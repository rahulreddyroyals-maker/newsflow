// src/pages/Splash.jsx
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Splash() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      const t = setTimeout(() => navigate('/home'), 600)
      return () => clearTimeout(t)
    }
  }, [loading, user])

  return (
    <div style={wrapStyle}>
      <div style={ringGlowStyle} />
      <img src="/icons/icon-192.png" alt="NewsFlow" style={{ width: 148, height: 148, position: 'relative', zIndex: 2 }} />
      <div style={{ marginTop: 22, textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <h1 style={{ fontSize: 28, color: '#fff' }}>News<span style={{ color: 'var(--nf-orange-light)' }}>Flow</span></h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13.5, marginTop: 6, letterSpacing: '0.02em' }}>
          తెలుగు &amp; English local news
        </p>
      </div>
      <button className="nf-btn nf-btn-flow" style={ctaStyle} onClick={() => navigate('/login')}>
        Get Started
      </button>
    </div>
  )
}

const wrapStyle = {
  minHeight: '100vh',
  background: 'var(--nf-navy)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden'
}
const ringGlowStyle = {
  position: 'absolute',
  width: 360,
  height: 360,
  borderRadius: '50%',
  background: 'var(--nf-ring)',
  opacity: 0.22,
  filter: 'blur(40px)',
  top: '28%'
}
const ctaStyle = {
  position: 'absolute',
  bottom: 56,
  left: 24,
  right: 24,
  width: 'auto'
}
