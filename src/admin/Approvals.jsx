// src/admin/Approvals.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listenToPendingDrafts, approveDraft, rejectDraft, rejectDraftsBulk, updateDraft, uploadImage, uploadVideo, logAuditEvent } from '../services/newsService'
import { validateVideoFile, MAX_VIDEO_SECONDS } from '../utils/video'
import { Events } from '../services/analytics'

export default function Approvals() {
  const { isAdmin, user, profile } = useAuth()
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [edits, setEdits] = useState({})
  const [videoError, setVideoError] = useState('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    const unsub = listenToPendingDrafts(setDrafts, (err) => setError(err.message || 'Could not load pending drafts.'))
    return unsub
  }, [isAdmin])

  if (!isAdmin) {
    return <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center' }}><p>Admins only</p></div>
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allSelected = !!drafts?.length && drafts.every((d) => selected.has(d.id))
  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set((drafts || []).map((d) => d.id)))
  }

  async function runBulkReject(list, label) {
    if (!list.length || bulkBusy) return
    if (!window.confirm(`Reject ${label} (${list.length} post${list.length > 1 ? 's' : ''})? This cannot be undone.`)) return
    const reason = window.prompt('Reason for rejection (optional, applied to all):') || ''
    setBulkBusy(true)
    try {
      await rejectDraftsBulk(
        list.map((d) => ({ id: d.id, headline: d.headline })),
        reason,
        { uid: user?.uid, name: profile?.name || 'Admin' }
      )
      setSelected(new Set())
    } catch (err) {
      setError(err.message || 'Bulk reject failed.')
    }
    setBulkBusy(false)
  }

  const rejectSelected = () => runBulkReject((drafts || []).filter((d) => selected.has(d.id)), 'selected')
  const rejectAll = () => runBulkReject(drafts || [], 'ALL pending')
  const rejectAllRss = () => runBulkReject((drafts || []).filter((d) => d.authorId === 'system-rss' || d.sourceName), 'all RSS / news-feed')

  function startEdit(d) {
    setEditingId(d.id)
    setExpandedId(d.id)
    setEdits({
      headline: d.headline, summary: d.summary, article: d.article,
      headlineEn: d.headlineEn || '', summaryEn: d.summaryEn || '', articleEn: d.articleEn || '',
      images: d.images || [], videoUrl: d.videoUrl || null
    })
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
    const toApprove = editingId === d.id ? { ...d, ...edits } : d
    if (editingId === d.id) await updateDraft(d.id, edits)
    const newsId = await approveDraft(toApprove)
    await logAuditEvent({
      action: 'approve',
      newsId,
      headline: toApprove.headline,
      performedBy: user?.uid,
      performedByName: profile?.name || 'Admin',
      details: `Submitted by ${d.authorName || d.sourceName || 'unknown'}`
    })
    Events.approveReport(d.district, d.category)
    setBusyId(null)
    setEditingId(null)
  }

  async function handleReject(d) {
    const reason = window.prompt('Reason for rejection (shown to journalist):') || ''
    setBusyId(d.id)
    await rejectDraft(d.id, reason)
    await logAuditEvent({
      action: 'reject',
      newsId: d.id,
      headline: d.headline,
      performedBy: user?.uid,
      performedByName: profile?.name || 'Admin',
      details: reason || '(no reason given)'
    })
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
        {drafts?.length > 0 && (
          <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--nf-paper)', padding: '8px 0 10px', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                Select all ({drafts.length})
              </label>
              {selected.size > 0 && (
                <button className="nf-btn nf-btn-ghost" style={{ color: 'var(--nf-danger)', padding: '6px 12px' }} disabled={bulkBusy} onClick={rejectSelected}>
                  {bulkBusy ? 'Rejecting…' : `✕ Reject selected (${selected.size})`}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <button className="nf-btn nf-btn-ghost" style={{ color: 'var(--nf-danger)', padding: '6px 12px' }} disabled={bulkBusy} onClick={rejectAllRss}>
                Reject all RSS / feed items
              </button>
              <button className="nf-btn nf-btn-ghost" style={{ color: 'var(--nf-danger)', padding: '6px 12px' }} disabled={bulkBusy} onClick={rejectAll}>
                Reject ALL pending
              </button>
            </div>
          </div>
        )}
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
            <div key={d.id} className="nf-card" style={{ padding: 14, marginBottom: 12, outline: selected.has(d.id) ? '2px solid var(--nf-blue)' : 'none' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 8, color: 'var(--nf-ink-soft)' }}>
                <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleSelect(d.id)} /> Select
              </label>
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

              {d.possibleDuplicate && (
                <div style={{ background: '#FFF1DD', borderRadius: 8, padding: 10, margin: '8px 0' }}>
                  <p style={{ fontSize: 11.5, color: 'var(--nf-warning)', fontWeight: 700 }}>
                    ⚠ {d.duplicateSimilarity}% similar to a recent report: "{d.duplicateOfHeadline}"
                  </p>
                </div>
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

                  {(d.headlineEn || editing) && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--nf-line)' }}>
                      <p className="nf-label" style={{ marginBottom: 8 }}>English version {!d.headlineEn && !editing ? '(none submitted)' : ''}</p>
                      {editing ? (
                        <>
                          <input
                            className="nf-input"
                            style={{ fontWeight: 700, marginBottom: 8 }}
                            placeholder="Headline (EN)"
                            value={edits.headlineEn}
                            onChange={(e) => setEdits((x) => ({ ...x, headlineEn: e.target.value }))}
                          />
                          <textarea
                            className="nf-textarea"
                            rows={2}
                            placeholder="Summary (EN)"
                            style={{ marginBottom: 8 }}
                            value={edits.summaryEn}
                            onChange={(e) => setEdits((x) => ({ ...x, summaryEn: e.target.value }))}
                          />
                          <textarea
                            className="nf-textarea"
                            rows={6}
                            placeholder="Full article (EN)"
                            value={edits.articleEn}
                            onChange={(e) => setEdits((x) => ({ ...x, articleEn: e.target.value }))}
                          />
                        </>
                      ) : (
                        <>
                          <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{d.headlineEn}</p>
                          <p style={{ fontSize: 13, color: 'var(--nf-ink-soft)', marginBottom: 8 }}>{d.summaryEn}</p>
                          <p style={{ fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{d.articleEn}</p>
                        </>
                      )}
                    </div>
                  )}
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
