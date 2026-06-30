// src/pages/JournalistProfile.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJournalistPublicProfile, getJournalistPublicNews } from '../services/newsService'
import { BigNewsCard, CompactNewsCard } from '../components/NewsCard'
import ReelsFeed from '../components/ReelsFeed'

const BackIcon = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
)

// Same UI language and reels-style tap-through as Home — a journalist's
// profile is just a filtered version of the same feed, not a different
// experience, so it reuses BigNewsCard/CompactNewsCard/ReelsFeed directly.
export default function JournalistProfile() {
  const { uid } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [news, setNews] = useState(null)
  const [error, setError] = useState('')
  const [reelsIndex, setReelsIndex] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const p = await getJournalistPublicProfile(uid)
        if (cancelled) return
        if (!p) {
          setError('This journalist profile could not be found.')
          return
        }
        setProfile(p)
        const items = await getJournalistPublicNews(uid, p.name)
        if (!cancelled) setNews(items)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load this profile.')
      }
    }
    load()
    return () => { cancelled = true }
  }, [uid])

  function openReelsAt(tappedNews) {
    const index = news.findIndex((n) => n.id === tappedNews.id)
    setReelsIndex(index >= 0 ? index : 0)
  }

  if (error) {
    return (
      <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <p style={{ fontWeight: 700, color: 'var(--nf-navy)', marginBottom: 8 }}>Profile not found</p>
        <p style={{ fontSize: 13.5, color: 'var(--nf-ink-soft)', textAlign: 'center' }}>{error}</p>
        <button className="nf-btn nf-btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate(-1)}>Go back</button>
      </div>
    )
  }

  return (
    <div className="nf-screen">
      <div style={headerStyle}>
        <button onClick={() => navigate(-1)} style={backBtnStyle}><BackIcon /></button>
        <span style={{ fontFamily: 'var(--nf-font-display)', fontWeight: 800, fontSize: 15, color: 'var(--nf-navy)' }}>Journalist Profile</span>
      </div>

      <div className="nf-scroll-body">
        {!profile ? (
          <div style={{ padding: 24 }}>
            <div className="nf-skeleton" style={{ width: 76, height: 76, borderRadius: '50%', margin: '0 auto 14px' }} />
            <div className="nf-skeleton" style={{ height: 18, width: '50%', margin: '0 auto' }} />
          </div>
        ) : (
          <>
            <div style={profileCardStyle}>
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="" style={avatarImgStyle} />
              ) : (
                <div style={avatarFallbackStyle}>{profile.name?.[0]?.toUpperCase() || 'N'}</div>
              )}
              <h2 style={{ fontSize: 18, marginTop: 12 }}>{profile.name}</h2>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 12.5, color: 'var(--nf-ink-soft)' }}>📍 {profile.district}</span>
                {profile.verified && <span className="nf-badge nf-badge-approved">✓ Verified</span>}
              </div>
              <p style={{ fontSize: 12, color: 'var(--nf-ink-faint)', marginTop: 8 }}>
                {news?.length ?? '…'} {news?.length === 1 ? 'report' : 'reports'} published
              </p>
            </div>

            <div className="nf-container" style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {news === null && <p style={{ color: 'var(--nf-ink-soft)', textAlign: 'center' }}>Loading reports…</p>}
              {news?.length === 0 && (
                <div className="nf-empty">
                  <p style={{ fontWeight: 700, color: 'var(--nf-navy)' }}>No public reports yet</p>
                </div>
              )}
              {news && news.length > 0 && (
                <>
                  <BigNewsCard news={news[0]} onOpen={openReelsAt} />
                  {news.slice(1).map((n) => <CompactNewsCard key={n.id} news={n} onOpen={openReelsAt} />)}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {reelsIndex !== null && news?.length > 0 && (
        <ReelsFeed news={news} startIndex={reelsIndex} onClose={() => setReelsIndex(null)} />
      )}
    </div>
  )
}

const headerStyle = {
  position: 'sticky',
  top: 0,
  zIndex: 30,
  height: 'var(--nf-header-h)',
  background: 'var(--nf-paper)',
  borderBottom: '1px solid var(--nf-line)',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '0 14px'
}
const backBtnStyle = {
  border: 'none',
  background: 'none',
  color: 'var(--nf-navy)',
  display: 'flex'
}
const profileCardStyle = {
  textAlign: 'center',
  padding: '28px 16px 20px',
  background: 'var(--nf-paper)',
  borderBottom: '1px solid var(--nf-line)'
}
const avatarImgStyle = {
  width: 76,
  height: 76,
  borderRadius: '50%',
  objectFit: 'cover',
  margin: '0 auto',
  border: '3px solid var(--nf-paper)',
  boxShadow: '0 0 0 1px var(--nf-line)'
}
const avatarFallbackStyle = {
  width: 76,
  height: 76,
  borderRadius: '50%',
  background: 'var(--nf-flow)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 28,
  fontWeight: 800,
  margin: '0 auto'
}
