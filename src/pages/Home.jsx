// src/pages/Home.jsx
// FIX: "Trending" (category = 'All') should show every report from every
// category, sorted by recency — a newer General item should always rank
// above an older State Politics item within the same district-priority
// bucket. If that wasn't happening, the most likely cause is a district
// string mismatch (extra whitespace, casing) silently sending an item into
// the wrong sort bucket. isLocalMatch below now normalizes both sides
// (trim + case-fold) before comparing, so no valid match is ever missed.
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

function tsMs(ts) {
  if (!ts) return 0
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (typeof ts.seconds === 'number') return ts.seconds * 1000
  const n = Number(ts)
  if (!isNaN(n) && n > 1_000_000_000) return n
  const d = new Date(ts)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

// Normalizes a district string for comparison — trims whitespace and
// lowercases, so "Andhra Pradesh (statewide) " (trailing space from a form
// field) still matches "Andhra Pradesh (statewide)" exactly.
function normalize(str) {
  return (str || '').trim().toLowerCase()
}

const AP_DISTRICTS = [
  'Srikakulam','Parvathipuram Manyam','Vizianagaram','Visakhapatnam','Anakapalli',
  'Alluri Sitharama Raju','Kakinada','East Godavari','Dr. B.R. Ambedkar Konaseema',
  'West Godavari','Eluru','Krishna','NTR','Guntur','Palnadu','Bapatla',
  'Prakasam','Markapuram','Nellore','Kurnool','Nandyal','Anantapur',
  'Sri Sathya Sai','YSR Kadapa','Annamayya','Chittoor','Tirupati','Polavaram'
].map(normalize)
const TS_DISTRICTS = [
  'Hyderabad','Medchal-Malkajgiri','Rangareddy','Vikarabad','Sangareddy',
  'Siddipet','Medak','Kamareddy','Nizamabad','Jagtial','Rajanna Sircilla',
  'Karimnagar','Peddapalli','Mancherial','Adilabad','Nirmal',
  'Komaram Bheem Asifabad','Jayashankar Bhupalpally','Warangal','Hanumakonda',
  'Jangaon','Mahabubabad','Bhadradri Kothagudem','Khammam','Mulugu',
  'Suryapet','Nalgonda','Yadadri Bhuvanagiri','Mahabubnagar','Nagarkurnool',
  'Wanaparthy','Jogulamba Gadwal','Narayanpet'
].map(normalize)

function isLocalMatch(newsDistrict, selectedDistrict, homeDistrict) {
  const target = normalize(selectedDistrict === 'All' ? homeDistrict : selectedDistrict)
  const item = normalize(newsDistrict)
  if (!target) return false
  if (item === target) return true
  if (target === normalize('Andhra Pradesh (statewide)')) return AP_DISTRICTS.includes(item)
  if (target === normalize('Telangana (statewide)'))       return TS_DISTRICTS.includes(item)
  return false
}

// Local-district items first (by recency), then every remaining item
// (also by recency) — regardless of category. "Trending" passes
// category=null so every category is included in both buckets;
// picking a specific category (e.g. General) only narrows the pool
// BEFORE this sort runs, it never changes the sort itself.
function sortFeed(items, selectedDistrict, homeDistrict) {
  if (!items.length) return items
  const local = items.filter((n) =>  isLocalMatch(n.district, selectedDistrict, homeDistrict))
  const rest  = items.filter((n) => !isLocalMatch(n.district, selectedDistrict, homeDistrict))
  const byDate = (a, b) => tsMs(b.createdAt) - tsMs(a.createdAt)
  return [...local.sort(byDate), ...rest.sort(byDate)]
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

  const displayedNews = allNews
    ? sortFeed(allNews, district, profile?.district)
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
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--nf-navy)', marginBottom: 6 }}>No news yet</p>
            <p style={{ fontSize: 13.5 }}>Try a different category, or check back soon.</p>
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
