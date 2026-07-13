# NewsFlow v21 — Feature Patch Instructions
# Apply every change below in order before deploying.

## FILES TO COPY into D:\newsflow (overwrite existing)

From this zip:
- src/pages/Register.jsx         ← extended journalist registration
- src/contexts/AuthContext.jsx   ← saves new journalist fields
- src/admin/ManageNews.jsx       ← hide / republish controls
- src/admin/ManageJournalists.jsx ← shows all journalist details
- src/admin/Advertisements.jsx   ← new: admin can post ads like news
- src/services/fcm.js            ← new: FCM push token management
- firebase.json                  ← updated with functions config
- firestore.rules                ← updated: hidden status, ads, fcmToken
- functions/index.js             ← new: Cloud Functions
- functions/package.json         ← new
- public/firebase-messaging-sw.js ← new: background push handler

## EDIT THESE FILES (targeted changes)

### 1. src/App.jsx
Add this import near the other admin imports:
  import Advertisements from './admin/Advertisements'

Add this route inside <Routes>:
  <Route path="/admin/advertisements" element={<Advertisements />} />

### 2. src/admin/Dashboard.jsx
Add this button in the admin dashboard button list:
  <button className="nf-btn nf-btn-ghost nf-btn-block" style={{ marginBottom: 10 }}
    onClick={() => navigate('/admin/advertisements')}>
    📺 Manage Advertisements
  </button>

### 3. src/main.jsx (or src/App.jsx, wherever you init the app)
Import and call initFCM after the user logs in. The easiest place is inside
AuthContext.jsx, right after the onSnapshot profile listener triggers.
Add at the top of AuthContext.jsx:
  import { initFCM } from '../services/fcm'

Add inside the onSnapshot callback after setProfile(...):
  if (firebaseUser && snap.exists()) {
    initFCM(firebaseUser.uid).catch(() => {})
  }

### 4. public/firebase-messaging-sw.js
Open this file and replace the placeholder config values with your real
Firebase project values (same ones in your .env file):
  apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId
These are safe to hardcode here — they're the same public config, not secrets.

### 5. .env
Add your VAPID key:
  VITE_FIREBASE_VAPID_KEY=your_vapid_key_here

Get it from: Firebase console → Project settings → Cloud Messaging →
Web Push certificates → Generate key pair → copy the Key pair value.

## DEPLOY — in this exact order

### Step 1: Install Cloud Functions dependencies
  cd D:\newsflow\functions
  npm install

### Step 2: Deploy Firestore rules first
  cd D:\newsflow
  firebase deploy --only firestore:rules

### Step 3: Deploy Cloud Functions
  firebase deploy --only functions
  (First deploy takes ~3-5 minutes. Watch for any errors.)

### Step 4: Build and deploy the app
  npm run build
  firebase deploy --only hosting

## VERIFY push notifications work
1. Open the app in Chrome (desktop or Android)
2. Log in — browser will ask "Allow notifications?" → Allow
3. Open Firebase console → Cloud Messaging → Send test message
4. Or: approve a news report and wait for the onNewsPublished function to fire
5. Check Functions logs: Firebase console → Functions → Logs

## HIDE/REPUBLISH
Admin → Edit Published News → filter by "approved" or "hidden"
"🚫 Hide" removes from reader feed instantly (no delete)
"↻ Republish" puts it back live

## ADVERTISEMENTS
Admin Dashboard → 📺 Manage Advertisements → + New Ad
Fills the same feed as news, tagged "Ad" on cards
Push notification fires automatically to the target district on publish

## JOURNALIST REGISTRATION FIELDS
New journalists registering will see additional required fields:
- Full name, village, mandal, assembly constituency
- Political affiliation (Yes/No + party name if Yes)
All visible to admin in Manage Journalists, visible to admin only (not public)
