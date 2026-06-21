// src/pages/NewsDetail.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getNewsById, incrementViewCount, toggleBookmark } from '../services/newsService'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { categoryLabel } from '../utils/categories'
import ImageWatermark from '../components/ImageWatermark'

const BackIcon = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
)
const ShareIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="2"/><circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="2"/><circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="2"/><path d="M8.2 10.8 15.8 6.7M8.2 13.2l7.6 4.1" stroke="currentColor" strokeWidth="2"/></svg>
)

export default function NewsDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, user, refreshProfile } = useAuth()
  const { lang } = useLanguage()
  const [news, setNews] = useState(null)
  const [imgIndex, setImgIndex] = useState(0)
  const [shareCopied, setShareCopied] = useState(false)

  useEffect(() => {
    getNewsById(id).then(setNews)
    incrementViewCount(id)
  }, [id])

  if (!news) {
    return (
      <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="nf-skeleton" style={{ width: 60, height: 60, borderRadius: '50%' }} />
      </div>
    )
  }

  const headline = lang === 'en' && news.headlineEn ? news.headlineEn : news.headline
  const content = lang === 'en' && news.contentEn ? news.contentEn : news.content
  const isBookmarked = profile?.bookmarks?.includes(id)

  async function handleBookmark() {
    if (!user) return navigate('/login')
    await toggleBookmark(user.uid, id, isBookmarked)
    refreshProfile()
  }

  function handleShare() {
    const shareData = { title: headline, text: news.summary, url: window.location.href }
    if (navigator.share) {
      navigator.share(shareData).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 1600)
    }
  }

  return (
    <div className="nf-screen">
      <div style={{ position: 'relative' }}>
        {news.images?.length ? (
          <>
            <img src={news.images[imgIndex]} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} />
            {news.images.length > 1 && (
              <div style={dotsRow}>
                {news.images.map((_, i) => (
                  <span key={i} style={{ ...dotStyle, opacity: i === imgIndex ? 1 : 0.4 }} onClick={() => setImgIndex(i)} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ width: '100%', aspectRatio: '4/3', background: 'var(--nf-flow)', opacity: 0.2 }} />
        )}
        <ImageWatermark size="lg" />
        <button onClick={() => navigate(-1)} style={backBtnStyle}><BackIcon /></button>
        <div style={topActionsStyle}>
          <button onClick={handleBookmark} style={topActionBtnStyle} aria-label="Save">
            <span style={{ fontSize: 16, color: isBookmarked ? 'var(--nf-orange-light)' : '#fff' }}>{isBookmarked ? '★' : '☆'}</span>
          </button>
          <button onClick={handleShare} style={topActionBtnStyle} aria-label="Share">
            <ShareIcon style={{ color: '#fff' }} />
          </button>
        </div>
        {shareCopied && <div style={toastStyle}>Link copied!</div>}
      </div>

      <div className="nf-scroll-body nf-container" style={{ paddingTop: 18 }}>
        <span className="nf-chip active" style={{ marginBottom: 12 }}>{categoryLabel(news.category, lang)}</span>
        <h1 style={{ fontSize: 22, lineHeight: 1.35, marginBottom: 10 }}>{headline}</h1>
        <div style={metaStyle}>
          <span>{news.district}</span>
          <span>•</span>
          <span>{news.authorName}</span>
          <span>•</span>
          <span>{news.views || 0} views</span>
        </div>

        <p style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--nf-ink)', whiteSpace: 'pre-wrap' }}>{content}</p>

        <div style={actionRowStyle}>
          <button className="nf-btn nf-btn-ghost" onClick={handleShare} style={{ flex: 1 }}>📤 {shareCopied ? 'Link copied!' : 'Share'}</button>
          <button className="nf-btn nf-btn-ghost" onClick={handleBookmark} style={{ flex: 1, color: isBookmarked ? 'var(--nf-orange)' : 'var(--nf-navy)' }}>
            {isBookmarked ? '★ Saved' : '☆ Save'}
          </button>
          <button className="nf-btn nf-btn-ghost" style={{ flex: 1 }}>⚠ Report</button>
        </div>
      </div>
    </div>
  )
}

const backBtnStyle = {
  position: 'absolute', top: 14, left: 14,
  width: 38, height: 38, borderRadius: '50%',
  background: 'rgba(15,31,61,0.55)', border: 'none', color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
}
const topActionsStyle = {
  position: 'absolute', top: 14, right: 14,
  display: 'flex', gap: 8, zIndex: 3
}
const topActionBtnStyle = {
  width: 38, height: 38, borderRadius: '50%',
  background: 'rgba(15,31,61,0.55)', border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
}
const toastStyle = {
  position: 'absolute', top: 58, right: 14,
  background: 'rgba(15,31,61,0.9)', color: '#fff',
  fontSize: 12, fontWeight: 700, padding: '6px 12px',
  borderRadius: 8, zIndex: 3
}
const dotsRow = { position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }
const dotStyle = { width: 6, height: 6, borderRadius: '50%', background: '#fff' }
const metaStyle = { display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--nf-ink-faint)', fontWeight: 600, marginBottom: 16 }
const actionRowStyle = { display: 'flex', gap: 10, margin: '26px 0 30px' }
