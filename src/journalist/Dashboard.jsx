// src/journalist/Dashboard.jsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listenToMyDrafts, updateUserProfile, uploadProfilePhoto } from '../services/newsService'
import WalletSection from './WalletSection'
import AdLeadsSection from './AdLeadsSection'
import GuidelinesSection from './GuidelinesSection'

export default function JournalistDashboard() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState(null)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [savingNameToggle, setSavingNameToggle] = useState(false)
  const [section, setSection] = useState('reports')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const photoInputRef = useRef(null)

  async function handlePhotoPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError('')
    if (file.size > 4 * 1024 * 1024) {
      setPhotoError('Photo is too large — keep it under 4MB.')
      e.target.value = ''
      return
    }
    setPhotoBusy(true)
    try {
      const url = await uploadProfilePhoto(file, user.uid)
      await updateUserProfile(user.uid, { photoUrl: url })
      refreshProfile()
    } catch (err) {
      setPhotoError('Could not upload photo: ' + err.message)
    } finally {
      setPhotoBusy(false)
    }
  }

  useEffect(() => {
    if (!user) return
    const unsub = listenToMyDrafts(user.uid, setDrafts, (err) => setError(err.message || 'Could not load your reports.'))
    return unsub
  }, [user])

  if (!user) {
    return (
      <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <p style={{ fontWeight: 700, color: 'var(--nf-navy)', marginBottom: 14 }}>Log in as a journalist to submit news</p>
        <button className="nf-btn nf-btn-primary" onClick={() => navigate('/login')}>Log In</button>
      </div>
    )
  }

  if (profile?.role !== 'journalist') {
    return (
      <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <p style={{ fontWeight: 700, color: 'var(--nf-navy)', marginBottom: 8 }}>Journalist accounts only</p>
        <p style={{ fontSize: 13.5, color: 'var(--nf-ink-soft)', textAlign: 'center' }}>Register a journalist account to submit reports for this district.</p>
      </div>
    )
  }

  const filtered = drafts?.filter((d) => filter === 'all' || d.status === filter) || []
  const showName = profile?.displayNamePublicly !== false
  const suspended = profile?.suspended === true

  async function toggleShowName() {
    setSavingNameToggle(true)
    await updateUserProfile(user.uid, { displayNamePublicly: !showName })
    refreshProfile()
    setSavingNameToggle(false)
  }

  return (
    <div className="nf-screen">
      <div style={{ padding: '18px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 20 }}>My News</h1>
            <div className="nf-flow-rule" style={{ marginTop: 6 }} />
          </div>
          {!profile?.verified && <span className="nf-badge nf-badge-pending">Verification pending</span>}
        </div>

        <div style={profileRowStyle}>
          <button onClick={() => photoInputRef.current?.click()} style={{ border: 'none', background: 'none', padding: 0, position: 'relative' }}>
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="" style={avatarStyle} />
            ) : (
              <div style={avatarFallbackStyle}>{profile?.name?.[0]?.toUpperCase() || 'N'}</div>
            )}
            <span style={editBadgeStyle}>{photoBusy ? '…' : '✎'}</span>
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoPick} style={{ display: 'none' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--nf-navy)' }}>{profile?.name}</p>
            <button onClick={() => navigate(`/journalist-profile/${user.uid}`)} style={publicProfileLinkStyle}>
              View my public profile →
            </button>
          </div>
        </div>
        {photoError && <p style={{ color: 'var(--nf-danger)', fontSize: 12, marginTop: 4 }}>{photoError}</p>}

        {suspended && (
          <div style={{ background: '#FBE7E5', borderRadius: 10, padding: 12, marginTop: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--nf-danger)' }}>Your account is currently restricted</p>
            <p style={{ fontSize: 12.5, color: 'var(--nf-danger)', marginTop: 4 }}>
              An admin has paused your ability to submit new reports. Contact the NewsFlow team if you think this is a mistake.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, margin: '16px 0', overflowX: 'auto' }}>
          {[
            { id: 'reports', label: 'Reports' },
            { id: 'wallet', label: '💰 Wallet' },
            { id: 'ads', label: '📢 Local Ads' },
            { id: 'guidelines', label: 'Guidelines' }
          ].map((s) => (
            <button
              key={s.id}
              className={`nf-chip ${section === s.id ? 'active' : ''}`}
              onClick={(e) => { setSection(s.id); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }) }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {section === 'reports' && (
        <>
          <div style={{ padding: '0 16px' }}>
            <div style={nameToggleRowStyle}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--nf-navy)' }}>Show my name on published reports</p>
                <p style={{ fontSize: 11.5, color: 'var(--nf-ink-faint)', marginTop: 2 }}>
                  {showName ? `New reports default to showing "${profile?.name || 'your name'}"` : 'New reports default to "NewsFlow Citizen Journalist"'} — you can still flip it per report when submitting.
                </p>
              </div>
              <Toggle checked={showName} onChange={toggleShowName} disabled={savingNameToggle} />
            </div>
            <div style={{ display: 'flex', gap: 8, margin: '14px 0 6px', overflowX: 'auto' }}>
              {['all', 'pending', 'approved', 'rejected'].map((f) => (
                <button key={f} className={`nf-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f}</button>
              ))}
            </div>
          </div>

          <div className="nf-scroll-body nf-container" style={{ paddingTop: 10 }}>
            {error && (
              <div className="nf-empty" style={{ color: 'var(--nf-danger)' }}>
                <p style={{ fontWeight: 700 }}>Couldn't load your reports</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>{error}</p>
              </div>
            )}
            {!error && drafts === null && <p style={{ color: 'var(--nf-ink-soft)' }}>Loading…</p>}
            {!error && drafts && filtered.length === 0 && (
              <div className="nf-empty">
                <p style={{ fontWeight: 700, color: 'var(--nf-navy)' }}>No reports here</p>
                <p style={{ fontSize: 13.5, marginTop: 4 }}>Tap "Submit News" to file your first report.</p>
              </div>
            )}
            {filtered.map((d) => (
              <div key={d.id} className="nf-card" style={{ padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <h3 style={{ fontSize: 15, lineHeight: 1.35 }}>{d.headline || '(untitled draft)'}</h3>
                  <span className={`nf-badge nf-badge-${d.status}`} style={{ flexShrink: 0 }}>{d.status}</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--nf-ink-faint)', marginTop: 8 }}>{d.district} • {d.category}</p>
                {d.status === 'approved' && (
                  <p style={{ fontSize: 12, color: 'var(--nf-success)', marginTop: 6, fontWeight: 700 }}>+10 NF points earned</p>
                )}
                {d.status === 'rejected' && d.rejectionReason && (
                  <p style={{ fontSize: 12.5, color: 'var(--nf-danger)', marginTop: 6 }}>Reason: {d.rejectionReason}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {section === 'wallet' && <WalletSection />}
      {section === 'ads' && <AdLeadsSection />}
      {section === 'guidelines' && <GuidelinesSection />}

      {section === 'reports' && !suspended && (
        <button className="nf-btn nf-btn-flow" style={fabStyle} onClick={() => navigate('/journalist/submit')}>+ Submit News</button>
      )}
    </div>
  )
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 42, height: 24, borderRadius: 999, border: 'none', flexShrink: 0,
        background: checked ? 'var(--nf-navy)' : 'var(--nf-line)',
        position: 'relative', transition: 'background .15s ease'
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left .15s ease', boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
      }} />
    </button>
  )
}

const profileRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginTop: 14
}
const avatarStyle = {
  width: 52,
  height: 52,
  borderRadius: '50%',
  objectFit: 'cover'
}
const avatarFallbackStyle = {
  width: 52,
  height: 52,
  borderRadius: '50%',
  background: 'var(--nf-flow)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 20,
  fontWeight: 800
}
const editBadgeStyle = {
  position: 'absolute',
  bottom: -2,
  right: -2,
  width: 18,
  height: 18,
  borderRadius: '50%',
  background: 'var(--nf-navy)',
  color: '#fff',
  fontSize: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '2px solid var(--nf-paper)'
}
const publicProfileLinkStyle = {
  border: 'none',
  background: 'none',
  padding: 0,
  color: 'var(--nf-blue)',
  fontSize: 12.5,
  fontWeight: 700
}

const nameToggleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  background: 'var(--nf-paper)',
  border: '1px solid var(--nf-line)',
  borderRadius: 10,
  padding: '12px 14px'
}

const fabStyle = {
  position: 'fixed',
  bottom: 'calc(var(--nf-nav-h) + 16px)',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'calc(100% - 32px)',
  maxWidth: 'calc(var(--nf-max-w) - 32px)',
  boxShadow: 'var(--nf-shadow-pop)'
}
