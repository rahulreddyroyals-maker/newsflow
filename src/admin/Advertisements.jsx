// src/admin/Advertisements.jsx
// FIX for "ad not showing in news feed":
// Publishing an ad writes TWO documents — one to `advertisements` (for
// admin management) and a copy to `news` (so readers see it in the feed).
// Previously these were both inside one try/catch, so if the second write
// (the news copy) failed for any reason, the error was swallowed and the
// admin had no way to know the ad existed in `advertisements` but was
// invisible to readers. Two things fixed:
//   1. Each write now has its own try/catch with a distinct, specific error.
//   2. The ad list now checks whether each ad actually HAS a matching news
//      document (queries news where adRef == ad.id). If not, it shows a
//      clear warning and a "📰 Publish to Feed" button that creates the
//      missing news doc right now, using the ad's own already-saved data —
//      fixes any ad that got orphaned by the old code, no Firestore console
//      digging required.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CATEGORIES } from '../utils/categories'
import { ALL_DISTRICTS } from '../utils/districts'
import { generateNewsDraft } from '../services/groq'
import { uploadImage, uploadVideo } from '../services/newsService'
import { validateVideoFile, MAX_VIDEO_SECONDS } from '../utils/video'
import {
  addDoc, collection, getDocs, query, where, orderBy, limit,
  serverTimestamp, doc, updateDoc
} from 'firebase/firestore'
import { db } from '../services/firebase'

