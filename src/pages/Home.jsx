// src/pages/Home.jsx
import { useEffect, useState } from 'react'
import Header from '../components/Header'
import CategoryTabs from '../components/CategoryTabs'
import DistrictSelector from '../components/DistrictSelector'
import { BigNewsCard, CompactNewsCard } from '../components/NewsCard'
import ReelsFeed from '../components/ReelsFeed'
import { listenToFeed, updateUserProfile } from '../services/newsService'
import { districtMatchesFilter } from '../utils/districts'
import { useAuth } from '../contexts/AuthContext'

const DISTRICT_KEY = 'nf_selected_district'

// Once a user explicitly picks "All", that choice should survive navigating
// away and back (e.g. opening a story and hitting back). Previously this was
// re-derived from profile.district on every mount, which silently overrode
// "All" back to the user's home district the moment they returned to Home.
// Storing the explicit choice in localStorage and reading it ONCE on first
// load (falling back to the profile's district only if nothing was chosen
// yet) fixes that without needing a global context just for this.
function getInitialDistrict(profile) {
  const stored = localStorage.getItem(DISTRICT_KEY)
  if (stored) return stored
  return profile?.district || 'All'
}

// When viewing "All", local news still matters most to a reader — this
// keeps the full set but moves the home-district stories to the top while
// preserving recency order within each group, rather than hiding anything.
function withLocalFirst(items, homeDistrict) {
  if (!homeDistrict) return items
  const local = items.filter((n) => n.district === homeDistrict)
  const rest = items.filter((n) => n.district !== homeDistrict)
  return [...local, ...rest]
}

export default function Home() {
  const { profile, user, refreshProfile } = useAuth()
  const [district, setDistrict] = useState(() => getInitialDistrict(profile))
  const [category, setCategory] = useState('All')
  const [news, setNews] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [feedError, setFeedError] = useState('')
  const [reelsIndex, setReelsIndex] = useState(null) // null = closed; number = open at that story

  // Only adopt the profile's district as a default the FIRST time we ever
  // learn it (e.g. right after login, before any manual selection exists).
  useEffect(() => {
    if (profile?.district && !localStorage.getItem(DISTRICT_KEY)) {
      setDistrict(profile.district)
    }
  }, [profile])

  useEffect(() => {
    setNews(null)
    setFeedError('')
    const unsub = listenToFeed({ category }, setNews, (err) => setFeedError(err.message || 'Could not load news.'))
    return unsub
  }, [category])

  async function handleDistrictSelect(d) {
    setDistrict(d)
    localStorage.setItem(DISTRICT_KEY, d)
    setPickerOpen(false)
    if (user && d !== 'All') {
      await updateUserProfile(user.uid, { district: d })
      refreshProfile()
    }
  }

  const filteredByDistrict = news ? news.filter((n) => districtMatchesFilter(n.district, district)) : null
  const displayedNews = filteredByDistrict && district === 'All' ? withLocalFirst(filteredByDistrict, profile?.district) : filteredByDistrict

  // Tapping ANY story opens the swipeable reels view at that story — this is
  // now the default reading experience, not a hidden alternate mode. Scroll
  // up/down to move between stories without leaving the swipe flow.
  function openReelsAt(tappedNews) {
    const index = displayedNews.findIndex((n) => n.id === tappedNews.id)
    setReelsIndex(index >= 0 ? index : 0)
  }

  return (
    <div className="nf-screen">
      <Header district={district} onDistrictTap={() => setPickerOpen(true)} onReelsTap={() => setReelsIndex(0)} />
      <div className="nf-scroll-body">
        <CategoryTabs active={category} onChange={setCategory} />

        {news === null && !feedError && <FeedSkeleton />}

        {feedError && (
          <div className="nf-empty" style={{ color: 'var(--nf-danger)' }}>
            <p style={{ fontWeight: 700 }}>Couldn't load news</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>{feedError}</p>
          </div>
        )}

        {news !== null && displayedNews?.length === 0 && (
          <div className="nf-empty">
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--nf-navy)', marginBottom: 6 }}>No news here yet</p>
            <p style={{ fontSize: 13.5 }}>Try a different district or category, or check back soon.</p>
          </div>
        )}

        {displayedNews && displayedNews.length > 0 && (
          <div className="nf-container" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <BigNewsCard news={displayedNews[0]} onOpen={openReelsAt} />
            {displayedNews.slice(1).map((n) => <CompactNewsCard key={n.id} news={n} onOpen={openReelsAt} />)}
          </div>
        )}
      </div>

      <DistrictSelector open={pickerOpen} current={district} onSelect={handleDistrictSelect} onClose={() => setPickerOpen(false)} />

      {reelsIndex !== null && displayedNews?.length > 0 && (
        <ReelsFeed news={displayedNews} startIndex={reelsIndex} onClose={() => setReelsIndex(null)} />
      )}
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="nf-container" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="nf-skeleton" style={{ height: 230, borderRadius: 'var(--nf-radius-md)' }} />
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ display: 'flex', gap: 12 }}>
          <div className="nf-skeleton" style={{ width: 92, height: 92 }} />
          <div style={{ flex: 1 }}>
            <div className="nf-skeleton" style={{ height: 12, width: '40%', marginBottom: 8 }} />
            <div className="nf-skeleton" style={{ height: 14, width: '90%', marginBottom: 6 }} />
            <div className="nf-skeleton" style={{ height: 14, width: '70%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
