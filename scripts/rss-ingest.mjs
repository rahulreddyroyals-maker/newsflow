// scripts/rss-ingest.mjs
// Runs as a GitHub Actions cron job every 30 minutes.
// KEY FIX: now rejects any RSS item older than 24 hours — prevents old
// archived stories from flooding the pending-approval queue on every run.
import Parser from 'rss-parser'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { RSS_FEEDS, NEWSDATA_QUERY } from './feeds.config.mjs'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT
const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY
const MAX_ITEMS_PER_FEED = 12
const MAX_ITEM_AGE_HOURS = 24   // ← reject anything older than this
const DEDUP_LOOKBACK_DAYS = 7   // ← still check last 7 days for duplicates

if (!SERVICE_ACCOUNT_JSON) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT env var.')
  process.exit(1)
}

initializeApp({ credential: cert(JSON.parse(SERVICE_ACCOUNT_JSON)) })
const db = getFirestore()
const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded']
    ]
  }
})

// ── Groq ──────────────────────────────────────────────────────────────────────
async function groqChat(systemPrompt, userPrompt) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY missing')
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
    })
  })
  if (!res.ok) {
    const t = await res.text()
    if (res.status === 401) throw new Error(`Groq 401 — invalid API key. Update GROQ_API_KEY secret. Raw: ${t}`)
    throw new Error(`Groq ${res.status}: ${t}`)
  }
  return (await res.json()).choices?.[0]?.message?.content?.trim() || ''
}

// ── Image extraction ──────────────────────────────────────────────────────────
function extractImageUrl(item) {
  if (item.enclosure?.url) return item.enclosure.url
  const media = item.mediaContent
  if (Array.isArray(media) && media.length > 0) {
    const w = media.find((m) => m?.$?.url)
    if (w) return w.$.url
  }
  if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url
  const html = item.contentEncoded || item.content || item['content:encoded'] || ''
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (match) return match[1]
  return null
}

// ── Districts / categories (inline mini-list for the rewrite prompt) ──────────
const DISTRICT_NAMES = [
  'Srikakulam','Parvathipuram Manyam','Vizianagaram','Visakhapatnam','Anakapalli',
  'Alluri Sitharama Raju','Kakinada','East Godavari','Dr. B.R. Ambedkar Konaseema',
  'West Godavari','Eluru','Krishna','NTR','Guntur','Palnadu','Bapatla',
  'Prakasam','Markapuram','Nellore','Kurnool','Nandyal','Anantapur',
  'Sri Sathya Sai','YSR Kadapa','Annamayya','Chittoor','Tirupati','Polavaram',
  'Hyderabad','Medchal-Malkajgiri','Rangareddy','Vikarabad','Sangareddy',
  'Siddipet','Medak','Kamareddy','Nizamabad','Jagtial','Rajanna Sircilla',
  'Karimnagar','Peddapalli','Mancherial','Adilabad','Nirmal',
  'Komaram Bheem Asifabad','Jayashankar Bhupalpally','Warangal','Hanumakonda',
  'Jangaon','Mahabubabad','Bhadradri Kothagudem','Khammam','Mulugu',
  'Suryapet','Nalgonda','Yadadri Bhuvanagiri','Mahabubnagar','Nagarkurnool',
  'Wanaparthy','Jogulamba Gadwal','Narayanpet'
]
const CATEGORY_IDS = [
  'general','state-politics','district-news','education','govt-jobs',
  'agriculture','business','technology','health','sports','cinema','transport','crime','weather'
]

// ── Age check ─────────────────────────────────────────────────────────────────
function itemIsRecent(item) {
  const raw = item.pubDate || item.isoDate || item.date
  if (!raw) return true // can't determine age → accept
  const pubMs = new Date(raw).getTime()
  if (isNaN(pubMs)) return true
  const ageHours = (Date.now() - pubMs) / 3_600_000
  return ageHours <= MAX_ITEM_AGE_HOURS
}

// ── Dedup ─────────────────────────────────────────────────────────────────────
async function alreadyIngested(sourceUrl) {
  const cutoff = new Date(Date.now() - DEDUP_LOOKBACK_DAYS * 86_400_000)
  const snap = await db.collection('drafts').where('sourceUrl', '==', sourceUrl).limit(1).get()
  if (snap.empty) return false
  const d = snap.docs[0].data()
  return !d.createdAt || d.createdAt.toDate() > cutoff
}

