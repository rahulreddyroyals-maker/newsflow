// src/services/groq.js
// -----------------------------------------------------------------------------
// GroqCloud free-tier API — used for: voice→text transcription (Whisper models
// hosted by Groq, no self-hosting needed), grammar cleanup, professional
// rewriting, headline + summary generation, and Telugu↔English translation.
//
// Get a free key at https://console.groq.com/keys
// Put it in your local .env file as VITE_GROQ_API_KEY=... (see .env.example).
// Never paste the key directly into this file — GitHub's secret scanning will
// block any push containing it.
//
// ⚠️ TRADE-OFF, same shape as the CricketStars Quick-Login workaround:
// calling Groq directly from the browser means this key is visible in your
// shipped JS bundle. That's fine for an MVP/testing phase with a low-value,
// rate-limited key. Before a public launch, move this file's fetch calls
// behind a small backend (a Firebase Cloud Function on the Blaze plan, or any
// cheap serverless proxy) so the key never reaches the client.
// -----------------------------------------------------------------------------

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_BASE = 'https://api.groq.com/openai/v1'
const TEXT_MODEL = 'llama-3.3-70b-versatile'
const TRANSCRIBE_MODEL = 'whisper-large-v3'

async function groqChat(systemPrompt, userPrompt) {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`
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
    throw new Error(`Groq request failed (${res.status}): ${errText}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

// Turns a journalist's raw notes/voice transcript into a structured article.
// Returns { headline, summary, article } all in the requested language.
export async function generateNewsDraft({ rawText, language = 'Telugu', category, district }) {
  const systemPrompt = `You are a professional ${language} news editor for a local news app called NewsFlow, covering ${district || 'Andhra Pradesh & Telangana'}.
Convert the journalist's raw report into clean, neutral, factual journalism. Never invent facts not present in the input.
Category: ${category || 'General'}.
Respond ONLY with valid JSON, no markdown fences, no preamble, in exactly this shape:
{"headline": "...", "summary": "...", "article": "..."}
Rules:
- headline: under 14 words, in ${language}, no clickbait.
- summary: about 50 words, in ${language}.
- article: 150-300 words, in ${language}, professional journalistic tone, grammar corrected.`

  const raw = await groqChat(systemPrompt, rawText)
  const cleaned = raw.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return { headline: '', summary: '', article: cleaned }
  }
}

// Translates an already-generated draft into the other language (Telugu <-> English).
export async function translateDraft({ headline, summary, article }, targetLanguage) {
  const systemPrompt = `You are a professional translator for an Indian news app. Translate the given news headline, summary, and article into ${targetLanguage}, preserving journalistic tone and all facts exactly. Respond ONLY with valid JSON in exactly this shape: {"headline": "...", "summary": "...", "article": "..."}`
  const userPrompt = JSON.stringify({ headline, summary, article })
  const raw = await groqChat(systemPrompt, userPrompt)
  const cleaned = raw.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return { headline, summary, article }
  }
}

// Sends a recorded voice note (Blob) to Groq's hosted Whisper model and gets text back.
export async function transcribeVoiceNote(audioBlob, language = 'te') {
  const form = new FormData()
  form.append('file', audioBlob, 'voice-note.webm')
  form.append('model', TRANSCRIBE_MODEL)
  if (language) form.append('language', language)

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: form
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Transcription failed (${res.status}): ${errText}`)
  }
  const data = await res.json()
  return data.text || ''
}

// Lightweight duplicate check: compares a new headline+summary against a list
// of recent ones and asks the model for a similarity verdict (0-100).
export async function checkDuplicate(candidateText, recentTexts = []) {
  if (recentTexts.length === 0) return { isDuplicate: false, similarity: 0, matchIndex: -1 }
  const systemPrompt = `You compare one news draft against a numbered list of recent drafts and find the closest match. Respond ONLY with JSON: {"matchIndex": <0-based index or -1>, "similarity": <0-100>}`
  const userPrompt = `New draft:\n${candidateText}\n\nRecent drafts:\n${recentTexts.map((t, i) => `${i}. ${t}`).join('\n')}`
  const raw = await groqChat(systemPrompt, userPrompt)
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return { isDuplicate: parsed.similarity >= 85, similarity: parsed.similarity, matchIndex: parsed.matchIndex }
  } catch {
    return { isDuplicate: false, similarity: 0, matchIndex: -1 }
  }
}
