// src/admin/UploadNews.jsx
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CATEGORIES } from '../utils/categories'
import { ALL_DISTRICTS } from '../utils/districts'
import { generateNewsDraft, translateDraft, transcribeVoiceNote } from '../services/groq'
import { uploadImage, uploadVideo, uploadAudio, publishNewsDirectly } from '../services/newsService'
import { validateVideoFile, MAX_VIDEO_SECONDS } from '../utils/video'

// Lets an admin publish a story directly — no approval step, since the admin
// IS the approver. Same AI-assist as the journalist flow (optional: admin
// can also just type the final headline/summary/article by hand and skip
// the AI draft step entirely).
export default function UploadNews() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [category, setCategory] = useState('')
  const [district, setDistrict] = useState('')
  const [images, setImages] = useState([])
  const [videoFile, setVideoFile] = useState(null)
  const [videoError, setVideoError] = useState('')
  const [rawText, setRawText] = useState('')
  const [draft, setDraft] = useState({ headline: '', headlineEn: '', summary: '', summaryEn: '', article: '', articleEn: '' })
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('')
  const [error, setError] = useState('')
  const [audioBlob, setAudioBlob] = useState(null)
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  if (!isAdmin) {
    return <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center' }}><p>Admins only</p></div>
  }

  function updateDraftField(field, value) {
    setDraft((d) => ({ ...d, [field]: value }))
  }

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current, { type: 'audio/webm' }))
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch {
      setError('Microphone access denied. You can still type notes below.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  async function handleVideoPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setVideoError('')
    const result = await validateVideoFile(file)
    if (!result.valid) {
      setVideoError(result.error)
      e.target.value = ''
      return
    }
    setVideoFile(file)
  }

  async function handleGenerateDraft() {
    if (!rawText.trim() && !audioBlob) return setError('Write notes or record a voice note first.')
    setError('')
    setBusy(true)
    try {
      let combinedText = rawText.trim()
      if (audioBlob) {
        setBusyLabel('Transcribing voice note…')
        try {
          const transcript = await transcribeVoiceNote(audioBlob, 'te')
          combinedText = [combinedText, transcript].filter(Boolean).join('\n\n')
        } catch (err) {
          if (!combinedText) throw new Error('Voice transcription failed and there are no typed notes to fall back on. Please type a few lines, or try recording again.')
          setError('Voice transcription failed — continuing with typed notes only. ')
        }
      }
      setBusyLabel('Writing AI draft…')
      const generated = await generateNewsDraft({ rawText: combinedText, language: 'Telugu', category, district })
      setDraft((d) => ({ ...d, headline: generated.headline, summary: generated.summary, article: generated.article }))
    } catch (err) {
      setError((prev) => (prev ? prev + ' ' : '') + 'AI draft failed: ' + err.message)
    } finally {
      setBusy(false)
      setBusyLabel('')
    }
  }

  async function handleTranslate() {
    setBusy(true)
    setBusyLabel('Translating…')
    try {
      const translated = await translateDraft(draft, 'English')
      setDraft((d) => ({ ...d, headlineEn: translated.headline, summaryEn: translated.summary, articleEn: translated.article }))
    } catch (err) {
      setError('Translation failed: ' + err.message)
    } finally {
      setBusy(false)
      setBusyLabel('')
    }
  }

  async function handlePublish() {
    if (!category || !district) return setError('Select category and district.')
    if (!draft.headline.trim() || !draft.article.trim()) return setError('Headline and article are required.')
    setError('')
    setBusy(true)
    try {
      setBusyLabel('Uploading photos…')
      const imageUrls = []
      for (const file of images) imageUrls.push(await uploadImage(file))

      let videoUrl = null
      if (videoFile) {
        setBusyLabel('Uploading video…')
        videoUrl = await uploadVideo(videoFile)
      }

      let audioUrl = null
      if (audioBlob) {
        setBusyLabel('Uploading voice note…')
        audioUrl = await uploadAudio(audioBlob)
      }

      setBusyLabel('Publishing…')
      await publishNewsDirectly({ ...draft, category, district, images: imageUrls, videoUrl, audioUrl })
      navigate('/admin', { replace: true })
    } catch (err) {
      setError('Could not publish: ' + err.message)
    } finally {
      setBusy(false)
      setBusyLabel('')
    }
  }

  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--nf-paper)' }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
        <h2 style={{ fontSize: 17 }}>Upload News</h2>
      </div>

      <div className="nf-scroll-body nf-container" style={{ paddingTop: 18 }}>
        <div className="nf-input-group">
          <label className="nf-label">Category</label>
          <select className="nf-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select category</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.en} / {c.te}</option>)}
          </select>
        </div>
        <div className="nf-input-group">
          <label className="nf-label">District</label>
          <select className="nf-select" value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">Select district</option>
            {ALL_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="nf-input-group">
          <label className="nf-label">Photos</label>
          <input type="file" accept="image/*" multiple onChange={(e) => setImages(Array.from(e.target.files || []).slice(0, 4))} />
          {images.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {images.map((f, i) => <img key={i} src={URL.createObjectURL(f)} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />)}
            </div>
          )}
        </div>

        <div className="nf-input-group">
          <label className="nf-label">Video (optional, max {MAX_VIDEO_SECONDS}s)</label>
          {!videoFile ? (
            <input type="file" accept="video/*" onChange={handleVideoPick} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <video controls src={URL.createObjectURL(videoFile)} style={{ flex: 1, maxHeight: 160, borderRadius: 8 }} />
              <button type="button" className="nf-btn nf-btn-ghost" onClick={() => setVideoFile(null)}>Remove</button>
            </div>
          )}
          {videoError && <p style={{ color: 'var(--nf-danger)', fontSize: 12.5, marginTop: 6 }}>{videoError}</p>}
        </div>

        <div className="nf-input-group">
          <label className="nf-label">Voice note (optional)</label>
          {!audioBlob ? (
            <button
              type="button"
              className={`nf-btn ${recording ? 'nf-btn-primary' : 'nf-btn-ghost'} nf-btn-block`}
              onClick={recording ? stopRecording : startRecording}
            >
              {recording ? '⏹ Stop recording' : '🎙 Record voice note'}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <audio controls src={URL.createObjectURL(audioBlob)} style={{ flex: 1, height: 38 }} />
              <button type="button" className="nf-btn nf-btn-ghost" onClick={() => setAudioBlob(null)}>Remove</button>
            </div>
          )}
        </div>

        <div className="nf-input-group">
          <label className="nf-label">Raw notes (for AI draft — optional if writing by hand below)</label>
          <textarea className="nf-textarea" value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="Paste or type the report; AI will turn it into a headline, summary, and article." />
        </div>
        <button className="nf-btn nf-btn-flow nf-btn-block" disabled={busy} onClick={handleGenerateDraft} style={{ marginBottom: 20 }}>
          {busy ? busyLabel || 'Working…' : '✨ Generate AI Draft'}
        </button>

        <div style={{ paddingTop: 6, borderTop: '1px dashed var(--nf-line)' }}>
          <div className="nf-input-group">
            <label className="nf-label">Headline</label>
            <input className="nf-input" value={draft.headline} onChange={(e) => updateDraftField('headline', e.target.value)} />
          </div>
          <div className="nf-input-group">
            <label className="nf-label">Summary</label>
            <textarea className="nf-textarea" rows={2} value={draft.summary} onChange={(e) => updateDraftField('summary', e.target.value)} />
          </div>
          <div className="nf-input-group">
            <label className="nf-label">Full article</label>
            <textarea className="nf-textarea" rows={7} value={draft.article} onChange={(e) => updateDraftField('article', e.target.value)} />
          </div>

          {draft.headlineEn && (
            <>
              <div className="nf-input-group">
                <label className="nf-label">Headline (EN)</label>
                <input className="nf-input" value={draft.headlineEn} onChange={(e) => updateDraftField('headlineEn', e.target.value)} />
              </div>
              <div className="nf-input-group">
                <label className="nf-label">Summary (EN)</label>
                <textarea className="nf-textarea" rows={2} value={draft.summaryEn} onChange={(e) => updateDraftField('summaryEn', e.target.value)} />
              </div>
              <div className="nf-input-group">
                <label className="nf-label">Article (EN)</label>
                <textarea className="nf-textarea" rows={7} value={draft.articleEn} onChange={(e) => updateDraftField('articleEn', e.target.value)} />
              </div>
            </>
          )}

          <button className="nf-btn nf-btn-ghost nf-btn-block" disabled={busy} onClick={handleTranslate} style={{ marginBottom: 12 }}>
            🌐 {draft.headlineEn ? 'Re-translate to English' : 'Add English translation'}
          </button>
        </div>

        {error && <p style={{ color: 'var(--nf-danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button className="nf-btn nf-btn-primary nf-btn-block" disabled={busy} onClick={handlePublish} style={{ marginBottom: 30 }}>
          {busy ? busyLabel || 'Working…' : 'Publish Now'}
        </button>
      </div>
    </div>
  )
}
