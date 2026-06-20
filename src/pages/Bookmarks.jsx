// src/pages/Bookmarks.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getNewsById } from '../services/newsService'
import { CompactNewsCard } from '../components/NewsCard'

export default function Bookmarks() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState(null)

  useEffect(() => {
    if (!profile?.bookmarks?.length) {
      setItems([])
      return
    }
    Promise.all(profile.bookmarks.map(getNewsById)).then((res) => setItems(res.filter(Boolean)))
  }, [profile])

  return (
    <div className="nf-screen">
      <div style={{ padding: '18px 16px 6px' }}>
        <h1 style={{ fontSize: 20 }}>Saved news</h1>
        <div className="nf-flow-rule" style={{ marginTop: 8 }} />
      </div>
      <div className="nf-scroll-body nf-container" style={{ paddingTop: 12 }}>
        {!user && (
          <div className="nf-empty">
            <p style={{ fontWeight: 700, color: 'var(--nf-navy)', marginBottom: 10 }}>Log in to save news</p>
            <button className="nf-btn nf-btn-primary" onClick={() => navigate('/login')}>Log In</button>
          </div>
        )}
        {user && items?.length === 0 && (
          <div className="nf-empty">
            <p style={{ fontWeight: 700, color: 'var(--nf-navy)' }}>Nothing saved yet</p>
            <p style={{ fontSize: 13.5, marginTop: 4 }}>Tap the ☆ on any story to save it for later.</p>
          </div>
        )}
        {items?.map((n) => <CompactNewsCard key={n.id} news={n} />)}
      </div>
    </div>
  )
}
