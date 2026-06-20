// src/journalist/SubmitNews.jsx
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CATEGORIES } from '../utils/categories'
import { ALL_DISTRICTS } from '../utils/districts'
import { generateNewsDraft, transcribeVoiceNote } from '../services/groq'
import { uploadImage, uploadAudio } from '../services/newsService'

export default function SubmitNews() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [category, setCategory] = useState('')
  const [district, setDistrict] = useState(profile?.district || '')
  const [text, setText] = useState('')
  const [images, setImages] = useState([])
  const [audioBlob, setAudioBlob] = useState(null)
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('')
  const [error, setError] = useState('')

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

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
      setError('Microphone access denied. You can still write your report as text below.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  function handleImagePick(e) {
    const files = Array.from(e.target.files || []).slice(0, 4)
    setImages(files)
  }

  async function handleGenerateDraft() {
    setError('')
    if (!category || !district) return setError('Please select category and district first.')
    if (!text.trim() && !audioBlob) return setError('Add a voice note or write your report notes first.')

    setBusy(true)
    try {
      let rawText = text.trim()

      if (audioBlob) {
        setBusyLabel('Transcribing voice note…')
        const transcript = await transcribeVoiceNote(audioBlob, profile?.language === 'en' ? 'en' : 'te')
        rawText = [rawText, transcript].filter(Boolean).join('\n\n')
      }

      setBusyLabel('Uploading photos…')
      const imageUrls = []
      for (const file of images) {
        imageUrls.push(await uploadImage(file))
      }

      let audioUrl = null
      if (audioBlob) {
        setBusyLabel('Uploading voice note…')
        audioUrl = await uploadAudio(audioBlob)
      }

      setBusyLabel('Writing AI draft…')
      const language = profile?.language === 'en' ? 'English' : 'Telugu'
      const draft = await generateNewsDraft({ rawText, language, category, district })

      navigate('/journalist/preview', {
        state: {
          ...draft,
          rawText,
          category,
          district,
          images: imageUrls,
          audioUrl,
          language: profile?.language || 'te'
        }
      })
    } catch (err) {
      setError(err.message || 'Something went wrong generating the draft. Please try again.')
    } finally {
      setBusy(false)
      setBusyLabel('')
    }
  }

  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--nf-paper)' }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
        <h2 style={{ fontSize: 17 }}>Submit News</h2>
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
          <label className="nf-label">Upload photos (optional, up to 4)</label>
          <input type="file" accept="image/*" multiple onChange={handleImagePick} />
          {images.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {images.map((f, i) => (
                <img key={i} src={URL.createObjectURL(f)} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />
              ))}
            </div>
          )}
        </div>

        <div className="nf-input-group">
          <label className="nf-label">Write your report notes</label>
          <textarea
            className="nf-textarea"
            placeholder="What happened, where, who's involved, when — write it in your own words, AI will turn it into a clean article."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        {error && <p style={{ color: 'var(--nf-danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button className="nf-btn nf-btn-flow nf-btn-block" disabled={busy} onClick={handleGenerateDraft} style={{ marginBottom: 30 }}>
          {busy ? busyLabel || 'Working…' : '✨ Generate AI Draft'}
        </button>
      </div>
    </div>
  )
}
