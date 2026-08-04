NewsFlow v30 — Every article reachable in Trending and All (pagination)
==========================================================================

THE ACTUAL BUG
-----------------
Category and district filtering were already correct — Trending includes
every category, "All districts" never hides anything, both confirmed in
earlier rounds. The real gap: the feed query had a hard cap of 200 articles.
Once your total published archive passed 200, older approved articles
simply stopped being fetched at all — not filtered out, never even
requested from Firestore. That's why "every article" wasn't holding up:
it wasn't a filtering bug, it was a ceiling.

THE FIX
---------
Proper pagination instead of a bigger hard cap (which would just hit the
same wall again later at a higher number):
  - Feed now loads 100 articles at a time, live-synced for real-time updates
  - A "Load older news" button appears at the bottom once there's more —
    tapping it fetches the next 100, and so on, all the way through your
    entire archive
  - When you truly reach the end, it says "You've reached the end — N
    articles total" so you know pagination is complete, not broken


FILES IN THIS ZIP (all complete, overwrite existing paths)
--------------------------------------------------------------
src/services/newsService.js   — paginated listenToFeed + new loadMoreNews()
src/pages/Home.jsx             — "Load older news" button + pagination state
firestore.indexes.json         — NEW, required for the ordered queries below
firebase.json                  — updated to reference the new indexes file


WHY A NEW INDEXES FILE IS NEEDED
------------------------------------
Ordering by date (createdAt) while also filtering by status/category
requires Firestore composite indexes — this is the same category-index
limitation noted in earlier rounds, which is exactly why it was avoided
originally (client-side sorting instead). Real pagination genuinely needs
server-side ordering though, so this round adds the two specific indexes
required: (status, createdAt) and (status, category, createdAt).


DEPLOY — note the extra step this time
==========================================
  cd D:\newsflow
  # copy all 4 files from this zip into your project, overwriting existing

  git add .
  git commit -m "Add pagination so every article is reachable in Trending and All, not capped at 200"
  git push

  firebase deploy --only firestore:indexes
  # ^ this is a NEW step — building composite indexes can take a few
  #   minutes on Firebase's side after this command returns; the app will
  #   show a "failed-precondition" error in the console if you skip this
  #   and try to use the feed before the index finishes building

  npm run build
  firebase deploy --only hosting


VERIFY
--------
1. Open Home — feed loads as before, nothing should look different
   initially (first 100 articles show exactly like before)
2. Scroll to the bottom — if you have more than 100 approved articles,
   you'll now see a "Load older news" button. Tap it, confirm older
   articles append below.
3. Keep tapping until you see "You've reached the end — N articles total"
   — N should match (or be very close to) your actual total published
   article count in the admin dashboard's "Total News" tile.
4. Repeat with a specific category tab (not just Trending) to confirm
   pagination works per-category too.
