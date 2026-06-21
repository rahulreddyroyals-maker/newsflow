// src/components/ReelsFeed.jsx
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { categoryLabel } from '../utils/categories'
import { toggleBookmark, incrementViewCount } from '../services/newsService'
import ImageWatermark from './ImageWatermark'

// Full-screen, one-story-per-screen vertical feed — the primary way stories
// are read from Home now. Scroll-snap does the heavy lifting (no gesture
// library needed): swipe up for the next story, swipe down for the previous
// one, identical to a reels/shorts feed. The FULL article shows inline on
// each slide (scrollable within the slide if it's long), so reading never
// requires leaving the swipe flow.
export default function ReelsFeed({ news, startIndex = 0, onClose }) {
  const containerRef = useRef(null)

  // Jump straight to the tapped story on open, instead of always starting
  // from the top of the list.
  useEffect(() => {
    if (containerRef.current && startIndex > 0) {
      const slide = containerRef.current.children[startIndex]
      slide?.scrollIntoView({ block: 'start' })
    }
  }, [startIndex])

  return (
    <div style={overlayStyle}>
      <button onClick={onClose} style={closeBtnStyle} aria-label="Back to list">←</button>
      <div ref={containerRef} style={scrollStyle}>
        {news.map((item) => (
          <ReelSlide key={item.id} news={item} />
        ))}
      </div>
    </div>
  )
}

function ReelSlide({ news }) {
  const { user, profile, refreshProfile } = useAuth()
  const { lang } = useLanguage()
  const [justCopied, setJustCopied] = useState(false)
  const [seen, setSeen] = useState(false)
  const slideRef = useRef(null)
  const headline = lang === 'en' && news.headlineEn ? news.headlineEn : news.headline
  const summary = lang === 'en' && news.summaryEn ? news.summaryEn : news.summary
  const content = lang === 'en' && news.contentEn ? news.contentEn : news.content
  const isBookmarked = profile?.bookmarks?.includes(news.id)

  // Count a view once a slide actually scrolls into view, not just because
  // it exists in the list.
  useEffect(() => {
    const el = slideRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !seen) {
          setSeen(true)
          incrementViewCount(news.id)
        }
      },
      { threshold: 0.6 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [seen, news.id])

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
    <section ref={slideRef} style={slideStyle}>
      <div style={mediaWrapStyle}>
        {news.videoUrl ? (
          <video controls src={news.videoUrl} poster={news.images?.[0]} style={bgImageStyle} />
        ) : news.images?.[0] ? (
          <img src={news.images[0]} alt="" style={bgImageStyle} />
        ) : (
          <div style={{ ...bgImageStyle, background: 'var(--nf-flow)', opacity: 0.5 }} />
        )}
        <ImageWatermark size="lg" />
        <div style={gradientStyle} />

        <div style={rightRailStyle}>
          <RailButton onClick={handleBookmark} active={isBookmarked} icon={isBookmarked ? '★' : '☆'} label="Save" />
          <RailButton onClick={handleShare} icon="↗" label={justCopied ? 'Copied!' : 'Share'} />
        </div>

        <div style={topCaptionStyle}>
          <span className="nf-chip" style={{ background: 'rgba(255,255,255,0.18)', borderColor: 'transparent', color: '#fff', marginBottom: 10 }}>
            {categoryLabel(news.category, lang)}
          </span>
          <h2 style={{ color: '#fff', fontSize: 20, lineHeight: 1.3 }}>{headline}</h2>
          <div style={{ display: 'flex', gap: 8, fontSize: 11.5, color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginTop: 8 }}>
            <span>{news.district}</span>
            <span>•</span>
            <span>NewsFlow</span>
          </div>
        </div>
      </div>

      <div style={textPaneStyle}>
        <p style={{ fontSize: 15.5, lineHeight: 1.75, color: 'var(--nf-ink)', whiteSpace: 'pre-wrap' }}>{content || summary}</p>
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
  left: 14,
  zIndex: 10,
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: 'rgba(0,0,0,0.45)',
  color: '#fff',
  border: 'none',
  fontSize: 18
}
const scrollStyle = {
  height: '100%',
  overflowY: 'scroll',
  scrollSnapType: 'y mandatory',
  WebkitOverflowScrolling: 'touch'
}
const slideStyle = {
  height: '100%',
  width: '100%',
  scrollSnapAlign: 'start',
  scrollSnapStop: 'always',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: '#000'
}
const mediaWrapStyle = {
  position: 'relative',
  flex: '0 0 46%',
  minHeight: 0,
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
  background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.55) 100%)'
}
const topCaptionStyle = {
  position: 'absolute',
  left: 16,
  right: 76,
  bottom: 14,
  zIndex: 2
}
const textPaneStyle = {
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto',
  background: 'var(--nf-paper)',
  padding: '18px 18px 32px',
  WebkitOverflowScrolling: 'touch'
}
const rightRailStyle = {
  position: 'absolute',
  right: 14,
  bottom: 18,
  zIndex: 3,
  display: 'flex',
  flexDirection: 'column',
  gap: 16
}
const railBtnStyle = {
  border: 'none',
  background: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
}
