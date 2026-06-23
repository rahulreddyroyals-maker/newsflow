// src/components/ReelsFeed.jsx
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { categoryLabel } from '../utils/categories'
import { toggleBookmark, incrementViewCount, setReaction } from '../services/newsService'
import ImageWatermark from './ImageWatermark'
import CommentsPanel from './CommentsPanel'

// Full-screen, one-story-per-screen vertical feed — the primary way stories
// are read from Home now. Scroll-snap does the heavy lifting (no gesture
// library needed): swipe up for the next story, swipe down for the previous
// one, identical to a reels/shorts feed.
export default function ReelsFeed({ news, startIndex = 0, onClose }) {
  const containerRef = useRef(null)
  // Lifted up here (not per-slide) so opening comments can lock background
  // scrolling on the ONE shared feed container — previously each slide owned
  // its own open/close state with no way to freeze the feed underneath,
  // which let a stray swipe while typing a comment scroll to the next story.
  const [openCommentsFor, setOpenCommentsFor] = useState(null)

  useEffect(() => {
    if (containerRef.current && startIndex > 0) {
      const slide = containerRef.current.children[startIndex]
      slide?.scrollIntoView({ block: 'start' })
    }
  }, [startIndex])

  return (
    <div style={overlayStyle}>
      <button onClick={onClose} style={closeBtnStyle} aria-label="Back to list">←</button>
      <div
        ref={containerRef}
        style={{ ...scrollStyle, overflowY: openCommentsFor ? 'hidden' : 'scroll' }}
      >
        {news.map((item) => (
          <ReelSlide key={item.id} news={item} onOpenComments={() => setOpenCommentsFor(item.id)} />
        ))}
      </div>

      {openCommentsFor && <CommentsPanel newsId={openCommentsFor} onClose={() => setOpenCommentsFor(null)} dark />}
    </div>
  )
}

function ReelSlide({ news: initialNews, onOpenComments }) {
  const { user, profile, refreshProfile } = useAuth()
  const { lang } = useLanguage()
  const [news, setNews] = useState(initialNews)
  const [justCopied, setJustCopied] = useState(false)
  const [seen, setSeen] = useState(false)
  const [isPortraitVideo, setIsPortraitVideo] = useState(null) // null = unknown yet, true/false once metadata loads
  const slideRef = useRef(null)
  const videoRef = useRef(null)
  const headline = lang === 'en' && news.headlineEn ? news.headlineEn : news.headline
  const summary = lang === 'en' && news.summaryEn ? news.summaryEn : news.summary
  const content = lang === 'en' && news.contentEn ? news.contentEn : news.content
  const isBookmarked = profile?.bookmarks?.includes(news.id)
  const isLiked = news.likedBy?.includes(user?.uid)
  const isDisliked = news.dislikedBy?.includes(user?.uid)

  useEffect(() => {
    const el = slideRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !seen) {
          setSeen(true)
          incrementViewCount(news.id)
        }
        // Pause audio/video the moment this slide scrolls mostly out of
        // view — without this, a video kept playing (and audible) even
        // after scrolling on to the next story.
        if (!entry.isIntersecting && videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause()
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [seen, news.id])

  // Vertical (9:16-ish) video gets the full slide so it isn't cropped down
  // into a 46%-height box; square/landscape video keeps the split layout
  // (media up top, full text below) since that's the better fit for those
  // shapes. Detected from the actual file once its metadata loads.
  function handleVideoMeta(e) {
    const { videoWidth, videoHeight } = e.target
    setIsPortraitVideo(videoHeight > videoWidth * 1.1)
  }

  async function handleBookmark(e) {
    e.stopPropagation()
    if (!user) return
    await toggleBookmark(user.uid, news.id, isBookmarked)
    refreshProfile()
  }

  async function handleReaction(type) {
    if (!user) return
    const prevLiked = news.likedBy || []
    const prevDisliked = news.dislikedBy || []
    setNews((n) => {
      const liked = new Set(prevLiked)
      const disliked = new Set(prevDisliked)
      if (type === 'like') {
        liked.has(user.uid) ? liked.delete(user.uid) : liked.add(user.uid)
        disliked.delete(user.uid)
      } else {
        disliked.has(user.uid) ? disliked.delete(user.uid) : disliked.add(user.uid)
        liked.delete(user.uid)
      }
      return { ...n, likedBy: [...liked], dislikedBy: [...disliked] }
    })
    await setReaction(news.id, user.uid, type, { likedBy: prevLiked, dislikedBy: prevDisliked })
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

  const fullBleed = news.videoUrl && isPortraitVideo === true

  return (
    <section ref={slideRef} style={slideStyle}>
      <div style={fullBleed ? mediaWrapStyleFull : mediaWrapStyle}>
        {news.videoUrl ? (
          <video
            ref={videoRef}
            controls
            playsInline
            src={news.videoUrl}
            poster={news.images?.[0]}
            onLoadedMetadata={handleVideoMeta}
            style={fullBleed ? { ...bgImageStyle, objectFit: 'contain', background: '#000' } : bgImageStyle}
          />
        ) : news.images?.[0] ? (
          <img src={news.images[0]} alt="" style={bgImageStyle} />
        ) : (
          <div style={{ ...bgImageStyle, background: 'var(--nf-flow)', opacity: 0.5 }} />
        )}
        <ImageWatermark size="lg" />
        <div style={gradientStyle} />

        <div style={rightRailStyle}>
          <RailButton onClick={() => handleReaction('like')} active={isLiked} icon="👍" label={news.likedBy?.length || 'Like'} />
          <RailButton onClick={() => handleReaction('dislike')} active={isDisliked} icon="👎" label={news.dislikedBy?.length || ''} />
          <RailButton onClick={(e) => { e.stopPropagation(); onOpenComments() }} icon="💬" label="Comment" />
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

      {!fullBleed && (
        <div style={textPaneStyle}>
          <p style={{ fontSize: 15.5, lineHeight: 1.75, color: 'var(--nf-ink)', whiteSpace: 'pre-wrap' }}>{content || summary}</p>
        </div>
      )}
    </section>
  )
}

function RailButton({ onClick, icon, label, active }) {
  return (
    <button onClick={onClick} style={railBtnStyle}>
      <span style={{ fontSize: 22, filter: active ? 'none' : 'grayscale(0.3) opacity(0.9)' }}>{icon}</span>
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
// Portrait video takes the whole slide instead of the 46% split — matches
// the natural shape of a 9:16 phone-recorded clip instead of cropping it.
const mediaWrapStyleFull = {
  position: 'relative',
  flex: '1 1 auto',
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
  background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.55) 100%)',
  pointerEvents: 'none'
}
const topCaptionStyle = {
  position: 'absolute',
  left: 16,
  right: 76,
  bottom: 14,
  zIndex: 2,
  pointerEvents: 'none'
}
const textPaneStyle = {
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto',
  background: 'var(--nf-paper)',
  padding: '18px 18px 32px',
  WebkitOverflowScrolling: 'touch'
}
// Bottom offset raised well clear of the native <video controls> bar — it
// used to sit at bottom:18, which collided directly with the browser's own
// control strip (play/seek/fullscreen) rendered along the video's bottom
// edge, causing the visible overlap with the Share label.
const rightRailStyle = {
  position: 'absolute',
  right: 14,
  bottom: 64,
  zIndex: 3,
  display: 'flex',
  flexDirection: 'column',
  gap: 14
}
const railBtnStyle = {
  border: 'none',
  background: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
}
