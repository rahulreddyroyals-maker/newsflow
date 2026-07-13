// src/admin/Advertisements.jsx
// Admin can create and manage advertisements — displayed exactly like news
// reports to readers (same feed, same cards), but tagged with an "Ad" label.
// Creating a new ad also triggers a Cloud Function that sends push
// notifications to users in the target district.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CATEGORIES } from '../utils/categories'
import { ALL_DISTRICTS } from '../utils/districts'
import { generateNewsDraft } from '../services/groq'
import { uploadImage, uploadVideo } from '../services/newsService'
import { validateVideoFile, MAX_VIDEO_SECONDS } from '../utils/video'
import { addDoc, collection, getDocs, query, orderBy, limit, serverTimestamp, doc, updateDoc } from 'firebase/firestore'
import { db } from '../services/firebase'

async function createAdvertisement(data) {
  const ref = await addDoc(collection(db, 'advertisements'), {
    ...data,
    isAd: true,
    status: 'active',
    views: 0,
    likedBy: [],
    dislikedBy: [],
    createdAt: serverTimestamp()
  })
  // Also publish to the news feed so readers see it inline
  await addDoc(collection(db, 'news'), {
    headline: data.headline,
    headlineEn: data.headlineEn || '',
    summary: data.summary,
    summaryEn: data.summaryEn || '',
    content: data.content,
    contentEn: data.contentEn || '',
    category: data.category,
    district: data.district,
    images: data.images || [],
    videoUrl: data.videoUrl || null,
    audioUrl: null,
    authorId: 'admin',
    authorName: 'NewsFlow',
    isAd: true,
    adRef: ref.id,
    status: 'approved',
    views: 0,
    likedBy: [],
    dislikedBy: [],
    createdAt: serverTimestamp()
  })
  return ref.id
}

