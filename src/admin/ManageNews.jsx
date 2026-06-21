// src/admin/ManageNews.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listAllNews, updateNews, deleteNews, uploadImage } from '../services/newsService'

// Lets an admin fix anything already live — wording, category/district, the
// byline (useful for cleaning up older RSS items that still say "RSS · X"
// before that was changed to show "NewsFlow"), or swap the photo entirely
// for a journalist's or RSS-sourced report.
export default function ManageNews() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [edits, setEdits] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    listAllNews().then(setItems).catch((err) => setError(err.message))
  }, [isAdmin])

  if (!isAdmin) {
    return <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center' }}><p>Admins only</p></div>
  }

  function startEdit(item) {
    setEditingId(item.id)
    setEdits({ headline: item.headline, summary: item.summary, content: item.content, authorName: item.authorName, images: item.images || [] })
  }

  async function handleImageReplace(file) {
    setBusyId(editingId)
    const url = await uploadImage(file)
    setEdits((x) => ({ ...x, images: [url, ...(x.images || []).slice(1)] }))
    setBusyId(null)
  }

  async function saveEdit(item) {
    setBusyId(item.id)
    await updateNews(item.id, edits)
    setItems((list) => list.map((n) => (n.id === item.id ? { ...n, ...edits } : n)))
    setBusyId(null)
    setEditingId(null)
  }

  async function handleDelete(item) {
    if (!window.confirm('Remove this story from the live feed? This cannot be undone.')) return
    setBusyId(item.id)
    await deleteNews(item.id)
    setItems((list) => list.filter((n) => n.id !== item.id))
    setBusyId(null)
  }

  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--nf-paper)' }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
        <h2 style={{ fontSize: 17 }}>Edit Published News</h2>
      </div>

      <div className="nf-scroll-body nf-container" style={{ paddingTop: 16 }}>
        {error && <p style={{ color: 'var(--nf-danger)', fontSize: 13 }}>{error}</p>}
        {items === null && !error && <p style={{ color: 'var(--nf-ink-soft)' }}>Loading…</p>}
        {items?.length === 0 && (
          <div className="nf-empty">
            <p style={{ fontWeight: 700, color: 'var(--nf-navy)' }}>No published news yet</p>
          </div>
        )}

        {items?.map((item) => {
          const editing = editingId === item.id
          return (
            <div key={item.id} className="nf-card" style={{ padding: 14, marginBottom: 12 }}>
              {editing ? (
                <>
                  {edits.images?.[0] && <img src={edits.images[0]} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
                  <label className="nf-label">Replace photo</label>
                  <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && handleImageReplace(e.target.files[0])} style={{ marginBottom: 12 }} />

                  <label className="nf-label">Byline</label>
                  <input className="nf-input" value={edits.authorName} onChange={(e) => setEdits((x) => ({ ...x, authorName: e.target.value }))} style={{ marginBottom: 10 }} />

                  <label className="nf-label">Headline</label>
                  <input className="nf-input" value={edits.headline} onChange={(e) => setEdits((x) => ({ ...x, headline: e.target.value }))} style={{ marginBottom: 10 }} />

                  <label className="nf-label">Summary</label>
                  <textarea className="nf-textarea" rows={2} value={edits.summary} onChange={(e) => setEdits((x) => ({ ...x, summary: e.target.value }))} style={{ marginBottom: 10 }} />

                  <label className="nf-label">Full article</label>
                  <textarea className="nf-textarea" rows={6} value={edits.content} onChange={(e) => setEdits((x) => ({ ...x, content: e.target.value }))} style={{ marginBottom: 12 }} />

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="nf-btn nf-btn-primary" style={{ flex: 1 }} disabled={busyId === item.id} onClick={() => saveEdit(item)}>
                      {busyId === item.id ? 'Saving…' : '✓ Save'}
                    </button>
                    <button className="nf-btn nf-btn-ghost" style={{ flex: 1 }} onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  {item.images?.[0] && <img src={item.images[0]} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />}
                  <h3 style={{ fontSize: 15, lineHeight: 1.35 }}>{item.headline}</h3>
                  <p style={{ fontSize: 12.5, color: 'var(--nf-ink-faint)', margin: '6px 0 12px' }}>{item.district} • {item.category} • by {item.authorName}</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="nf-btn nf-btn-ghost" style={{ flex: 1 }} onClick={() => startEdit(item)}>✎ Edit</button>
                    <button className="nf-btn nf-btn-ghost" style={{ flex: 1, color: 'var(--nf-danger)' }} disabled={busyId === item.id} onClick={() => handleDelete(item)}>🗑 Remove</button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
