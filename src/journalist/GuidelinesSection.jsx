// src/journalist/GuidelinesSection.jsx
const RULES = [
  { title: 'Original content only', body: 'No copying, no duplicating someone else\u2019s report or photos. Write and shoot your own coverage.' },
  { title: 'Stay genuine', body: 'Fake or misleading information is not allowed, ever — even if it seems harmless or "probably true."' },
  { title: 'Be sensitive', body: 'Blur violent, bloody, or otherwise disturbing images before submitting. Respect people\u2019s privacy and dignity, especially victims and minors.' },
  { title: 'Follow ethics', body: 'Report responsibly. Build trust with truth and fairness, not speed or sensationalism.' }
]

export default function GuidelinesSection() {
  return (
    <div className="nf-scroll-body nf-container" style={{ paddingTop: 6, paddingBottom: 30 }}>
      <h2 style={{ fontSize: 17, marginBottom: 4 }}>Reporter guidelines</h2>
      <p style={{ fontSize: 12.5, color: 'var(--nf-ink-soft)', marginBottom: 16 }}>
        Every journalist on NewsFlow agrees to these before publishing.
      </p>

      {RULES.map((r) => (
        <div key={r.title} className="nf-card" style={{ padding: 14, marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--nf-navy)', marginBottom: 4 }}>{r.title}</p>
          <p style={{ fontSize: 13, color: 'var(--nf-ink-soft)', lineHeight: 1.6 }}>{r.body}</p>
        </div>
      ))}

      <div style={{ background: '#FBE7E5', borderRadius: 10, padding: 14, marginTop: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--nf-danger)' }}>If these aren't followed</p>
        <p style={{ fontSize: 12.5, color: 'var(--nf-danger)', marginTop: 4, lineHeight: 1.6 }}>
          Your profile will be restricted — you'll lose the ability to submit new reports
          until an admin reviews and reinstates your account.
        </p>
      </div>
    </div>
  )
}
