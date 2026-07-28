// src/pages/Classifieds.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { CLASSIFIED_CATEGORIES, createClassified, listActiveClassifieds } from '../services/classifieds'
import { ALL_DISTRICTS } from '../utils/districts'
import { uploadImage } from '../services/newsService'
import { Events } from '../services/analytics'

export default function Classifieds() {
  const { user, profile } = useAuth()
  const { lang } = useLanguage()
  const navigate = useNavigate()
  const [tab, setTab] = useState('browse')
  const [category, setCategory] = useState('All')
  const [items, setItems] = useState(null)

  useEffect(() => { if (tab === 'browse') reload() }, [tab, category])
  function reload() { listActiveClassifieds({ category }).then(setItems) }

  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', background: 'var(--nf-paper)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
          <h2 style={{ fontSize: 17 }}>Classifieds</h2>
        </div>
        {user && (
          <button className="nf-btn nf-btn-flow" style={{ padding: '8px 14px' }} onClick={() => setTab(tab === 'post' ? 'browse' : 'post')}>
            {tab === 'post' ? '← Browse' : '+ Post Ad'}
          </button>
        )}
      </div>

      {tab === 'browse' && (
        <>
          <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', flexShrink: 0 }}>
            <button className={`nf-chip ${category === 'All' ? 'active' : ''}`} onClick={() => setCategory('All')}>All</button>
            {CLASSIFIED_CATEGORIES.map((c) => (
              <button key={c.id} className={`nf-chip ${category === c.id ? 'active' : ''}`} onClick={() => setCategory(c.id)}>
                {lang === 'te' ? c.te : c.en}
              </button>
            ))}
          </div>
          <div className="nf-scroll-body nf-container">
            {items === null && <p style={{ color: 'var(--nf-ink-soft)' }}>Loading…</p>}
            {items?.length === 0 && <div className="nf-empty"><p style={{ fontWeight: 700, color: 'var(--nf-navy)' }}>No listings yet in this category</p></div>}
            {items?.map((item) => <ClassifiedCard key={item.id} item={item} lang={lang} />)}
            <div style={{ height: 30 }} />
          </div>
        </>
      )}

      {tab === 'post' && <PostClassifiedForm user={user} profile={profile} onDone={() => { setTab('browse'); reload() }} />}
    </div>
  )
}

function ClassifiedCard({ item, lang }) {
  const catLabel = CLASSIFIED_CATEGORIES.find((c) => c.id === item.category)
  return (
    <div className="nf-card" style={{ padding: 14, marginBottom: 12 }}>
      {item.images?.[0] && <img src={item.images[0]} alt="" style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />}
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--nf-orange)', textTransform: 'uppercase' }}>
        {catLabel ? (lang === 'te' ? catLabel.te : catLabel.en) : item.category}
      </span>
      <h3 style={{ fontSize: 15, margin: '4px 0 6px' }}>{item.title}</h3>
      <p style={{ fontSize: 13, color: 'var(--nf-ink-soft)', lineHeight: 1.5 }}>{item.description}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--nf-ink-faint)' }}>{item.district}</span>
        {item.price && <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--nf-navy)' }}>₹{item.price}</span>}
      </div>
      {item.contactPhone && (
        <a href={`tel:${item.contactPhone}`} className="nf-btn nf-btn-ghost nf-btn-block" style={{ marginTop: 10 }}>📞 {item.contactPhone}</a>
      )}
    </div>
  )
}

function PostClassifiedForm({ user, profile, onDone }) {
  const [form, setForm] = useState({ category: '', title: '', description: '', price: '', contactPhone: profile?.phone || '', district: profile?.district || '' })
  const [images, setImages] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!user) {
    return (
      <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <p style={{ fontWeight: 700, marginBottom: 12 }}>Log in to post a classified ad</p>
      </div>
    )
  }

  function upd(f, v) { setForm((x) => ({ ...x, [f]: v })) }

  async function handleSubmit() {
    if (!form.category || !form.title.trim() || !form.description.trim() || !form.contactPhone.trim()) {
      return setError('Category, title, description, and contact phone are required.')
    }
    setError(''); setBusy(true)
    try {
      const imageUrls = []
      for (const file of images) imageUrls.push(await uploadImage(file, 'classified_images'))
      await createClassified({ ...form, images: imageUrls, postedBy: user.uid, postedByName: profile?.name || 'NewsFlow User' })
      Events.classifiedPost(form.category)
      setSuccess(true)
      setTimeout(onDone, 1200)
    } catch (err) {
      setError('Could not post: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  if (success) {
    return (
      <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <p style={{ fontWeight: 700, color: 'var(--nf-success)' }}>✓ Submitted for review</p>
        <p style={{ fontSize: 13, color: 'var(--nf-ink-soft)', marginTop: 6 }}>An admin will approve it shortly.</p>
      </div>
    )
  }

  return (
    <div className="nf-scroll-body nf-container" style={{ paddingTop: 18 }}>
      <div className="nf-input-group">
        <label className="nf-label">Category *</label>
        <select className="nf-select" value={form.category} onChange={(e) => upd('category', e.target.value)}>
          <option value="">Select</option>
          {CLASSIFIED_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.en} / {c.te}</option>)}
        </select>
      </div>
      <div className="nf-input-group">
        <label className="nf-label">Title *</label>
        <input className="nf-input" value={form.title} onChange={(e) => upd('title', e.target.value)} placeholder="e.g. 2BHK flat for rent in Vijayawada" />
      </div>
      <div className="nf-input-group">
        <label className="nf-label">Description *</label>
        <textarea className="nf-textarea" rows={4} value={form.description} onChange={(e) => upd('description', e.target.value)} />
      </div>
      <div className="nf-input-group">
        <label className="nf-label">Price (optional, ₹)</label>
        <input className="nf-input" type="number" value={form.price} onChange={(e) => upd('price', e.target.value)} />
      </div>
      <div className="nf-input-group">
        <label className="nf-label">Contact phone *</label>
        <input className="nf-input" type="tel" value={form.contactPhone} onChange={(e) => upd('contactPhone', e.target.value)} />
      </div>
      <div className="nf-input-group">
        <label className="nf-label">District</label>
        <select className="nf-select" value={form.district} onChange={(e) => upd('district', e.target.value)}>
          <option value="">Any / statewide</option>
          {ALL_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="nf-input-group">
        <label className="nf-label">Photo (optional)</label>
        <input type="file" accept="image/*" onChange={(e) => setImages(e.target.files[0] ? [e.target.files[0]] : [])} />
      </div>
      {error && <p style={{ color: 'var(--nf-danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <button className="nf-btn nf-btn-primary nf-btn-block" disabled={busy} onClick={handleSubmit} style={{ marginBottom: 30 }}>
        {busy ? 'Submitting…' : 'Submit for Review'}
      </button>
    </div>
  )
}
