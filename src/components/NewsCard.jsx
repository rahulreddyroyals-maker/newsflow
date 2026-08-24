// src/components/NewsCard.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { categoryLabel } from '../utils/categories'
import { updateNews, deleteNews, logAuditEvent } from '../services/newsService'
import ImageWatermark from './ImageWatermark'
import AdminQuickEditModal from './AdminQuickEditModal'

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

// Shared admin quick-action menu — a small "⋮" button that expands into
// Edit / Hide / Delete, usable directly wherever a card is rendered (Home
// feed, Search, Bookmarks, Journalist profile) without navigating to a
// separate Manage News screen. Only rendered for admins.
function AdminQuickActions({ news, onLocalUpdate }) {
  const { user, profile, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [localStatus, setLocalStatus] = useState(news.status || 'approved')
  const [removed, setRemoved] = useState(false)

  if (!isAdmin) return null
  if (removed) return null

  const isHidden = localStatus === 'hidden'

  async function handleHideToggle(e) {
    e.stopPropagation()
    setBusy(true)
    const nextStatus = isHidden ? 'approved' : 'hidden'
    try {
      await updateNews(news.id, { status: nextStatus })
      await logAuditEvent({
        action: nextStatus === 'hidden' ? 'hide' : 'republish',
        newsId: news.id,
        headline: news.headline,
        performedBy: user?.uid,
        performedByName: profile?.name || 'Admin',
        details: 'From feed quick actions'
      })
      setLocalStatus(nextStatus)
      onLocalUpdate?.({ ...news, status: nextStatus })
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  async function handleDelete(e) {
    e.stopPropagation()
    if (!window.confirm(`Delete "${news.headline}"? This cannot be undone.`)) { setOpen(false); return }
    setBusy(true)
    try {
      await deleteNews(news.id)
      await logAuditEvent({
        action: 'delete',
        newsId: news.id,
        headline: news.headline,
        performedBy: user?.uid,
        performedByName: profile?.name || 'Admin',
        details: 'From feed quick actions'
      })
      setRemoved(true)
    } finally {
      setBusy(false)
    }
  }

  function handleEditClick(e) {
    e.stopPropagation()
    setEditing(true)
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        style={menuBtnStyle}
        aria-label="Admin actions"
      >
        ⋮
      </button>

      {open && (
        <div onClick={(e) => e.stopPropagation()} style={menuPanelStyle}>
          <button onClick={handleEditClick} style={menuItemStyle}>✎ Edit</button>
          <button onClick={handleHideToggle} disabled={busy} style={menuItemStyle}>
            {isHidden ? '↻ Republish' : '🚫 Hide'}
          </button>
          <button onClick={handleDelete} disabled={busy} style={{ ...menuItemStyle, color: 'var(--nf-danger)' }}>🗑 Delete</button>
        </div>
      )}

      {isHidden && <span style={hiddenBadgeStyle}>Hidden</span>}

      {editing && (
        <AdminQuickEditModal
          news={news}
          onClose={() => setEditing(false)}
          onSaved={(updated) => onLocalUpdate?.(updated)}
        />
      )}
    </>
  )
}

export function BigNewsCard({ news: initialNews, onOpen }) {
  const navigate = useNavigate()
  const { lang } = useLanguage()
  const [news, setNews] = useState(initialNews)
  const headline = lang === 'en' && news.headlineEn ? news.headlineEn : news.headline
  const summary = lang === 'en' && news.summaryEn ? news.summaryEn : news.summary

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => (onOpen ? onOpen(news) : navigate(`/news/${news.id}`))} style={bigCardStyle}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/10' }}>
          {news.images?.[0] ? (
            <img src={news.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--nf-radius-md) var(--nf-radius-md) 0 0' }} />
          ) : (
            <div style={{ ...placeholderStyle, borderRadius: 'var(--nf-radius-md) var(--nf-radius-md) 0 0' }} />
          )}
          <ImageWatermark size="lg" />
          {news.videoUrl && <PlayBadge size="lg" />}
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
      <div style={adminMenuAnchorStyle}>
        <AdminQuickActions news={news} onLocalUpdate={setNews} />
      </div>
    </div>
  )
}

export function CompactNewsCard({ news: initialNews, onOpen }) {
  const navigate = useNavigate()
  const { lang } = useLanguage()
  const [news, setNews] = useState(initialNews)
  const headline = lang === 'en' && news.headlineEn ? news.headlineEn : news.headline

  return (
    <div style={{ position: 'relative', marginBottom: 10 }}>
      <button onClick={() => (onOpen ? onOpen(news) : navigate(`/news/${news.id}`))} style={compactCardStyle}>
        <div style={{ width: 92, height: 92, flexShrink: 0, position: 'relative' }}>
          {news.images?.[0] ? (
            <img src={news.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--nf-radius-sm)' }} />
          ) : (
            <div style={{ ...placeholderStyle, borderRadius: 'var(--nf-radius-sm)', width: '100%', height: '100%' }} />
          )}
          {news.videoUrl && <PlayBadge size="sm" />}
        </div>
        <div style={{ flex: 1, textAlign: 'left', paddingRight: 26 }}>
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
      <div style={adminMenuAnchorCompactStyle}>
        <AdminQuickActions news={news} onLocalUpdate={setNews} />
      </div>
    </div>
  )
}

function PlayBadge({ size }) {
  const isLg = size === 'lg'
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1, pointerEvents: 'none'
    }}>
      <div style={{
        width: isLg ? 48 : 30, height: isLg ? 48 : 30, borderRadius: '50%',
        background: 'rgba(15,31,61,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{
          width: 0, height: 0,
          borderTop: `${isLg ? 9 : 6}px solid transparent`,
          borderBottom: `${isLg ? 9 : 6}px solid transparent`,
          borderLeft: `${isLg ? 14 : 9}px solid #fff`,
          marginLeft: 2
        }} />
      </div>
    </div>
  )
}

