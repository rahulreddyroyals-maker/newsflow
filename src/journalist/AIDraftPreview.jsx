// src/journalist/AIDraftPreview.jsx
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createDraft } from '../services/newsService'
import { translateDraft } from '../services/groq'
import { findPossibleDuplicate } from '../services/duplicateCheck'
import { Events } from '../services/analytics'

export default function AIDraftPreview() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState(state || null)
  const [dupWarning, setDupWarning] = useState(null)
  const [checkingDup, setCheckingDup] = useState(false)

  const journalistGroqKey = profile?.groqApiKey || undefined

  useEffect(() => {
    if (!draft?.headline) return
    setCheckingDup(true)
    findPossibleDuplicate({
      headline: draft.headline,
      summary: draft.summary,
      district: draft.district,
      category: draft.category
    }, journalistGroqKey).then((result) => {
      setDupWarning(result.isDuplicate ? result : null)
      setCheckingDup(false)
    }).catch(() => setCheckingDup(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.headline])

  if (!draft) {
    return (
      <div className="nf-screen" style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <p style={{ color: 'var(--nf-ink-soft)' }}>No draft to preview.</p>
        <button className="nf-btn nf-btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/journalist/submit')}>Submit news</button>
      </div>
    )
  }

  function updateField(field, value) {
    setDraft((d) => ({ ...d, [field]: value }))
  }

  async function handleTranslate() {
    setBusy(true)
    setError('')
    try {
      const targetLang = draft.language === 'en' ? 'Telugu' : 'English'
      const translated = await translateDraft(draft, targetLang, journalistGroqKey)
      if (draft.language === 'en') {
        updateField('headlineTe', translated.headline)
      } else {
        setDraft((d) => ({
          ...d,
          headlineEn: translated.headline,
          summaryEn: translated.summary,
          articleEn: translated.article
        }))
      }
    } catch (err) {
      setError('Translation failed. You can still submit without it.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit() {
    setBusy(true)
    setError('')

    const draftDistrict = (draft.district || '').trim()
    const profileDistrict = (profile?.district || '').trim()
    if (draftDistrict !== profileDistrict) {
      setError(`This draft's district ("${draftDistrict}") doesn't exactly match your registered district ("${profileDistrict}"). Go back and resubmit from the form, which locks the district to your own automatically. If these look identical, ask an admin to re-save your district in Manage Journalists.`)
      setBusy(false)
      return
    }

    try {
      await createDraft({
        headline: draft.headline,
        headlineEn: draft.headlineEn || '',
        summary: draft.summary,
        summaryEn: draft.summaryEn || '',
        article: draft.article,
        articleEn: draft.articleEn || '',
        category: draft.category,
        district: draft.district,
        images: draft.images || [],
        videoUrl: draft.videoUrl || null,
        audioUrl: draft.audioUrl || null,
        rawText: draft.rawText || '',
        authorId: user.uid,
        authorName: draft.showNameThisPost === false ? 'NewsFlow Citizen Journalist' : (profile?.name || 'NewsFlow Reporter'),
        possibleDuplicate: dupWarning?.isDuplicate || false,
        duplicateSimilarity: dupWarning?.similarity || 0,
        duplicateOfHeadline: dupWarning?.matchedItem?.headline || null
      })
      Events.submitReport(draft.district, draft.category)
      navigate('/journalist', { replace: true })
    } catch (err) {
      console.error('createDraft failed:', err)
      const isPermissionError = err.code === 'permission-denied' || /permission/i.test(err.message || '')
      setError(
        isPermissionError
          ? 'Could not submit: Firestore rejected this with "permission-denied." This almost always means the live rules are out of date — an admin needs to run "firebase deploy --only firestore:rules".'
          : 'Could not submit: ' + (err.message || 'unknown error')
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--nf-paper)' }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
        <h2 style={{ fontSize: 17 }}>Review AI Draft</h2>
      </div>

      <div className="nf-scroll-body nf-container" style={{ paddingTop: 18 }}>
        {draft.images?.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
            {draft.images.map((url, i) => <img key={i} src={url} alt="" style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />)}
          </div>
        )}

        {draft.videoUrl && (
          <video controls src={draft.videoUrl} style={{ width: '100%', maxHeight: 200, borderRadius: 10, marginBottom: 16 }} />
        )}

        {checkingDup && (
          <p style={{ fontSize: 11.5, color: 'var(--nf-ink-faint)', marginBottom: 10 }}>
            Checking for similar recent reports…
          </p>
        )}
        {dupWarning?.isDuplicate && (
          <div style={{ background: '#FFF1DD', borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <p style={{ fontSize: 12.5, color: 'var(--nf-warning)', fontWeight: 700 }}>
              ⚠ This looks {dupWarning.similarity}% similar to a recent report:
              "{dupWarning.matchedItem?.headline}"
            </p>
            <p style={{ fontSize: 11.5, color: 'var(--nf-warning)', marginTop: 4 }}>
              You can still submit — an admin will review both and decide whether to merge or reject.
            </p>
          </div>
        )}

        <Field label="Headline" value={draft.headline} editing={editing} onChange={(v) => updateField('headline', v)} bold />
        <Field label="Summary" value={draft.summary} editing={editing} onChange={(v) => updateField('summary', v)} textarea rows={2} />
        <Field label="Full article" value={draft.article} editing={editing} onChange={(v) => updateField('article', v)} textarea rows={8} />

        {draft.headlineEn && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed var(--nf-line)' }}>
            <p className="nf-label" style={{ marginBottom: 10 }}>English version</p>
            <Field label="Headline (EN)" value={draft.headlineEn} editing={editing} onChange={(v) => updateField('headlineEn', v)} bold />
            <Field label="Summary (EN)" value={draft.summaryEn} editing={editing} onChange={(v) => updateField('summaryEn', v)} textarea rows={2} />
            <Field label="Article (EN)" value={draft.articleEn} editing={editing} onChange={(v) => updateField('articleEn', v)} textarea rows={8} />
          </div>
        )}

        {error && <p style={{ color: 'var(--nf-danger)', fontSize: 13, margin: '10px 0' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button className="nf-btn nf-btn-ghost" style={{ flex: 1 }} onClick={() => setEditing((e) => !e)}>
            {editing ? '✓ Done editing' : '✎ Edit'}
          </button>
          <button className="nf-btn nf-btn-ghost" style={{ flex: 1 }} disabled={busy} onClick={handleTranslate}>
            🌐 {draft.headlineEn ? 'Re-translate' : 'Add ' + (draft.language === 'en' ? 'Telugu' : 'English')}
          </button>
        </div>

        <button className="nf-btn nf-btn-flow nf-btn-block" disabled={busy} onClick={handleSubmit} style={{ marginTop: 12, marginBottom: 30 }}>
          {busy ? 'Submitting…' : 'Submit for Approval'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, editing, onChange, textarea, rows = 3, bold }) {
  return (
    <div className="nf-input-group">
      <label className="nf-label">{label}</label>
      {editing ? (
        textarea ? (
          <textarea className="nf-textarea" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input className="nf-input" value={value} onChange={(e) => onChange(e.target.value)} />
        )
      ) : (
        <p style={{ fontSize: bold ? 17 : 14.5, fontWeight: bold ? 700 : 400, lineHeight: 1.6, color: 'var(--nf-ink)', whiteSpace: 'pre-wrap' }}>{value}</p>
      )}
    </div>
  )
}
