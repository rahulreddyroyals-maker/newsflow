// src/journalist/SubmitNews.jsx
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CATEGORIES } from '../utils/categories'
import { generateNewsDraft, transcribeVoiceNote } from '../services/groq'
import { uploadImage, uploadAudio, uploadVideo } from '../services/newsService'
import { validateVideoFile, MAX_VIDEO_SECONDS } from '../utils/video'

export default function SubmitNews() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [category, setCategory] = useState('')
  const district = profile?.district || ''
  const [text, setText] = useState('')
  const [images, setImages] = useState([])
  const [videoFile, setVideoFile] = useState(null)
  const [videoError, setVideoError] = useState('')
  const [audioBlob, setAudioBlob] = useState(null)
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('')
  const [error, setError] = useState('')
  const [showNameThisPost, setShowNameThisPost] = useState(profile?.displayNamePublicly !== false)

  // Filled either by "Generate AI Draft" or typed by hand below — AI failing
  // (wrong/expired key, network issue, etc.) no longer blocks submission;
  // the journalist can always just type these three fields themselves and
  // continue, the same way the admin's Upload News page already works.
  const [headline, setHeadline] = useState('')
  const [summary, setSummary] = useState('')
  const [article, setArticle] = useState('')

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  if (profile?.suspended) {
    return (
      <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <p style={{ fontWeight: 700, color: 'var(--nf-danger)', marginBottom: 8 }}>Posting is currently restricted</p>
        <p style={{ fontSize: 13.5, color: 'var(--nf-ink-soft)', textAlign: 'center' }}>
          An admin has paused your ability to submit new reports. Contact the NewsFlow team if you think this is a mistake.
        </p>
        <button className="nf-btn nf-btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate(-1)}>Go back</button>
      </div>
    )
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

  // Assistive only now — fills the headline/summary/article fields below on
  // success, but never blocks the journalist from typing those by hand
  // instead if this fails (wrong API key, network issue, etc.) or they'd
  // simply rather write it themselves.
  async function handleGenerateDraft() {
    setError('')
    if (!category || !district) return setError('Please select category and district first.')
    if (!text.trim() && !audioBlob) return setError('Add a voice note or write your report notes first.')

    setBusy(true)
    try {
      let rawText = text.trim()

      if (audioBlob) {
        setBusyLabel('Transcribing voice note…')
        try {
          const transcript = await transcribeVoiceNote(audioBlob, profile?.language === 'en' ? 'en' : 'te')
          rawText = [rawText, transcript].filter(Boolean).join('\n\n')
        } catch (err) {
          if (!rawText) {
            throw new Error('Voice transcription failed and there are no typed notes to fall back on. Type a few lines below, or try recording again.')
          }
          setError('Voice transcription failed, used your typed notes only for this draft. ')
        }
      }

      setBusyLabel('Writing AI draft…')
      const language = profile?.language === 'en' ? 'English' : 'Telugu'
      const draft = await generateNewsDraft({ rawText, language, category, district })
      setHeadline(draft.headline || '')
      setSummary(draft.summary || '')
      setArticle(draft.article || '')
    } catch (err) {
      setError((prev) => (prev ? prev + ' ' : '') + (err.message || 'AI draft generation failed. You can still type the headline/summary/article by hand below and continue.'))
    } finally {
      setBusy(false)
      setBusyLabel('')
    }
  }

  async function handleContinue() {
    setError('')
    if (!category || !district) return setError('Select category first.')
    if (!headline.trim() || !article.trim()) {
      return setError('Headline and full article are required — generate a draft above or type them in yourself.')
    }
    setBusy(true)
    setBusyLabel('Uploading photos…')
    try {
      const imageUrls = []
      for (const file of images) {
        imageUrls.push(await uploadImage(file))
      }

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

      navigate('/journalist/preview', {
        state: {
          headline,
          summary,
          article,
          showNameThisPost,
          rawText: text.trim(),
          category,
          district,
          images: imageUrls,
          videoUrl,
          audioUrl,
          language: profile?.language || 'te'
        }
      })
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
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
          <div style={lockedDistrictStyle}>
            📍 {profile?.district || 'Not set'}
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--nf-ink-faint)', marginTop: 6 }}>
            You can only file reports for your own registered district — NewsFlow
            points are only earned on your own district's news. If you've moved,
            ask an admin to update your district.
          </p>
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
          <label className="nf-label">Upload video (optional, max {MAX_VIDEO_SECONDS}s)</label>
          {!videoFile ? (
            <>
              <input type="file" accept="video/*" onChange={handleVideoPick} />
              <p style={{ fontSize: 11.5, color: 'var(--nf-ink-faint)', marginTop: 6 }}>
                Tip: record at lower resolution if your phone allows it — shorter, smaller clips upload faster and use less data for readers too.
              </p>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <video controls src={URL.createObjectURL(videoFile)} style={{ flex: 1, maxHeight: 160, borderRadius: 8 }} />
              <button type="button" className="nf-btn nf-btn-ghost" onClick={() => setVideoFile(null)}>Remove</button>
            </div>
          )}
          {videoError && <p style={{ color: 'var(--nf-danger)', fontSize: 12.5, marginTop: 6 }}>{videoError}</p>}
        </div>

        <div className="nf-input-group">
          <div style={nameToggleRowStyle}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--nf-navy)' }}>Show my name on this report</p>
              <p style={{ fontSize: 11.5, color: 'var(--nf-ink-faint)', marginTop: 2 }}>
                {showNameThisPost ? `Readers will see "${profile?.name || 'your name'}" on this one` : 'Readers will see "NewsFlow Citizen Journalist" on this one'}
              </p>
            </div>
            <Toggle checked={showNameThisPost} onChange={() => setShowNameThisPost((v) => !v)} />
          </div>
        </div>

        <div className="nf-input-group">
          <label className="nf-label">Write your report notes</label>
          <textarea
            className="nf-textarea"
            placeholder="What happened, where, who's involved, when — write it in your own words, AI will turn it into a clean article below."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        {error && <p style={{ color: 'var(--nf-danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button className="nf-btn nf-btn-flow nf-btn-block" disabled={busy} onClick={handleGenerateDraft} style={{ marginBottom: 22 }}>
          {busy ? busyLabel || 'Working…' : '✨ Generate AI Draft'}
        </button>

        <div style={{ paddingTop: 6, borderTop: '1px dashed var(--nf-line)' }}>
          <p style={{ fontSize: 12, color: 'var(--nf-ink-faint)', margin: '14px 0 6px' }}>
            Filled automatically above, or just type these yourself — either way works.
          </p>
          <div className="nf-input-group">
            <label className="nf-label">Headline</label>
            <input className="nf-input" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Type a headline if AI didn't generate one" />
          </div>
          <div className="nf-input-group">
            <label className="nf-label">Summary</label>
            <textarea className="nf-textarea" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="A short 1-2 sentence summary" />
          </div>
          <div className="nf-input-group">
            <label className="nf-label">Full article</label>
            <textarea className="nf-textarea" rows={7} value={article} onChange={(e) => setArticle(e.target.value)} placeholder="The full report, in your own words" />
          </div>
        </div>

        <button className="nf-btn nf-btn-primary nf-btn-block" disabled={busy} onClick={handleContinue} style={{ marginBottom: 30 }}>
          {busy ? busyLabel || 'Working…' : 'Continue to Review →'}
        </button>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      type="button"
      style={{
        width: 42, height: 24, borderRadius: 999, border: 'none', flexShrink: 0,
        background: checked ? 'var(--nf-navy)' : 'var(--nf-line)',
        position: 'relative', transition: 'background .15s ease'
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left .15s ease', boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
      }} />
    </button>
  )
}

const lockedDistrictStyle = {
  border: '1.5px solid var(--nf-line)',
  borderRadius: 8,
  padding: '12px 14px',
  background: 'var(--nf-paper-dim)',
  fontWeight: 700,
  color: 'var(--nf-navy)'
}

const nameToggleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  background: 'var(--nf-paper)',
  border: '1px solid var(--nf-line)',
  borderRadius: 10,
  padding: '12px 14px'
}
