// src/components/DistrictSelector.jsx
import { DISTRICTS } from '../utils/districts'

export default function DistrictSelector({ open, current, onSelect, onClose }) {
  if (!open) return null

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
        <div style={handleStyle} />
        <h3 style={{ fontSize: 17, marginBottom: 14 }}>Choose your district</h3>
        <button
          onClick={() => onSelect('All')}
          style={rowStyle(current === 'All')}
        >
          🌐 All districts
        </button>
        {Object.entries(DISTRICTS).map(([state, list]) => (
          <div key={state} style={{ marginTop: 14 }}>
            <div style={stateLabelStyle}>{state}</div>
            {list.map((d) => (
              <button key={d} onClick={() => onSelect(d)} style={rowStyle(current === d)}>
                {d}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15,31,61,0.45)',
  zIndex: 60,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center'
}
const sheetStyle = {
  width: '100%',
  maxWidth: 'var(--nf-max-w)',
  maxHeight: '78vh',
  overflowY: 'auto',
  background: 'var(--nf-paper)',
  borderRadius: '20px 20px 0 0',
  padding: '10px 18px 26px'
}
const handleStyle = {
  width: 36,
  height: 4,
  borderRadius: 4,
  background: 'var(--nf-line)',
  margin: '6px auto 14px'
}
const stateLabelStyle = {
  fontSize: 12,
  fontWeight: 800,
  color: 'var(--nf-ink-faint)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '8px 0 6px'
}
const rowStyle = (isActive) => ({
  display: 'block',
  width: '100%',
  textAlign: 'left',
  border: 'none',
  background: isActive ? 'var(--nf-paper-dim)' : 'transparent',
  borderRadius: 10,
  padding: '11px 12px',
  fontSize: 15,
  fontWeight: isActive ? 700 : 500,
  color: isActive ? 'var(--nf-navy)' : 'var(--nf-ink)'
})
