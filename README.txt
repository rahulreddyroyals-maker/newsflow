NewsFlow v28 — Complete files, ready to drop in
==================================================
Every file below is COMPLETE and OVERWRITE-READY — no patch notes to read,
no manual code-merging. Copy each one into the matching path in your
D:\newsflow project, overwriting what's there.

FILES IN THIS ZIP (all complete, all overwrite existing paths)
------------------------------------------------------------------
src/main.jsx
src/App.jsx
src/components/Header.jsx
src/components/ReelsFeed.jsx
src/components/AdSlot.jsx                    (NEW)
src/admin/Dashboard.jsx
src/admin/Approvals.jsx
src/admin/ManageClassifieds.jsx              (NEW)
src/admin/ErrorLogs.jsx                       (NEW)
src/journalist/AIDraftPreview.jsx
src/pages/NewsDetail.jsx
src/pages/Search.jsx
src/pages/Classifieds.jsx                    (NEW)
src/pages/Premium.jsx                         (NEW)
src/services/newsService.js
src/services/analytics.js                     (NEW)
src/services/duplicateCheck.js                (NEW)
src/services/classifieds.js                   (NEW)
functions/index.js
functions/package.json
firestore.rules

NOT included (unchanged from before — nothing to update):
  everything else in your project: AuthContext.jsx, LanguageContext.jsx,
  Login.jsx, Register.jsx, AdminLogin.jsx, Splash.jsx, SubmitNews.jsx,
  WalletSection.jsx, AdLeadsSection.jsx, GuidelinesSection.jsx,
  ManageJournalists.jsx, ManageNews.jsx, AdLeads.jsx, Withdrawals.jsx,
  Advertisements.jsx, ManageAdmins.jsx, UploadNews.jsx, JournalistProfile.jsx,
  CommentsPanel.jsx, ActionIcons.jsx, ImageWatermark.jsx, NewsCard.jsx,
  CategoryTabs.jsx, DistrictSelector.jsx, Bookmarks.jsx, Notifications.jsx,
  Profile.jsx, BottomNav.jsx, groq.js, firebase.js, fcm.js, wallet.js,
  video.js, districts.js, categories.js, styles/index.css


WHAT WORKS IMMEDIATELY (no account setup needed)
====================================================
- Analytics + error logging (Admin → 🐛 Error Logs)
- Duplicate detection warnings (shown to journalist while reviewing draft,
  and to admin in the approval queue)
- Full-corpus search (Cloud Function, no more 200-article cap)
- Classifieds — Jobs/Matrimony/Real Estate/Vehicles/Services, browse via
  the 🗂️ icon in the header next to search, post via same page,
  moderate via Admin → 🗂️ Pending Classifieds
- Multi-admin management (from last round, included again for completeness)
- Headline + language toggle on one line in Reels view
- Original submission timestamp preserved through approval (fixes
  recency ranking for reports that sit in the queue a while)


WHAT NEEDS YOUR OWN ACCOUNT (won't error, just does nothing until set up)
=============================================================================

ADSENSE (display ads) — src/components/AdSlot.jsx
  1. Apply at ads.google.com (approval takes days-to-weeks for new sites)
  2. Add to .env:  VITE_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
  3. Add the AdSense <script> tag to index.html <head> (they give you the
     exact snippet once approved)
  4. Create ad units in AdSense dashboard, each gives a slot ID
  5. Drop <AdSlot slotId="1234567890" /> anywhere you want an ad to appear
     (e.g. every few items in Home.jsx's news list)
  6. Add public/ads.txt with the exact content AdSense gives you — ads
     won't serve without this even if everything else is right

RAZORPAY (premium subscriptions) — functions/index.js already has the code
  1. Create account at razorpay.com, get Key ID + Key Secret (Settings →
     API Keys). Start in Test Mode.
  2. cd functions && npm install   (package.json already lists razorpay)
  3. Set secrets:
       firebase functions:secrets:set RAZORPAY_KEY_ID
       firebase functions:secrets:set RAZORPAY_KEY_SECRET
  4. Add to .env:  VITE_RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXX
  5. Premium page is already routed at /premium — add a button to it
     wherever you like, e.g. in Profile.jsx or journalist Dashboard.jsx:
       <button onClick={() => navigate('/premium')}>⭐ Go Premium</button>


DEPLOY
========
  cd D:\newsflow
  # copy every file from this zip into the matching path, overwriting

  cd functions
  npm install
  cd ..

  git add .
  git commit -m "Analytics, duplicate detection, full-corpus search, classifieds, AdSense/Razorpay scaffolding, timestamp fix"
  git push

  firebase deploy --only functions
  npm run build
  firebase deploy --only hosting,firestore:rules


VERIFY AFTER DEPLOY
======================
1. Header now shows a 🗂️ classifieds icon next to search
2. Post a test classified → check Admin → 🗂️ Pending Classifieds → approve it
   → confirm it shows up when browsing Classifieds
3. Submit a journalist report similar to an existing one → check the
   preview screen shows a duplicate warning, and Admin Approvals shows it too
4. Search for something → confirms results come back (Cloud Function working)
5. Admin → 🐛 Error Logs loads (will be empty until something actually errors)
6. Open a report in Reels view → headline and తె/EN sit on one line now
