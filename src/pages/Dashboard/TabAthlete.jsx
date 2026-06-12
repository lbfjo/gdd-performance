import { useState, useEffect } from 'react'
import { getAthletes } from '../../services/athletes'
import { getCheckinsForAthlete } from '../../services/checkins'
import { getWeightHistory } from '../../services/nutrition'
import { getLocalDate, getWeekBounds } from '../../lib/dates'
import './TabAthlete.css'

function WeightChart({ data }) {
  if (data.length < 2) return null

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
  const weights = sorted.map(d => d.weight)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const range = maxW - minW || 1

  const padding = { top: 20, right: 16, bottom: 40, left: 44 }
  const width = 500
  const height = 220
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const yMin = minW - range * 0.15
  const yMax = maxW + range * 0.15
  const yRange = yMax - yMin

  const points = sorted.map((d, i) => ({
    x: padding.left + (i / (sorted.length - 1)) * chartW,
    y: padding.top + chartH - ((d.weight - yMin) / yRange) * chartH,
    ...d,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  const yTicks = 5
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const val = yMin + (yRange * i) / (yTicks - 1)
    const y = padding.top + chartH - (i / (yTicks - 1)) * chartH
    return { val, y }
  })

  const labelStep = Math.max(1, Math.floor(sorted.length / 6))

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="weight-chart-svg">
      {yLabels.map((t, i) => (
        <g key={i}>
          <line
            x1={padding.left} y1={t.y}
            x2={width - padding.right} y2={t.y}
            stroke="var(--border)" strokeWidth="0.5"
          />
          <text
            x={padding.left - 8} y={t.y + 4}
            textAnchor="end"
            fill="var(--muted)"
            fontFamily="Inter, sans-serif"
            fontSize="10"
          >
            {t.val.toFixed(1)}
          </text>
        </g>
      ))}

      <path d={linePath} fill="none" stroke="var(--red)" strokeWidth="2" strokeLinejoin="round" />

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="var(--red)" />
          {i % labelStep === 0 && (
            <text
              x={p.x} y={height - 8}
              textAnchor="middle"
              fill="var(--muted)"
              fontFamily="Inter, sans-serif"
              fontSize="9"
            >
              {new Date(p.date + 'T12:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

export default function TabAthlete() {
  const [athletes, setAthletes] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [checkins, setCheckins] = useState([])
  const [weightHist, setWeightHist] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { getAthletes().then(setAthletes).catch(() => {}) }, [])

  const filtered = search.length > 0
    ? athletes.filter(a => a.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5)
    : []

  async function selectAthlete(a) {
    setSelected(a); setSearch(a.name); setLoading(true)
    const [cs, wh] = await Promise.all([
      getCheckinsForAthlete(a.id).catch(() => []),
      getWeightHistory(a.id, 30).catch(() => []),
    ])
    setCheckins(cs); setWeightHist(wh); setLoading(false)
  }

  const { start: weekStart, end: weekEnd } = getWeekBounds(getLocalDate())
  const thisWeek = checkins.filter(c => c.date >= weekStart && c.date <= weekEnd).length
  const total = checkins.length

  const weekMap = {}
  checkins.forEach(c => {
    const { start } = getWeekBounds(c.date)
    weekMap[start] = (weekMap[start] || 0) + 1
  })
  const weekEntries = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
  const maxSessions = Math.max(...weekEntries.map(([, v]) => v), 1)

  return (
    <>
      <input
        className="athlete-search"
        placeholder="🔍 Search athlete..."
        value={search}
        onChange={e => { setSearch(e.target.value); setSelected(null) }}
        autoComplete="off"
      />
      {filtered.length > 0 && !selected && (
        <div className="athlete-dropdown">
          {filtered.map(a => (
            <button key={a.id} className="athlete-option" onClick={() => selectAthlete(a)}>{a.name}</button>
          ))}
        </div>
      )}

      {selected && !loading && (
        <>
          <div className="athlete-stats">
            <div className="stat-card">
              <div className="stat-number" style={{ color: '#22c55e' }}>{total}</div>
              <div className="stat-label">Total sessions</div>
            </div>
            <div className="stat-card">
              <div className="stat-number" style={{ color: '#3b82f6' }}>{thisWeek}</div>
              <div className="stat-label">This week</div>
            </div>
          </div>

          {weekEntries.length > 0 && (
            <>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Weekly breakdown</p>
              <div className="week-bars">
                {weekEntries.map(([start, count], i) => (
                  <div key={start} className="week-row">
                    <span className="week-label">Wk {i + 1}</span>
                    <div className="week-bar-bg">
                      <div className="week-bar-fill" style={{ width: `${(count / maxSessions) * 100}%` }} />
                    </div>
                    <span className="week-count">{count}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {(() => {
            const wSorted = [...weightHist].sort((a, b) => a.date.localeCompare(b.date))
            const latest = wSorted.length > 0 ? wSorted[wSorted.length - 1] : null
            const earliest = wSorted.length > 1 ? wSorted[0] : null
            const delta = latest && earliest ? (latest.weight - earliest.weight).toFixed(1) : null
            return (
              <>
                <div className="athlete-section-divider" />
                <p className="athlete-section-title">Peso</p>
                {weightHist.length > 0 ? (
                  <>
                    <div className="athlete-stats" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                      <div className="stat-card">
                        <div className="stat-number" style={{ color: 'var(--white)' }}>
                          {latest?.weight}
                          <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)', marginLeft: 4 }}>kg</span>
                        </div>
                        <div className="stat-label">Último peso</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-number" style={{ color: delta > 0 ? 'var(--red)' : delta < 0 ? 'var(--green)' : 'var(--muted)' }}>
                          {delta !== null ? `${delta > 0 ? '+' : ''}${delta}` : '—'}
                          {delta !== null && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)', marginLeft: 4 }}>kg</span>}
                        </div>
                        <div className="stat-label">Variação</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-number" style={{ color: 'var(--white)' }}>{weightHist.length}</div>
                        <div className="stat-label">Dias registados</div>
                      </div>
                    </div>
                    <div className="nutri-dash-chart-wrap">
                      <WeightChart data={weightHist} />
                    </div>
                  </>
                ) : (
                  <p className="athlete-no-weight">Sem registos de peso.</p>
                )}
              </>
            )
          })()}
        </>
      )}

      {loading && <p className="loading-state">Loading...</p>}
    </>
  )
}
