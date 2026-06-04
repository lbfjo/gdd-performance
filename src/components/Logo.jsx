const SIZE_MAP = {
  sm: { img: 40, text: 11 },
  md: { img: 56, text: 13 },
  lg: { img: 80, text: 16 },
}

export default function Logo({ size = 'md' }) {
  const { img, text } = SIZE_MAP[size] ?? SIZE_MAP.md

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(img * 0.25) }}>
      <img
        src="/logo.png"
        alt="GDD"
        style={{ width: img, height: img, objectFit: 'contain' }}
        draggable={false}
      />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{
          fontFamily: "'Saira Condensed', sans-serif",
          fontWeight: 800,
          fontSize: Math.round(img * 0.55),
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--white)',
          lineHeight: 0.95,
        }}>
          GDD
        </span>
        <span style={{
          fontFamily: "'Saira Condensed', sans-serif",
          fontWeight: 600,
          fontSize: text,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginTop: 3,
        }}>
          PERFORMANCE
        </span>
      </div>
    </div>
  )
}
