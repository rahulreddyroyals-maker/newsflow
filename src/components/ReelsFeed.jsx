// src/components/ReelsFeed.jsx
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { categoryLabel } from '../utils/categories'
import { toggleBookmark, incrementViewCount, setReaction } from '../services/newsService'
import ImageWatermark from './ImageWatermark'
import CommentsPanel from './CommentsPanel'
import { ThumbsUpIcon, ThumbsDownIcon, CommentIcon, SaveIcon, WhatsAppIcon } from './ActionIcons'

// Full-screen, one-story-per-screen vertical feed — the primary way stories
// are read from Home now. Scroll-snap does the heavy lifting (no gesture
// library needed): swipe up for the next story, swipe down for the previous
// one, identical to a reels/shorts feed.
export default function ReelsFeed({ news, startIndex = 0, onClose }) {
  const containerRef = useRef(null)
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
  const [seen, setSeen] = useState(false)
  const [isPortraitVideo, setIsPortraitVideo] = useState(null)
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
        if (!entry.isIntersecting && videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause()
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [seen, news.id])

  function handleVideoMeta(e) {
    const { videoWidth, videoHeight } = e.target
    setIsPortraitVideo(videoHeight > videoWidth * 1.1)
  }

  async function handleBookmark() {
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

  // Same reasoning as NewsDetail's handleShare — the icon is specifically
  // WhatsApp now, so the action opens it directly via wa.me.
  function handleShare() {
    const shareUrl = `${window.location.origin}/news/${news.id}`
    const text = `${headline}\n${shareUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
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

        {/* Full-bleed (portrait video) has no separate space below the media
            for an action bar, so it overlays a thin horizontal strip near
            the bottom — well clear of the native video control bar — instead
            of the old vertical rail, which was tall enough to collide with
            the watermark/caption at the top of much shorter media boxes. */}
        {fullBleed && (
          <div style={overlayActionBarStyle}>
            <ActionBar
              isLiked={isLiked} isDisliked={isDisliked} isBookmarked={isBookmarked}
              likeCount={news.likedBy?.length} dislikeCount={news.dislikedBy?.length}
              onLike={() => handleReaction('like')} onDislike={() => handleReaction('dislike')}
              onComment={onOpenComments} onSave={handleBookmark} onShare={handleShare}
              light
            />
          </div>
        )}
      </div>

      {!fullBleed && (
        <>
          <div style={actionBarStripStyle}>
            <ActionBar
              isLiked={isLiked} isDisliked={isDisliked} isBookmarked={isBookmarked}
              likeCount={news.likedBy?.length} dislikeCount={news.dislikedBy?.length}
              onLike={() => handleReaction('like')} onDislike={() => handleReaction('dislike')}
              onComment={onOpenComments} onSave={handleBookmark} onShare={handleShare}
            />
          </div>
          <div style={textPaneStyle}>
            <p style={{ fontSize: 15.5, lineHeight: 1.75, color: 'var(--nf-ink)', whiteSpace: 'pre-wrap' }}>{content || summary}</p>
          </div>
        </>
      )}
    </section>
  )
}

// Single horizontal row — Like · Dislike · Comment · Save · Share — used
// both as an overlay strip (full-bleed portrait video) and as an in-flow
// strip between the media and the article text (everything else).
function ActionBar({ isLiked, isDisliked, isBookmarked, likeCount, dislikeCount, onLike, onDislike, onComment, onSave, onShare, light }) {
  const color = light ? '#fff' : 'var(--nf-navy)'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
      <BarButton onClick={onLike} color={color}>
        <ThumbsUpIcon active={isLiked} style={{ color: isLiked ? 'var(--nf-blue)' : color }} />
        <BarLabel color={color}>{likeCount || 'Like'}</BarLabel>
      </BarButton>
      <BarButton onClick={onDislike} color={color}>
        <ThumbsDownIcon active={isDisliked} style={{ color: isDisliked ? 'var(--nf-danger)' : color }} />
        <BarLabel color={color}>{dislikeCount || 'Dislike'}</BarLabel>
      </BarButton>
      <BarButton onClick={onComment} color={color}>
        <CommentIcon style={{ color }} />
        <BarLabel color={color}>Comment</BarLabel>
      </BarButton>
      <BarButton onClick={onSave} color={color}>
        <SaveIcon active={isBookmarked} style={{ color: isBookmarked ? 'var(--nf-orange)' : color }} />
        <BarLabel color={color}>Save</BarLabel>
      </BarButton>
      <BarButton onClick={onShare} color={color}>
        <WhatsAppIcon style={{ color: '#25D366' }} />
        <BarLabel color={color}>Share</BarLabel>
      </BarButton>
    </div>
  )
}

function BarButton({ onClick, children }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick() }} style={barBtnStyle}>
      {children}
    </button>
  )
}

function BarLabel({ color, children }) {
  return <span style={{ fontSize: 10, color, fontWeight: 700, marginTop: 3 }}>{children}</span>
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
  flex: '0 0 42%',
  minHeight: 0,
  overflow: 'hidden'
}
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
  right: 16,
  bottom: 14,
  zIndex: 2,
  pointerEvents: 'none'
}
const actionBarStripStyle = {
  flexShrink: 0,
  padding: '10px 16px',
  background: 'var(--nf-paper)',
  borderBottom: '1px solid var(--nf-line)'
}
// Sits well above the native <video controls> bar (which renders along the
// video's own bottom edge) instead of competing with it for the same space.
const overlayActionBarStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 56,
  zIndex: 3,
  padding: '0 16px'
}
const textPaneStyle = {
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto',
  background: 'var(--nf-paper)',
  padding: '18px 18px 32px',
  WebkitOverflowScrolling: 'touch'
}
const barBtnStyle = {
  border: 'none',
  background: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
}
