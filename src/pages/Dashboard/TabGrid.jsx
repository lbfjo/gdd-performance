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
      if (!map[c.athleteId]) map[c.athleteId] = {}
      map[c.athleteId][c.date] = (map[c.athleteId][c.date] || 0) + 1
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

  const weekTotal = (athleteId) =>
    Object.values(checkinsByAthlete[athleteId] ?? {}).reduce((s, n) => s + n, 0)

  const totalAthletes = athletes.length
  const sessionsHoje = athletes.reduce((sum, a) => sum + (checkinsByAthlete[a.id]?.[today] ?? 0), 0)
  const athletesToday = athletes.filter(a => (checkinsByAthlete[a.id]?.[today] ?? 0) > 0).length
  const activeThisWeek = athletes.filter(a => weekTotal(a.id) > 0).length
  const activeThisWeekRate = totalAthletes > 0
    ? Math.round((activeThisWeek / totalAthletes) * 100)
    : 0
  const athletesOnTarget = weeklyTarget != null
    ? athletes.filter(a => weekTotal(a.id) >= weeklyTarget).length
    : null

  const totalSessions = athletes.reduce((sum, a) => sum + weekTotal(a.id), 0)

  return (
    <>
      {!loading && isCurrentWeek && (
        <div className="grid-summary-row">
          <div className="grid-stat-card">
            <div className="grid-stat-number" style={{ color: 'var(--green)' }}>
              {athletesToday}<span> / {totalAthletes}</span>
            </div>
            <div className="grid-stat-label">Atletas hoje</div>
            <div className="grid-stat-detail">
              {sessionsHoje} {sessionsHoje === 1 ? 'sessão registada' : 'sessões registadas'}
            </div>
          </div>
          <div className="grid-stat-card">
            <div className="grid-stat-number">
              {activeThisWeek}<span> / {totalAthletes}</span>
            </div>
            <div className="grid-stat-label">Atletas esta semana</div>
            <div className="grid-stat-detail">
              {activeThisWeekRate}% do plantel · {totalSessions} {totalSessions === 1 ? 'sessão' : 'sessões'}
            </div>
          </div>
          <div className="grid-stat-card">
            <div className="grid-stat-number" style={{ color: athletesOnTarget > 0 ? 'var(--green)' : 'var(--white)' }}>
              {athletesOnTarget != null
                ? <>{athletesOnTarget}<span> / {totalAthletes}</span></>
                : '—'}
            </div>
            <div className="grid-stat-label">Objetivo atingido</div>
            <div className="grid-stat-detail">
              {weeklyTarget != null
                ? `${weeklyTarget} ${weeklyTarget === 1 ? 'sessão' : 'sessões'} por atleta`
                : 'Define o objetivo nas configurações'}
            </div>
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
                  {days.map(d => {
                    const count = checkinsByAthlete[a.id]?.[d] ?? 0
                    return (
                      <td key={d} style={{ textAlign: 'center' }}>
                        <div className={`grid-cell${count >= 2 ? ' double' : count === 1 ? ' checked' : ''}`}>
                          {count >= 2 && <span className="grid-cell-badge">2</span>}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid-legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--green)' }} /> Check-in</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--amber)' }} /> Sessão dupla</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--card2)', border: '1px solid var(--border)' }} /> Ausente</div>
      </div>

      <button className="grid-export-btn" onClick={handleExport} disabled={exporting}>
        {exporting ? 'A exportar…' : '↓ Exportar CSV'}
      </button>
    </>
  )
}
