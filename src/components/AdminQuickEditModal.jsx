// src/components/AdminQuickEditModal.jsx
// Lets an admin edit a news item's headline/summary/content/category/district
// right where they found it — no navigating to a separate Manage News screen.
// Opened from NewsCard's admin quick-action menu.
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { updateNews, logAuditEvent } from '../services/newsService'
import { CATEGORIES } from '../utils/categories'
import { ALL_DISTRICTS } from '../utils/districts'

export default function AdminQuickEditModal({ news, onClose, onSaved }) {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({
    headline: news.headline || '',
    summary: news.summary || '',
    content: news.content || '',
    category: news.category || '',
    district: news.district || ''
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function upd(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.headline.trim() || !form.content.trim()) {
      return setError('Headline and content cannot be empty.')
    }
    setBusy(true)
    setError('')
    try {
      await updateNews(news.id, form)
      await logAuditEvent({
        action: 'edit',
        newsId: news.id,
        headline: form.headline,
        performedBy: user?.uid,
        performedByName: profile?.name || 'Admin',
        details: 'Edited from feed'
      })
      onSaved?.({ ...news, ...form })
      onClose()
    } catch (err) {
      setError('Could not save: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
        <div style={handleStyle} />
        <div style={headerStyle}>
          <h3 style={{ fontSize: 16, color: 'var(--nf-navy)' }}>Quick Edit</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, color: 'var(--nf-navy)' }}>✕</button>
        </div>

        <div style={bodyStyle}>
          <div className="nf-input-group">
            <label className="nf-label">Headline</label>
            <input className="nf-input" value={form.headline} onChange={(e) => upd('headline', e.target.value)} />
          </div>
          <div className="nf-input-group">
            <label className="nf-label">Summary</label>
            <textarea className="nf-textarea" rows={2} value={form.summary} onChange={(e) => upd('summary', e.target.value)} />
          </div>
          <div className="nf-input-group">
            <label className="nf-label">Full content</label>
            <textarea className="nf-textarea" rows={6} value={form.content} onChange={(e) => upd('content', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="nf-input-group" style={{ flex: 1 }}>
              <label className="nf-label">Category</label>
              <select className="nf-select" value={form.category} onChange={(e) => upd('category', e.target.value)}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.en}</option>)}
              </select>
            </div>
            <div className="nf-input-group" style={{ flex: 1 }}>
              <label className="nf-label">District</label>
              <select className="nf-select" value={form.district} onChange={(e) => upd('district', e.target.value)}>
                {ALL_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {error && <p style={{ color: 'var(--nf-danger)', fontSize: 13, marginBottom: 10 }}>{error}</p>}

          <button className="nf-btn nf-btn-primary nf-btn-block" disabled={busy} onClick={handleSave}>
            {busy ? 'Saving…' : '✓ Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 95,
  background: 'rgba(15,31,61,0.45)',
  maxWidth: 'var(--nf-max-w)',
  margin: '0 auto',
  display: 'flex',
  alignItems: 'flex-end'
}
const sheetStyle = {
  width: '100%',
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--nf-paper)',
  borderRadius: '18px 18px 0 0',
  padding: '10px 16px 20px'
}
const handleStyle = {
  width: 36, height: 4, borderRadius: 4,
  background: 'var(--nf-line)', margin: '4px auto 10px'
}
const headerStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  marginBottom: 14
}
const bodyStyle = {
  overflowY: 'auto',
  flex: 1
}
