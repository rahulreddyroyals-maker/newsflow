# NewsFlow v20 → v21 patch: per-article/per-slide language toggle
# Apply these two file changes to your local D:\newsflow project, then rebuild and deploy.

## CHANGE 1: src/pages/NewsDetail.jsx
Replace the ENTIRE file with the NewsDetail.jsx file provided alongside this patch.
(It adds a small తె / EN toggle in the top-right of the article, only shown when
an English version exists. Each article toggles independently of the global app language.)

## CHANGE 2: src/components/ReelsFeed.jsx
Apply these three targeted edits inside your existing file:

### Edit A — add slideLang state (around line 47, after existing useState declarations)
Add this line after:   const [isPortraitVideo, setIsPortraitVideo] = useState(null)

  const [slideLang, setSlideLang] = useState(lang) // per-slide language toggle

### Edit B — switch headline/summary/content to use slideLang (around line 52-54)
Replace:
  const headline = lang === 'en' && news.headlineEn ? news.headlineEn : news.headline
  const summary  = lang === 'en' && news.summaryEn  ? news.summaryEn  : news.summary
  const content  = lang === 'en' && news.contentEn  ? news.contentEn  : news.content

With:
  const headline = slideLang === 'en' && news.headlineEn ? news.headlineEn : news.headline
  const summary  = slideLang === 'en' && news.summaryEn  ? news.summaryEn  : news.summary
  const content  = slideLang === 'en' && news.contentEn  ? news.contentEn  : news.content

### Edit C — add toggle UI to the text pane (inside the !fullBleed block, just before the <p> tag)
Find this inside the textPaneStyle div:

  <p style={{ fontSize: 15.5, lineHeight: 1.75, color: 'var(--nf-ink)', whiteSpace: 'pre-wrap' }}>{content || summary}</p>

Replace with:

  {news.headlineEn && (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
      <div style={{ display: 'flex', border: '1.5px solid var(--nf-line)', borderRadius: 999, overflow: 'hidden' }}>
        <button onClick={() => setSlideLang('te')}
          style={{ border: 'none', padding: '5px 12px', fontSize: 12, fontWeight: 700,
            background: slideLang === 'te' ? 'var(--nf-navy)' : 'transparent',
            color: slideLang === 'te' ? '#fff' : 'var(--nf-ink-soft)' }}>తె</button>
        <button onClick={() => setSlideLang('en')}
          style={{ border: 'none', padding: '5px 12px', fontSize: 12, fontWeight: 700,
            background: slideLang === 'en' ? 'var(--nf-navy)' : 'transparent',
            color: slideLang === 'en' ? '#fff' : 'var(--nf-ink-soft)' }}>EN</button>
      </div>
    </div>
  )}
  <p style={{ fontSize: 15.5, lineHeight: 1.75, color: 'var(--nf-ink)', whiteSpace: 'pre-wrap' }}>{content || summary}</p>

## DEPLOY

git add src/pages/NewsDetail.jsx src/components/ReelsFeed.jsx
git commit -m "Add per-article Telugu/English language toggle"
git push
npm run build
firebase deploy --only hosting
