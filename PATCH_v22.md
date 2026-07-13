# NewsFlow v22 — Patch Instructions
# Apply these file changes to D:\newsflow, then rebuild and deploy.

## FILES TO COPY (overwrite existing)

From this zip:
  src/utils/categories.js           ← adds General + Transport/Crime/Weather categories
  src/services/newsService.js        ← All feed shows everything, district = sort order only
  src/pages/Home.jsx                 ← district selection bubbles local news to top (never hides)
  src/admin/Dashboard.jsx            ← Advertisements button now visible
  scripts/rss-ingest.mjs             ← rejects items older than 24 hours

## EDIT src/App.jsx (add one import + one route)

### Add import near other admin imports:
  import Advertisements from './admin/Advertisements'

### Add route inside <Routes>:
  <Route path="/admin/advertisements" element={<Advertisements />} />

## FIX OLD RSS DATA IN FIRESTORE (one-time cleanup)

The old data is already in your `drafts` collection as pending items from months ago.
To clean them up:

1. Go to Firebase console → Firestore → `drafts` collection
2. Click the filter icon → filter by `status == pending`
3. Sort by `createdAt` ascending — the oldest items will be at the top
4. Delete any drafts with a `createdAt` older than yesterday manually
   (select each, click the 3-dot menu → Delete document)

OR use this quick one-time script (run once, then delete):

  # PowerShell — run from D:\newsflow
  node -e "
  const { initializeApp, cert } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  initializeApp({ credential: cert(sa) });
  const db = getFirestore();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  db.collection('drafts').where('status','==','pending').get().then(snap => {
    let deleted = 0;
    const batch = db.batch();
    snap.docs.forEach(doc => {
      const ts = doc.data().createdAt?.toDate?.();
      if (ts && ts < cutoff) { batch.delete(doc.ref); deleted++; }
    });
    return batch.commit().then(() => console.log('Deleted', deleted, 'old drafts'));
  }).catch(console.error);
  "

  Set FIREBASE_SERVICE_ACCOUNT to your service account JSON first:
  $env:FIREBASE_SERVICE_ACCOUNT = Get-Content path\to\serviceAccount.json -Raw

## DEPLOY

  cd D:\newsflow
  git add .
  git commit -m "General category, all-district feed, 24h RSS age limit, advertisements in admin"
  git push
  npm run build
  firebase deploy --only hosting,firestore:rules

## WHAT CHANGED

1. GENERAL CATEGORY — "General / జనరల్" is now the first option in the category
   dropdown, plus added Transport, Crime, and Weather. Any story that doesn't fit
   the existing list can now go under General.

2. ALL-DISTRICT FEED — selecting "All" always shows every story in the app.
   Selecting a specific district shows that district's stories FIRST, then all
   other stories after. Nothing is ever hidden from readers.

3. OLD RSS DATA — the ingest script now rejects any item whose pubDate is older
   than 24 hours before the run. Won't stop existing old items already in the
   `drafts` queue — use the cleanup above to remove those.

4. ADVERTISEMENTS VISIBLE — the "📺 Manage Advertisements" button now shows on
   the Admin Dashboard. The page was already built; it just wasn't linked.
