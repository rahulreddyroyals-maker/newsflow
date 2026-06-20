// scripts/feeds.config.mjs
// -----------------------------------------------------------------------------
// List the RSS feeds you want NewsFlow to ingest. Each entry needs a real,
// working feed URL — verify it loads XML in a browser before adding it here.
//
// Confirmed working as of mid-2026:
//   Andhra Jyothy — https://www.andhrajyothy.com/rss/feed.xml
//
// Not included below because the exact feed paths need verifying with the
// publisher first (sites change these without notice): Eenadu, Sakshi,
// Namasthe Telangana, TV5 News. Browse https://rss.feedspot.com/telugu_news_rss_feeds/
// for current links, confirm each one loads, then add it to this list.
//
// Government sources worth adding once you confirm the URL:
//   PIB (Press Information Bureau) regional release feeds — https://pib.gov.in/
//   AP/Telangana state government press release pages (most don't offer RSS —
//   for those, NewsData.io's API below is the more reliable free option).
// -----------------------------------------------------------------------------

export const RSS_FEEDS = [
  {
    source: 'Andhra Jyothy',
    url: 'https://www.andhrajyothy.com/rss/feed.xml',
    language: 'te',
    defaultDistrict: null, // null = let AI/category guess, or hardcode if a feed is district-specific
    defaultCategory: null
  }
  // Add more feeds here, same shape:
  // { source: 'Your Source Name', url: 'https://.../feed.xml', language: 'te', defaultDistrict: null, defaultCategory: null }
]

// Optional: NewsData.io free tier (https://newsdata.io) — sign up for a free API key,
// set NEWSDATA_API_KEY as a GitHub Actions secret, and this query pulls India/Telugu news.
export const NEWSDATA_QUERY = {
  enabled: true, // safe to leave on — it's a no-op until you add a NEWSDATA_API_KEY secret
  baseUrl: 'https://newsdata.io/api/1/news',
  params: { country: 'in', language: 'te', category: 'top' }
}
