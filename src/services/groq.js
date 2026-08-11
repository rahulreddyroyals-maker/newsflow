// src/services/groq.js
// GroqCloud free-tier API — voice→text transcription, grammar cleanup,
// professional rewriting, headline/summary generation, translation, and
// duplicate-similarity checks.
//
// PER-JOURNALIST KEYS: every exported function now accepts an optional
// trailing `apiKeyOverride` argument. Pass a journalist's individually
// assigned key (profile.groqApiKey) when calling on their behalf; omit it
// (or pass undefined/null) to fall back to the shared VITE_GROQ_API_KEY —
// used for admin actions, RSS ingestion, and any journalist who hasn't
// been assigned a personal key yet. Nothing breaks for existing call sites
// that don't pass this — it's purely additive.
//
// ⚠️ Same trade-off as before: these calls happen directly from the browser,
// so whichever key is used is visible in that browser's network requests /
// devtools. A shared key is visible to everyone; a per-journalist key is
// visible to that journalist specifically. Fine for cost attribution and
// isolating one journalist's usage from another's; not a hard security
// boundary. Before a public launch at scale, move these calls behind a
// small backend (Cloud Function) so no key reaches the client at all.

const DEFAULT_GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_BASE = 'https://api.groq.com/openai/v1'
const TEXT_MODEL = 'llama-3.3-70b-versatile'
const TRANSCRIBE_MODEL = 'whisper-large-v3'

function resolveKey(apiKeyOverride) {
  return apiKeyOverride || DEFAULT_GROQ_API_KEY
}

async function groqChat(systemPrompt, userPrompt, apiKeyOverride) {
  const key = resolveKey(apiKeyOverride)
  if (!key) {
    throw new Error('Groq API key is missing. Check VITE_GROQ_API_KEY in your .env file (or assign this journalist a personal key in Manage Journalists), then rebuild and redeploy.')
  }
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  })
  if (!res.ok) {
    const errText = await res.text()
    if (res.status === 401) {
      throw new Error(`Groq rejected this API key as invalid (401). If this journalist has a personal key assigned, check it in Manage Journalists — otherwise the shared VITE_GROQ_API_KEY needs updating. Raw response: ${errText}`)
    }
    throw new Error(`Groq request failed (${res.status}): ${errText}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

// Turns a journalist's raw notes/voice transcript into a structured article.
export async function generateNewsDraft({ rawText, language = 'Telugu', category, district }, apiKeyOverride) {
  const systemPrompt = `You are a professional ${language} news editor for a local news app called NewsFlow, covering ${district || 'Andhra Pradesh & Telangana'}.
Convert the journalist's raw report into clean, neutral, factual journalism. Never invent facts not present in the input.
Category: ${category || 'General'}.
Respond ONLY with valid JSON, no markdown fences, no preamble, in exactly this shape:
{"headline": "...", "summary": "...", "article": "..."}
Rules:
- headline: under 14 words, in ${language}, no clickbait.
- summary: about 50 words, in ${language}.
- article: 150-300 words, in ${language}, professional journalistic tone, grammar corrected.`

  const raw = await groqChat(systemPrompt, rawText, apiKeyOverride)
  const cleaned = raw.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return { headline: '', summary: '', article: cleaned }
  }
}

// Translates an already-generated draft into the other language.
export async function translateDraft({ headline, summary, article }, targetLanguage, apiKeyOverride) {
  const systemPrompt = `You are a professional translator for an Indian news app. Translate the given news headline, summary, and article into ${targetLanguage}, preserving journalistic tone and all facts exactly. Respond ONLY with valid JSON in exactly this shape: {"headline": "...", "summary": "...", "article": "..."}`
  const userPrompt = JSON.stringify({ headline, summary, article })
  const raw = await groqChat(systemPrompt, userPrompt, apiKeyOverride)
  const cleaned = raw.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return { headline, summary, article }
  }
}

async function callTranscribe(audioBlob, { language, includeLanguage }, apiKeyOverride) {
  const key = resolveKey(apiKeyOverride)
  if (!key) {
    throw new Error('Groq API key is missing. Check VITE_GROQ_API_KEY in your .env file (or assign this journalist a personal key), then rebuild and redeploy.')
  }
  const form = new FormData()
  form.append('file', audioBlob, 'voice-note.webm')
  form.append('model', TRANSCRIBE_MODEL)
  form.append('response_format', 'json')
  if (includeLanguage && language) form.append('language', language)

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Transcription failed (${res.status}): ${errText}`)
  }
  const data = await res.json()
  return data.text || ''
}

// One automatic retry without the language hint — some short/quiet clips
// trip a transient failure tied to that parameter; retrying without it
// (letting Whisper auto-detect) recovers most of these.
export async function transcribeVoiceNote(audioBlob, language = 'te', apiKeyOverride) {
  try {
    return await callTranscribe(audioBlob, { language, includeLanguage: true }, apiKeyOverride)
  } catch (firstErr) {
    try {
      return await callTranscribe(audioBlob, { language, includeLanguage: false }, apiKeyOverride)
    } catch (secondErr) {
      throw new Error(`Voice transcription failed twice. ${secondErr.message}`)
    }
  }
}

// Lightweight duplicate check: compares a new headline+summary against a
// list of recent ones and asks the model for a similarity verdict (0-100).
export async function checkDuplicate(candidateText, recentTexts = [], apiKeyOverride) {
  if (recentTexts.length === 0) return { isDuplicate: false, similarity: 0, matchIndex: -1 }
  const systemPrompt = `You compare one news draft against a numbered list of recent drafts and find the closest match. Respond ONLY with JSON: {"matchIndex": <0-based index or -1>, "similarity": <0-100>}`
  const userPrompt = `New draft:\n${candidateText}\n\nRecent drafts:\n${recentTexts.map((t, i) => `${i}. ${t}`).join('\n')}`
  const raw = await groqChat(systemPrompt, userPrompt, apiKeyOverride)
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return { isDuplicate: parsed.similarity >= 85, similarity: parsed.similarity, matchIndex: parsed.matchIndex }
  } catch {
    return { isDuplicate: false, similarity: 0, matchIndex: -1 }
  }
}
