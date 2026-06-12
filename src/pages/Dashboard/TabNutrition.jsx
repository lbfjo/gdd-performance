import { useState, useEffect, useCallback } from 'react'
import { getAthletes } from '../../services/athletes'
import { getWeightLogsForWeek } from '../../services/nutrition'
import { getLocalDate, getWeekBounds, getPreviousWeekBounds } from '../../lib/dates'
import './TabNutrition.css'

function getWeekDays(start) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d.toLocaleDateString('sv-SE')
  })
}

export default function TabNutrition() {
  const [athletes, setAthletes] = useState([])
  const [weightsByAthlete, setWeightsByAthlete] = useState({})
  const [weekStart, setWeekStart] = useState(() => getWeekBounds(getLocalDate()).start)
  const [loading, setLoading] = useState(true)
  const today = getLocalDate()

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

  return (
    <>
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
    </>
  )
}
