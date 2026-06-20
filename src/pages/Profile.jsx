// src/pages/Profile.jsx
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Profile() {
  const { user, profile, logout, guestMode } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return (
      <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <img src="/icons/icon-96.png" alt="" style={{ width: 56, height: 56, marginBottom: 16 }} />
        <p style={{ fontWeight: 700, color: 'var(--nf-navy)', marginBottom: 6 }}>
          {guestMode ? "You're browsing as a guest" : 'Welcome to NewsFlow'}
        </p>
        <p style={{ fontSize: 13.5, color: 'var(--nf-ink-soft)', textAlign: 'center', marginBottom: 18 }}>
          Log in to save news, follow districts, and submit reports as a journalist.
        </p>
        <button className="nf-btn nf-btn-primary nf-btn-block" onClick={() => navigate('/login')}>Log In</button>
      </div>
    )
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="nf-screen">
      <div style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--nf-paper)', borderBottom: '1px solid var(--nf-line)' }}>
        <div style={avatarStyle}>{profile?.name?.[0]?.toUpperCase() || 'N'}</div>
        <h2 style={{ fontSize: 18, marginTop: 12 }}>{profile?.name}</h2>
        <p style={{ fontSize: 13, color: 'var(--nf-ink-soft)' }}>{profile?.email}</p>
        <span className="nf-chip active" style={{ marginTop: 10 }}>{profile?.district}</span>
      </div>
      <div className="nf-scroll-body nf-container" style={{ paddingTop: 18 }}>
        <button className="nf-btn nf-btn-ghost nf-btn-block" style={{ marginBottom: 10 }} onClick={() => navigate('/bookmarks')}>Saved news</button>
        {profile?.role === 'journalist' && (
          <button className="nf-btn nf-btn-ghost nf-btn-block" style={{ marginBottom: 10 }} onClick={() => navigate('/journalist')}>Journalist dashboard</button>
        )}
        <button className="nf-btn nf-btn-ghost nf-btn-block" style={{ marginBottom: 10, color: 'var(--nf-danger)' }} onClick={handleLogout}>Log out</button>
      </div>
    </div>
  )
}

const avatarStyle = {
  width: 64, height: 64, borderRadius: '50%',
  background: 'var(--nf-flow)', color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 26, fontWeight: 800, margin: '0 auto'
}
