// functions/index.js
// FIX: getTokensForDistrict previously did an exact string match against
// each user's district field. An ad/story targeting "Andhra Pradesh
// (statewide)" therefore only reached users whose profile literally said
// that exact string — missing everyone whose district was set to a specific
// place like "Guntur" or "Krishna," even though they're in Andhra Pradesh.
// Same class of bug fixed in Home.jsx's sort logic previously; now applied
// here too, so district-targeted push notifications actually reach every
// user whose own preference falls within that target scope.

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
// DISTRICT MATCHING — mirrors Home.jsx's isLocalMatch so "which users get
// notified" and "which stories rank as local" use identical logic.
// ═══════════════════════════════════════════════════════════════════════════

function normalize(str) { return (str || '').trim().toLowerCase() }

const AP_DISTRICTS = [
  'Srikakulam','Parvathipuram Manyam','Vizianagaram','Visakhapatnam','Anakapalli',
  'Alluri Sitharama Raju','Kakinada','East Godavari','Dr. B.R. Ambedkar Konaseema',
  'West Godavari','Eluru','Krishna','NTR','Guntur','Palnadu','Bapatla',
  'Prakasam','Markapuram','Nellore','Kurnool','Nandyal','Anantapur',
  'Sri Sathya Sai','YSR Kadapa','Annamayya','Chittoor','Tirupati','Polavaram'
].map(normalize)
const TS_DISTRICTS = [
  'Hyderabad','Medchal-Malkajgiri','Rangareddy','Vikarabad','Sangareddy',
  'Siddipet','Medak','Kamareddy','Nizamabad','Jagtial','Rajanna Sircilla',
  'Karimnagar','Peddapalli','Mancherial','Adilabad','Nirmal',
  'Komaram Bheem Asifabad','Jayashankar Bhupalpally','Warangal','Hanumakonda',
  'Jangaon','Mahabubabad','Bhadradri Kothagudem','Khammam','Mulugu',
  'Suryapet','Nalgonda','Yadadri Bhuvanagiri','Mahabubnagar','Nagarkurnool',
  'Wanaparthy','Jogulamba Gadwal','Narayanpet'
].map(normalize)

function districtMatchesTarget(userDistrict, targetDistrict) {
  const target = normalize(targetDistrict)
  const user = normalize(userDistrict)
  if (!target) return true // no target = broadcast to everyone
  if (user === target) return true
  if (target === normalize('Andhra Pradesh (statewide)')) return AP_DISTRICTS.includes(user)
  if (target === normalize('Telangana (statewide)'))       return TS_DISTRICTS.includes(user)
  return false
}

// Fetches every user with a push token, then filters in JS against the
// target district — this replaces the old single Firestore where() equality
// match. Doing it this way (rather than a Firestore 'in' query) sidesteps
// the 30-value cap too, since Telangana alone has 33 districts.
async function getTokensForDistrict(targetDistrict) {
  const snap = await db.collection('users').where('fcmToken', '!=', null).limit(2000).get()
  return snap.docs
    .map((d) => d.data())
    .filter((u) => districtMatchesTarget(u.district, targetDistrict))
    .map((u) => u.fcmToken)
    .filter(Boolean)
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
  const tokens = await getTokensForDistrict(story.district || null)
  await sendMulticast(tokens, { title: `📰 ${story.headline || 'Breaking news'}`, body: story.summary || '' }, { url: `https://newsflowshots.web.app/news/${newsId}`, newsId })
  return null
})

// Fires on EVERY new advertisement document — a business/journalist can
// post as many separate ads in a day as they like, each one is its own
// document creation, so each gets its own fresh round of notifications.
// There's no daily cap or dedup logic here by design.
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
