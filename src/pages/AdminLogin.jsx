// src/pages/AdminLogin.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../services/firebase'
import { getUserProfile } from '../services/newsService'
import { useAuth } from '../contexts/AuthContext'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const profile = await getUserProfile(cred.user.uid)
      if (profile?.role !== 'admin') {
        await auth.signOut()
        setError('This account does not have admin access.')
        return
      }
      refreshProfile()
      navigate('/admin')
    } catch (err) {
      setError('Incorrect email or password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="nf-screen" style={{ justifyContent: 'center', padding: '0 24px', background: 'var(--nf-navy)' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <img src="/icons/icon-96.png" alt="NewsFlow" style={{ width: 60, height: 60, margin: '0 auto 14px' }} />
        <h1 style={{ fontSize: 20, color: '#fff' }}>Admin Console</h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 4 }}>NewsFlow newsroom &amp; journalist management</p>
      </div>

      <form onSubmit={handleSubmit} style={{ background: 'var(--nf-paper)', borderRadius: 'var(--nf-radius-md)', padding: 20 }}>
        <div className="nf-input-group">
          <label className="nf-label">Admin Email</label>
          <input className="nf-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@newsflow.com" />
        </div>
        <div className="nf-input-group">
          <label className="nf-label">Password</label>
          <input className="nf-input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {error && <p style={{ color: 'var(--nf-danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button className="nf-btn nf-btn-primary nf-btn-block" disabled={busy} type="submit">
          {busy ? 'Verifying…' : 'Enter Admin Console'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
        Not an admin? <Link to="/login" style={{ color: '#fff', fontWeight: 700 }}>Go to reader/journalist login</Link>
      </p>
    </div>
  )
}
