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

function getInitialDistrict(profile) {
  const stored = localStorage.getItem(DISTRICT_KEY)
  if (stored) return stored
  return profile?.district || 'All'
}

// When "All" is selected: show everything, local stories first.
// When a specific district is selected: local stories first, then ALL
// other stories after — readers always see everything, locality just
// determines the ordering, not what gets hidden.
function applyDistrictOrder(items, district, homeDistrict) {
  if (district === 'All') {
    if (!homeDistrict) return items
    const local = items.filter((n) => n.district === homeDistrict)
    const rest  = items.filter((n) => n.district !== homeDistrict)
    return [...local, ...rest]
  }
  // Specific district: matching items (including statewide parent) first
  const local = items.filter((n) => districtMatchesFilter(n.district, district))
  const rest  = items.filter((n) => !districtMatchesFilter(n.district, district))
  return [...local, ...rest]
}

export default function Home() {
  const { profile, user, refreshProfile } = useAuth()
  const [district, setDistrict] = useState(() => getInitialDistrict(profile))
  const [category, setCategory] = useState('All')
  const [allNews, setAllNews] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [feedError, setFeedError] = useState('')
  const [reelsIndex, setReelsIndex] = useState(null)

  useEffect(() => {
    if (profile?.district && !localStorage.getItem(DISTRICT_KEY)) {
      setDistrict(profile.district)
    }
  }, [profile])

  // Only category is filtered server-side (avoids the Firestore composite-
  // index / 30-item `in` limit issues). District is sorted client-side so
  // ALL news is always fetched and nothing is ever hidden from readers.
  useEffect(() => {
    setAllNews(null)
    setFeedError('')
    const unsub = listenToFeed(
      { category },
      setAllNews,
      (err) => setFeedError(err.message || 'Could not load news.')
    )
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

  const displayedNews = allNews
    ? applyDistrictOrder(allNews, district, profile?.district)
    : null

  function openReelsAt(tappedNews) {
    const index = (displayedNews || []).findIndex((n) => n.id === tappedNews.id)
    setReelsIndex(index >= 0 ? index : 0)
  }

  return (
    <div className="nf-screen">
      <Header district={district} onDistrictTap={() => setPickerOpen(true)} onReelsTap={() => setReelsIndex(0)} />
      <div className="nf-scroll-body">
        <CategoryTabs active={category} onChange={setCategory} />

        {allNews === null && !feedError && <FeedSkeleton />}

        {feedError && (
          <div className="nf-empty" style={{ color: 'var(--nf-danger)' }}>
            <p style={{ fontWeight: 700 }}>Couldn't load news</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>{feedError}</p>
          </div>
        )}

        {allNews !== null && displayedNews?.length === 0 && (
          <div className="nf-empty">
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--nf-navy)', marginBottom: 6 }}>No news here yet</p>
            <p style={{ fontSize: 13.5 }}>Try a different category, or check back soon.</p>
          </div>
        )}

        {displayedNews && displayedNews.length > 0 && (
          <div className="nf-container" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <BigNewsCard news={displayedNews[0]} onOpen={openReelsAt} />
            {displayedNews.slice(1).map((n) => <CompactNewsCard key={n.id} news={n} onOpen={openReelsAt} />)}
          </div>
        )}
      </div>

      <DistrictSelector
        open={pickerOpen}
        current={district}
        onSelect={handleDistrictSelect}
        onClose={() => setPickerOpen(false)}
      />

      {reelsIndex !== null && displayedNews?.length > 0 && (
        <ReelsFeed
          news={displayedNews}
          startIndex={reelsIndex}
          onClose={() => setReelsIndex(null)}
        />
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
