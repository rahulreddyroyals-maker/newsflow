// src/components/BottomNav.jsx
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../utils/i18n'

const HomeIcon = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><path d="M4 11.5 12 4l8 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
)
const SearchIcon = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2"/><path d="M20 20l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
)
const BookmarkIcon = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><path d="M6 4h12v17l-6-4-6 4V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
)
const PenIcon = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><path d="M4 20h4l11-11-4-4L4 16v4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
)
const ShieldIcon = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
)
const UserIcon = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
)

export default function BottomNav() {
  const { isJournalist, isAdmin } = useAuth()
  const { lang } = useLanguage()
  const location = useLocation()

  const items = [
    { to: '/home', label: t('home', lang), Icon: HomeIcon },
    { to: '/search', label: t('search', lang), Icon: SearchIcon },
    { to: '/bookmarks', label: t('bookmarks', lang), Icon: BookmarkIcon },
    isAdmin
      ? { to: '/admin', label: 'Admin', Icon: ShieldIcon }
      : { to: '/journalist', label: isJournalist ? 'Reports' : t('profile', lang), Icon: isJournalist ? PenIcon : UserIcon }
  ]

  // Hide nav on auth/splash screens and on focused task flows that have
  // their own back-button header and bottom action buttons — showing the
  // nav there pushed those buttons under it.
  const hiddenRoutes = ['/', '/login', '/register', '/admin-login', '/journalist/submit', '/journalist/preview', '/admin/upload']
  if (hiddenRoutes.includes(location.pathname)) return null

  return (
    <nav style={navStyle}>
      {items.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} style={({ isActive }) => linkStyle(isActive)}>
          {({ isActive }) => (
            <>
              <Icon style={{ color: isActive ? 'var(--nf-navy)' : 'var(--nf-ink-faint)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? 'var(--nf-navy)' : 'var(--nf-ink-faint)' }}>{label}</span>
              {isActive && <span className="nf-flow-rule" style={{ width: 18, height: 3, marginTop: 2 }} />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

const navStyle = {
  position: 'fixed',
  bottom: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  width: '100%',
  maxWidth: 'var(--nf-max-w)',
  height: 'var(--nf-nav-h)',
  background: 'var(--nf-paper)',
  borderTop: '1px solid var(--nf-line)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-around',
  zIndex: 40,
  paddingBottom: 'env(safe-area-inset-bottom)'
}

const linkStyle = (isActive) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 3,
  flex: 1,
  paddingTop: 4
})
