// src/admin/ManageJournalists.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listJournalists, setJournalistVerified } from '../services/newsService'

export default function ManageJournalists() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [journalists, setJournalists] = useState(null)

  useEffect(() => {
    if (isAdmin) listJournalists().then(setJournalists)
  }, [isAdmin])

  if (!isAdmin) {
    return <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center' }}><p>Admins only</p></div>
  }

  async function toggle(j) {
    await setJournalistVerified(j.uid, !j.verified)
    setJournalists((list) => list.map((x) => (x.uid === j.uid ? { ...x, verified: !x.verified } : x)))
  }

  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--nf-paper)' }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
        <h2 style={{ fontSize: 17 }}>Manage Journalists</h2>
      </div>
      <div className="nf-scroll-body nf-container" style={{ paddingTop: 16 }}>
        {journalists === null && <p style={{ color: 'var(--nf-ink-soft)' }}>Loading…</p>}
        {journalists?.map((j) => (
          <div key={j.uid} className="nf-card" style={{ padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 700 }}>{j.name}</p>
              <p style={{ fontSize: 12.5, color: 'var(--nf-ink-faint)' }}>{j.email} • {j.district}</p>
            </div>
            <button className={`nf-chip ${j.verified ? 'active' : ''}`} onClick={() => toggle(j)}>
              {j.verified ? '✓ Verified' : 'Verify'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
