// src/pages/Home.jsx
// FEED BEHAVIOUR (guaranteed):
//   "All"      → every news item, newest first
//   "District" → that district's news first, then every other item after
//   EITHER WAY → reader sees 100% of all published news, nothing hidden

import { useEffect, useState } from 'react'
import Header from '../components/Header'
import CategoryTabs from '../components/CategoryTabs'
import DistrictSelector from '../components/DistrictSelector'
import { BigNewsCard, CompactNewsCard } from '../components/NewsCard'
import ReelsFeed from '../components/ReelsFeed'
import { listenToFeed, updateUserProfile } from '../services/newsService'
import { useAuth } from '../contexts/AuthContext'

const DISTRICT_KEY = 'nf_selected_district'

function getInitialDistrict(profile) {
  const stored = localStorage.getItem(DISTRICT_KEY)
  if (stored) return stored
  return 'All'
}

// Sorts items so the selected district appears first.
// ALL items are always included — selecting a district never removes anything.
//
// Rules:
//   district === 'All'  →  local home district first (if known), then rest
//   district === 'X'    →  X's news first, then ALL remaining news
//
// "Matching" for statewide scopes (e.g. "Andhra Pradesh (statewide)"):
//   matches all AP district items too, so they also bubble up.
function sortByDistrict(items, selectedDistrict, homeDistrict) {
  if (!items.length) return items

  const isMatch = (newsDistrict) => {
    if (!selectedDistrict || selectedDistrict === 'All') {
      // For "All", only bubble the user's home district
      return homeDistrict && newsDistrict === homeDistrict
    }
    if (newsDistrict === selectedDistrict) return true
    // Statewide scope matches all districts in that state
    if (selectedDistrict === 'Andhra Pradesh (statewide)') {
      return AP_DISTRICTS.includes(newsDistrict)
    }
    if (selectedDistrict === 'Telangana (statewide)') {
      return TS_DISTRICTS.includes(newsDistrict)
    }
    return false
  }

  const local = items.filter((n) => isMatch(n.district))
  const rest  = items.filter((n) => !isMatch(n.district))
  return [...local, ...rest]
}

// District lists for statewide scope matching (inline, avoids a separate import)
const AP_DISTRICTS = [
  'Srikakulam','Parvathipuram Manyam','Vizianagaram','Visakhapatnam','Anakapalli',
  'Alluri Sitharama Raju','Kakinada','East Godavari','Dr. B.R. Ambedkar Konaseema',
  'West Godavari','Eluru','Krishna','NTR','Guntur','Palnadu','Bapatla',
  'Prakasam','Markapuram','Nellore','Kurnool','Nandyal','Anantapur',
  'Sri Sathya Sai','YSR Kadapa','Annamayya','Chittoor','Tirupati','Polavaram'
]
const TS_DISTRICTS = [
  'Hyderabad','Medchal-Malkajgiri','Rangareddy','Vikarabad','Sangareddy',
  'Siddipet','Medak','Kamareddy','Nizamabad','Jagtial','Rajanna Sircilla',
  'Karimnagar','Peddapalli','Mancherial','Adilabad','Nirmal',
  'Komaram Bheem Asifabad','Jayashankar Bhupalpally','Warangal','Hanumakonda',
  'Jangaon','Mahabubabad','Bhadradri Kothagudem','Khammam','Mulugu',
  'Suryapet','Nalgonda','Yadadri Bhuvanagiri','Mahabubnagar','Nagarkurnool',
  'Wanaparthy','Jogulamba Gadwal','Narayanpet'
]

export default function Home() {
  const { profile, user, refreshProfile } = useAuth()
  const [district, setDistrict] = useState(() => getInitialDistrict(profile))
  const [category, setCategory] = useState('All')
  const [allNews, setAllNews] = useState(null)   // ALL news from Firestore, no district filter
  const [pickerOpen, setPickerOpen] = useState(false)
  const [feedError, setFeedError] = useState('')
  const [reelsIndex, setReelsIndex] = useState(null)

  // Sync district default from profile (only first time, before any manual selection)
  useEffect(() => {
    if (profile?.district && !localStorage.getItem(DISTRICT_KEY)) {
      setDistrict(profile.district)
    }
  }, [profile])

  // Subscribe to ALL approved news — no district filter at the Firestore level.
  // Category is the only server-side filter (simple, no composite index needed).
  useEffect(() => {
    setAllNews(null)
    setFeedError('')
    const unsub = listenToFeed(
      { category },
      (news) => setAllNews(news),
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

  // Apply district sort — ALL items included, local just floats to top
  const displayedNews = allNews
    ? sortByDistrict(allNews, district, profile?.district)
    : null

  function openReelsAt(tappedNews) {
    const index = (displayedNews || []).findIndex((n) => n.id === tappedNews.id)
    setReelsIndex(index >= 0 ? index : 0)
  }

  return (
    <div className="nf-screen">
      <Header
        district={district}
        onDistrictTap={() => setPickerOpen(true)}
        onReelsTap={() => setReelsIndex(0)}
      />
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
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--nf-navy)', marginBottom: 6 }}>
              No news yet
            </p>
            <p style={{ fontSize: 13.5 }}>
              Try a different category, or check back soon.
            </p>
          </div>
        )}

        {displayedNews && displayedNews.length > 0 && (
          <div className="nf-container" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <BigNewsCard news={displayedNews[0]} onOpen={openReelsAt} />
            {displayedNews.slice(1).map((n) => (
              <CompactNewsCard key={n.id} news={n} onOpen={openReelsAt} />
            ))}
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