function tsMs(ts) {
  if (!ts) return 0
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (typeof ts.seconds === 'number') return ts.seconds * 1000
  const d = new Date(ts)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

function newsPayloadFromAd(ad, adId) {
  return {
    headline: ad.headline,
    headlineEn: ad.headlineEn || '',
    summary: ad.summary,
    summaryEn: ad.summaryEn || '',
    content: ad.content,
    contentEn: ad.contentEn || '',
    category: ad.category,
    district: ad.district,
    images: ad.images || [],
    videoUrl: ad.videoUrl || null,
    audioUrl: null,
    authorId: 'admin',
    authorName: 'NewsFlow Ad',
    isAd: true,
    adRef: adId,
    status: 'approved',
    views: 0,
    likedBy: [],
    dislikedBy: [],
    createdAt: serverTimestamp()
  }
}

// Publishes both documents, with each write's failure reported distinctly
// rather than both being caught by one generic error.
async function createAdvertisement(data) {
  let adId
  try {
    const adRef = await addDoc(collection(db, 'advertisements'), {
      headline: data.headline,
      headlineEn: data.headlineEn || '',
      summary: data.summary,
      summaryEn: data.summaryEn || '',
      content: data.content,
      contentEn: data.contentEn || '',
      category: data.category,
      district: data.district,
      businessName: data.businessName || '',
      images: data.images || [],
      videoUrl: data.videoUrl || null,
      isAd: true,
      status: 'active',
      views: 0,
      createdAt: serverTimestamp()
    })
    adId = adRef.id
  } catch (err) {
    throw new Error(`Ad record could not be saved: ${err.message}`)
  }

  try {
    await addDoc(collection(db, 'news'), newsPayloadFromAd(data, adId))
  } catch (err) {
    // Ad record DID save — only the reader-facing copy failed. Surface this
    // distinctly so the admin knows to use "Publish to Feed" on the list,
    // rather than assuming the whole publish failed.
    throw new Error(`Ad saved, but it failed to appear in the reader news feed: ${err.message}. Use "📰 Publish to Feed" on this ad in the list to retry.`)
  }

  return adId
}

// Checks each ad against the news collection and flags any without a
// matching adRef — these are "orphaned" ads invisible to readers.
async function checkFeedStatus(ads) {
  const results = await Promise.all(
    ads.map(async (ad) => {
      const snap = await getDocs(query(collection(db, 'news'), where('adRef', '==', ad.id), limit(1)))
      return { ...ad, inFeed: !snap.empty }
    })
  )
  return results
}

async function republishToFeed(ad) {
  await addDoc(collection(db, 'news'), newsPayloadFromAd(ad, ad.id))
}

async function listAds() {
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
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    headline: '', headlineEn: '', summary: '', summaryEn: '',
    content: '', contentEn: '', category: '', district: '', businessName: ''
  })
  const [rawNotes, setRawNotes] = useState('')
  const [images, setImages] = useState([])
  const [videoFile, setVideoFile] = useState(null)
  const [videoError, setVideoError] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [repairingId, setRepairingId] = useState(null)

  useEffect(() => { if (isAdmin) reload() }, [isAdmin])

  async function reload() {
    setAds(null)
    const raw = await listAds()
    const withFeedStatus = await checkFeedStatus(raw)
    setAds(withFeedStatus)
  }
  function upd(f, v) { setForm((x) => ({ ...x, [f]: v })) }

  if (!isAdmin) {
    return <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center' }}><p>Admins only</p></div>
  }

  async function handleVideoPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setVideoError('')
    const result = await validateVideoFile(file)
    if (!result.valid) { setVideoError(result.error); e.target.value = ''; return }
    setVideoFile(file)
  }

  async function handleDraft() {
    if (!rawNotes.trim()) return setError('Write ad notes first.')
    setError(''); setBusy(true); setBusyLabel('Writing AI draft…')
    try {
      const d = await generateNewsDraft({
        rawText: rawNotes, language: 'Telugu',
        category: form.category || 'business', district: form.district || 'All'
      })
      setForm((x) => ({ ...x, headline: d.headline, summary: d.summary, content: d.article }))
    } catch (err) {
      setError('AI draft failed: ' + err.message)
    } finally {
      setBusy(false); setBusyLabel('')
    }
  }

  async function handlePublish() {
    if (!form.headline.trim() || !form.content.trim()) return setError('Headline and content required.')
    if (!form.category || !form.district) return setError('Select category and district.')
    setError(''); setBusy(true)
    try {
      setBusyLabel('Uploading photos…')
      const imageUrls = []
      for (const file of images) imageUrls.push(await uploadImage(file))
      let videoUrl = null
      if (videoFile) { setBusyLabel('Uploading video…'); videoUrl = await uploadVideo(videoFile) }
      setBusyLabel('Publishing…')
      await createAdvertisement({ ...form, images: imageUrls, videoUrl })
      setSuccess('Ad published and added to the news feed.')
      setShowForm(false)
      setForm({ headline: '', headlineEn: '', summary: '', summaryEn: '', content: '', contentEn: '', category: '', district: '', businessName: '' })
      setRawNotes(''); setImages([]); setVideoFile(null)
      reload()
    } catch (err) {
      setError(err.message)
      reload() // even on partial failure, refresh so the "not in feed" flag shows correctly
    } finally {
      setBusy(false); setBusyLabel('')
    }
  }

  async function handleRepair(ad) {
    setRepairingId(ad.id)
    try {
      await republishToFeed(ad)
      await reload()
    } catch (err) {
      setError('Repair failed: ' + err.message)
    } finally {
      setRepairingId(null)
    }
  }

  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--nf-paper)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
          <h2 style={{ fontSize: 17 }}>Advertisements</h2>
        </div>
        <button className="nf-btn nf-btn-flow" style={{ padding: '8px 14px' }} onClick={() => { setShowForm((v) => !v); setError(''); setSuccess('') }}>
          {showForm ? '← List' : '+ New Ad'}
        </button>
      </div>

      <div className="nf-scroll-body nf-container" style={{ paddingTop: 16 }}>
        {success && <div style={{ background: '#E3F6EA', borderRadius: 10, padding: 12, marginBottom: 14 }}><p style={{ color: 'var(--nf-success)', fontWeight: 700, fontSize: 13 }}>{success}</p></div>}
        {error && !showForm && <div style={{ background: '#FBE7E5', borderRadius: 10, padding: 12, marginBottom: 14 }}><p style={{ color: 'var(--nf-danger)', fontWeight: 700, fontSize: 13 }}>{error}</p></div>}

        {showForm && (
          <div style={{ marginBottom: 28 }}>
            <div className="nf-input-group">
              <label className="nf-label">Business / brand name (optional)</label>
              <input className="nf-input" value={form.businessName} onChange={(e) => upd('businessName', e.target.value)} placeholder="e.g. Sri Lakshmi Sweets" />
            </div>
            <div className="nf-input-group">
              <label className="nf-label">Category *</label>
              <select className="nf-select" value={form.category} onChange={(e) => upd('category', e.target.value)}>
                <option value="">Select</option>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.en} / {c.te}</option>)}
              </select>
            </div>
            <div className="nf-input-group">
              <label className="nf-label">Target district * (push notifications go to this district)</label>
              <select className="nf-select" value={form.district} onChange={(e) => upd('district', e.target.value)}>
                <option value="">Select</option>
                {ALL_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="nf-input-group">
              <label className="nf-label">Photos</label>
              <input type="file" accept="image/*" multiple onChange={(e) => setImages(Array.from(e.target.files || []).slice(0, 4))} />
              {images.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {images.map((f, i) => <img key={i} src={URL.createObjectURL(f)} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />)}
                </div>
              )}
            </div>
            <div className="nf-input-group">
              <label className="nf-label">Video (optional, max {MAX_VIDEO_SECONDS}s)</label>
              {!videoFile ? (
                <input type="file" accept="video/*" onChange={handleVideoPick} />
              ) : (
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
            <button className="nf-btn nf-btn-flow nf-btn-block" disabled={busy} onClick={handleDraft} style={{ marginBottom: 16 }}>
              {busy ? busyLabel || 'Working…' : '✨ Generate AI Draft'}
            </button>

            <div style={{ borderTop: '1px dashed var(--nf-line)', paddingTop: 14 }}>
              <div className="nf-input-group"><label className="nf-label">Headline *</label><input className="nf-input" value={form.headline} onChange={(e) => upd('headline', e.target.value)} /></div>
              <div className="nf-input-group"><label className="nf-label">Summary</label><textarea className="nf-textarea" rows={2} value={form.summary} onChange={(e) => upd('summary', e.target.value)} /></div>
              <div className="nf-input-group"><label className="nf-label">Full content *</label><textarea className="nf-textarea" rows={5} value={form.content} onChange={(e) => upd('content', e.target.value)} /></div>
              <div className="nf-input-group"><label className="nf-label">Headline (English)</label><input className="nf-input" value={form.headlineEn} onChange={(e) => upd('headlineEn', e.target.value)} /></div>
            </div>

            {error && <div style={{ background: '#FBE7E5', borderRadius: 10, padding: 12, marginBottom: 12 }}><p style={{ color: 'var(--nf-danger)', fontSize: 13, fontWeight: 700 }}>{error}</p></div>}
            <button className="nf-btn nf-btn-primary nf-btn-block" disabled={busy} onClick={handlePublish} style={{ marginBottom: 10 }}>
              {busy ? busyLabel || 'Working…' : 'Publish Ad + Notify District'}
            </button>
          </div>
        )}

        {!showForm && (
          <>
            {ads === null && <p style={{ color: 'var(--nf-ink-soft)' }}>Loading…</p>}
            {ads?.length === 0 && <div className="nf-empty"><p style={{ fontWeight: 700, color: 'var(--nf-navy)' }}>No ads yet — tap "+ New Ad" to create one</p></div>}
            {ads?.slice().sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt)).map((ad) => (
              <div key={ad.id} className="nf-card" style={{ padding: 14, marginBottom: 12, opacity: ad.status === 'hidden' ? 0.6 : 1 }}>
                {ad.images?.[0] && <img src={ad.images[0]} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ fontWeight: 700, fontSize: 14, flex: 1, marginRight: 8 }}>{ad.headline}</p>
                  <span className={`nf-badge ${ad.status === 'active' ? 'nf-badge-approved' : 'nf-badge-rejected'}`}>{ad.status}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--nf-ink-faint)', marginTop: 4 }}>{ad.district} • {ad.category}{ad.businessName ? ` • ${ad.businessName}` : ''}</p>

                {ad.inFeed === false && (
                  <div style={{ background: '#FFF1DD', borderRadius: 8, padding: 10, marginTop: 10 }}>
                    <p style={{ fontSize: 12, color: 'var(--nf-warning)', fontWeight: 700 }}>
                      ⚠ Not appearing in the reader news feed
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {ad.inFeed === false && (
                    <button className="nf-btn nf-btn-primary" style={{ flex: 1 }} disabled={repairingId === ad.id} onClick={() => handleRepair(ad)}>
                      {repairingId === ad.id ? 'Publishing…' : '📰 Publish to Feed'}
                    </button>
                  )}
                  <button
                    className="nf-btn nf-btn-ghost"
                    style={{ flex: 1, color: ad.status === 'active' ? 'var(--nf-warning)' : 'var(--nf-success)' }}
                    onClick={async () => { await setAdStatus(ad.id, ad.status === 'active' ? 'hidden' : 'active'); reload() }}>
                    {ad.status === 'active' ? '🚫 Hide' : '↻ Republish'}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        <div style={{ height: 30 }} />
      </div>
    </div>
  )
}
