import { useState, useEffect, useCallback } from 'react'
import { getCheckinsForWeek } from '../../services/checkins'
import { getAthletes } from '../../services/athletes'
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
  const today = getLocalDate()

  const load = useCallback(async (start) => {
    setLoading(true)
    const [aths, checkins] = await Promise.all([
      getAthletes(),
      getCheckinsForWeek(start),
    ])
    const map = {}
    checkins.forEach(c => {
      if (!map[c.athleteId]) map[c.athleteId] = new Set()
      map[c.athleteId].add(c.date)
    })
    setAthletes(aths)
    setCheckinsByAthlete(map)
    setLoading(false)
  }, [])

  useEffect(() => { load(weekStart) }, [weekStart, load])

  const days = getWeekDays(weekStart)
  const currentWeekStart = getWeekBounds(today).start
  const isCurrentWeek = weekStart === currentWeekStart

  return (
    <>
      <div className="grid-controls">
        <button className="grid-nav" onClick={() => setWeekStart(s => getPreviousWeekBounds(s).start)}>‹</button>
        <span className="grid-week-label">{formatDay(days[0])} {days[0].slice(5)} — {formatDay(days[6])} {days[6].slice(5)}</span>
        <button className="grid-nav" disabled={isCurrentWeek} onClick={() => {
          const next = new Date(weekStart + 'T12:00:00')
          next.setDate(next.getDate() + 7)
          setWeekStart(next.toLocaleDateString('sv-SE'))
        }}>›</button>
      </div>

      {loading ? (
        <p className="loading-state">Loading...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="grid-table">
            <thead>
              <tr>
                <th />
                {days.map(d => (
                  <th key={d} className={d === today ? 'today' : ''}>
                    {formatDay(d).slice(0, 1)}
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
        <div className="legend-item"><div className="legend-dot" style={{ background: '#16a34a' }} /> Checked in</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#1f2937', border: '1px solid #374151' }} /> Absent</div>
      </div>
    </>
  )
}
