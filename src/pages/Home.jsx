// src/pages/Home.jsx
// CHANGE: pagination now auto-triggers as the reader scrolls near the
// bottom (IntersectionObserver on a sentinel element), instead of requiring
// a manual "Load older news" tap. Feels like every article is simply *in*
// Trending/All as you scroll, rather than something you have to ask for.
import { useEffect, useRef, useState } from 'react'
import Header from '../components/Header'
import CategoryTabs from '../components/CategoryTabs'
import DistrictSelector from '../components/DistrictSelector'
import { BigNewsCard, CompactNewsCard } from '../components/NewsCard'
import ReelsFeed from '../components/ReelsFeed'
import { listenToFeed, loadMoreNews, updateUserProfile } from '../services/newsService'
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

  const [pageCursor, setPageCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef(null)

  useEffect(() => {
    if (profile?.district && !localStorage.getItem(DISTRICT_KEY)) {
      setDistrict(profile.district)
    }
  }, [profile])

  useEffect(() => {
    setAllNews(null)
    setFeedError('')
    setPageCursor(null)
    setHasMore(false)
    const unsub = listenToFeed(
      { category },
      (news, meta) => {
        setAllNews(news)
        setPageCursor(meta.lastDoc)
        setHasMore(meta.hasMore)
      },
      (err) => setFeedError(err.message || 'Could not load news.')
    )
    return unsub
  }, [category])

  async function handleLoadMore() {
    if (!pageCursor || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const { docs, lastDoc, hasMore: more } = await loadMoreNews({ category, afterDoc: pageCursor })
      setAllNews((prev) => {
        const existingIds = new Set(prev.map((n) => n.id))
        return [...prev, ...docs.filter((n) => !existingIds.has(n.id))]
      })
      setPageCursor(lastDoc)
      setHasMore(more)
    } catch (err) {
      setFeedError('Could not load more news: ' + err.message)
    } finally {
      setLoadingMore(false)
    }
  }

  // Auto-fires handleLoadMore when the sentinel (an empty div right after
  // the last card) scrolls into view — the reader never has to tap
  // anything, older articles just keep appearing as they scroll.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) handleLoadMore() },
      { rootMargin: '400px' } // start loading a bit before it's actually visible, so it feels seamless
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, pageCursor, category])

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

            {/* Invisible sentinel — triggers auto-loading when scrolled near */}
            {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}

            {loadingMore && (
              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--nf-ink-faint)', padding: '10px 0' }}>
                Loading more…
              </p>
            )}
            {!hasMore && allNews.length > 0 && (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--nf-ink-faint)', marginBottom: 20 }}>
                You've reached the end — {allNews.length} article{allNews.length === 1 ? '' : 's'} total
              </p>
            )}
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
