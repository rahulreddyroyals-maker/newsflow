// src/admin/Dashboard.jsx
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

  const buttons = [
    { label: 'Review Pending News →', variant: 'nf-btn-flow', path: '/admin/approvals' },
    { label: '+ Upload News Directly', variant: 'nf-btn-primary', path: '/admin/upload' },
    { label: '📺 Manage Advertisements', variant: 'nf-btn-ghost', path: '/admin/advertisements' },
    { label: '🗂️ Pending Classifieds', variant: 'nf-btn-ghost', path: '/admin/manage-classifieds' },
    { label: 'Edit / Hide Published News', variant: 'nf-btn-ghost', path: '/admin/manage-news' },
    { label: '📢 Local Ad Leads', variant: 'nf-btn-ghost', path: '/admin/ad-leads' },
    { label: '💰 Withdrawal Requests', variant: 'nf-btn-ghost', path: '/admin/withdrawals' },
    { label: '👥 Manage Admins', variant: 'nf-btn-ghost', path: '/admin/manage-admins' },
    { label: '🐛 Error Logs', variant: 'nf-btn-ghost', path: '/admin/error-logs' },
    { label: 'Manage Journalists', variant: 'nf-btn-ghost', path: '/admin/journalists' }
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

        {buttons.map((b, i) => (
          <button
            key={b.path}
            className={`nf-btn ${b.variant} nf-btn-block`}
            style={{ marginTop: i === 0 ? 18 : 10, marginBottom: i === buttons.length - 1 ? 40 : 0 }}
            onClick={() => navigate(b.path)}
          >
            {b.label}
          </button>
        ))}
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
