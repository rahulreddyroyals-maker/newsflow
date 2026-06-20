// src/components/ReelsFeed.jsx
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { categoryLabel } from '../utils/categories'
import { toggleBookmark } from '../services/newsService'

// Full-screen, one-story-per-screen vertical feed. Scroll-snap does the heavy
// lifting — no swipe-gesture library needed, this is just native scroll
// behavior constrained to snap one screen at a time, which feels identical
// to a reels/shorts feed and works the same with touch swipes, mouse wheel,
// or a trackpad.
export default function ReelsFeed({ news, onClose, onOpenDetail }) {
  const containerRef = useRef(null)

  return (
    <div style={overlayStyle}>
      <button onClick={onClose} style={closeBtnStyle} aria-label="Close">✕</button>
      <div ref={containerRef} style={scrollStyle}>
        {news.map((item) => (
          <ReelSlide key={item.id} news={item} onOpenDetail={() => onOpenDetail(item.id)} />
        ))}
      </div>
    </div>
  )
}

function ReelSlide({ news, onOpenDetail }) {
  const { user, profile, refreshProfile } = useAuth()
  const { lang } = useLanguage()
  const [justCopied, setJustCopied] = useState(false)
  const headline = lang === 'en' && news.headlineEn ? news.headlineEn : news.headline
  const summary = lang === 'en' && news.summaryEn ? news.summaryEn : news.summary
  const isBookmarked = profile?.bookmarks?.includes(news.id)

  async function handleBookmark(e) {
    e.stopPropagation()
    if (!user) return
    await toggleBookmark(user.uid, news.id, isBookmarked)
    refreshProfile()
  }

  function handleShare(e) {
    e.stopPropagation()
    const shareData = { title: headline, text: summary, url: `${window.location.origin}/news/${news.id}` }
    if (navigator.share) {
      navigator.share(shareData).catch(() => {})
    } else {
      navigator.clipboard.writeText(shareData.url)
      setJustCopied(true)
      setTimeout(() => setJustCopied(false), 1600)
    }
  }

  return (
    <section style={slideStyle} onClick={onOpenDetail}>
      {news.images?.[0] ? (
        <img src={news.images[0]} alt="" style={bgImageStyle} />
      ) : (
        <div style={{ ...bgImageStyle, background: 'var(--nf-flow)', opacity: 0.5 }} />
      )}
      <div style={gradientStyle} />

      <div style={rightRailStyle}>
        <RailButton onClick={handleBookmark} active={isBookmarked} icon={isBookmarked ? '★' : '☆'} label="Save" />
        <RailButton onClick={handleShare} icon="↗" label={justCopied ? 'Copied!' : 'Share'} />
      </div>

      <div style={captionStyle}>
        <span className="nf-chip" style={{ background: 'rgba(255,255,255,0.18)', borderColor: 'transparent', color: '#fff', marginBottom: 10 }}>
          {categoryLabel(news.category, lang)}
        </span>
        <h2 style={{ color: '#fff', fontSize: 21, lineHeight: 1.3, marginBottom: 10 }}>{headline}</h2>
        <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 14, lineHeight: 1.55, marginBottom: 12 }}>{summary}</p>
        <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
          <span>{news.district}</span>
          <span>•</span>
          <span>Tap to read full story</span>
        </div>
      </div>
    </section>
  )
}

function RailButton({ onClick, icon, label, active }) {
  return (
    <button onClick={onClick} style={railBtnStyle}>
      <span style={{ fontSize: 22, color: active ? 'var(--nf-orange-light)' : '#fff' }}>{icon}</span>
      <span style={{ fontSize: 10.5, color: '#fff', fontWeight: 700, marginTop: 2 }}>{label}</span>
    </button>
  )
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 80,
  background: '#000',
  maxWidth: 'var(--nf-max-w)',
  margin: '0 auto'
}
const closeBtnStyle = {
  position: 'absolute',
  top: 16,
  right: 14,
  zIndex: 10,
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: 'rgba(0,0,0,0.45)',
  color: '#fff',
  border: 'none',
  fontSize: 16
}
const scrollStyle = {
  height: '100%',
  overflowY: 'scroll',
  scrollSnapType: 'y mandatory',
  WebkitOverflowScrolling: 'touch'
}
const slideStyle = {
  position: 'relative',
  height: '100%',
  width: '100%',
  scrollSnapAlign: 'start',
  scrollSnapStop: 'always',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  overflow: 'hidden'
}
const bgImageStyle = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover'
}
const gradientStyle = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.92) 100%)'
}
const captionStyle = {
  position: 'relative',
  zIndex: 2,
  padding: '0 76px 38px 20px'
}
const rightRailStyle = {
  position: 'absolute',
  right: 14,
  bottom: 130,
  zIndex: 3,
  display: 'flex',
  flexDirection: 'column',
  gap: 18
}
const railBtnStyle = {
  border: 'none',
  background: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
}
