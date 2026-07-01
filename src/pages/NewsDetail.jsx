// src/pages/NewsDetail.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getNewsById, incrementViewCount, toggleBookmark, setReaction } from '../services/newsService'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { categoryLabel } from '../utils/categories'
import ImageWatermark from '../components/ImageWatermark'
import CommentsPanel from '../components/CommentsPanel'
import { ThumbsUpIcon, ThumbsDownIcon, CommentIcon, SaveIcon, WhatsAppIcon } from '../components/ActionIcons'

const ANONYMOUS_BYLINES = new Set(['NewsFlow', 'NewsFlow Citizen Journalist', 'NewsFlow Reporter'])
const NON_PROFILE_AUTHOR_IDS = new Set(['system-rss', 'admin'])

// A byline only links to a public profile when it's a real, named journalist
// who chose to show their name on THIS report — never for RSS items, admin
// uploads, or a journalist who posted that particular report anonymously
// (even though the underlying authorId is still theirs, linking it would
// defeat the point of the anonymity toggle).
function isLinkableByline(news) {
  return news.authorId
    && !NON_PROFILE_AUTHOR_IDS.has(news.authorId)
    && !ANONYMOUS_BYLINES.has(news.authorName)
}

const BackIcon = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
)

export default function NewsDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, user, refreshProfile } = useAuth()
  const { lang } = useLanguage()
  const [news, setNews] = useState(null)
  const [imgIndex, setImgIndex] = useState(0)
  const [isPortraitVideo, setIsPortraitVideo] = useState(null)
  const [commentsOpen, setCommentsOpen] = useState(false)

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
  const isLiked = news.likedBy?.includes(user?.uid)
  const isDisliked = news.dislikedBy?.includes(user?.uid)

  function handleVideoMeta(e) {
    const { videoWidth, videoHeight } = e.target
    setIsPortraitVideo(videoHeight > videoWidth * 1.1)
  }

  async function handleBookmark() {
    if (!user) return navigate('/login')
    await toggleBookmark(user.uid, id, isBookmarked)
    refreshProfile()
  }

  async function handleReaction(type) {
    if (!user) return navigate('/login')
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
    await setReaction(id, user.uid, type, { likedBy: prevLiked, dislikedBy: prevDisliked })
  }

  // The action bar icon is specifically the WhatsApp mark now, so tapping it
  // should open WhatsApp directly (wa.me works as a plain link on both
  // mobile and desktop, opening the app or WhatsApp Web) rather than a
  // generic share sheet that might suggest a different destination than
  // what the icon promised.
  function handleShare() {
    const shareUrl = window.location.href
    const text = `${headline}\n${shareUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const videoIsPortrait = news.videoUrl && isPortraitVideo === true

  return (
    <div className="nf-screen">
      <div style={{ position: 'relative' }}>
        {news.videoUrl ? (
          <video
            controls
            playsInline
            src={news.videoUrl}
            poster={news.images?.[0]}
            onLoadedMetadata={handleVideoMeta}
            style={{
              width: '100%',
              aspectRatio: videoIsPortrait ? '9/16' : '4/3',
              objectFit: videoIsPortrait ? 'contain' : 'cover',
              background: '#000'
            }}
          />
        ) : news.images?.length ? (
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
      </div>

      {news.videoUrl && news.images?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0', overflowX: 'auto' }}>
          {news.images.map((url, i) => <img key={i} src={url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />)}
        </div>
      )}

      {/* Single horizontal action bar, directly below the media and above
          the headline/text — replaces the old split between top-corner
          icons and a separate row further down the page. */}
      <div style={actionBarStripStyle}>
        <BarButton onClick={() => handleReaction('like')}>
          <ThumbsUpIcon active={isLiked} style={{ color: isLiked ? 'var(--nf-blue)' : 'var(--nf-navy)' }} />
          <BarLabel>{news.likedBy?.length || 'Like'}</BarLabel>
        </BarButton>
        <BarButton onClick={() => handleReaction('dislike')}>
          <ThumbsDownIcon active={isDisliked} style={{ color: isDisliked ? 'var(--nf-danger)' : 'var(--nf-navy)' }} />
          <BarLabel>{news.dislikedBy?.length || 'Dislike'}</BarLabel>
        </BarButton>
        <BarButton onClick={() => setCommentsOpen(true)}>
          <CommentIcon style={{ color: 'var(--nf-navy)' }} />
          <BarLabel>Comment</BarLabel>
        </BarButton>
        <BarButton onClick={handleBookmark}>
          <SaveIcon active={isBookmarked} style={{ color: isBookmarked ? 'var(--nf-orange)' : 'var(--nf-navy)' }} />
          <BarLabel>Save</BarLabel>
        </BarButton>
        <BarButton onClick={handleShare}>
          <WhatsAppIcon style={{ color: '#25D366' }} />
          <BarLabel>Share</BarLabel>
        </BarButton>
      </div>

      <div className="nf-scroll-body nf-container" style={{ paddingTop: 18 }}>
        <span className="nf-chip active" style={{ marginBottom: 12 }}>{categoryLabel(news.category, lang)}</span>
        <h1 style={{ fontSize: 22, lineHeight: 1.35, marginBottom: 10 }}>{headline}</h1>
        <div style={metaStyle}>
          <span>{news.district}</span>
          <span>•</span>
          <span>
            {isLinkableByline(news) ? (
              <button onClick={() => navigate(`/journalist-profile/${news.authorId}`)} style={authorLinkStyle}>{news.authorName}</button>
            ) : news.authorName}
          </span>
          <span>•</span>
          <span>{news.views || 0} views</span>
        </div>

        <p style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--nf-ink)', whiteSpace: 'pre-wrap', marginBottom: 30 }}>{content}</p>
      </div>

      {commentsOpen && <CommentsPanel newsId={id} onClose={() => setCommentsOpen(false)} />}
    </div>
  )
}

function BarButton({ onClick, children }) {
  return (
    <button onClick={onClick} style={barBtnStyle}>
      {children}
    </button>
  )
}

function BarLabel({ children }) {
  return <span style={{ fontSize: 10, color: 'var(--nf-navy)', fontWeight: 700, marginTop: 3 }}>{children}</span>
}

const backBtnStyle = {
  position: 'absolute', top: 14, left: 14,
  width: 38, height: 38, borderRadius: '50%',
  background: 'rgba(15,31,61,0.55)', border: 'none', color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
}
const dotsRow = { position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }
const dotStyle = { width: 6, height: 6, borderRadius: '50%', background: '#fff' }
const metaStyle = { display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--nf-ink-faint)', fontWeight: 600, marginBottom: 16 }
const authorLinkStyle = {
  border: 'none',
  background: 'none',
  padding: 0,
  font: 'inherit',
  color: 'var(--nf-blue)',
  fontWeight: 700
}
const actionBarStripStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '10px 16px',
  background: 'var(--nf-paper)',
  borderBottom: '1px solid var(--nf-line)'
}
const barBtnStyle = {
  border: 'none',
  background: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
}
