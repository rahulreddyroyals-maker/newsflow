// src/components/CommentsPanel.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { listenToComments, addComment, deleteComment } from '../services/newsService'

function timeAgo(ts) {
  if (!ts) return ''
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  return `${Math.floor(diffHr / 24)}d`
}

// Slides up over whatever's currently on screen (a reels slide or the detail
// page) rather than navigating to a separate route — comments stay attached
// to the post the reader was just looking at.
export default function CommentsPanel({ newsId, onClose, dark }) {
  const { user, profile, isAdmin } = useAuth()
  const [comments, setComments] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const unsub = listenToComments(newsId, setComments)
    return unsub
  }, [newsId])

  async function handlePost() {
    if (!text.trim() || !user) return
    setBusy(true)
    await addComment(newsId, {
      text: text.trim(),
      authorId: user.uid,
      authorName: profile?.name || 'NewsFlow Reader'
    })
    setText('')
    setBusy(false)
  }

  async function handleDelete(commentId) {
    await deleteComment(newsId, commentId)
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={sheetStyle(dark)} onClick={(e) => e.stopPropagation()}>
        <div style={handleStyle} />
        <div style={headerStyle}>
          <h3 style={{ fontSize: 16, color: dark ? '#fff' : 'var(--nf-navy)' }}>
            Comments {comments ? `(${comments.length})` : ''}
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, color: dark ? '#fff' : 'var(--nf-navy)' }}>✕</button>
        </div>

        <div style={listStyle}>
          {comments === null && <p style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'var(--nf-ink-soft)', fontSize: 13.5 }}>Loading…</p>}
          {comments?.length === 0 && (
            <p style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'var(--nf-ink-soft)', fontSize: 13.5, textAlign: 'center', padding: '20px 0' }}>
              No comments yet — be the first to say something.
            </p>
          )}
          {comments?.map((c) => (
            <div key={c.id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: dark ? '#fff' : 'var(--nf-navy)' }}>{c.authorName}</span>
                <span style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.45)' : 'var(--nf-ink-faint)' }}>{timeAgo(c.createdAt)}</span>
              </div>
              <p style={{ fontSize: 13.5, color: dark ? 'rgba(255,255,255,0.85)' : 'var(--nf-ink)', marginTop: 2, lineHeight: 1.5 }}>{c.text}</p>
              {(isAdmin || c.authorId === user?.uid) && (
                <button onClick={() => handleDelete(c.id)} style={{ border: 'none', background: 'none', color: dark ? 'rgba(255,255,255,0.45)' : 'var(--nf-ink-faint)', fontSize: 11, padding: 0, marginTop: 4 }}>
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>

        {user ? (
          <div style={inputRowStyle}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a comment…"
              style={inputStyle(dark)}
              onKeyDown={(e) => e.key === 'Enter' && handlePost()}
            />
            <button onClick={handlePost} disabled={busy || !text.trim()} className="nf-btn nf-btn-flow" style={{ padding: '10px 16px' }}>Post</button>
          </div>
        ) : (
          <p style={{ fontSize: 12.5, color: dark ? 'rgba(255,255,255,0.6)' : 'var(--nf-ink-soft)', textAlign: 'center', padding: '12px 0' }}>
            Log in to join the conversation.
          </p>
        )}
      </div>
    </div>
  )
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 95,
  background: 'rgba(0,0,0,0.4)',
  maxWidth: 'var(--nf-max-w)',
  margin: '0 auto',
  display: 'flex',
  alignItems: 'flex-end'
}
const sheetStyle = (dark) => ({
  width: '100%',
  maxHeight: '70vh',
  display: 'flex',
  flexDirection: 'column',
  background: dark ? '#161B26' : 'var(--nf-paper)',
  borderRadius: '18px 18px 0 0',
  padding: '10px 16px 16px'
})
const handleStyle = {
  width: 36, height: 4, borderRadius: 4,
  background: 'rgba(150,150,150,0.4)', margin: '4px auto 10px'
}
const headerStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  marginBottom: 10
}
const listStyle = {
  flex: 1, overflowY: 'auto', paddingBottom: 8
}
const inputRowStyle = {
  display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid rgba(150,150,150,0.2)'
}
const inputStyle = (dark) => ({
  flex: 1,
  border: dark ? '1px solid rgba(255,255,255,0.2)' : '1.5px solid var(--nf-line)',
  background: dark ? 'rgba(255,255,255,0.08)' : 'var(--nf-paper)',
  color: dark ? '#fff' : 'var(--nf-ink)',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14
})
