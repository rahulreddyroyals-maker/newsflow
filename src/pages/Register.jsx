// src/pages/Register.jsx
// Extended registration — journalists must fill in village, mandal, assembly
// constituency, and political affiliation before their account is approved.
// Readers have a shorter form (no journalist-specific fields).
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ALL_DISTRICTS } from '../utils/districts'

const LANGUAGES = [{ id: 'te', label: 'తెలుగు' }, { id: 'en', label: 'English' }]
const ROLES = [{ id: 'reader', label: 'Reader' }, { id: 'journalist', label: 'Journalist / Reporter' }]

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', role: 'reader',
    language: 'te', district: '',
    // journalist-only fields:
    fullName: '', village: '', mandal: '', constituency: '',
    politicalAffiliation: '', politicalPartyName: ''
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
    if (form.role === 'journalist') {
      if (!form.fullName.trim()) return setError('Full name is required for journalist accounts.')
      if (!form.village.trim()) return setError('Village name is required.')
      if (!form.mandal.trim()) return setError('Mandal is required.')
      if (!form.constituency.trim()) return setError('Assembly Constituency is required.')
    }
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
          {/* ── Basic details ── */}
          <div className="nf-input-group">
            <label className="nf-label">Display name</label>
            <input className="nf-input" required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Name shown on your profile" />
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

          {/* ── Role ── */}
          <div className="nf-input-group">
            <label className="nf-label">I want to join as</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {ROLES.map((r) => (
                <button type="button" key={r.id} onClick={() => update('role', r.id)}
                  className={`nf-chip ${form.role === r.id ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center' }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Language ── */}
          <div className="nf-input-group">
            <label className="nf-label">Preferred language</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {LANGUAGES.map((l) => (
                <button type="button" key={l.id} onClick={() => update('language', l.id)}
                  className={`nf-chip ${form.language === l.id ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center' }}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── District ── */}
          <div className="nf-input-group">
            <label className="nf-label">District</label>
            <select className="nf-select" required value={form.district} onChange={(e) => update('district', e.target.value)}>
              <option value="">Select your district</option>
              {ALL_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* ── Journalist-only fields ── */}
          {form.role === 'journalist' && (
            <>
              <div style={sectionDividerStyle}>
                <span style={sectionLabelStyle}>Journalist details — required before you can post</span>
              </div>

              <div className="nf-input-group">
                <label className="nf-label">Full name *</label>
                <input className="nf-input" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="As per your ID / press card" />
              </div>
              <div className="nf-input-group">
                <label className="nf-label">Village / Town *</label>
                <input className="nf-input" value={form.village} onChange={(e) => update('village', e.target.value)} placeholder="Your village or town name" />
              </div>
              <div className="nf-input-group">
                <label className="nf-label">Mandal *</label>
                <input className="nf-input" value={form.mandal} onChange={(e) => update('mandal', e.target.value)} placeholder="Your mandal" />
              </div>
              <div className="nf-input-group">
                <label className="nf-label">Assembly Constituency *</label>
                <input className="nf-input" value={form.constituency} onChange={(e) => update('constituency', e.target.value)} placeholder="e.g. Vijayawada East" />
              </div>

              <div className="nf-input-group">
                <label className="nf-label">Are you affiliated to any political party?</label>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  {['No', 'Yes'].map((v) => (
                    <button type="button" key={v} onClick={() => update('politicalAffiliation', v)}
                      className={`nf-chip ${form.politicalAffiliation === v ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center' }}>
                      {v}
                    </button>
                  ))}
                </div>
                {form.politicalAffiliation === 'Yes' && (
                  <input className="nf-input" value={form.politicalPartyName}
                    onChange={(e) => update('politicalPartyName', e.target.value)}
                    placeholder="Party name" />
                )}
                {form.politicalAffiliation === 'Yes' && (
                  <p style={{ fontSize: 11.5, color: 'var(--nf-warning)', marginTop: 6 }}>
                    ⚠ Political affiliation will be visible to admins. Politically affiliated
                    journalists are expected to report with extra care for balance and fairness.
                  </p>
                )}
              </div>

              <div style={{ background: 'var(--nf-paper-dim)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <p style={{ fontSize: 12.5, color: 'var(--nf-ink-soft)', lineHeight: 1.6 }}>
                  Your journalist account will be reviewed by an admin before you can post. You can submit
                  draft reports right away — they'll go live once your account is verified and the draft
                  is approved.
                </p>
              </div>
            </>
          )}

          {error && <p style={{ color: 'var(--nf-danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button className="nf-btn nf-btn-primary nf-btn-block" disabled={busy} type="submit">
            {busy ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13.5, color: 'var(--nf-ink-soft)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--nf-blue)', fontWeight: 700 }}>Log in</Link>
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

const sectionDividerStyle = {
  borderTop: '1.5px dashed var(--nf-line)',
  paddingTop: 16,
  marginBottom: 14,
  marginTop: 8
}
const sectionLabelStyle = {
  fontSize: 12,
  fontWeight: 800,
  color: 'var(--nf-ink-faint)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em'
}
