import { useState, useEffect } from 'react'
import { getAthletes } from '../../services/athletes'
import { getCheckinsForAthlete } from '../../services/checkins'
import { getLocalDate, getWeekBounds } from '../../lib/dates'
import './TabAthlete.css'

export default function TabAthlete() {
  const [athletes, setAthletes] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { getAthletes().then(setAthletes).catch(() => {}) }, [])

  const filtered = search.length > 0
    ? athletes.filter(a => a.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5)
    : []

  async function selectAthlete(a) {
    setSelected(a); setSearch(a.name); setLoading(true)
    const cs = await getCheckinsForAthlete(a.id).catch(() => [])
    setCheckins(cs); setLoading(false)
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
        </>
      )}

      {loading && <p className="loading-state">Loading...</p>}
    </>
  )
}
