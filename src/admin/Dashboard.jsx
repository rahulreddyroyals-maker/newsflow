// src/admin/Dashboard.jsx
// FIX: scroll wasn't working. In a flex-column parent (nf-screen), a
// scrollable child needs min-height:0 explicitly — without it, some browsers
// let the content's natural height push the flex item past the viewport
// instead of clipping+scrolling it, especially once enough buttons/tiles
// stack up to exceed one screen. Also gave the header flex-shrink:0 so it
// can never be compressed or miscalculated as part of the scrollable area.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardCounts } from '../services/newsService'

export default function AdminDashboard() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [counts, setCounts] = useState(null)

  useEffect(() => {
    if (isAdmin) getDashboardCounts().then(setCounts)
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <p style={{ fontWeight: 700, color: 'var(--nf-navy)' }}>Admins only</p>
      </div>
    )
  }

  const tiles = [
    { label: 'Total News', value: counts?.totalNews, color: 'var(--nf-navy)' },
    { label: 'Pending Approval', value: counts?.pendingNews, color: 'var(--nf-orange)', onClick: () => navigate('/admin/approvals') },
    { label: 'Journalists', value: counts?.journalists, color: 'var(--nf-blue)', onClick: () => navigate('/admin/journalists') },
    { label: 'Readers', value: counts?.readers, color: 'var(--nf-success)' }
  ]

  return (
    <div style={screenStyle}>
      <div style={headerStyle}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Admin Dashboard</h1>
        <div className="nf-flow-rule" style={{ marginTop: 8 }} />
      </div>

      <div style={scrollBodyStyle} className="nf-container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 18 }}>
          {tiles.map((t) => (
            <button key={t.label} className="nf-card" style={tileStyle} onClick={t.onClick}>
              <span style={{ fontSize: 28, fontWeight: 800, color: t.color }}>{t.value ?? '—'}</span>
              <span style={{ fontSize: 12.5, color: 'var(--nf-ink-soft)', fontWeight: 600 }}>{t.label}</span>
            </button>
          ))}
        </div>

        <button className="nf-btn nf-btn-flow nf-btn-block" style={{ marginTop: 18 }} onClick={() => navigate('/admin/approvals')}>
          Review Pending News →
        </button>
        <button className="nf-btn nf-btn-primary nf-btn-block" style={{ marginTop: 10 }} onClick={() => navigate('/admin/upload')}>
          + Upload News Directly
        </button>
        <button className="nf-btn nf-btn-ghost nf-btn-block" style={{ marginTop: 10 }} onClick={() => navigate('/admin/advertisements')}>
          📺 Manage Advertisements
        </button>
        <button className="nf-btn nf-btn-ghost nf-btn-block" style={{ marginTop: 10 }} onClick={() => navigate('/admin/manage-news')}>
          Edit / Hide Published News
        </button>
        <button className="nf-btn nf-btn-ghost nf-btn-block" style={{ marginTop: 10 }} onClick={() => navigate('/admin/ad-leads')}>
          📢 Local Ad Leads
        </button>
        <button className="nf-btn nf-btn-ghost nf-btn-block" style={{ marginTop: 10 }} onClick={() => navigate('/admin/withdrawals')}>
          💰 Withdrawal Requests
        </button>
        <button className="nf-btn nf-btn-ghost nf-btn-block" style={{ marginTop: 10, marginBottom: 40 }} onClick={() => navigate('/admin/journalists')}>
          Manage Journalists
        </button>
      </div>
    </div>
  )
}

const tileStyle = {
  border: 'none',
  padding: '20px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  textAlign: 'left'
}

// Explicit inline styles (not relying solely on the shared .nf-screen /
// .nf-scroll-body classes) so this page's scroll behaviour can't be broken
// by a shared CSS rule changing elsewhere in the app.
const screenStyle = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--nf-paper-dim)',
  overflow: 'hidden'
}
const headerStyle = {
  flexShrink: 0,
  padding: '20px 16px 0'
}
const scrollBodyStyle = {
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  paddingBottom: 'calc(var(--nf-nav-h) + 20px)'
}
