// src/pages/Search.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchNews } from '../services/newsService'
import { CompactNewsCard } from '../components/NewsCard'

const RECENT_KEY = 'nf_recent_searches'
const TRENDING = ['Andhra Pradesh budget', 'Cricket score', 'Govt jobs notification', 'Cinema release', 'Cyclone alert']

export default function Search() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [recent, setRecent] = useState(() => JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'))
  const [busy, setBusy] = useState(false)

  async function runSearch(term) {
    if (!term.trim()) return
    setBusy(true)
    setQuery(term)
    const res = await searchNews(term)
    setResults(res)
    const updated = [term, ...recent.filter((r) => r !== term)].slice(0, 6)
    setRecent(updated)
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
    setBusy(false)
  }

  return (
    <div className="nf-screen">
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nf-line)', background: 'var(--nf-paper)' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', fontSize: 20, color: 'var(--nf-navy)' }}>←</button>
          <input
            className="nf-input"
            autoFocus
            placeholder="Search news, districts, topics…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch(query)}
          />
        </div>
      </div>

      <div className="nf-scroll-body nf-container" style={{ paddingTop: 18 }}>
        {results === null && (
          <>
            {recent.length > 0 && (
              <Section title="Recent searches">
                {recent.map((r) => (
                  <button key={r} className="nf-chip" style={{ marginRight: 8, marginBottom: 8 }} onClick={() => runSearch(r)}>{r}</button>
                ))}
              </Section>
            )}
            <Section title="Trending searches">
              {TRENDING.map((r) => (
                <button key={r} className="nf-chip" style={{ marginRight: 8, marginBottom: 8 }} onClick={() => runSearch(r)}>🔥 {r}</button>
              ))}
            </Section>
          </>
        )}

        {busy && <p style={{ color: 'var(--nf-ink-soft)', fontSize: 14 }}>Searching…</p>}

        {results && !busy && (
          results.length === 0 ? (
            <div className="nf-empty">
              <p style={{ fontWeight: 700, color: 'var(--nf-navy)' }}>No results for "{query}"</p>
              <p style={{ fontSize: 13.5, marginTop: 4 }}>Try a different keyword or district name.</p>
            </div>
          ) : (
            results.map((n) => <CompactNewsCard key={n.id} news={n} />)
          )
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 13.5, color: 'var(--nf-ink-soft)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}
