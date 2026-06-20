// src/pages/Notifications.jsx
import { useNavigate } from 'react-router-dom'

export default function Notifications() {
  const navigate = useNavigate()
  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
        <h2 style={{ fontSize: 17 }}>Notifications</h2>
      </div>
      <div className="nf-empty">
        <p style={{ fontWeight: 700, color: 'var(--nf-navy)' }}>You're all caught up</p>
        <p style={{ fontSize: 13.5, marginTop: 4 }}>Breaking news and updates for your district will show up here.</p>
      </div>
    </div>
  )
}