// ── AI rewrite ────────────────────────────────────────────────────────────────
async function processItem(item, feed) {
  const rawText = `${item.title}\n\n${item.contentSnippet || item.content || ''}`.slice(0, 4000)
  const sys = `You are a professional Telugu/English news editor for NewsFlow, a local news app for Andhra Pradesh & Telangana.
Rewrite this wire item into clean, neutral journalism. Never invent facts not present in the input.
Pick the closest category id from: ${CATEGORY_IDS.join(', ')}.
Pick the closest district from: ${DISTRICT_NAMES.join(', ')}, or "All" for state-wide/non-local stories.
Respond ONLY with valid JSON, no markdown, exactly:
{"headline":"...","headlineEn":"...","summary":"...","summaryEn":"...","article":"...","articleEn":"...","category":"...","district":"..."}`

  const raw = await groqChat(sys, rawText)
  const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
  const imageUrl = extractImageUrl(item)
  return {
    ...parsed,
    images: imageUrl ? [imageUrl] : [],
    audioUrl: null,
    rawText,
    sourceUrl: item.link,
    sourceName: feed.source,
    authorId: 'system-rss',
    authorName: 'NewsFlow',
    createdAt: FieldValue.serverTimestamp(),
    status: 'pending'
  }
}

// ── Feed ingestion ─────────────────────────────────────────────────────────────
async function ingestFeed(feed, counters) {
  console.log(`Fetching ${feed.source} (${feed.url})…`)
  let parsed
  try { parsed = await parser.parseURL(feed.url) }
  catch (err) { console.error(`  ✗ Could not fetch: ${err.message}`); counters.errors++; return }

  const items = (parsed.items || []).slice(0, MAX_ITEMS_PER_FEED)
  console.log(`  Feed returned ${items.length} item(s).`)
  for (const item of items) {
    if (!item.link) continue
    if (!itemIsRecent(item)) {
      console.log(`  · skip (older than ${MAX_ITEM_AGE_HOURS}h): ${item.title}`)
      counters.skipped++
      continue
    }
    if (await alreadyIngested(item.link)) {
      console.log(`  · skip (already ingested): ${item.title}`)
      counters.skipped++
      continue
    }
    try {
      const draft = await processItem(item, feed)
      if (feed.defaultDistrict) draft.district = feed.defaultDistrict
      if (feed.defaultCategory) draft.category = feed.defaultCategory
      await db.collection('drafts').add(draft)
      counters.queued++
      console.log(`  ✓ queued: ${draft.headline}`)
    } catch (err) {
      counters.errors++
      console.error(`  ✗ failed "${item.title}": ${err.message}`)
    }
  }
}

// ── NewsData.io fallback ──────────────────────────────────────────────────────
async function ingestNewsData(counters) {
  if (!NEWSDATA_QUERY.enabled || !NEWSDATA_API_KEY) {
    console.log('NewsData.io skipped (no NEWSDATA_API_KEY set).')
    return
  }
  const params = new URLSearchParams({ apikey: NEWSDATA_API_KEY, ...NEWSDATA_QUERY.params })
  const res = await fetch(`${NEWSDATA_QUERY.baseUrl}?${params}`)
  if (!res.ok) { console.error(`NewsData.io error ${res.status}`); counters.errors++; return }
  const data = await res.json()
  console.log(`NewsData.io returned ${data.results?.length || 0} item(s).`)
  for (const article of (data.results || []).slice(0, MAX_ITEMS_PER_FEED)) {
    const pubDate = article.pubDate || article.publishedAt
    const pseudo = { title: article.title, contentSnippet: article.description, link: article.link, pubDate, enclosure: article.image_url ? { url: article.image_url } : null }
    if (!pseudo.link) continue
    if (!itemIsRecent(pseudo)) { counters.skipped++; continue }
    if (await alreadyIngested(pseudo.link)) { counters.skipped++; continue }
    try {
      const draft = await processItem(pseudo, { source: 'NewsData.io' })
      await db.collection('drafts').add(draft)
      counters.queued++
      console.log(`  ✓ queued (NewsData.io): ${draft.headline}`)
    } catch (err) { counters.errors++; console.error(`  ✗ NewsData.io item failed: ${err.message}`) }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!GROQ_API_KEY) {
    console.error('GROQ_API_KEY secret is missing — add it in repo Settings → Secrets.')
    process.exit(1)
  }
  try {
    await groqChat('Reply with the single word: ok', 'ping')
  } catch (err) {
    console.error(`Groq key check failed: ${err.message}`)
    process.exit(1)
  }

  const counters = { queued: 0, skipped: 0, errors: 0 }
  for (const feed of RSS_FEEDS) await ingestFeed(feed, counters)
  await ingestNewsData(counters)
  console.log(`\nDone. Queued: ${counters.queued} · Skipped: ${counters.skipped} · Errors: ${counters.errors}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
