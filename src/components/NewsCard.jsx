// src/components/NewsCard.jsx
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { categoryLabel } from '../utils/categories'
import ImageWatermark from './ImageWatermark'

function timeAgo(ts) {
  if (!ts) return ''
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

// onOpen (optional): when provided (Home's reels-first browsing), tapping the
// card opens the swipeable Reels view at this story instead of navigating to
// the standalone detail page. Other contexts (Search, Bookmarks) omit it and
// keep the normal navigate-to-detail behavior.
export function BigNewsCard({ news, onOpen }) {
  const navigate = useNavigate()
  const { lang } = useLanguage()
  const headline = lang === 'en' && news.headlineEn ? news.headlineEn : news.headline
  const summary = lang === 'en' && news.summaryEn ? news.summaryEn : news.summary

  return (
    <button onClick={() => (onOpen ? onOpen(news) : navigate(`/news/${news.id}`))} style={bigCardStyle}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/10' }}>
        {news.images?.[0] ? (
          <img src={news.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--nf-radius-md) var(--nf-radius-md) 0 0' }} />
        ) : (
          <div style={{ ...placeholderStyle, borderRadius: 'var(--nf-radius-md) var(--nf-radius-md) 0 0' }} />
        )}
        <ImageWatermark size="lg" />
        <div style={overlayStyle}>
          <span className="nf-chip" style={{ background: 'rgba(255,255,255,0.16)', borderColor: 'transparent', color: '#fff', marginBottom: 8 }}>
            {categoryLabel(news.category, lang)}
          </span>
          <h2 style={{ color: '#fff', fontSize: 19, lineHeight: 1.3, textAlign: 'left' }}>{headline}</h2>
        </div>
      </div>
      <div style={{ padding: '12px 16px 16px' }}>
        <p style={{ color: 'var(--nf-ink-soft)', fontSize: 13.5, lineHeight: 1.5, textAlign: 'left' }}>{summary}</p>
        <div style={metaRowStyle}>
          <span>{news.district}</span>
          <span>•</span>
          <span>{timeAgo(news.createdAt)}</span>
        </div>
      </div>
    </button>
  )
}

export function CompactNewsCard({ news, onOpen }) {
  const navigate = useNavigate()
  const { lang } = useLanguage()
  const headline = lang === 'en' && news.headlineEn ? news.headlineEn : news.headline

  return (
    <button onClick={() => (onOpen ? onOpen(news) : navigate(`/news/${news.id}`))} style={compactCardStyle}>
      <div style={{ width: 92, height: 92, flexShrink: 0 }}>
        {news.images?.[0] ? (
          <img src={news.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--nf-radius-sm)' }} />
        ) : (
          <div style={{ ...placeholderStyle, borderRadius: 'var(--nf-radius-sm)', width: '100%', height: '100%' }} />
        )}
      </div>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--nf-orange)', textTransform: 'uppercase' }}>
          {categoryLabel(news.category, lang)}
        </span>
        <h3 style={{ fontSize: 14.5, lineHeight: 1.35, margin: '3px 0 6px', color: 'var(--nf-ink)' }}>{headline}</h3>
        <div style={metaRowStyle}>
          <span>{news.district}</span>
          <span>•</span>
          <span>{timeAgo(news.createdAt)}</span>
        </div>
      </div>
    </button>
  )
}

const bigCardStyle = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  border: 'none',
  background: 'var(--nf-paper)',
  borderRadius: 'var(--nf-radius-md)',
  boxShadow: 'var(--nf-shadow-card)',
  padding: 0,
  overflow: 'hidden'
}
const compactCardStyle = {
  display: 'flex',
  gap: 12,
  width: '100%',
  border: 'none',
  background: 'var(--nf-paper)',
  borderRadius: 'var(--nf-radius-md)',
  boxShadow: 'var(--nf-shadow-card)',
  padding: 10,
  marginBottom: 10
}
const placeholderStyle = {
  width: '100%',
  height: '100%',
  background: 'var(--nf-flow)',
  opacity: 0.18
}
const overlayStyle = {
  position: 'absolute',
  inset: 0,
  background: 'var(--nf-navy-fade)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  padding: 16
}
const metaRowStyle = {
  display: 'flex',
  gap: 6,
  fontSize: 11.5,
  color: 'var(--nf-ink-faint)',
  fontWeight: 600,
  marginTop: 6
}
