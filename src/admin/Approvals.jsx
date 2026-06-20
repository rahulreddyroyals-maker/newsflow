// src/admin/Approvals.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listenToPendingDrafts, approveDraft, rejectDraft } from '../services/newsService'

export default function Approvals() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    const unsub = listenToPendingDrafts(setDrafts, (err) => setError(err.message || 'Could not load pending drafts.'))
    return unsub
  }, [isAdmin])

  if (!isAdmin) {
    return <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center' }}><p>Admins only</p></div>
  }

  async function handleApprove(d) {
    setBusyId(d.id)
    await approveDraft(d)
    setBusyId(null)
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
          return (
            <div key={d.id} className="nf-card" style={{ padding: 14, marginBottom: 12 }}>
              {d.images?.[0] && <img src={d.images[0]} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />}
              <h3 style={{ fontSize: 15.5, lineHeight: 1.35 }}>{d.headline}</h3>
              <p style={{ fontSize: 12.5, color: 'var(--nf-ink-faint)', margin: '6px 0 10px' }}>{d.district} • {d.category} • by {d.authorName}</p>
              <p style={{ fontSize: 13.5, color: 'var(--nf-ink-soft)', lineHeight: 1.6 }}>{d.summary}</p>

              {expanded && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--nf-line)' }}>
                  <p style={{ fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{d.article}</p>
                  {d.audioUrl && <audio controls src={d.audioUrl} style={{ width: '100%', marginTop: 10 }} />}
                </div>
              )}

              <button onClick={() => setExpandedId(expanded ? null : d.id)} style={{ border: 'none', background: 'none', color: 'var(--nf-blue)', fontSize: 12.5, fontWeight: 700, marginTop: 8, padding: 0 }}>
                {expanded ? 'Show less ▲' : 'Show full article ▼'}
              </button>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button className="nf-btn nf-btn-primary" style={{ flex: 1 }} disabled={busyId === d.id} onClick={() => handleApprove(d)}>✓ Approve</button>
                <button className="nf-btn nf-btn-ghost" style={{ flex: 1, color: 'var(--nf-danger)' }} disabled={busyId === d.id} onClick={() => handleReject(d)}>✕ Reject</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
