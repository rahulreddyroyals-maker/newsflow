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

  return (
    <div className="nf-screen">
      <div style={{ padding: '20px 16px 0' }}>
        <h1 style={{ fontSize: 20 }}>Admin Dashboard</h1>
        <div className="nf-flow-rule" style={{ marginTop: 8, marginBottom: 18 }} />
      </div>
      <div className="nf-scroll-body nf-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {tiles.map((t) => (
          <button key={t.label} className="nf-card" style={tileStyle} onClick={t.onClick}>
            <span style={{ fontSize: 28, fontWeight: 800, color: t.color }}>{t.value ?? '—'}</span>
            <span style={{ fontSize: 12.5, color: 'var(--nf-ink-soft)', fontWeight: 600 }}>{t.label}</span>
          </button>
        ))}
        <button className="nf-btn nf-btn-flow" style={{ gridColumn: 'span 2', marginTop: 6 }} onClick={() => navigate('/admin/approvals')}>
          Review Pending News →
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
