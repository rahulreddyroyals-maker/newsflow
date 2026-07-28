// functions/index.js
// All Cloud Functions in one file. Deploy with: firebase deploy --only functions
//
// SETUP NEEDED before some of these work:
//   - createAdminAccount: works immediately, no extra setup
//   - searchNewsFn: works immediately, no extra setup
//   - sendNewsDigest / onNewsPublished / onAdPublished: works immediately
//     (needs VAPID key configured client-side for push to actually deliver —
//     see src/services/fcm.js from an earlier round)
//   - createPremiumOrder / verifyPremiumPayment: needs a Razorpay account +
//     secrets set via:
//       firebase functions:secrets:set RAZORPAY_KEY_ID
//       firebase functions:secrets:set RAZORPAY_KEY_SECRET
//     and `npm install razorpay --save` inside this functions/ folder.

const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
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
// PREMIUM SUBSCRIPTIONS (Razorpay) — requires secrets + `npm install razorpay`
// ═══════════════════════════════════════════════════════════════════════════

const Razorpay = require('razorpay')
const crypto = require('crypto')

const razorpayKeyId = defineSecret('RAZORPAY_KEY_ID')
const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET')

const PREMIUM_PLANS = {
  monthly: { amountPaise: 4900, days: 30 },
  yearly: { amountPaise: 39900, days: 365 }
}

exports.createPremiumOrder = onCall(
  { region: 'asia-south1', secrets: [razorpayKeyId, razorpayKeySecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.')
    const plan = PREMIUM_PLANS[request.data?.plan]
    if (!plan) throw new HttpsError('invalid-argument', 'Invalid plan.')

    const instance = new Razorpay({ key_id: razorpayKeyId.value(), key_secret: razorpayKeySecret.value() })
    const order = await instance.orders.create({
      amount: plan.amountPaise,
      currency: 'INR',
      receipt: `premium_${request.auth.uid}_${Date.now()}`
    })
    return { orderId: order.id, amount: plan.amountPaise, keyId: razorpayKeyId.value() }
  }
)

exports.verifyPremiumPayment = onCall(
  { region: 'asia-south1', secrets: [razorpayKeySecret] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.')
    const { orderId, paymentId, signature, plan } = request.data || {}
    if (!orderId || !paymentId || !signature || !PREMIUM_PLANS[plan]) {
      throw new HttpsError('invalid-argument', 'Missing payment verification fields.')
    }

    const expected = crypto
      .createHmac('sha256', razorpayKeySecret.value())
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    if (expected !== signature) {
      throw new HttpsError('permission-denied', 'Payment verification failed.')
    }

    const days = PREMIUM_PLANS[plan].days
    const premiumUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

    await db.collection('users').doc(request.auth.uid).update({
      isPremium: true,
      premiumUntil,
      premiumPlan: plan
    })

    return { success: true, premiumUntil: premiumUntil.toISOString() }
  }
)
