// scripts/rss-ingest.mjs
// -----------------------------------------------------------------------------
// Pulls items from the RSS feeds in feeds.config.mjs (and optionally
// NewsData.io), rewrites/categorizes each one with Groq, and writes it into
// the SAME `drafts` collection your journalists submit to — so RSS items
// show up in the existing Admin → Pending Approval screen for a human check
// before they go live. Nothing is auto-published.
//
// Runs as a free GitHub Actions cron job (see .github/workflows/rss-ingest.yml)
// instead of a Firebase Cloud Function, because Cloud Functions need the
// Blaze plan for outbound network calls — this script needs zero Firebase
// plan upgrade. It uses the Firebase Admin SDK with a service account key,
// not the client SDK, so it bypasses the reader/journalist security rules.
//
// Local test:
//   GROQ_API_KEY=... FIREBASE_SERVICE_ACCOUNT='<paste JSON>' node scripts/rss-ingest.mjs
// -----------------------------------------------------------------------------
import Parser from 'rss-parser'
import { initializeApp } from 'firebase-admin/app'
import { cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { RSS_FEEDS, NEWSDATA_QUERY } from './feeds.config.mjs'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT
const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY
const MAX_ITEMS_PER_FEED = 12
const LOOKBACK_DAYS_FOR_DEDUP = 7

if (!SERVICE_ACCOUNT_JSON) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT env var. See README for setup.')
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

// Pulls a usable image URL out of an RSS item, trying every common place
// feeds hide images: <enclosure>, <media:content>, <media:thumbnail>, or a
// plain <img> tag inside the HTML description/content as a last resort.
function extractImageUrl(item) {
  if (item.enclosure?.url) return item.enclosure.url

  const media = item.mediaContent
  if (Array.isArray(media) && media.length > 0) {
    const withUrl = media.find((m) => m?.$?.url)
    if (withUrl) return withUrl.$.url
  }

  if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url

  const html = item.contentEncoded || item.content || item['content:encoded'] || ''
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (match) return match[1]

  return null
}

async function groqChat(systemPrompt, userPrompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
    })
  })
  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

const CATEGORY_IDS = ['state-politics', 'district-news', 'education', 'govt-jobs', 'agriculture', 'business', 'technology', 'health', 'sports', 'cinema']
const DISTRICT_NAMES = [
  'Srikakulam', 'Parvathipuram Manyam', 'Vizianagaram', 'Visakhapatnam', 'Anakapalli', 'Alluri Sitharama Raju',
  'Kakinada', 'East Godavari', 'Dr. B.R. Ambedkar Konaseema', 'West Godavari', 'Eluru', 'Krishna', 'NTR',
  'Guntur', 'Palnadu', 'Bapatla', 'Prakasam', 'Markapuram', 'Nellore', 'Kurnool', 'Nandyal', 'Anantapur',
  'Sri Sathya Sai', 'YSR Kadapa', 'Annamayya', 'Chittoor', 'Tirupati', 'Polavaram',
  'Hyderabad', 'Medchal-Malkajgiri', 'Rangareddy', 'Vikarabad', 'Sangareddy', 'Siddipet', 'Medak', 'Kamareddy',
  'Nizamabad', 'Jagtial', 'Rajanna Sircilla', 'Karimnagar', 'Peddapalli', 'Mancherial', 'Adilabad', 'Nirmal',
  'Komaram Bheem Asifabad', 'Jayashankar Bhupalpally', 'Warangal', 'Hanumakonda', 'Jangaon', 'Mahabubabad',
  'Bhadradri Kothagudem', 'Khammam', 'Mulugu', 'Suryapet', 'Nalgonda', 'Yadadri Bhuvanagiri', 'Mahabubnagar',
  'Nagarkurnool', 'Wanaparthy', 'Jogulamba Gadwal', 'Narayanpet'
]

