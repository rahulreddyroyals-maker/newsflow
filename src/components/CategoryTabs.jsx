// src/components/CategoryTabs.jsx
import { CATEGORIES } from '../utils/categories'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../utils/i18n'

export default function CategoryTabs({ active, onChange }) {
  const { lang } = useLanguage()

  return (
    <div style={wrapStyle}>
      <button onClick={() => onChange('All')} className={`nf-chip ${active === 'All' ? 'active' : ''}`} style={{ flexShrink: 0 }}>
        {t('trending', lang)}
      </button>
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          className={`nf-chip ${active === c.id ? 'active' : ''}`}
          style={{ flexShrink: 0 }}
        >
          {lang === 'te' ? c.te : c.en}
        </button>
      ))}
    </div>
  )
}

const wrapStyle = {
  display: 'flex',
  gap: 8,
  overflowX: 'auto',
  padding: '12px 16px',
  scrollbarWidth: 'none'
}
