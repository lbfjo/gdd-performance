import { useState, useEffect, useCallback } from 'react'
import { getAthletes } from '../../services/athletes'
import { getWeightHistory, getWeightLogsForWeek } from '../../services/nutrition'
import { getLocalDate, getWeekBounds, getPreviousWeekBounds } from '../../lib/dates'
import './TabNutrition.css'

function getWeekDays(start) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d.toLocaleDateString('sv-SE')
  })
}

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

export default function TabNutrition() {
  const [athletes, setAthletes] = useState([])
  const [weightsByAthlete, setWeightsByAthlete] = useState({})
  const [weekStart, setWeekStart] = useState(() => getWeekBounds(getLocalDate()).start)
  const [loading, setLoading] = useState(true)
  const today = getLocalDate()

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)

  const loadGrid = useCallback(async (start) => {
    setLoading(true)
    const days = getWeekDays(start)
    const [aths, logs] = await Promise.all([
      getAthletes(),
      getWeightLogsForWeek(days[0], days[6]).catch(() => []),
    ])
    const map = {}
    logs.forEach(l => {
      if (!map[l.athleteId]) map[l.athleteId] = {}
      map[l.athleteId][l.date] = l.weight
    })
    setAthletes(aths)
    setWeightsByAthlete(map)
    setLoading(false)
  }, [])

  useEffect(() => { loadGrid(weekStart) }, [weekStart, loadGrid])

  const days = getWeekDays(weekStart)
  const currentWeekStart = getWeekBounds(today).start
  const isCurrentWeek = weekStart === currentWeekStart

  const athletesWithLogs = athletes.filter(a => weightsByAthlete[a.id])
  const totalLogs = Object.values(weightsByAthlete).reduce(
    (sum, dates) => sum + Object.keys(dates).length, 0
  )
  const loggedToday = athletes.filter(a => weightsByAthlete[a.id]?.[today]).length

  const filtered = search.length > 0
    ? athletes.filter(a => a.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5)
    : []

  async function selectAthlete(a) {
    setSelected(a)
    setSearch(a.name)
    setDetailLoading(true)
    const hist = await getWeightHistory(a.id, 30).catch(() => [])
    setHistory(hist)
    setDetailLoading(false)
  }

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null
  const earliest = sorted.length > 1 ? sorted[0] : null
  const delta = latest && earliest ? (latest.weight - earliest.weight).toFixed(1) : null

  return (
    <>
      {/* ── Weekly weight grid ── */}
      {!loading && isCurrentWeek && (
        <div className="grid-summary-row">
          <div className="grid-stat-card">
            <div className="grid-stat-number" style={{ color: 'var(--green)' }}>{loggedToday}</div>
            <div className="grid-stat-label">Pesagens hoje</div>
          </div>
          <div className="grid-stat-card">
            <div className="grid-stat-number" style={{ color: 'var(--white)' }}>{athletesWithLogs.length}</div>
            <div className="grid-stat-label">Atletas c/ registo</div>
          </div>
          <div className="grid-stat-card">
            <div className="grid-stat-number" style={{ color: 'var(--red)' }}>{totalLogs}</div>
            <div className="grid-stat-label">Total registos</div>
          </div>
        </div>
      )}

      <div className="grid-controls">
        <button className="grid-nav" onClick={() => setWeekStart(s => getPreviousWeekBounds(s).start)}>‹</button>
        <span className="grid-week-label">
          {new Date(days[0]+'T12:00:00').toLocaleDateString('pt-PT',{day:'numeric',month:'short'})} — {new Date(days[6]+'T12:00:00').toLocaleDateString('pt-PT',{day:'numeric',month:'short'})}
        </span>
        <button className="grid-nav" disabled={isCurrentWeek} onClick={() => {
          const next = new Date(weekStart + 'T12:00:00')
          next.setDate(next.getDate() + 7)
          setWeekStart(next.toLocaleDateString('sv-SE'))
        }}>›</button>
      </div>

      {loading ? (
        <p className="loading-state">A carregar…</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="grid-table">
            <thead>
              <tr>
                <th />
                {days.map(d => (
                  <th key={d} className={d === today ? 'today' : ''}>
                    {new Date(d+'T12:00:00').toLocaleDateString('pt-PT',{weekday:'short'}).slice(0,1).toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {athletes.map(a => {
                const hasAny = !!weightsByAthlete[a.id]
                return (
                  <tr key={a.id} className={hasAny ? '' : 'nutri-row-empty'}>
                    <td className="grid-name" title={a.name}>{a.name.split(' ')[0]} {a.name.split(' ').slice(-1)}</td>
                    {days.map(d => {
                      const w = weightsByAthlete[a.id]?.[d]
                      return (
                        <td key={d} style={{ textAlign: 'center' }}>
                          <div className={`grid-cell${w ? ' nutri-filled' : ''}`}>
                            {w && <span className="nutri-cell-weight">{w}</span>}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid-legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--green)' }} /> Pesou</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--card2)', border: '1px solid var(--border)' }} /> Sem registo</div>
      </div>

      {/* ── Per-athlete detail ── */}
      <div className="nutri-detail-divider" />

      <input
        className="athlete-search"
        placeholder="🔍 Procurar atleta..."
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

      {selected && !detailLoading && (
        <>
          {history.length > 0 ? (
            <>
              <div className="nutri-dash-stats">
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
                  <div className="stat-number" style={{ color: 'var(--white)' }}>{history.length}</div>
                  <div className="stat-label">Dias registados</div>
                </div>
              </div>

              <p className="nutri-dash-chart-title">Evolução do peso</p>
              <div className="nutri-dash-chart-wrap">
                <WeightChart data={history} />
              </div>
            </>
          ) : (
            <div className="nutri-dash-empty">
              <p>Sem registos de peso para este atleta.</p>
            </div>
          )}
        </>
      )}

      {detailLoading && <p className="loading-state">A carregar…</p>}
    </>
  )
}
