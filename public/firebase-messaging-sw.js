// public/firebase-messaging-sw.js
// Service worker for Firebase Cloud Messaging — must live at the root path
// so FCM can find it. Handles background push notifications (when the app
// tab is not in the foreground) by showing a browser notification and
// opening the article URL when the user taps it.
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js')

// These MUST match your app's Firebase config in .env / firebase.js.
// They're safe to include in the service worker (public-facing config, not secret).
firebase.initializeApp({
  apiKey: self.__AIzaSyBZNfBFc627uPtq7Kkqf1LjdEN6d8EWx-Q__ || 'REPLACE_WITH_YOUR_VITE_FIREBASE_API_KEY',
  authDomain: self.__newsflowshots.firebaseapp.com__ || 'REPLACE_WITH_YOUR_PROJECT_ID.firebaseapp.com',
  projectId: self.__newsflowshots__ || 'REPLACE_WITH_YOUR_PROJECT_ID',
  storageBucket: self.__newsflowshots.firebasestorage.app__ || 'REPLACE_WITH_YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: self.__165921800043__ || 'REPLACE_WITH_YOUR_MESSAGING_SENDER_ID',
  appId: self.__1:165921800043:web:77b510e1e62567ada1562e__ || 'REPLACE_WITH_YOUR_APP_ID'
})

const messaging = firebase.messaging()

// Handle background messages (app tab not visible)
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {}
  const url = payload.data?.url || '/'

  self.registration.showNotification(title || 'NewsFlow', {
    body: body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    data: { url },
    requireInteraction: false
  })
})

// Tap notification → open / focus the relevant URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
