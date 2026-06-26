// src/journalist/WalletSection.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createWithdrawalRequest, listenToMyWithdrawals } from '../services/newsService'
import { POINTS_PER_RUPEE, MIN_WITHDRAWAL_POINTS, MIN_WITHDRAWAL_RUPEES, pointsToRupees } from '../utils/wallet'

export default function WalletSection() {
  const { user, profile } = useAuth()
  const [withdrawals, setWithdrawals] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!user) return
    const unsub = listenToMyWithdrawals(user.uid, setWithdrawals)
    return unsub
  }, [user])

  const points = profile?.walletPoints || 0
  const rupees = pointsToRupees(points)
  const adCommission = profile?.adCommissionEarnings || 0
  const progressPct = Math.min(100, Math.round((points / MIN_WITHDRAWAL_POINTS) * 100))
  const eligible = points >= MIN_WITHDRAWAL_POINTS
  const hasPendingRequest = withdrawals?.some((w) => w.status === 'pending')

  async function handleWithdraw() {
    if (!eligible || hasPendingRequest) return
    setBusy(true)
    setError('')
    try {
      await createWithdrawalRequest({
        journalistId: user.uid,
        journalistName: profile?.name || 'NewsFlow Reporter',
        pointsRequested: points,
        rupeeAmount: pointsToRupees(points)
      })
      setSuccess('Withdrawal request submitted — NewsFlow will process it and pay out via bank transfer/UPI.')
    } catch (err) {
      setError('Could not submit request: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="nf-scroll-body nf-container" style={{ paddingTop: 6 }}>
      <div style={walletCardStyle}>
        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>NewsFlow Wallet</p>
        <h2 style={{ fontSize: 34, color: '#fff', marginTop: 6 }}>{points.toLocaleString()} <span style={{ fontSize: 16, fontWeight: 600 }}>pts</span></h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>≈ ₹{rupees.toLocaleString()}</p>

        <div style={{ marginTop: 16 }}>
          <div style={progressTrackStyle}>
            <div style={{ ...progressFillStyle, width: `${progressPct}%` }} />
          </div>
          <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>
            {eligible ? 'You can withdraw now' : `${(MIN_WITHDRAWAL_POINTS - points).toLocaleString()} more points to reach the ₹${MIN_WITHDRAWAL_RUPEES} minimum withdrawal`}
          </p>
        </div>
      </div>

      <div className="nf-card" style={{ padding: 14, marginTop: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--nf-navy)', marginBottom: 6 }}>How points work</p>
        <ul style={{ fontSize: 12.5, color: 'var(--nf-ink-soft)', lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
          <li>+10 NewsFlow points each time a report of yours is approved</li>
          <li>Points are only earned for reports about your own registered district</li>
          <li>{POINTS_PER_RUPEE} points = ₹1</li>
          <li>Minimum withdrawal: {MIN_WITHDRAWAL_POINTS.toLocaleString()} points (₹{MIN_WITHDRAWAL_RUPEES})</li>
        </ul>
      </div>

      {adCommission > 0 && (
        <div className="nf-card" style={{ padding: 14, marginTop: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--nf-navy)' }}>Local ads commission earned</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--nf-success)', marginTop: 4 }}>₹{adCommission.toLocaleString()}</p>
          <p style={{ fontSize: 11.5, color: 'var(--nf-ink-faint)', marginTop: 4 }}>Paid out separately by the NewsFlow team — see the Local Ads tab for deal status.</p>
        </div>
      )}

      {error && <p style={{ color: 'var(--nf-danger)', fontSize: 13, marginTop: 12 }}>{error}</p>}
      {success && <p style={{ color: 'var(--nf-success)', fontSize: 13, marginTop: 12, fontWeight: 600 }}>{success}</p>}

      <button
        className="nf-btn nf-btn-primary nf-btn-block"
        style={{ marginTop: 16 }}
        disabled={!eligible || hasPendingRequest || busy}
        onClick={handleWithdraw}
      >
        {hasPendingRequest ? 'Withdrawal already pending' : busy ? 'Submitting…' : `Request Withdrawal (₹${rupees})`}
      </button>

      {withdrawals?.length > 0 && (
        <div style={{ marginTop: 20, marginBottom: 30 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--nf-navy)', marginBottom: 10 }}>Withdrawal history</p>
          {withdrawals.map((w) => (
            <div key={w.id} className="nf-card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700 }}>₹{w.rupeeAmount}</p>
                <p style={{ fontSize: 11.5, color: 'var(--nf-ink-faint)' }}>{w.pointsRequested.toLocaleString()} pts</p>
              </div>
              <span className={`nf-badge nf-badge-${w.status === 'paid' ? 'approved' : w.status === 'rejected' ? 'rejected' : 'pending'}`}>{w.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const walletCardStyle = {
  background: 'var(--nf-flow)',
  borderRadius: 'var(--nf-radius-lg)',
  padding: '20px 20px 18px',
  marginTop: 8
}
const progressTrackStyle = {
  height: 8,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.25)',
  overflow: 'hidden'
}
const progressFillStyle = {
  height: '100%',
  background: '#fff',
  borderRadius: 999,
  transition: 'width .3s ease'
}
