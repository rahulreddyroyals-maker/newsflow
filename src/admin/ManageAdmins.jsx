// src/admin/ManageAdmins.jsx
// Lets a super/existing admin:
//  1. Promote an existing reader/journalist account to admin (or demote back)
//     — a direct Firestore update, already allowed by your rules for admins.
//  2. Create a brand-new admin account from scratch (email + password) via
//     the createAdminAccount Cloud Function — this does NOT log you out of
//     your own session, unlike a plain client-side account creation would.
//
// Multiple admins can then split up review/proofreading work in the
// existing Pending Approval queue — there's no separate "assign to me"
// mechanism, but any admin can approve/edit/reject any pending report, so
// a small team can just divide the queue by agreement (e.g. by district).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { collection, getDocs, doc, updateDoc, query, limit } from 'firebase/firestore'
import { db, app } from '../services/firebase'

async function listAllUsers() {
  const snap = await getDocs(query(collection(db, 'users'), limit(300)))
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
}

async function setUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role })
}

export default function ManageAdmins() {
  const { isAdmin, user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState(null)
  const [busyUid, setBusyUid] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  useEffect(() => { if (isAdmin) reload() }, [isAdmin])

  function reload() { listAllUsers().then(setUsers) }

  if (!isAdmin) {
    return <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center' }}><p>Admins only</p></div>
  }

  const admins = users?.filter((u) => u.role === 'admin') || []
  const others = users?.filter((u) => u.role !== 'admin') || []

  async function handlePromote(u) {
    setBusyUid(u.uid)
    await setUserRole(u.uid, 'admin')
    reload()
    setBusyUid(null)
  }

  async function handleDemote(u) {
    if (u.uid === user.uid) {
      alert("You can't remove your own admin access — ask another admin to do this.")
      return
    }
    if (!window.confirm(`Remove admin access from ${u.name || u.email}?`)) return
    setBusyUid(u.uid)
    await setUserRole(u.uid, 'reader')
    reload()
    setBusyUid(null)
  }

  async function handleCreateAdmin() {
    if (!form.email.trim() || !form.password.trim()) {
      return setCreateError('Email and password are required.')
    }
    if (form.password.length < 6) {
      return setCreateError('Password must be at least 6 characters.')
    }
    setCreateError(''); setCreateSuccess(''); setCreateBusy(true)
    try {
      const functions = getFunctions(app, 'asia-south1')
      const createAdminAccount = httpsCallable(functions, 'createAdminAccount')
      const result = await createAdminAccount({ email: form.email.trim(), password: form.password, name: form.name.trim() })
      setCreateSuccess(`Admin account created for ${result.data.email}. They can log in at /admin-login with the password you set.`)
      setForm({ name: '', email: '', password: '' })
      setShowCreate(false)
      reload()
    } catch (err) {
      setCreateError(err.message || 'Could not create admin account.')
    } finally {
      setCreateBusy(false)
    }
  }

  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--nf-paper)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
          <h2 style={{ fontSize: 17 }}>Manage Admins</h2>
        </div>
        <button className="nf-btn nf-btn-flow" style={{ padding: '8px 14px' }} onClick={() => { setShowCreate((v) => !v); setCreateError(''); setCreateSuccess('') }}>
          {showCreate ? '← Back' : '+ New Admin'}
        </button>
      </div>

      <div className="nf-scroll-body nf-container" style={{ paddingTop: 16 }}>

        {createSuccess && <div style={{ background: '#E3F6EA', borderRadius: 10, padding: 12, marginBottom: 14 }}><p style={{ color: 'var(--nf-success)', fontWeight: 700, fontSize: 13 }}>{createSuccess}</p></div>}

        {showCreate && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ background: 'var(--nf-paper-dim)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <p style={{ fontSize: 12.5, color: 'var(--nf-ink-soft)', lineHeight: 1.6 }}>
                Creates a brand-new login for someone who isn't already a NewsFlow user
                (e.g. a proofreader you're bringing on). They'll log in at <strong>/admin-login</strong>{' '}
                using the email and password you set here.
              </p>
            </div>
            <div className="nf-input-group">
              <label className="nf-label">Name</label>
              <input className="nf-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Their name" />
            </div>
            <div className="nf-input-group">
              <label className="nf-label">Email</label>
              <input className="nf-input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="their@email.com" />
            </div>
            <div className="nf-input-group">
              <label className="nf-label">Temporary password</label>
              <input className="nf-input" type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="At least 6 characters — share this with them securely" />
            </div>
            {createError && <p style={{ color: 'var(--nf-danger)', fontSize: 13, marginBottom: 12 }}>{createError}</p>}
            <button className="nf-btn nf-btn-primary nf-btn-block" disabled={createBusy} onClick={handleCreateAdmin}>
              {createBusy ? 'Creating…' : 'Create Admin Account'}
            </button>
          </div>
        )}

        {!showCreate && (
          <>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--nf-ink-soft)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Current admins ({admins.length})
            </p>
            {users === null && <p style={{ color: 'var(--nf-ink-soft)' }}>Loading…</p>}
            {admins.map((u) => (
              <div key={u.uid} className="nf-card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>{u.name || '(no name)'} {u.uid === user.uid && <span style={{ color: 'var(--nf-ink-faint)', fontWeight: 500 }}>(you)</span>}</p>
                  <p style={{ fontSize: 12, color: 'var(--nf-ink-faint)' }}>{u.email}</p>
                </div>
                {u.uid !== user.uid && (
                  <button className="nf-btn nf-btn-ghost" style={{ color: 'var(--nf-danger)', padding: '6px 12px', fontSize: 12.5 }} disabled={busyUid === u.uid} onClick={() => handleDemote(u)}>
                    Remove
                  </button>
                )}
              </div>
            ))}

            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--nf-ink-soft)', margin: '24px 0 10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Promote an existing user
            </p>
            <p style={{ fontSize: 12, color: 'var(--nf-ink-faint)', marginBottom: 10 }}>
              Give admin access to someone who already has a reader or journalist account.
            </p>
            {others.slice(0, 50).map((u) => (
              <div key={u.uid} className="nf-card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>{u.name || '(no name)'}</p>
                  <p style={{ fontSize: 12, color: 'var(--nf-ink-faint)' }}>{u.email} • {u.role}</p>
                </div>
                <button className="nf-btn nf-btn-ghost" style={{ padding: '6px 12px', fontSize: 12.5 }} disabled={busyUid === u.uid} onClick={() => handlePromote(u)}>
                  Make admin
                </button>
              </div>
            ))}
          </>
        )}

        <div style={{ height: 30 }} />
      </div>
    </div>
  )
}
