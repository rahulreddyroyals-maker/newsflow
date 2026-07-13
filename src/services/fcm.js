// src/services/fcm.js
// Handles asking for push notification permission and storing the FCM token
// on the user's Firestore profile so Cloud Functions can target them.
// Call initFCM(uid) once after login — safe to call multiple times.

import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { doc, updateDoc } from 'firebase/firestore'
import { app, db } from './firebase'

// Get your VAPID key from Firebase console → Project settings →
// Cloud Messaging → Web Push certificates → Key pair
// Add it to .env as VITE_FIREBASE_VAPID_KEY=...
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

export async function initFCM(uid) {
  if (!('Notification' in window) || !VAPID_KEY) return
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.ready
    })
    if (!token) return

    // Store/refresh the token on the user's profile — Cloud Functions
    // query this field when deciding who to notify.
    await updateDoc(doc(db, 'users', uid), { fcmToken: token })
  } catch (err) {
    // Notifications blocked or not supported — silent no-op, app works fine.
    console.info('FCM init skipped:', err.message)
  }
}

// Call this to handle foreground notifications (when the tab is active) —
// FCM doesn't show a browser notification automatically in this case.
export function listenForegroundMessages(onReceive) {
  if (!('Notification' in window)) return () => {}
  try {
    const messaging = getMessaging(app)
    return onMessage(messaging, (payload) => {
      onReceive?.(payload)
    })
  } catch {
    return () => {}
  }
}
