// src/admin/ManageJournalists.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listJournalists, setJournalistVerified, setJournalistSuspended, updateUserProfile } from '../services/newsService'

export default function ManageJournalists() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [journalists, setJournalists] = useState(null)
  const [expandedUid, setExpandedUid] = useState(null)
  const [busyUid, setBusyUid] = useState(null)
  const [keyDrafts, setKeyDrafts] = useState({}) // uid -> in-progress key input, before saving

  useEffect(() => { if (isAdmin) reload() }, [isAdmin])
  function reload() { listJournalists().then(setJournalists) }

  if (!isAdmin) return <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center' }}><p>Admins only</p></div>

  async function toggleVerified(j) {
    setBusyUid(j.uid)
    await setJournalistVerified(j.uid, !j.verified)
    setJournalists((list) => list.map((x) => x.uid === j.uid ? { ...x, verified: !x.verified } : x))
    setBusyUid(null)
  }

  async function toggleSuspended(j) {
    const next = !j.suspended
    if (next && !window.confirm(`Restrict ${j.name} from submitting new reports?`)) return
    setBusyUid(j.uid)
    await setJournalistSuspended(j.uid, next)
    setJournalists((list) => list.map((x) => x.uid === j.uid ? { ...x, suspended: next } : x))
    setBusyUid(null)
  }

  async function saveGroqKey(j) {
    const newKey = (keyDrafts[j.uid] ?? j.groqApiKey ?? '').trim()
    setBusyUid(j.uid)
    await updateUserProfile(j.uid, { groqApiKey: newKey || null })
    setJournalists((list) => list.map((x) => x.uid === j.uid ? { ...x, groqApiKey: newKey || null } : x))
    setBusyUid(null)
  }

  async function removeGroqKey(j) {
    setBusyUid(j.uid)
    await updateUserProfile(j.uid, { groqApiKey: null })
    setJournalists((list) => list.map((x) => x.uid === j.uid ? { ...x, groqApiKey: null } : x))
    setKeyDrafts((d) => ({ ...d, [j.uid]: '' }))
    setBusyUid(null)
  }

  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--nf-paper)' }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
        <h2 style={{ fontSize: 17 }}>Manage Journalists</h2>
      </div>
      <div className="nf-scroll-body nf-container" style={{ paddingTop: 16 }}>
        {journalists === null && <p style={{ color: 'var(--nf-ink-soft)' }}>Loading…</p>}
        {journalists?.map((j) => {
          const expanded = expandedUid === j.uid
          const draftKey = keyDrafts[j.uid] ?? j.groqApiKey ?? ''
          return (
            <div key={j.uid} className="nf-card" style={{ padding: 14, marginBottom: 10 }}>
              <button onClick={() => setExpandedUid(expanded ? null : j.uid)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', border: 'none', background: 'none', textAlign: 'left' }}>
                <div>
                  <p style={{ fontWeight: 700 }}>{j.name}</p>
                  <p style={{ fontSize: 12.5, color: 'var(--nf-ink-faint)' }}>{j.district}</p>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {j.groqApiKey && <span className="nf-badge nf-badge-approved">Own key</span>}
                  {j.suspended && <span className="nf-badge nf-badge-rejected">Restricted</span>}
                  {!j.verified && <span className="nf-badge nf-badge-pending">Unverified</span>}
                  <span style={{ color: 'var(--nf-ink-faint)', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
                </div>
              </button>

              {expanded && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--nf-line)' }}>
                  <DetailRow label="Email" value={j.email} />
                  <DetailRow label="Phone" value={j.phone || '—'} />
                  <DetailRow label="Full name" value={j.fullName || '—'} />
                  <DetailRow label="Village / Town" value={j.village || '—'} />
                  <DetailRow label="Mandal" value={j.mandal || '—'} />
                  <DetailRow label="Assembly Constituency" value={j.constituency || '—'} />
                  <DetailRow label="Political affiliation"
                    value={j.politicalAffiliation === 'Yes' ? `Yes — ${j.politicalPartyName || '(party not specified)'}` : 'No'} />
                  <DetailRow label="Wallet points" value={`${(j.walletPoints || 0).toLocaleString()} pts (₹${Math.floor((j.walletPoints || 0) / 10)})`} />
                  <DetailRow label="Ad commission earned" value={`₹${(j.adCommissionEarnings || 0).toLocaleString()}`} />
                  <DetailRow label="Shows name publicly" value={j.displayNamePublicly === false ? 'No' : 'Yes'} />

                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button
                      className={`nf-chip ${j.verified ? 'active' : ''}`}
                      style={{ flex: 1, justifyContent: 'center' }}
                      disabled={busyUid === j.uid}
                      onClick={() => toggleVerified(j)}>
                      {j.verified ? '✓ Verified' : 'Verify'}
                    </button>
                    <button
                      className="nf-btn nf-btn-ghost"
                      style={{ flex: 1, color: j.suspended ? 'var(--nf-success)' : 'var(--nf-danger)' }}
                      disabled={busyUid === j.uid}
                      onClick={() => toggleSuspended(j)}>
                      {j.suspended ? '↻ Reinstate' : '⛔ Restrict'}
                    </button>
                  </div>

                  {/* Per-journalist Groq API key — optional. Leave blank to
                      use the shared VITE_GROQ_API_KEY for this journalist's
                      AI draft/transcription/translation requests. Assigning
                      one lets you track this journalist's usage separately
                      in your Groq dashboard, and revoke just their access
                      without affecting anyone else. */}
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--nf-line)' }}>
                    <label className="nf-label">Personal Groq API key (optional)</label>
                    <p style={{ fontSize: 11.5, color: 'var(--nf-ink-faint)', marginBottom: 8 }}>
                      Leave blank to use the shared key. Generate one from your own
                      Groq account (console.groq.com/keys) to track this journalist's
                      AI usage separately or isolate rate limits.
                    </p>
                    <input
                      className="nf-input"
                      type="text"
                      placeholder="gsk_… (leave blank for shared key)"
                      value={draftKey}
                      onChange={(e) => setKeyDrafts((d) => ({ ...d, [j.uid]: e.target.value }))}
                      style={{ marginBottom: 10, fontFamily: 'monospace', fontSize: 12.5 }}
                    />
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="nf-btn nf-btn-primary" style={{ flex: 1 }} disabled={busyUid === j.uid} onClick={() => saveGroqKey(j)}>
                        {busyUid === j.uid ? 'Saving…' : '✓ Save key'}
                      </button>
                      {j.groqApiKey && (
                        <button className="nf-btn nf-btn-ghost" style={{ flex: 1, color: 'var(--nf-danger)' }} disabled={busyUid === j.uid} onClick={() => removeGroqKey(j)}>
                          Remove — use shared key
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13.5 }}>
      <span style={{ color: 'var(--nf-ink-faint)' }}>{label}</span>
      <span style={{ color: 'var(--nf-ink)', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}