async function listAdvertisements() {
  const snap = await getDocs(query(collection(db, 'advertisements'), orderBy('createdAt', 'desc'), limit(100)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

async function setAdStatus(id, status) {
  await updateDoc(doc(db, 'advertisements', id), { status })
}

export default function Advertisements() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [ads, setAds] = useState(null)
  const [tab, setTab] = useState('list') // 'list' | 'new'
  const [form, setForm] = useState({ headline: '', headlineEn: '', summary: '', summaryEn: '', content: '', contentEn: '', category: '', district: '', businessName: '', images: [], videoUrl: null })
  const [rawNotes, setRawNotes] = useState('')
  const [images, setImages] = useState([])
  const [videoFile, setVideoFile] = useState(null)
  const [videoError, setVideoError] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (isAdmin) listAdvertisements().then(setAds)
  }, [isAdmin])

  if (!isAdmin) return <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center' }}><p>Admins only</p></div>

  function updateForm(field, value) { setForm((f) => ({ ...f, [field]: value })) }

  async function handleVideoPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setVideoError('')
    const result = await validateVideoFile(file)
    if (!result.valid) { setVideoError(result.error); e.target.value = ''; return }
    setVideoFile(file)
  }

  async function handleGenerateDraft() {
    if (!rawNotes.trim()) return setError('Write ad details/notes first.')
    setError(''); setBusy(true); setBusyLabel('Writing AI draft…')
    try {
      const draft = await generateNewsDraft({ rawText: rawNotes, language: 'Telugu', category: form.category || 'business', district: form.district || 'All' })
      setForm((f) => ({ ...f, headline: draft.headline, summary: draft.summary, content: draft.article }))
    } catch (err) { setError('AI draft failed: ' + err.message) }
    finally { setBusy(false); setBusyLabel('') }
  }

  async function handlePublish() {
    if (!form.headline.trim() || !form.content.trim()) return setError('Headline and content are required.')
    if (!form.category || !form.district) return setError('Select category and district.')
    setError(''); setBusy(true)
    try {
      setBusyLabel('Uploading photos…')
      const imageUrls = []
      for (const file of images) imageUrls.push(await uploadImage(file))
      let videoUrl = null
      if (videoFile) { setBusyLabel('Uploading video…'); videoUrl = await uploadVideo(videoFile) }
      setBusyLabel('Publishing ad…')
      await createAdvertisement({ ...form, businessName: form.businessName, images: imageUrls, videoUrl })
      setSuccess('Ad published and push notifications queued for the district.')
      setTab('list')
      listAdvertisements().then(setAds)
    } catch (err) { setError('Could not publish: ' + err.message) }
    finally { setBusy(false); setBusyLabel('') }
  }

  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--nf-paper)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
          <h2 style={{ fontSize: 17 }}>Advertisements</h2>
        </div>
        <button className="nf-btn nf-btn-flow" style={{ padding: '8px 14px' }} onClick={() => setTab(tab === 'new' ? 'list' : 'new')}>
          {tab === 'new' ? '← Back to list' : '+ New Ad'}
        </button>
      </div>

      {success && <div style={{ padding: '12px 16px', background: '#E3F6EA' }}><p style={{ color: 'var(--nf-success)', fontWeight: 700, fontSize: 13 }}>{success}</p></div>}

      {tab === 'list' && (
        <div className="nf-scroll-body nf-container" style={{ paddingTop: 16 }}>
          {ads === null && <p style={{ color: 'var(--nf-ink-soft)' }}>Loading…</p>}
          {ads?.length === 0 && <div className="nf-empty"><p style={{ fontWeight: 700, color: 'var(--nf-navy)' }}>No ads published yet</p></div>}
          {ads?.map((ad) => (
            <div key={ad.id} className="nf-card" style={{ padding: 14, marginBottom: 12, opacity: ad.status === 'hidden' ? 0.6 : 1 }}>
              {ad.images?.[0] && <img src={ad.images[0]} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <p style={{ fontWeight: 700, fontSize: 14 }}>{ad.headline}</p>
                <span className={`nf-badge ${ad.status === 'active' ? 'nf-badge-approved' : 'nf-badge-rejected'}`}>{ad.status}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--nf-ink-faint)', marginTop: 4 }}>{ad.district} • {ad.category} {ad.businessName ? `• ${ad.businessName}` : ''}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="nf-btn nf-btn-ghost" style={{ flex: 1, color: ad.status === 'active' ? 'var(--nf-warning)' : 'var(--nf-success)' }}
                  onClick={async () => { await setAdStatus(ad.id, ad.status === 'active' ? 'hidden' : 'active'); listAdvertisements().then(setAds) }}>
                  {ad.status === 'active' ? '🚫 Hide' : '↻ Republish'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'new' && (
        <div className="nf-scroll-body nf-container" style={{ paddingTop: 16 }}>
          <div className="nf-input-group">
            <label className="nf-label">Business / brand name (optional)</label>
            <input className="nf-input" value={form.businessName} onChange={(e) => updateForm('businessName', e.target.value)} placeholder="e.g. Sri Lakshmi Sweets" />
          </div>
          <div className="nf-input-group">
            <label className="nf-label">Category</label>
            <select className="nf-select" value={form.category} onChange={(e) => updateForm('category', e.target.value)}>
              <option value="">Select</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.en} / {c.te}</option>)}
            </select>
          </div>
          <div className="nf-input-group">
            <label className="nf-label">Target district (push notifications go to this district's users)</label>
            <select className="nf-select" value={form.district} onChange={(e) => updateForm('district', e.target.value)}>
              <option value="">Select</option>
              {ALL_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="nf-input-group">
            <label className="nf-label">Photos</label>
            <input type="file" accept="image/*" multiple onChange={(e) => setImages(Array.from(e.target.files || []).slice(0, 4))} />
            {images.length > 0 && <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {images.map((f, i) => <img key={i} src={URL.createObjectURL(f)} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />)}
            </div>}
          </div>
          <div className="nf-input-group">
            <label className="nf-label">Video (optional, max {MAX_VIDEO_SECONDS}s)</label>
            {!videoFile ? <input type="file" accept="video/*" onChange={handleVideoPick} /> : (
              <div style={{ display: 'flex', gap: 10 }}>
                <video controls src={URL.createObjectURL(videoFile)} style={{ flex: 1, maxHeight: 150, borderRadius: 8 }} />
                <button className="nf-btn nf-btn-ghost" onClick={() => setVideoFile(null)}>Remove</button>
              </div>
            )}
            {videoError && <p style={{ color: 'var(--nf-danger)', fontSize: 12.5, marginTop: 4 }}>{videoError}</p>}
          </div>
          <div className="nf-input-group">
            <label className="nf-label">Ad notes (for AI draft)</label>
            <textarea className="nf-textarea" rows={3} value={rawNotes} onChange={(e) => setRawNotes(e.target.value)} placeholder="Describe the ad — product, offer, target audience…" />
          </div>
          <button className="nf-btn nf-btn-flow nf-btn-block" disabled={busy} onClick={handleGenerateDraft} style={{ marginBottom: 18 }}>
            {busy ? busyLabel || 'Working…' : '✨ Generate AI Draft'}
          </button>
          <div style={{ borderTop: '1px dashed var(--nf-line)', paddingTop: 14 }}>
            <div className="nf-input-group"><label className="nf-label">Headline</label><input className="nf-input" value={form.headline} onChange={(e) => updateForm('headline', e.target.value)} /></div>
            <div className="nf-input-group"><label className="nf-label">Summary</label><textarea className="nf-textarea" rows={2} value={form.summary} onChange={(e) => updateForm('summary', e.target.value)} /></div>
            <div className="nf-input-group"><label className="nf-label">Full content</label><textarea className="nf-textarea" rows={6} value={form.content} onChange={(e) => updateForm('content', e.target.value)} /></div>
          </div>
          {error && <div style={{ background: '#FBE7E5', borderRadius: 10, padding: 12, marginBottom: 12 }}><p style={{ color: 'var(--nf-danger)', fontSize: 13, fontWeight: 700 }}>{error}</p></div>}
          <button className="nf-btn nf-btn-primary nf-btn-block" disabled={busy} onClick={handlePublish} style={{ marginBottom: 30 }}>
            {busy ? busyLabel || 'Working…' : 'Publish Ad + Send Push Notifications'}
          </button>
        </div>
      )}
    </div>
  )
}
