/* GDD Performance logo mark.
   Props:
     size — 'sm' | 'md' | 'lg'  (default 'md')
*/

const SIZE_MAP = {
  sm: { gdd: 36, sub: 11, border: 3 },
  md: { gdd: 56, sub: 14, border: 4 },
  lg: { gdd: 80, sub: 18, border: 4 },
}

export default function Logo({ size = 'md' }) {
  const { gdd, sub, border } = SIZE_MAP[size] ?? SIZE_MAP.md

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        borderLeft: `${border}px solid var(--red)`,
        paddingLeft: Math.round(border * 2.5),
        lineHeight: 1,
      }}
    >
      <span
        style={{
          fontFamily: "'Saira Condensed', sans-serif",
          fontWeight: 700,
          fontSize: gdd,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--white)',
          lineHeight: 0.95,
        }}
      >
        GDD
      </span>
      <span
        style={{
          fontFamily: "'Saira Condensed', sans-serif",
          fontWeight: 600,
          fontSize: sub,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginTop: Math.round(sub * 0.3),
          lineHeight: 1,
        }}
      >
        PERFORMANCE
      </span>
    </div>
  )
}
