// src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login, continueAsGuest } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate('/home')
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="nf-screen" style={{ justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <img src="/icons/icon-96.png" alt="NewsFlow" style={{ width: 64, height: 64, margin: '0 auto 14px' }} />
        <h1 style={{ fontSize: 22 }}>Welcome back</h1>
        <p style={{ color: 'var(--nf-ink-soft)', fontSize: 13.5, marginTop: 4 }}>Log in to your NewsFlow account</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="nf-input-group">
          <label className="nf-label">Email</label>
          <input className="nf-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="nf-input-group">
          <label className="nf-label">Password</label>
          <input className="nf-input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {error && <p style={{ color: 'var(--nf-danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button className="nf-btn nf-btn-primary nf-btn-block" disabled={busy} type="submit">
          {busy ? 'Logging in…' : 'Log In'}
        </button>
      </form>

      <button className="nf-btn nf-btn-ghost nf-btn-block" style={{ marginTop: 10 }} onClick={() => { continueAsGuest(); navigate('/home') }}>
        Continue as Reader
      </button>

      <p style={{ textAlign: 'center', marginTop: 22, fontSize: 13.5, color: 'var(--nf-ink-soft)' }}>
        Don't have an account?{' '}
        <Link to="/register" style={{ color: 'var(--nf-blue)', fontWeight: 700 }}>Register</Link>
      </p>
      <p style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: 'var(--nf-ink-faint)' }}>
        <Link to="/admin-login" style={{ color: 'var(--nf-ink-faint)' }}>Admin login →</Link>
      </p>
    </div>
  )
}

function friendlyError(code) {
  const map = {
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.'
  }
  return map[code] || 'Something went wrong. Please try again.'
}