const bigCardStyle = {
  display: 'block', width: '100%', textAlign: 'left', border: 'none',
  background: 'var(--nf-paper)', borderRadius: 'var(--nf-radius-md)',
  boxShadow: 'var(--nf-shadow-card)', padding: 0, overflow: 'hidden'
}
const compactCardStyle = {
  display: 'flex', gap: 12, width: '100%', border: 'none',
  background: 'var(--nf-paper)', borderRadius: 'var(--nf-radius-md)',
  boxShadow: 'var(--nf-shadow-card)', padding: 10
}
const placeholderStyle = { width: '100%', height: '100%', background: 'var(--nf-flow)', opacity: 0.18 }
const overlayStyle = {
  position: 'absolute', inset: 0, background: 'var(--nf-navy-fade)',
  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 16
}
const metaRowStyle = { display: 'flex', gap: 6, fontSize: 11.5, color: 'var(--nf-ink-faint)', fontWeight: 600, marginTop: 6 }

const adminMenuAnchorStyle = { position: 'absolute', top: 10, right: 10, zIndex: 2 }
const adminMenuAnchorCompactStyle = { position: 'absolute', top: 8, right: 8, zIndex: 2 }
const menuBtnStyle = {
  width: 28, height: 28, borderRadius: '50%',
  background: 'rgba(15,31,61,0.55)', color: '#fff', border: 'none',
  fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
}
const menuPanelStyle = {
  position: 'absolute', top: 32, right: 0, zIndex: 3,
  background: 'var(--nf-paper)', borderRadius: 10, boxShadow: 'var(--nf-shadow-pop)',
  minWidth: 130, overflow: 'hidden', border: '1px solid var(--nf-line)'
}
const menuItemStyle = {
  display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'none',
  padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--nf-navy)'
}
const hiddenBadgeStyle = {
  position: 'absolute', top: 10, left: 10, zIndex: 2,
  background: 'var(--nf-danger)', color: '#fff', fontSize: 10, fontWeight: 800,
  padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase'
}
