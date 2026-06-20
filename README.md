# NewsFlow

Citizen-journalist + AI newsroom PWA for Andhra Pradesh & Telangana. Telugu + English.
React + Vite + Firebase (Auth, Firestore, Storage, Hosting) + GroqCloud for AI.

## What's in this build (Phase 1 MVP)

- Splash → Login/Register → Home, matching the screen list in the spec
- Email/password auth (no Phone OTP — that needs Blaze, same blocker as CricketStars)
- Reader: district feed, category chips, search, news detail, bookmarks, share
- Journalist: submit news (text and/or voice note + photos) → AI draft (headline,
  50-word summary, full article) → edit → translate → submit for approval
- Admin: dashboard counts, pending-approval queue (approve/reject/edit), verify journalists,
  dedicated `/admin-login` console
- RSS / free news feed ingestion via GitHub Actions (no Blaze plan needed) — feeds the
  same approval queue as journalist submissions
- Firestore live listeners for the feed and "My News" — no manual refresh needed
- Installable PWA (manifest + service worker, offline app-shell caching)
- App icon/splash built from your NewsFlow logo (`public/icons`)

## 1. Firebase project setup

1. Create a project at https://console.firebase.google.com (Spark/free plan is enough).
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Enable **Firestore Database** (start in production mode — rules are provided).
4. Enable **Storage**.
5. Project settings → General → Your apps → Add app → Web. Copy the config object's
   values into a new `.env` file in this folder (copy `.env.example` to `.env` first —
   `.env` is gitignored, so these never get committed or pushed):
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
6. Install the Firebase CLI if you don't have it: `npm install -g firebase-tools`
7. `firebase login`, then `firebase use --add` inside this folder and pick your project.
8. Deploy rules: `firebase deploy --only firestore:rules,storage`

### Creating your first admin
Registration only offers Reader/Journalist — there's no public admin signup, by design.
1. Register a normal account (any role) with the email you want to use as admin.
2. In the Firestore console, open `users/<that-uid>` and change `role` to `admin`.
3. Go to `/admin-login` in the app (there's a small "Admin login →" link at the bottom
   of the regular Login screen) and sign in with that email/password.

Once signed in as admin, the bottom nav switches to an Admin tab automatically.

## 2. GroqCloud setup (free AI)

1. Get a free key at https://console.groq.com/keys
2. Add it to your `.env` file: `VITE_GROQ_API_KEY=your_key_here`

**Trade-off to know about:** this MVP calls Groq directly from the browser, so the key
ships inside your JS bundle (anyone can view it in devtools). That's fine while you're
testing with a low-value, rate-limited key — it's the same kind of shortcut as the
CricketStars Quick-Login workaround. Before a public launch, move the `fetch` calls in
`groq.js` behind a small backend (a Firebase Cloud Function, which needs the Blaze plan
since it makes outbound network calls) so the key stays server-side.

Voice notes are transcribed using Groq's hosted `whisper-large-v3` model (no self-hosted
Whisper needed — simpler than the `whisper.cpp` route in the original plan, same result).

## 5. RSS / free news feed ingestion (no Blaze plan needed)

Browsers can't fetch most RSS feeds directly (CORS), and Firebase Cloud Functions
need the Blaze plan just to make outbound network calls — so this uses a free
GitHub Actions cron job instead, running `scripts/rss-ingest.mjs` every 2 hours.

What it does: fetches each feed in `scripts/feeds.config.mjs` → rewrites the item
with Groq into NewsFlow's bilingual format → guesses category + district → writes
it into the same `drafts` collection journalists submit to. **Nothing is
auto-published** — RSS items land in Admin → Pending Approval exactly like a
journalist's report, tagged "RSS · <source name>", so you review before they go live.

### Setup
1. **Get a Firebase service account key**: Firebase console → Project settings →
   Service accounts → Generate new private key. Downloads a JSON file — keep it secret.
2. **Push this project to a GitHub repo** (private is fine — the workflow runs free
   either way, just with a monthly minutes cap on private repos).
3. In the repo, go to Settings → Secrets and variables → Actions, and add:
   - `FIREBASE_SERVICE_ACCOUNT` — paste the entire contents of the JSON key file
   - `GROQ_API_KEY` — your Groq key
   - `NEWSDATA_API_KEY` — optional, only if you enable the NewsData.io fallback
4. The workflow (`.github/workflows/rss-ingest.yml`) runs automatically every 2 hours,
   or trigger it manually from the repo's Actions tab → "NewsFlow RSS Ingest" → Run workflow.

### Adding more feeds
Only one feed is pre-verified in `scripts/feeds.config.mjs` (Andhra Jyothy). RSS paths
for Eenadu/Sakshi/etc. change without notice, so rather than guess, browse
https://rss.feedspot.com/telugu_news_rss_feeds/ , confirm a feed URL actually loads
XML in your browser, then add it to the `RSS_FEEDS` array. For sources without RSS,
flip `NEWSDATA_QUERY.enabled` to `true` and add a free https://newsdata.io key —
it covers Indian/Telugu news without needing a feed URL at all.

### Test it locally before relying on the schedule
```
GROQ_API_KEY=your_key FIREBASE_SERVICE_ACCOUNT='paste the full JSON here' npm run ingest
```

## 6. Run locally

```
npm install
npm run dev
```

Open http://localhost:5173 — Chrome DevTools → Toggle device toolbar for the mobile view.

## 7. Deploy

```
npm run build
firebase deploy --only hosting
```

(`npm run deploy` does both in one step, once `firebase use` is configured.)

## Firestore collections

```
users        { name, email, phone, role, language, district, verified, bookmarks[] }
news         { headline, headlineEn, summary, summaryEn, content, contentEn,
               category, district, images[], audioUrl, authorId, authorName,
               status, views, createdAt }
drafts       { same fields as news, pre-approval, status: pending|approved|rejected,
               rejectionReason }
```
`status` on `news` is always `"approved"` — drafts are copied into `news` on approval,
matching the "drafts → admin approval → published" flow from the spec.

## Known gaps / next steps (Phase 2 candidates)

- **Search** is a client-side filter over the last 200 articles — fine for an MVP, but
  swap in Algolia or Typesense once the catalog grows; Firestore has no native full-text search.
- **AI fact-check & duplicate detection for journalist submissions**: `checkDuplicate()`
  is implemented in `groq.js` but not yet wired into the submit flow — call it before
  `createDraft()` once you want it live. (RSS ingestion already dedups by source URL.)
- **Push notifications (FCM)**: not wired up yet — the Notifications screen is a static
  placeholder. Needs a service worker messaging handler plus a Cloud Function (Blaze)
  to send on publish.
- **AI News Anchor** (audio bulletins): Phase 2 per the spec, not started.
