import { useState, useEffect, useCallback } from 'react'
import { getCheckinsForWeek, getAllCheckinsForExport } from '../../services/checkins'
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
  const [exporting, setExporting] = useState(false)
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
