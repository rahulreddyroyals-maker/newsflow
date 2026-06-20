// src/services/firebase.js
// -----------------------------------------------------------------------------
// Config now comes from environment variables (see .env.example) instead of
// being hardcoded here. This means real keys never get committed to git —
// GitHub's secret scanning push protection blocks pushes containing
// recognizable key patterns, which is what happened when these were inline.
//
// Vite only exposes env vars prefixed with VITE_ to client code, and only
// reads them from a local .env file (gitignored) or your hosting provider's
// environment settings at build time.
//
// IMPORTANT: Phone Auth / OTP requires the Blaze (pay-as-you-go) plan, the same
// blocker you hit on CricketStars. This build uses Email + Password auth on the
// free Spark plan, so there is no OTP cost here.
// -----------------------------------------------------------------------------
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

if (!firebaseConfig.apiKey) {
  console.error(
    'Missing Firebase config. Copy .env.example to .env and fill in your project values, then restart `npm run dev`.'
  )
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
