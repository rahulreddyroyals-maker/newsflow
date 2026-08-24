// src/admin/AuditLogs.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listAuditLogs } from '../services/newsService'

const ACTION_LABELS = {
  approve: { label: 'Approved', icon: '✓', color: 'var(--nf-success)' },
  reject: { label: 'Rejected', icon: '✕', color: 'var(--nf-danger)' },
  edit: { label: 'Edited', icon: '✎', color: 'var(--nf-blue)' },
  hide: { label: 'Hidden', icon: '🚫', color: 'var(--nf-warning)' },
  republish: { label: 'Republished', icon: '↻', color: 'var(--nf-success)' },
  delete: { label: 'Deleted', icon: '🗑', color: 'var(--nf-danger)' }
}

function tsMs(ts) {
  if (!ts) return 0
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  return 0
}

export default function AuditLogs() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [logs, setLogs] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (isAdmin) listAuditLogs().then(setLogs)
  }, [isAdmin])

  if (!isAdmin) return <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center' }}><p>Admins only</p></div>

  const filtered = logs?.filter((l) => filter === 'all' || l.action === filter) || []

  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--nf-paper)', flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
        <h2 style={{ fontSize: 17 }}>Audit Log</h2>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', flexShrink: 0, borderBottom: '1px solid var(--nf-line)' }}>
        <button className={`nf-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
        {Object.keys(ACTION_LABELS).map((a) => (
          <button key={a} className={`nf-chip ${filter === a ? 'active' : ''}`} onClick={() => setFilter(a)}>
            {ACTION_LABELS[a].icon} {ACTION_LABELS[a].label}
          </button>
        ))}
      </div>

      <div className="nf-scroll-body nf-container" style={{ paddingTop: 16 }}>
        {logs === null && <p style={{ color: 'var(--nf-ink-soft)' }}>Loading…</p>}
        {logs !== null && filtered.length === 0 && (
          <div className="nf-empty"><p style={{ fontWeight: 700, color: 'var(--nf-navy)' }}>No activity logged yet</p></div>
        )}
        {filtered.map((log) => {
          const meta = ACTION_LABELS[log.action] || { label: log.action, icon: '•', color: 'var(--nf-ink-soft)' }
          return (
            <div key={log.id} className="nf-card" style={{ padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15 }}>{meta.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{meta.label}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--nf-ink-faint)' }}>{new Date(tsMs(log.createdAt)).toLocaleString()}</span>
              </div>
              {log.headline && <p style={{ fontSize: 13.5, fontWeight: 600, marginTop: 8 }}>{log.headline}</p>}
              <p style={{ fontSize: 12, color: 'var(--nf-ink-soft)', marginTop: 4 }}>
                by <strong>{log.performedByName}</strong>
              </p>
              {log.details && <p style={{ fontSize: 11.5, color: 'var(--nf-ink-faint)', marginTop: 4 }}>{log.details}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
