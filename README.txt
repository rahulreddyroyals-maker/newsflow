NewsFlow v32 — Per-journalist Groq API keys
===============================================

WHAT THIS ACTUALLY GIVES YOU
--------------------------------
Not "each journalist has their own Groq account" (unrealistic for citizen
journalists) — instead: YOU generate multiple keys under your own Groq
account (console.groq.com/keys lets you create as many as you like), then
assign one to a specific journalist if you want to:
  - Track their AI usage separately in Groq's dashboard
  - Revoke/replace just their access without affecting anyone else
  - Isolate one journalist hitting a rate limit from blocking others

Any journalist WITHOUT an assigned key automatically uses the shared
VITE_GROQ_API_KEY, exactly as before — this is fully optional, per journalist.

SECURITY NOTE (same trade-off as the shared key, just now per-person):
AI calls happen directly from the browser, so whichever key is used is
visible in that browser's network requests/devtools. A shared key is
visible to everyone; a personal key is visible to that one journalist
specifically. Fine for usage tracking and isolating misuse between
journalists — not a hard security boundary against that journalist seeing
their own key.


FILES IN THIS ZIP (all complete, overwrite existing paths)
------------------------------------------------------------
src/services/groq.js               — every function now takes an optional
                                       trailing apiKeyOverride argument
src/services/duplicateCheck.js     — passes the override through
src/journalist/SubmitNews.jsx      — uses profile.groqApiKey when set
src/journalist/AIDraftPreview.jsx  — same, for translate + duplicate check
src/admin/ManageJournalists.jsx    — NEW: input field to assign/remove a
                                       journalist's personal key

No firestore.rules changes needed — groqApiKey was never added to the
self-editable field list, so it's already admin-only by default.


HOW TO USE IT
----------------
1. Generate a new key at console.groq.com/keys (do this once per
   journalist you want to isolate — takes a few seconds each)
2. Admin → Manage Journalists → tap a journalist to expand → scroll to
   "Personal Groq API key" → paste it in → Save key
3. That journalist's AI draft generation, voice transcription, translation,
   and duplicate-check calls now use their assigned key automatically —
   nothing changes on their end, no UI for them to configure
4. To go back to the shared key for that journalist: tap "Remove — use
   shared key"

Admin-side actions (Upload News Directly, Advertisements) always use the
shared key regardless — this feature is specifically for journalist
submissions.


DEPLOY
========
  cd D:\newsflow
  # copy all 5 files from this zip, overwriting existing

  git add .
  git commit -m "Add optional per-journalist Groq API keys for usage tracking/isolation"
  git push

  npm run build
  firebase deploy --only hosting

(No Cloud Functions or Firestore rules changes this round — pure frontend.)


VERIFY
========
1. Admin → Manage Journalists → expand a journalist → confirm the new
   "Personal Groq API key" field appears
2. Assign a test key, save, confirm the "Own key" badge appears next to
   their name in the collapsed list view
3. Log in as that journalist → Submit News → Generate AI Draft → confirm
   it works normally (uses their key behind the scenes, no visible
   difference in the UI)
4. Check console.groq.com's usage dashboard for that specific key — should
   show requests only from that journalist's activity