// Rewrites a raw RSS item into NewsFlow's bilingual draft shape and guesses category/district.
async function processItem(item, feed) {
  const rawText = `${item.title}\n\n${item.contentSnippet || item.content || ''}`.slice(0, 4000)
  const systemPrompt = `You are a professional Telugu/English news editor for NewsFlow, a local news app for Andhra Pradesh & Telangana.
Rewrite this wire item into clean, neutral journalism. Never invent facts not present in the input.
Pick the closest category id from: ${CATEGORY_IDS.join(', ')}.
Pick the closest district from this list, or "All" if it's a state-wide/non-local story: ${DISTRICT_NAMES.join(', ')}.
Respond ONLY with valid JSON, no markdown fences, exactly this shape:
{"headline":"...","headlineEn":"...","summary":"...","summaryEn":"...","article":"...","articleEn":"...","category":"...","district":"..."}
Rules: Telugu fields in Telugu, English fields in English, summary ~50 words, article 120-250 words.`

  const raw = await groqChat(systemPrompt, rawText)
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(cleaned)
  const imageUrl = extractImageUrl(item)
  return {
    ...parsed,
    images: imageUrl ? [imageUrl] : [],
    audioUrl: null,
    rawText,
    sourceUrl: item.link,
    sourceName: feed.source,
    authorId: 'system-rss',
    authorName: `RSS · ${feed.source}`,
    createdAt: FieldValue.serverTimestamp(),
    status: 'pending'
  }
}

async function alreadyIngested(sourceUrl) {
  const cutoff = new Date(Date.now() - LOOKBACK_DAYS_FOR_DEDUP * 24 * 60 * 60 * 1000)
  const snap = await db.collection('drafts').where('sourceUrl', '==', sourceUrl).limit(1).get()
  if (snap.empty) return false
  const doc = snap.docs[0].data()
  return !doc.createdAt || doc.createdAt.toDate() > cutoff
}

async function ingestFeed(feed, counters) {
  console.log(`Fetching ${feed.source} (${feed.url})…`)
  let parsed
  try {
    parsed = await parser.parseURL(feed.url)
  } catch (err) {
    console.error(`  ✗ Could not fetch/parse ${feed.source}: ${err.message}`)
    counters.errors++
    return
  }
  const items = (parsed.items || []).slice(0, MAX_ITEMS_PER_FEED)
  console.log(`  Feed returned ${items.length} item(s) to check.`)
  for (const item of items) {
    if (!item.link) continue
    if (await alreadyIngested(item.link)) {
      counters.skipped++
      console.log(`  · skip (already ingested): ${item.title}`)
      continue
    }
    try {
      const draft = await processItem(item, feed)
      if (feed.defaultDistrict) draft.district = feed.defaultDistrict
      if (feed.defaultCategory) draft.category = feed.defaultCategory
      await db.collection('drafts').add(draft)
      counters.queued++
      console.log(`  ✓ queued for approval: ${draft.headline}`)
    } catch (err) {
      counters.errors++
      console.error(`  ✗ failed on "${item.title}": ${err.message}`)
    }
  }
}

async function ingestNewsData(counters) {
  if (!NEWSDATA_QUERY.enabled || !NEWSDATA_API_KEY) {
    console.log('NewsData.io skipped (no NEWSDATA_API_KEY secret set — this is fine if you only want RSS).')
    return
  }
  const params = new URLSearchParams({ apikey: NEWSDATA_API_KEY, ...NEWSDATA_QUERY.params })
  const res = await fetch(`${NEWSDATA_QUERY.baseUrl}?${params}`)
  if (!res.ok) {
    console.error(`NewsData.io error ${res.status}`)
    counters.errors++
    return
  }
  const data = await res.json()
  console.log(`NewsData.io returned ${data.results?.length || 0} item(s) to check.`)
  for (const article of (data.results || []).slice(0, MAX_ITEMS_PER_FEED)) {
    const pseudoItem = { title: article.title, contentSnippet: article.description, link: article.link, enclosure: article.image_url ? { url: article.image_url } : null }
    if (!pseudoItem.link || (await alreadyIngested(pseudoItem.link))) {
      counters.skipped++
      continue
    }
    try {
      const draft = await processItem(pseudoItem, { source: 'NewsData.io' })
      await db.collection('drafts').add(draft)
      counters.queued++
      console.log(`  ✓ queued (NewsData.io): ${draft.headline}`)
    } catch (err) {
      counters.errors++
      console.error(`  ✗ NewsData.io item failed: ${err.message}`)
    }
  }
}

async function main() {
  const counters = { queued: 0, skipped: 0, errors: 0 }
  for (const feed of RSS_FEEDS) {
    await ingestFeed(feed, counters)
  }
  await ingestNewsData(counters)
  console.log(`\nDone. Queued: ${counters.queued} · Already had: ${counters.skipped} · Errors: ${counters.errors}`)
  if (counters.queued === 0 && counters.errors === 0) {
    console.log('Nothing new this run — every item in the feed(s) had already been ingested before. This is expected once a feed runs dry between publishes, not a bug. Add more feeds in feeds.config.mjs, or add a NEWSDATA_API_KEY secret, for more volume.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
