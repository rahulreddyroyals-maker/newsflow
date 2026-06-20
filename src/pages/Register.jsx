// src/pages/Register.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ALL_DISTRICTS } from '../utils/districts'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    role: 'reader', language: 'te', district: ''
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.district) return setError('Please select your district.')
    setBusy(true)
    try {
      await register(form)
      navigate('/home')
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="nf-screen">
      <div className="nf-scroll-body nf-container" style={{ paddingTop: 28, paddingBottom: 40 }}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Create your account</h1>
        <p style={{ color: 'var(--nf-ink-soft)', fontSize: 13.5, marginBottom: 24 }}>Join NewsFlow as a reader or a verified journalist.</p>

        <form onSubmit={handleSubmit}>
          <div className="nf-input-group">
            <label className="nf-label">Name</label>
            <input className="nf-input" required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your full name" />
          </div>
          <div className="nf-input-group">
            <label className="nf-label">Email</label>
            <input className="nf-input" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="nf-input-group">
            <label className="nf-label">Phone</label>
            <input className="nf-input" type="tel" required value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="10-digit mobile number" />
          </div>
          <div className="nf-input-group">
            <label className="nf-label">Password</label>
            <input className="nf-input" type="password" required minLength={6} value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="At least 6 characters" />
          </div>

          <div className="nf-input-group">
            <label className="nf-label">I want to join as</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ id: 'reader', label: 'Reader' }, { id: 'journalist', label: 'Journalist' }].map((r) => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => update('role', r.id)}
                  className={`nf-chip ${form.role === r.id ? 'active' : ''}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {form.role === 'journalist' && (
              <p style={{ fontSize: 12, color: 'var(--nf-ink-faint)', marginTop: 8 }}>
                Journalist accounts are reviewed by an admin before you can publish. You can submit drafts right away.
              </p>
            )}
          </div>

          <div className="nf-input-group">
            <label className="nf-label">Preferred language</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ id: 'te', label: 'తెలుగు' }, { id: 'en', label: 'English' }].map((l) => (
                <button
                  type="button"
                  key={l.id}
                  onClick={() => update('language', l.id)}
                  className={`nf-chip ${form.language === l.id ? 'active' : ''}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="nf-input-group">
            <label className="nf-label">District</label>
            <select className="nf-select" required value={form.district} onChange={(e) => update('district', e.target.value)}>
              <option value="">Select your district</option>
              {ALL_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {error && <p style={{ color: 'var(--nf-danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button className="nf-btn nf-btn-primary nf-btn-block" disabled={busy} type="submit">
            {busy ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13.5, color: 'var(--nf-ink-soft)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--nf-blue)', fontWeight: 700 }}>Log in</Link>
        </p>
      </div>
    </div>
  )
}

function friendlyError(code) {
  const map = {
    'auth/email-already-in-use': 'An account already exists with this email.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Password should be at least 6 characters.'
  }
  return map[code] || 'Something went wrong. Please try again.'
}
