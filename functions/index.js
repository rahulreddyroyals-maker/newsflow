// functions/index.js
// Firebase Cloud Functions — runs on the Blaze plan (required for outbound
// network calls and scheduling). Deploy with: firebase deploy --only functions
//
// Three functions:
//  1. sendNewsDigest     — scheduled every 30 min, sends latest news to all users
//  2. onAdPublished      — triggers when an ad goes live, pushes to that district
//  3. onNewsPublished    — triggers when any news is approved, pushes to subscribers

const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')

initializeApp()
const db = getFirestore()

// Helper: get all FCM tokens for a given district (or all users if district = null)
async function getTokensForDistrict(district) {
  let q = db.collection('users').where('fcmToken', '!=', null)
  if (district) q = q.where('district', '==', district)
  const snap = await q.limit(500).get()
  return snap.docs.map((d) => d.data().fcmToken).filter(Boolean)
}

// Helper: batch-send — FCM's multicast accepts max 500 tokens per call
async function sendMulticast(tokens, notification, data = {}) {
  if (!tokens.length) return
  const batches = []
  for (let i = 0; i < tokens.length; i += 500) {
    batches.push(tokens.slice(i, i + 500))
  }
  const messaging = getMessaging()
  await Promise.allSettled(batches.map((batch) =>
    messaging.sendEachForMulticast({
      tokens: batch,
      notification,
      data,
      android: { priority: 'high', notification: { sound: 'default', channelId: 'newsflow_news' } },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      webpush: {
        headers: { Urgency: 'high' },
        notification: { ...notification, icon: '/icons/icon-192.png', badge: '/icons/icon-96.png', requireInteraction: false },
        fcmOptions: { link: data.url || 'https://newsflowshots.web.app/home' }
      }
    })
  ))
}

// 1. Scheduled news digest — every 30 minutes, sends the latest approved
//    story (if one was published in the last 30 min) to all users as a
//    breaking-news push.
exports.sendNewsDigest = onSchedule({ schedule: 'every 30 minutes', region: 'asia-south1' }, async () => {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)
  const snap = await db.collection('news')
    .where('status', '==', 'approved')
    .where('createdAt', '>', thirtyMinAgo)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()

  if (snap.empty) return null

  const story = snap.docs[0].data()
  const storyId = snap.docs[0].id
  const tokens = await getTokensForDistrict(null) // all users

  await sendMulticast(tokens, {
    title: story.headline || 'New story on NewsFlow',
    body: story.summary || ''
  }, {
    url: `https://newsflowshots.web.app/news/${storyId}`,
    storyId
  })

  return null
})

// 2. Triggers when a news document is created (i.e. admin approves a draft
//    or uploads directly) — pushes immediately to users in that district.
exports.onNewsPublished = onDocumentCreated(
  { document: 'news/{newsId}', region: 'asia-south1' },
  async (event) => {
    const story = event.data?.data()
    if (!story || story.status !== 'approved') return null

    const newsId = event.params.newsId
    const tokens = story.district
      ? await getTokensForDistrict(story.district)
      : await getTokensForDistrict(null)

    await sendMulticast(tokens, {
      title: `📰 ${story.headline || 'Breaking news'}`,
      body: story.summary || ''
    }, {
      url: `https://newsflowshots.web.app/news/${newsId}`,
      newsId
    })

    return null
  }
)

// 3. Triggers when an advertisement is created — pushes to users in the
//    ad's target district (or all users if no district specified).
exports.onAdPublished = onDocumentCreated(
  { document: 'advertisements/{adId}', region: 'asia-south1' },
  async (event) => {
    const ad = event.data?.data()
    if (!ad) return null

    const adId = event.params.adId
    const district = ad.district || null
    const tokens = await getTokensForDistrict(district)

    await sendMulticast(tokens, {
      title: `📢 ${ad.headline || 'Advertisement on NewsFlow'}`,
      body: ad.summary || ad.businessName || ''
    }, {
      url: `https://newsflowshots.web.app/ad/${adId}`,
      adId
    })

    return null
  }
)
