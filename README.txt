NewsFlow v33 — Inline admin controls in the feed + full audit log
=====================================================================

Every file below is COMPLETE and overwrite-ready. No patches to decode.


FILES IN THIS ZIP (9 total)
------------------------------
firestore.rules                        — auditLogs collection added
src/services/newsService.js            — logAuditEvent() + listAuditLogs()
src/components/AdminQuickEditModal.jsx — NEW: inline edit sheet
src/components/NewsCard.jsx            — admin ⋮ menu on every card
src/admin/AuditLogs.jsx                — NEW: the audit trail viewer
src/admin/Approvals.jsx                — logs approve/reject
src/admin/ManageNews.jsx               — logs edit/hide/republish/delete
src/App.jsx                            — added /admin/audit-logs route
src/admin/Dashboard.jsx                — added "📋 Audit Log" button


1. INLINE ADMIN CONTROLS — RIGHT IN THE FEED
-------------------------------------------------
Every news card (Home feed, Search results, Bookmarks, journalist public
profiles — anywhere BigNewsCard/CompactNewsCard is used) now shows a small
"⋮" button in the corner, visible ONLY to logged-in admins. Tapping it opens:

  ✎ Edit       — opens a bottom-sheet with headline/summary/content/
                  category/district editable right there, no navigation away
  🚫 Hide       — instantly removes it from the reader feed (toggle to
                  ↻ Republish once hidden)
  🗑 Delete     — confirms, then permanently removes it

This means admin can just scroll their normal Home feed like anyone else,
and the moment something needs fixing, fix it on the spot — no detour
through a separate Manage News screen (though that screen still exists too,
for bulk review).

A small "HIDDEN" badge appears on any card an admin has hidden, so it's
visually obvious if you're looking at something readers can't currently see.


2. AUDIT LOG — WHO DID WHAT
--------------------------------
New collection `auditLogs` records six action types:
  approve · reject · edit · hide · republish · delete

Every entry captures: what action, which article (by headline, in case the
article is later deleted), who did it, when, and a short details note
(e.g. rejection reason, or "from feed quick actions" vs "from Manage News").

Logged from every relevant action site:
  - Approvals.jsx     → approve, reject
  - ManageNews.jsx     → edit, hide, republish, delete
  - NewsCard's inline quick actions → edit, hide, republish, delete
  - AdminQuickEditModal → edit

View it at Admin → 📋 Audit Log — filterable by action type, newest first.

IMPORTANT: audit log entries are write-once. The Firestore rules make them
uneditable and undeletable by anyone, including admins — so the trail can't
be quietly altered after the fact. If you ever need to purge old entries,
that has to be done manually via the Firebase console, by design.


DEPLOY
========
  cd D:\newsflow
  # copy all 9 files from this zip, overwriting existing

  git add .
  git commit -m "Add inline admin edit/hide/delete on every feed card, full audit log of approve/edit/hide/delete actions"
  git push

  firebase deploy --only firestore:rules
  npm run build
  firebase deploy --only hosting

(No new Cloud Functions or indexes this round — the audit log query just
orders by createdAt on its own collection, no composite index needed since
there's no additional where() filter alongside it.)


VERIFY
========
1. Log in as admin, open Home — you should see a small "⋮" in the corner
   of every card now
2. Tap it on any card → Edit → change the headline → Save → confirm the
   card updates immediately in the feed without a page reload
3. Tap ⋮ → Hide on a different card → confirm it shows a "HIDDEN" badge
   and log out (or open in an incognito window) to confirm readers no
   longer see it
4. Admin → 📋 Audit Log → confirm both actions above appear, correctly
   labeled, with your name and a timestamp
5. Approve a pending journalist report → check Audit Log again → confirm
   an "Approved" entry appears automatically
