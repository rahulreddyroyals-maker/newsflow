// src/journalist/Dashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listenToMyDrafts } from '../services/newsService'

export default function JournalistDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState(null)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    const unsub = listenToMyDrafts(user.uid, setDrafts, (err) => setError(err.message || 'Could not load your reports.'))
    return unsub
  }, [user])

  if (!user) {
    return (
      <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <p style={{ fontWeight: 700, color: 'var(--nf-navy)', marginBottom: 14 }}>Log in as a journalist to submit news</p>
        <button className="nf-btn nf-btn-primary" onClick={() => navigate('/login')}>Log In</button>
      </div>
    )
  }

  if (profile?.role !== 'journalist') {
    return (
      <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <p style={{ fontWeight: 700, color: 'var(--nf-navy)', marginBottom: 8 }}>Journalist accounts only</p>
        <p style={{ fontSize: 13.5, color: 'var(--nf-ink-soft)', textAlign: 'center' }}>Register a journalist account to submit reports for this district.</p>
      </div>
    )
  }

  const filtered = drafts?.filter((d) => filter === 'all' || d.status === filter) || []

  return (
    <div className="nf-screen">
      <div style={{ padding: '18px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 20 }}>My News</h1>
            <div className="nf-flow-rule" style={{ marginTop: 6 }} />
          </div>
          {!profile?.verified && <span className="nf-badge nf-badge-pending">Verification pending</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, margin: '16px 0 6px', overflowX: 'auto' }}>
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button key={f} className={`nf-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f}</button>
          ))}
        </div>
      </div>

      <div className="nf-scroll-body nf-container" style={{ paddingTop: 10 }}>
        {error && (
          <div className="nf-empty" style={{ color: 'var(--nf-danger)' }}>
            <p style={{ fontWeight: 700 }}>Couldn't load your reports</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>{error}</p>
          </div>
        )}
        {!error && drafts === null && <p style={{ color: 'var(--nf-ink-soft)' }}>Loading…</p>}
        {!error && drafts && filtered.length === 0 && (
          <div className="nf-empty">
            <p style={{ fontWeight: 700, color: 'var(--nf-navy)' }}>No reports here</p>
            <p style={{ fontSize: 13.5, marginTop: 4 }}>Tap "Submit News" to file your first report.</p>
          </div>
        )}
        {filtered.map((d) => (
          <div key={d.id} className="nf-card" style={{ padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <h3 style={{ fontSize: 15, lineHeight: 1.35 }}>{d.headline || '(untitled draft)'}</h3>
              <span className={`nf-badge nf-badge-${d.status}`} style={{ flexShrink: 0 }}>{d.status}</span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--nf-ink-faint)', marginTop: 8 }}>{d.district} • {d.category}</p>
            {d.status === 'rejected' && d.rejectionReason && (
              <p style={{ fontSize: 12.5, color: 'var(--nf-danger)', marginTop: 6 }}>Reason: {d.rejectionReason}</p>
            )}
          </div>
        ))}
      </div>

      <button className="nf-btn nf-btn-flow" style={fabStyle} onClick={() => navigate('/journalist/submit')}>+ Submit News</button>
    </div>
  )
}

const fabStyle = {
  position: 'fixed',
  bottom: 'calc(var(--nf-nav-h) + 16px)',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'calc(100% - 32px)',
  maxWidth: 'calc(var(--nf-max-w) - 32px)',
  boxShadow: 'var(--nf-shadow-pop)'
}
