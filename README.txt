NewsFlow — Fix Round: layout, multi-admin, recency audit
==========================================================

FILES IN THIS ZIP
------------------
src/components/ReelsFeed.jsx      → REPLACE existing file entirely
src/admin/ManageAdmins.jsx        → NEW file, add to your project
functions/index.js                 → ADD the createAdminAccount function to
                                      your EXISTING functions/index.js —
                                      do not overwrite your push-notification
                                      functions, just append this one
src/services/approveDraftPatch.js  → NOT a real file — open it and copy the
                                      approveDraft function into your existing
                                      src/services/newsService.js, replacing
                                      your current approveDraft function
PATCH_APP_AND_DASHBOARD.txt        → manual edits needed in App.jsx and
                                      admin/Dashboard.jsx


WHAT WAS FIXED
--------------
1. LAYOUT: headline and తె/EN toggle now sit on the same row in the Reels
   article view, instead of the toggle floating alone above the headline
   with a large gap.

2. MULTI-ADMIN: new "Manage Admins" screen lets you:
     - Promote an existing reader/journalist account to admin
     - Create a brand-new admin login from scratch (email + password) via
       a Cloud Function — this does NOT log you out of your own session,
       which is what would happen with a plain client-side account creation
     - Remove admin access from anyone except yourself
   Multiple admins can then split up the Pending Approval queue for
   proofreading — any admin can approve/edit/reject any pending report,
   there's no formal "assignment" system, just divide the work by agreement.

3. RECENCY AUDIT: confirmed Trending, All, and the headline banner all read
   from the exact same sorted array — no divergent code path. Found and
   fixed one real issue: approved reports were timestamped at APPROVAL time,
   not the journalist's original SUBMISSION time. Fixed so ranking reflects
   true recency even if a report sits in the pending queue a while before
   an admin reviews it.


DEPLOY STEPS
------------
1. Copy ReelsFeed.jsx and ManageAdmins.jsx into your project (see paths above)
2. Edit src/services/newsService.js — replace approveDraft with the version
   in approveDraftPatch.js
3. Edit functions/index.js — add the createAdminAccount export (see that
   file's comments for exactly what to add and where)
4. Edit src/App.jsx and src/admin/Dashboard.jsx per PATCH_APP_AND_DASHBOARD.txt

Then:

  cd D:\newsflow
  git add .
  git commit -m "Fix headline/toggle layout, add multi-admin management, preserve original submission timestamp through approval"
  git push

  cd functions
  npm install
  cd ..
  firebase deploy --only functions
  npm run build
  firebase deploy --only hosting

(No firestore.rules changes this round — your existing rules already let
isAdmin() update any user's role field, which is all "promote/demote" needs.)


VERIFY
------
- Open a report in Reels view — headline and తె/EN should be on one line
- Admin Dashboard → 👥 Manage Admins → try creating a test admin account,
  confirm you're still logged into YOUR account afterward (not the new one)
- Submit a journalist report, wait a bit, then approve it — confirm its
  "time ago" reflects when it was submitted, not when you approved it
