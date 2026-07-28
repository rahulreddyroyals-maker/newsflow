// src/admin/ManageClassifieds.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listPendingClassifieds, setClassifiedStatus } from '../services/classifieds'

export default function ManageClassifieds() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState(null)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => { if (isAdmin) reload() }, [isAdmin])
  function reload() { listPendingClassifieds().then(setItems) }

  if (!isAdmin) return <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center' }}><p>Admins only</p></div>

  async function approve(id) {
    setBusyId(id)
    await setClassifiedStatus(id, 'approved')
    reload()
    setBusyId(null)
  }
  async function reject(id) {
    const reason = window.prompt('Reason for rejection:') || ''
    setBusyId(id)
    await setClassifiedStatus(id, 'rejected', reason)
    reload()
    setBusyId(null)
  }

  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--nf-paper)', flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
        <h2 style={{ fontSize: 17 }}>Pending Classifieds</h2>
      </div>
      <div className="nf-scroll-body nf-container" style={{ paddingTop: 16 }}>
        {items === null && <p style={{ color: 'var(--nf-ink-soft)' }}>Loading…</p>}
        {items?.length === 0 && <div className="nf-empty"><p style={{ fontWeight: 700, color: 'var(--nf-navy)' }}>All caught up</p></div>}
        {items?.map((item) => (
          <div key={item.id} className="nf-card" style={{ padding: 14, marginBottom: 12 }}>
            {item.images?.[0] && <img src={item.images[0]} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
            <p style={{ fontWeight: 700, fontSize: 15 }}>{item.title}</p>
            <p style={{ fontSize: 12.5, color: 'var(--nf-ink-faint)', margin: '6px 0' }}>{item.category} • {item.district || 'Statewide'} • by {item.postedByName}</p>
            <p style={{ fontSize: 13.5, color: 'var(--nf-ink-soft)' }}>{item.description}</p>
            {item.price && <p style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>₹{item.price}</p>}
            <p style={{ fontSize: 13, marginTop: 6 }}>📞 {item.contactPhone}</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="nf-btn nf-btn-primary" style={{ flex: 1 }} disabled={busyId === item.id} onClick={() => approve(item.id)}>✓ Approve</button>
              <button className="nf-btn nf-btn-ghost" style={{ flex: 1, color: 'var(--nf-danger)' }} disabled={busyId === item.id} onClick={() => reject(item.id)}>✕ Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
