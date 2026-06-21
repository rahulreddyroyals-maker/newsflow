// src/components/ImageWatermark.jsx
// Small branded overlay shown on top of article images — mainly matters for
// RSS/wire photos that arrive with zero NewsFlow branding, but applied
// everywhere images appear for visual consistency.
export default function ImageWatermark({ size = 'sm' }) {
  const isLg = size === 'lg'
  return (
    <div style={{ ...wrapStyle, padding: isLg ? '5px 10px 5px 6px' : '3px 8px 3px 4px' }}>
      <img src="/icons/icon-32.png" alt="" style={{ width: isLg ? 18 : 14, height: isLg ? 18 : 14, borderRadius: '50%' }} />
      <span style={{ fontSize: isLg ? 12.5 : 10.5, fontWeight: 800, color: '#fff', letterSpacing: '0.01em' }}>
        News<span style={{ color: 'var(--nf-orange-light)' }}>Flow</span>
      </span>
    </div>
  )
}

const wrapStyle = {
  position: 'absolute',
  left: 10,
  bottom: 10,
  zIndex: 2,
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  background: 'rgba(15,31,61,0.55)',
  borderRadius: 999,
  backdropFilter: 'blur(2px)'
}
