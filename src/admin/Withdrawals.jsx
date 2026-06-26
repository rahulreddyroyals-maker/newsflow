// src/admin/Withdrawals.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listAllWithdrawals, markWithdrawalPaid, rejectWithdrawal } from '../services/newsService'

export default function Withdrawals() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState(null)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (isAdmin) listAllWithdrawals().then(setRequests)
  }, [isAdmin])

  if (!isAdmin) {
    return <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center' }}><p>Admins only</p></div>
  }

  async function handleMarkPaid(req) {
    if (!window.confirm(`Confirm you've paid ₹${req.rupeeAmount} to ${req.journalistName} via bank/UPI? This will deduct ${req.pointsRequested.toLocaleString()} points from their wallet.`)) return
    setBusyId(req.id)
    await markWithdrawalPaid(req.id, req.journalistId, req.pointsRequested)
    setRequests((list) => list.map((r) => (r.id === req.id ? { ...r, status: 'paid' } : r)))
    setBusyId(null)
  }

  async function handleReject(req) {
    const reason = window.prompt('Reason for rejecting this withdrawal request:') || ''
    setBusyId(req.id)
    await rejectWithdrawal(req.id, reason)
    setRequests((list) => list.map((r) => (r.id === req.id ? { ...r, status: 'rejected' } : r)))
    setBusyId(null)
  }

  const pending = requests?.filter((r) => r.status === 'pending') || []
  const resolved = requests?.filter((r) => r.status !== 'pending') || []

  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--nf-paper)' }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
        <h2 style={{ fontSize: 17 }}>Withdrawal Requests</h2>
      </div>

      <div className="nf-scroll-body nf-container" style={{ paddingTop: 16 }}>
        {requests === null && <p style={{ color: 'var(--nf-ink-soft)' }}>Loading…</p>}

        {requests !== null && pending.length === 0 && (
          <div className="nf-empty">
            <p style={{ fontWeight: 700, color: 'var(--nf-navy)' }}>No pending requests</p>
          </div>
        )}

        {pending.map((req) => (
          <div key={req.id} className="nf-card" style={{ padding: 14, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontWeight: 700 }}>{req.journalistName}</p>
              <span className="nf-badge nf-badge-pending">pending</span>
            </div>
            <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--nf-navy)', marginTop: 6 }}>₹{req.rupeeAmount.toLocaleString()}</p>
            <p style={{ fontSize: 12, color: 'var(--nf-ink-faint)' }}>{req.pointsRequested.toLocaleString()} points</p>
            <p style={{ fontSize: 11.5, color: 'var(--nf-ink-faint)', marginTop: 8 }}>
              Pay this out via bank transfer or UPI outside the app, then confirm below.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="nf-btn nf-btn-primary" style={{ flex: 1 }} disabled={busyId === req.id} onClick={() => handleMarkPaid(req)}>✓ Mark Paid</button>
              <button className="nf-btn nf-btn-ghost" style={{ flex: 1, color: 'var(--nf-danger)' }} disabled={busyId === req.id} onClick={() => handleReject(req)}>✕ Reject</button>
            </div>
          </div>
        ))}

        {resolved.length > 0 && (
          <>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--nf-ink-soft)', margin: '20px 0 10px' }}>History</p>
            {resolved.map((req) => (
              <div key={req.id} className="nf-card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 700 }}>{req.journalistName}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--nf-ink-faint)' }}>₹{req.rupeeAmount.toLocaleString()}</p>
                </div>
                <span className={`nf-badge nf-badge-${req.status === 'paid' ? 'approved' : 'rejected'}`}>{req.status}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
