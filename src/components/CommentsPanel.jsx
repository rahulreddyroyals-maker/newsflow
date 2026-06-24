// src/components/CommentsPanel.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { listenToComments, addComment, deleteComment, toggleCommentLike } from '../services/newsService'

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
// to the post the reader was just looking at, and the list inside just
// scrolls in place no matter how many comments pile up (it doesn't paginate
// to a new screen).
export default function CommentsPanel({ newsId, onClose, dark }) {
  const { user, profile, isAdmin } = useAuth()
  const [comments, setComments] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null) // comment id currently being replied to
  const [replyText, setReplyText] = useState('')

  useEffect(() => {
    const unsub = listenToComments(newsId, setComments)
    return unsub
  }, [newsId])

  const topLevel = comments?.filter((c) => !c.replyTo) || []
  const repliesByParent = {}
  comments?.filter((c) => c.replyTo).forEach((c) => {
    repliesByParent[c.replyTo] = [...(repliesByParent[c.replyTo] || []), c]
  })

  async function handlePost() {
    if (!text.trim() || !user) return
    setBusy(true)
    await addComment(newsId, { text: text.trim(), authorId: user.uid, authorName: profile?.name || 'NewsFlow Reader' })
    setText('')
    setBusy(false)
  }

  async function handleReplyPost(parentId) {
    if (!replyText.trim() || !user) return
    setBusy(true)
    await addComment(newsId, { text: replyText.trim(), authorId: user.uid, authorName: profile?.name || 'NewsFlow Reader', replyTo: parentId })
    setReplyText('')
    setReplyingTo(null)
    setBusy(false)
  }

  async function handleLike(comment) {
    if (!user) return
    await toggleCommentLike(newsId, comment.id, user.uid, comment.likedBy || [])
  }

  async function handleDelete(commentId) {
    await deleteComment(newsId, commentId)
  }

  function CommentRow({ comment, isReply }) {
    const liked = comment.likedBy?.includes(user?.uid)
    return (
      <div style={{ marginBottom: isReply ? 10 : 14, marginLeft: isReply ? 22 : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: dark ? '#fff' : 'var(--nf-navy)' }}>{comment.authorName}</span>
          <span style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.45)' : 'var(--nf-ink-faint)' }}>{timeAgo(comment.createdAt)}</span>
        </div>
        <p style={{ fontSize: 13.5, color: dark ? 'rgba(255,255,255,0.85)' : 'var(--nf-ink)', marginTop: 2, lineHeight: 1.5 }}>{comment.text}</p>
        <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
          <button onClick={() => handleLike(comment)} style={{ border: 'none', background: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12.5, filter: liked ? 'none' : 'grayscale(0.4) opacity(0.7)' }}>👍</span>
            <span style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.6)' : 'var(--nf-ink-faint)' }}>{comment.likedBy?.length || ''}</span>
          </button>
          {!isReply && user && (
            <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} style={{ border: 'none', background: 'none', color: dark ? 'rgba(255,255,255,0.6)' : 'var(--nf-ink-faint)', fontSize: 11, fontWeight: 700, padding: 0 }}>
              Reply
            </button>
          )}
          {(isAdmin || comment.authorId === user?.uid) && (
            <button onClick={() => handleDelete(comment.id)} style={{ border: 'none', background: 'none', color: dark ? 'rgba(255,255,255,0.45)' : 'var(--nf-ink-faint)', fontSize: 11, padding: 0 }}>
              Delete
            </button>
          )}
        </div>

        {replyingTo === comment.id && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${comment.authorName}…`}
              style={inputStyle(dark)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleReplyPost(comment.id)}
            />
            <button onClick={() => handleReplyPost(comment.id)} disabled={busy || !replyText.trim()} className="nf-btn nf-btn-flow" style={{ padding: '8px 12px', fontSize: 12.5 }}>Post</button>
          </div>
        )}

        {repliesByParent[comment.id]?.map((reply) => <CommentRow key={reply.id} comment={reply} isReply />)}
      </div>
    )
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
          {topLevel.length === 0 && comments !== null && (
            <p style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'var(--nf-ink-soft)', fontSize: 13.5, textAlign: 'center', padding: '20px 0' }}>
              No comments yet — be the first to say something.
            </p>
          )}
          {topLevel.map((c) => <CommentRow key={c.id} comment={c} />)}
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
