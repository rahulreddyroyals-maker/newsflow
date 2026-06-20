// src/components/Header.jsx
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

const BellIcon = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...p}><path d="M6 10a6 6 0 0 1 12 0v4l2 3H4l2-3v-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M9.5 20a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
)
const SearchIcon = (p) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" {...p}><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2"/><path d="M20 20l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
)

export default function Header({ district, onDistrictTap, hasNotifications }) {
  const navigate = useNavigate()
  const { lang, toggleLang } = useLanguage()

  return (
    <header style={headerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src="/icons/icon-72.png" alt="NewsFlow" style={{ width: 32, height: 32, borderRadius: '50%' }} />
        <div>
          <div style={{ fontFamily: 'var(--nf-font-display)', fontWeight: 800, fontSize: 16, color: 'var(--nf-navy)', lineHeight: 1 }}>
            News<span style={{ color: 'var(--nf-orange)' }}>Flow</span>
          </div>
          {district && (
            <button onClick={onDistrictTap} style={districtBtnStyle}>
              📍 {district} <span style={{ fontSize: 9 }}>▾</span>
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={toggleLang} style={langBtnStyle}>{lang === 'te' ? 'EN' : 'తె'}</button>
        <button onClick={() => navigate('/search')} style={iconBtnStyle} aria-label="Search">
          <SearchIcon style={{ color: 'var(--nf-navy)' }} />
        </button>
        <button onClick={() => navigate('/notifications')} style={iconBtnStyle} aria-label="Notifications">
          <BellIcon style={{ color: 'var(--nf-navy)' }} />
          {hasNotifications && <span style={dotStyle} />}
        </button>
      </div>
    </header>
  )
}

const headerStyle = {
  position: 'sticky',
  top: 0,
  zIndex: 30,
  height: 'var(--nf-header-h)',
  background: 'var(--nf-paper)',
  borderBottom: '1px solid var(--nf-line)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 14px'
}
const districtBtnStyle = {
  border: 'none',
  background: 'none',
  padding: 0,
  fontSize: 11.5,
  fontWeight: 700,
  color: 'var(--nf-ink-soft)',
  display: 'flex',
  alignItems: 'center',
  gap: 2
}
const langBtnStyle = {
  border: '1.5px solid var(--nf-line)',
  background: 'var(--nf-paper-dim)',
  borderRadius: 8,
  padding: '5px 9px',
  fontWeight: 800,
  fontSize: 12,
  color: 'var(--nf-navy)'
}
const iconBtnStyle = {
  border: 'none',
  background: 'none',
  position: 'relative',
  padding: 4,
  display: 'flex'
}
const dotStyle = {
  position: 'absolute',
  top: 2,
  right: 2,
  width: 7,
  height: 7,
  borderRadius: '50%',
  background: 'var(--nf-orange)',
  border: '1.5px solid var(--nf-paper)'
}
