// src/admin/Approvals.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listenToPendingDrafts, approveDraft, rejectDraft, updateDraft, uploadImage, uploadVideo } from '../services/newsService'
import { validateVideoFile, MAX_VIDEO_SECONDS } from '../utils/video'

export default function Approvals() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [edits, setEdits] = useState({})
  const [videoError, setVideoError] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    const unsub = listenToPendingDrafts(setDrafts, (err) => setError(err.message || 'Could not load pending drafts.'))
    return unsub
  }, [isAdmin])

  if (!isAdmin) {
    return <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center' }}><p>Admins only</p></div>
  }

  function startEdit(d) {
    setEditingId(d.id)
    setExpandedId(d.id) // editing implies seeing the full article
    setEdits({ headline: d.headline, summary: d.summary, article: d.article, images: d.images || [], videoUrl: d.videoUrl || null })
  }

  async function handleImageReplace(file) {
    setBusyId(editingId)
    const url = await uploadImage(file)
    setEdits((x) => ({ ...x, images: [url, ...(x.images || []).slice(1)] }))
    setBusyId(null)
  }

  async function handleVideoReplace(file) {
    setVideoError('')
    const result = await validateVideoFile(file)
    if (!result.valid) return setVideoError(result.error)
    setBusyId(editingId)
    const url = await uploadVideo(file)
    setEdits((x) => ({ ...x, videoUrl: url }))
    setBusyId(null)
  }

  async function saveEdit(d) {
    setBusyId(d.id)
    await updateDraft(d.id, edits)
    setBusyId(null)
    setEditingId(null)
  }

  async function handleApprove(d) {
    setBusyId(d.id)
    // If there are unsaved edits open for this draft, save them first so
    // what gets published matches what the admin just reviewed.
    const toApprove = editingId === d.id ? { ...d, ...edits } : d
    if (editingId === d.id) await updateDraft(d.id, edits)
    await approveDraft(toApprove)
    setBusyId(null)
    setEditingId(null)
  }

  async function handleReject(d) {
    const reason = window.prompt('Reason for rejection (shown to journalist):') || ''
    setBusyId(d.id)
    await rejectDraft(d.id, reason)
    setBusyId(null)
  }

  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--nf-paper)' }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
        <h2 style={{ fontSize: 17 }}>Pending Approval</h2>
      </div>

      <div className="nf-scroll-body nf-container" style={{ paddingTop: 16 }}>
        {error && (
          <div className="nf-empty" style={{ color: 'var(--nf-danger)' }}>
            <p style={{ fontWeight: 700 }}>Couldn't load pending drafts</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>{error}</p>
          </div>
        )}
        {!error && drafts === null && <p style={{ color: 'var(--nf-ink-soft)' }}>Loading…</p>}
        {!error && drafts?.length === 0 && (
          <div className="nf-empty">
            <p style={{ fontWeight: 700, color: 'var(--nf-navy)' }}>All caught up</p>
            <p style={{ fontSize: 13.5, marginTop: 4 }}>No drafts waiting for review.</p>
          </div>
        )}
        {drafts?.map((d) => {
          const expanded = expandedId === d.id
          const editing = editingId === d.id
          return (
            <div key={d.id} className="nf-card" style={{ padding: 14, marginBottom: 12 }}>
              {d.images?.[0] && !editing && <img src={d.images[0]} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />}
              {d.videoUrl && !editing && <video controls src={d.videoUrl} style={{ width: '100%', maxHeight: 160, borderRadius: 8, marginBottom: 10 }} />}

              {editing && (
                <>
                  {edits.images?.[0] && <img src={edits.images[0]} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
                  <label className="nf-label">Replace photo</label>
                  <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && handleImageReplace(e.target.files[0])} style={{ marginBottom: 10 }} />

                  {edits.videoUrl && (
                    <>
                      <video controls src={edits.videoUrl} style={{ width: '100%', maxHeight: 160, borderRadius: 8, marginBottom: 8 }} />
                      <button type="button" className="nf-btn nf-btn-ghost" style={{ marginBottom: 8 }} onClick={() => setEdits((x) => ({ ...x, videoUrl: null }))}>Remove video</button>
                    </>
                  )}
                  <label className="nf-label">{edits.videoUrl ? 'Replace video' : `Add video (max ${MAX_VIDEO_SECONDS}s)`}</label>
                  <input type="file" accept="video/*" onChange={(e) => e.target.files[0] && handleVideoReplace(e.target.files[0])} style={{ marginBottom: 6 }} />
                  {videoError && <p style={{ color: 'var(--nf-danger)', fontSize: 12, marginBottom: 10 }}>{videoError}</p>}
                </>
              )}

              {editing ? (
                <input
                  className="nf-input"
                  style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}
                  value={edits.headline}
                  onChange={(e) => setEdits((x) => ({ ...x, headline: e.target.value }))}
                />
              ) : (
                <h3 style={{ fontSize: 15.5, lineHeight: 1.35 }}>{d.headline}</h3>
              )}

              <p style={{ fontSize: 12.5, color: 'var(--nf-ink-faint)', margin: '6px 0 10px' }}>
                {d.district} • {d.category} • {d.sourceName ? `source: ${d.sourceName}` : `by ${d.authorName}`}
              </p>

              {editing ? (
                <textarea
                  className="nf-textarea"
                  rows={2}
                  value={edits.summary}
                  onChange={(e) => setEdits((x) => ({ ...x, summary: e.target.value }))}
                />
              ) : (
                <p style={{ fontSize: 13.5, color: 'var(--nf-ink-soft)', lineHeight: 1.6 }}>{d.summary}</p>
              )}

              {expanded && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--nf-line)' }}>
                  {editing ? (
                    <textarea
                      className="nf-textarea"
                      rows={7}
                      value={edits.article}
                      onChange={(e) => setEdits((x) => ({ ...x, article: e.target.value }))}
                    />
                  ) : (
                    <p style={{ fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{d.article}</p>
                  )}
                  {d.audioUrl && <audio controls src={d.audioUrl} style={{ width: '100%', marginTop: 10 }} />}
                </div>
              )}

              <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                <button onClick={() => setExpandedId(expanded ? null : d.id)} style={linkBtnStyle}>
                  {expanded ? 'Show less ▲' : 'Show full article ▼'}
                </button>
                {!editing && (
                  <button onClick={() => startEdit(d)} style={linkBtnStyle}>✎ Edit</button>
                )}
              </div>

              {editing ? (
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button className="nf-btn nf-btn-primary" style={{ flex: 1 }} disabled={busyId === d.id} onClick={() => saveEdit(d)}>
                    {busyId === d.id ? 'Saving…' : '✓ Save changes'}
                  </button>
                  <button className="nf-btn nf-btn-ghost" style={{ flex: 1 }} onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button className="nf-btn nf-btn-primary" style={{ flex: 1 }} disabled={busyId === d.id} onClick={() => handleApprove(d)}>
                    {busyId === d.id ? 'Working…' : '✓ Approve'}
                  </button>
                  <button className="nf-btn nf-btn-ghost" style={{ flex: 1, color: 'var(--nf-danger)' }} disabled={busyId === d.id} onClick={() => handleReject(d)}>✕ Reject</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const linkBtnStyle = {
  border: 'none',
  background: 'none',
  color: 'var(--nf-blue)',
  fontSize: 12.5,
  fontWeight: 700,
  padding: 0
}
