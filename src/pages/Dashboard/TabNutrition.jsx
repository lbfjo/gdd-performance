import { useState, useEffect } from 'react'
import { getAthletes } from '../../services/athletes'
import { getWeightHistory } from '../../services/nutrition'
import './TabNutrition.css'

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
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { getAthletes().then(setAthletes).catch(() => {}) }, [])

  const filtered = search.length > 0
    ? athletes.filter(a => a.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5)
    : []

  async function selectAthlete(a) {
    setSelected(a)
    setSearch(a.name)
    setLoading(true)
    const hist = await getWeightHistory(a.id, 30).catch(() => [])
    setHistory(hist)
    setLoading(false)
  }

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null
  const earliest = sorted.length > 1 ? sorted[0] : null
  const delta = latest && earliest ? (latest.weight - earliest.weight).toFixed(1) : null
  const daysLogged = history.length

  return (
    <>
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

      {selected && !loading && (
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
                  <div className="stat-number" style={{ color: 'var(--white)' }}>{daysLogged}</div>
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

      {loading && <p className="loading-state">A carregar…</p>}
    </>
  )
}
