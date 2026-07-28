// src/admin/ErrorLogs.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../services/firebase'

function tsMs(ts) {
  if (!ts) return 0
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  return 0
}

export default function ErrorLogs() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [logs, setLogs] = useState(null)

  useEffect(() => { if (isAdmin) reload() }, [isAdmin])

  async function reload() {
    const snap = await getDocs(query(collection(db, 'errorLogs'), orderBy('createdAt', 'desc'), limit(100)))
    setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }

  async function clearAll() {
    if (!window.confirm('Delete all error logs?')) return
    for (const log of logs) await deleteDoc(doc(db, 'errorLogs', log.id))
    reload()
  }

  if (!isAdmin) return <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center' }}><p>Admins only</p></div>

  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--nf-paper)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
          <h2 style={{ fontSize: 17 }}>Error Logs</h2>
        </div>
        {logs?.length > 0 && <button className="nf-btn nf-btn-ghost" style={{ padding: '6px 12px', fontSize: 12.5, color: 'var(--nf-danger)' }} onClick={clearAll}>Clear all</button>}
      </div>
      <div className="nf-scroll-body nf-container" style={{ paddingTop: 16 }}>
        {logs === null && <p style={{ color: 'var(--nf-ink-soft)' }}>Loading…</p>}
        {logs?.length === 0 && <div className="nf-empty"><p style={{ fontWeight: 700, color: 'var(--nf-navy)' }}>No errors logged — good sign 🎉</p></div>}
        {logs?.map((log) => (
          <div key={log.id} className="nf-card" style={{ padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="nf-badge nf-badge-rejected">{log.type}</span>
              <span style={{ fontSize: 11, color: 'var(--nf-ink-faint)' }}>{new Date(tsMs(log.createdAt)).toLocaleString()}</span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>{log.message}</p>
            {log.context && <p style={{ fontSize: 12, color: 'var(--nf-ink-soft)', marginTop: 4 }}>Context: {log.context}</p>}
            {log.url && <p style={{ fontSize: 11, color: 'var(--nf-ink-faint)', marginTop: 4 }}>{log.url}</p>}
            {log.stack && (
              <details style={{ marginTop: 6 }}>
                <summary style={{ fontSize: 11, color: 'var(--nf-blue)', cursor: 'pointer' }}>Stack trace</summary>
                <pre style={{ fontSize: 10, color: 'var(--nf-ink-faint)', whiteSpace: 'pre-wrap', marginTop: 4 }}>{log.stack}</pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
