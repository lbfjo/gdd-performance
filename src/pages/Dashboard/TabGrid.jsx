import { useState, useEffect, useCallback } from 'react'
import { getCheckinsForWeek, getAllCheckinsForExport } from '../../services/checkins'
import { getAthletes } from '../../services/athletes'
import { getConfig } from '../../services/config'
import { getLocalDate, getWeekBounds, formatDay, getPreviousWeekBounds } from '../../lib/dates'
import './TabGrid.css'

function getWeekDays(start) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d.toLocaleDateString('sv-SE')
  })
}

export default function TabGrid() {
  const [athletes, setAthletes] = useState([])
  const [checkinsByAthlete, setCheckinsByAthlete] = useState({})
  const [weekStart, setWeekStart] = useState(() => getWeekBounds(getLocalDate()).start)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [weeklyTarget, setWeeklyTarget] = useState(null)
  const today = getLocalDate()

  async function handleExport() {
    setExporting(true)
    try {
      const rows = await getAllCheckinsForExport()
      const header = 'Atleta,Data,Semana\n'
      const csv = header + rows.map(r => `"${r.athlete}",${r.date},${r.week}`).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gdd-checkins-${getLocalDate()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const load = useCallback(async (start) => {
    setLoading(true)
    const [aths, checkins, cfg] = await Promise.all([
      getAthletes(),
      getCheckinsForWeek(start),
      getConfig(),
    ])
    const map = {}
    checkins.forEach(c => {
      if (!map[c.athleteId]) map[c.athleteId] = new Set()
      map[c.athleteId].add(c.date)
    })
    setAthletes(aths)
    setCheckinsByAthlete(map)
    setWeeklyTarget(cfg.weeklyTarget)
    setLoading(false)
  }, [])

  useEffect(() => { load(weekStart) }, [weekStart, load])

  const days = getWeekDays(weekStart)
  const currentWeekStart = getWeekBounds(today).start
  const isCurrentWeek = weekStart === currentWeekStart

  // Summary stat computations (only meaningful for current week)
  const sessionsHoje = athletes.filter(a => checkinsByAthlete[a.id]?.has(today)).length

  const totalAthletes = athletes.length
  const athletesOnTarget = weeklyTarget != null
    ? athletes.filter(a => (checkinsByAthlete[a.id]?.size ?? 0) >= weeklyTarget).length
    : null
  const taxaSemanal = weeklyTarget != null && totalAthletes > 0
    ? Math.round((athletesOnTarget / totalAthletes) * 100)
    : null

  const totalSessions = athletes.reduce((sum, a) => sum + (checkinsByAthlete[a.id]?.size ?? 0), 0)
  const presencaMedia = totalAthletes > 0
    ? (totalSessions / totalAthletes).toFixed(1)
    : '0.0'

  return (
    <>
      {!loading && isCurrentWeek && (
        <div className="grid-summary-row">
          <div className="grid-stat-card">
            <div className="grid-stat-number" style={{ color: 'var(--green)' }}>{sessionsHoje}</div>
            <div className="grid-stat-label">Sessões hoje</div>
          </div>
          <div className="grid-stat-card">
            <div className="grid-stat-number" style={{ color: taxaSemanal != null && taxaSemanal >= 50 ? 'var(--green)' : 'var(--red)' }}>
              {taxaSemanal != null ? `${taxaSemanal}%` : '—'}
            </div>
            <div className="grid-stat-label">Taxa semanal</div>
          </div>
          <div className="grid-stat-card">
            <div className="grid-stat-number" style={{ color: 'var(--red)' }}>{presencaMedia}</div>
            <div className="grid-stat-label">Presença média</div>
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
              {athletes.map(a => (
                <tr key={a.id}>
                  <td className="grid-name" title={a.name}>{a.name.split(' ')[0]} {a.name.split(' ').slice(-1)}</td>
                  {days.map(d => (
                    <td key={d} style={{ textAlign: 'center' }}>
                      <div className={`grid-cell${checkinsByAthlete[a.id]?.has(d) ? ' checked' : ''}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid-legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--green)' }} /> Check-in</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--card2)', border: '1px solid var(--border)' }} /> Ausente</div>
      </div>

      <button className="grid-export-btn" onClick={handleExport} disabled={exporting}>
        {exporting ? 'A exportar…' : '↓ Exportar CSV'}
      </button>
    </>
  )
}
