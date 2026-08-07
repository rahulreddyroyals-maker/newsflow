NewsFlow v31 — Auto-pagination, district-aware push notifications
=====================================================================

FILES IN THIS ZIP (both complete, overwrite existing paths)
------------------------------------------------------------
src/pages/Home.jsx      — infinite scroll instead of manual "Load more" button
functions/index.js      — fixed statewide district matching for push notifications


1. TRENDING SHOWS EVERY ARTICLE, AUTOMATICALLY
-------------------------------------------------
Last round added pagination via a manual "Load older news" button. This
round switches that to auto-loading: an invisible sentinel element near
the bottom of the list triggers the next page automatically as the reader
scrolls close to it (IntersectionObserver, starts loading ~400px before
it's actually visible so it feels seamless, no visible pop-in).

Nothing else about the pagination logic changed — same server-side
ordering by createdAt, same "You've reached the end — N articles total"
message when truly done.


2. PUSH NOTIFICATIONS NOW MATCH DISTRICT SCOPE CORRECTLY
-------------------------------------------------------------
THE BUG: notifications matched a user's district against the target
district using an EXACT STRING match. An ad or story targeting "Andhra
Pradesh (statewide)" only reached users whose profile literally said that
exact string — missing everyone whose district was set to a specific place
like "Guntur" or "Vijayawada," even though they're clearly within Andhra
Pradesh. Same category of bug that was fixed in Home.jsx's sort logic a
while back, just never applied here too.

THE FIX: getTokensForDistrict now fetches all users with a push token and
matches each one against the target using the same statewide-aware logic
Home.jsx already uses — a story/ad targeting "Andhra Pradesh (statewide)"
now correctly reaches every user whose own district falls anywhere within
AP's 28 districts, not just literal string matches.

Also switched from a Firestore where() equality query to fetch-then-filter
in JavaScript — this sidesteps Firestore's 30-value cap on 'in' queries,
which would've been hit anyway once trying to match against Telangana's
33 districts.


3. MULTIPLE ADS PER DAY — ALREADY WORKS, NO CHANGE NEEDED
---------------------------------------------------------------
Checked createAdvertisement: every "+ New Ad" is a brand new Firestore
document, no dedup check, no daily cap. Each new ad triggers its own
separate onAdPublished push round. This already does exactly what you
asked — confirmed and documented in a comment so it doesn't get
accidentally restricted later.


DEPLOY
========
  cd D:\newsflow
  # copy both files, overwriting existing:
  #   src/pages/Home.jsx
  #   functions/index.js

  git add .
  git commit -m "Auto-infinite-scroll pagination, fix statewide district matching for push notifications"
  git push

  firebase deploy --only functions
  npm run build
  firebase deploy --only hosting


VERIFY
========
1. Scroll down Home past the first ~15-20 items — older articles should
   keep appearing automatically, no button to tap
2. Post a test ad targeting "Andhra Pradesh (statewide)" — confirm a
   push notification reaches a test account whose district is set to a
   SPECIFIC AP district (e.g. "Guntur"), not just accounts set to the
   literal "Andhra Pradesh (statewide)" string
3. Post two separate ads back-to-back same day — confirm both trigger
   their own notification (check Firebase console → Functions → Logs
   for onAdPublished firing twice)
