// functions/index.js — ADD THIS to your existing functions/index.js file
// (alongside sendNewsDigest, onNewsPublished, onAdPublished — don't remove those)
//
// Why this needs to be a Cloud Function rather than a plain client-side
// createUserWithEmailAndPassword call: Firebase's client SDK signs you in
// as whichever account you just created — so if an admin tried to create a
// second admin account directly from the app, they'd immediately be logged
// out of their own session and into the new one. Creating the account via
// the Admin SDK (server-side, here) has no such side effect — the calling
// admin stays logged into their own account throughout.

const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { getAuth } = require('firebase-admin/auth')

// (getFirestore/db and initializeApp should already exist earlier in your
// index.js from the push-notification functions — reuse them, don't
// initializeApp() a second time.)

exports.createAdminAccount = onCall({ region: 'asia-south1' }, async (request) => {
  // 1. Caller must be signed in
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.')
  }

  // 2. Caller must already be an admin — checked against Firestore, not
  //    trusted from the client.
  const callerSnap = await db.collection('users').doc(request.auth.uid).get()
  if (!callerSnap.exists || callerSnap.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only existing admins can create new admin accounts.')
  }

  const { email, password, name } = request.data || {}
  if (!email || !password || password.length < 6) {
    throw new HttpsError('invalid-argument', 'Email and a password (6+ characters) are required.')
  }

  // 3. Create the new Auth account server-side
  let newUser
  try {
    newUser = await getAuth().createUser({ email, password, displayName: name || email })
  } catch (err) {
    throw new HttpsError('already-exists', `Could not create account: ${err.message}`)
  }

  // 4. Create their Firestore profile as a pre-verified admin
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
