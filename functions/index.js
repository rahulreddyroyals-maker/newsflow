// functions/index.js
// Razorpay/Premium removed for now — can be added back later without
// touching anything else here. What's left needs zero extra setup beyond
// what's already configured (no Secret Manager, no extra APIs to enable).

const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')
const { getAuth } = require('firebase-admin/auth')

initializeApp()
const db = getFirestore()

// ═══════════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function getTokensForDistrict(district) {
  let q = db.collection('users').where('fcmToken', '!=', null)
  if (district) q = q.where('district', '==', district)
  const snap = await q.limit(500).get()
  return snap.docs.map((d) => d.data().fcmToken).filter(Boolean)
}

async function sendMulticast(tokens, notification, data = {}) {
  if (!tokens.length) return
  const batches = []
  for (let i = 0; i < tokens.length; i += 500) batches.push(tokens.slice(i, i + 500))
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
  const tokens = await getTokensForDistrict(null)
  await sendMulticast(tokens, { title: story.headline || 'New story on NewsFlow', body: story.summary || '' }, { url: `https://newsflowshots.web.app/news/${storyId}`, storyId })
  return null
})

exports.onNewsPublished = onDocumentCreated({ document: 'news/{newsId}', region: 'asia-south1' }, async (event) => {
  const story = event.data?.data()
  if (!story || story.status !== 'approved') return null
  const newsId = event.params.newsId
  const tokens = story.district ? await getTokensForDistrict(story.district) : await getTokensForDistrict(null)
  await sendMulticast(tokens, { title: `📰 ${story.headline || 'Breaking news'}`, body: story.summary || '' }, { url: `https://newsflowshots.web.app/news/${newsId}`, newsId })
  return null
})

exports.onAdPublished = onDocumentCreated({ document: 'advertisements/{adId}', region: 'asia-south1' }, async (event) => {
  const ad = event.data?.data()
  if (!ad) return null
  const adId = event.params.adId
  const tokens = await getTokensForDistrict(ad.district || null)
  await sendMulticast(tokens, { title: `📢 ${ad.headline || 'Advertisement on NewsFlow'}`, body: ad.summary || ad.businessName || '' }, { url: `https://newsflowshots.web.app/ad/${adId}`, adId })
  return null
})

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN ACCOUNT CREATION
// ═══════════════════════════════════════════════════════════════════════════

exports.createAdminAccount = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'You must be signed in.')

  const callerSnap = await db.collection('users').doc(request.auth.uid).get()
  if (!callerSnap.exists || callerSnap.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only existing admins can create new admin accounts.')
  }

  const { email, password, name } = request.data || {}
  if (!email || !password || password.length < 6) {
    throw new HttpsError('invalid-argument', 'Email and a password (6+ characters) are required.')
  }

  let newUser
  try {
    newUser = await getAuth().createUser({ email, password, displayName: name || email })
  } catch (err) {
    throw new HttpsError('already-exists', `Could not create account: ${err.message}`)
  }

  await db.collection('users').doc(newUser.uid).set({
    name: name || email,
    email,
    role: 'admin',
    verified: true,
    language: 'te',
    district: '',
    bookmarks: [],
    createdAt: new Date()
  })

  return { uid: newUser.uid, email }
})

// ═══════════════════════════════════════════════════════════════════════════
// FULL-CORPUS SEARCH
// ═══════════════════════════════════════════════════════════════════════════

exports.searchNewsFn = onCall({ region: 'asia-south1' }, async (request) => {
  const keyword = (request.data?.query || '').trim().toLowerCase()
  if (!keyword) return { results: [] }

  const snap = await db.collection('news').where('status', '==', 'approved').get()
  const scored = []

  snap.forEach((doc) => {
    const n = doc.data()
    const haystack = `${n.headline} ${n.headlineEn || ''} ${n.summary} ${n.summaryEn || ''} ${n.district} ${n.category}`.toLowerCase()
    if (haystack.includes(keyword)) {
      let score = 1
      if ((n.headline || '').toLowerCase().includes(keyword)) score += 3
      if ((n.headlineEn || '').toLowerCase().includes(keyword)) score += 3
      scored.push({ id: doc.id, ...n, _score: score })
    }
  })

  scored.sort((a, b) => b._score - a._score || (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
  return { results: scored.slice(0, 40).map(({ _score, ...rest }) => rest) }
})

// ═══════════════════════════════════════════════════════════════════════════
// PREMIUM (Razorpay) — REMOVED FOR NOW
// ═══════════════════════════════════════════════════════════════════════════
// When you're ready to bring this back:
//   1. Enable the Secret Manager API for your project (this is what the
//      earlier deploy error was about — it's a one-time toggle, not
//      anything wrong with the code):
//      console.developers.google.com/apis/api/secretmanager.googleapis.com/overview?project=newsflowshots
//   2. `npm install razorpay --save` inside functions/
//   3. Re-add the createPremiumOrder / verifyPremiumPayment functions
//      (ask and I'll hand them back exactly as before)
//   4. Set the two secrets: firebase functions:secrets:set RAZORPAY_KEY_ID
//      and RAZORPAY_KEY_SECRET
// Until then, src/pages/Premium.jsx will just show an error if someone
// tries to subscribe — safe to leave the page in place unlinked, or remove
// the /premium route from App.jsx if you'd rather it not exist at all yet.
