// src/pages/Home.jsx
import { useEffect, useState } from 'react'
import Header from '../components/Header'
import CategoryTabs from '../components/CategoryTabs'
import DistrictSelector from '../components/DistrictSelector'
import { BigNewsCard, CompactNewsCard } from '../components/NewsCard'
import { listenToFeed, updateUserProfile } from '../services/newsService'
import { useAuth } from '../contexts/AuthContext'

export default function Home() {
  const { profile, user, refreshProfile } = useAuth()
  const [district, setDistrict] = useState('All')
  const [category, setCategory] = useState('All')
  const [news, setNews] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (profile?.district) setDistrict(profile.district)
  }, [profile])

  useEffect(() => {
    setNews(null)
    const unsub = listenToFeed({ district, category }, setNews)
    return unsub
  }, [district, category])

  async function handleDistrictSelect(d) {
    setDistrict(d)
    setPickerOpen(false)
    if (user && d !== 'All') {
      await updateUserProfile(user.uid, { district: d })
      refreshProfile()
    }
  }

  return (
    <div className="nf-screen">
      <Header district={district} onDistrictTap={() => setPickerOpen(true)} />
      <div className="nf-scroll-body">
        <CategoryTabs active={category} onChange={setCategory} />

        {news === null && <FeedSkeleton />}

        {news?.length === 0 && (
          <div className="nf-empty">
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--nf-navy)', marginBottom: 6 }}>No news here yet</p>
            <p style={{ fontSize: 13.5 }}>Try a different district or category, or check back soon.</p>
          </div>
        )}

        {news && news.length > 0 && (
          <div className="nf-container" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <BigNewsCard news={news[0]} />
            {news.slice(1).map((n) => <CompactNewsCard key={n.id} news={n} />)}
          </div>
        )}
      </div>

      <DistrictSelector open={pickerOpen} current={district} onSelect={handleDistrictSelect} onClose={() => setPickerOpen(false)} />
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
