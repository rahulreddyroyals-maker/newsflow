// src/pages/Premium.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../services/firebase'
import { Events } from '../services/analytics'

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function Premium() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isPremium = profile?.isPremium && profile?.premiumUntil?.toDate?.() > new Date()

  async function handleSubscribe(plan) {
    if (!user) return navigate('/login')
    setError(''); setBusy(true)
    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Could not load payment gateway. Check your connection.')

      const functions = getFunctions(app, 'asia-south1')
      const createPremiumOrder = httpsCallable(functions, 'createPremiumOrder')
      const { data: order } = await createPremiumOrder({ plan })

      const rzp = new window.Razorpay({
        key: order.keyId || RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: 'INR',
        name: 'NewsFlow Premium',
        description: plan === 'yearly' ? 'Annual subscription' : 'Monthly subscription',
        order_id: order.orderId,
        handler: async (response) => {
          try {
            const verifyPremiumPayment = httpsCallable(functions, 'verifyPremiumPayment')
            await verifyPremiumPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              plan
            })
            Events.premiumPurchase(plan)
            navigate('/home')
          } catch (err) {
            setError('Payment succeeded but activation failed — contact support with payment ID: ' + response.razorpay_payment_id)
          }
        },
        prefill: { name: profile?.name, email: profile?.email, contact: profile?.phone },
        theme: { color: '#0F1F3D' }
      })
      rzp.on('payment.failed', () => setError('Payment failed or was cancelled.'))
      rzp.open()
    } catch (err) {
      setError(err.message || 'Could not start checkout.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--nf-paper)', flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
        <h2 style={{ fontSize: 17 }}>NewsFlow Premium</h2>
      </div>

      <div className="nf-scroll-body nf-container" style={{ paddingTop: 20 }}>
        {isPremium ? (
          <div className="nf-card" style={{ padding: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--nf-success)' }}>✓ You're a Premium member</p>
            <p style={{ fontSize: 13, color: 'var(--nf-ink-soft)', marginTop: 6 }}>
              Active until {profile.premiumUntil?.toDate?.().toLocaleDateString()}
            </p>
          </div>
        ) : (
          <>
            <div style={{ background: 'var(--nf-flow)', borderRadius: 'var(--nf-radius-lg)', padding: 20, marginBottom: 16, color: '#fff' }}>
              <p style={{ fontSize: 13, fontWeight: 700, opacity: 0.85, textTransform: 'uppercase' }}>Go Premium</p>
              <ul style={{ marginTop: 10, paddingLeft: 18, fontSize: 14, lineHeight: 1.8 }}>
                <li>Ad-free reading</li>
                <li>Early access to breaking news</li>
                <li>Support local citizen journalism</li>
              </ul>
            </div>

            <PlanCard title="Monthly" price="₹49/month" onClick={() => handleSubscribe('monthly')} busy={busy} />
            <PlanCard title="Yearly" price="₹399/year" badge="Save 32%" onClick={() => handleSubscribe('yearly')} busy={busy} />

            {error && <p style={{ color: 'var(--nf-danger)', fontSize: 13, marginTop: 12 }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}

function PlanCard({ title, price, badge, onClick, busy }) {
  return (
    <button className="nf-card" onClick={onClick} disabled={busy} style={{ width: '100%', padding: 18, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none' }}>
      <div style={{ textAlign: 'left' }}>
        <p style={{ fontWeight: 700, fontSize: 15 }}>{title}</p>
        <p style={{ fontSize: 13, color: 'var(--nf-ink-soft)' }}>{price}</p>
      </div>
      {badge && <span className="nf-badge nf-badge-approved">{badge}</span>}
    </button>
  )
}
