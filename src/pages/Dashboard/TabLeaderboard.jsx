import { useState, useEffect } from 'react'
import { getAthletes } from '../../services/athletes'
import { getCheckinsForWeek, getCheckinsForAthlete } from '../../services/checkins'
import { getLocalDate, getWeekBounds } from '../../lib/dates'
import './TabLeaderboard.css'

const MEDALS = ['🥇', '🥈', '🥉']

export default function TabLeaderboard() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('week')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const athletes = await getAthletes()
      if (mode === 'week') {
        const checkins = await getCheckinsForWeek(getLocalDate())
        const countMap = {}
        checkins.forEach(c => { countMap[c.athleteId] = (countMap[c.athleteId] || 0) + 1 })
        const ranked = athletes
          .map(a => ({ ...a, count: countMap[a.id] || 0 }))
          .sort((a, b) => b.count - a.count)
        setRows(ranked)
      } else {
        const allCheckins = await Promise.all(athletes.map(a => getCheckinsForAthlete(a.id)))
        const ranked = athletes
          .map((a, i) => ({ ...a, count: allCheckins[i].length }))
          .sort((a, b) => b.count - a.count)
        setRows(ranked)
      }
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [mode])

  return (
    <>
      <div className="leaderboard-toggle">
        <button className={`toggle-btn${mode === 'week' ? ' active' : ''}`} onClick={() => setMode('week')}>This Week</button>
        <button className={`toggle-btn${mode === 'alltime' ? ' active' : ''}`} onClick={() => setMode('alltime')}>All Time</button>
      </div>
      {loading ? <p className="loading-state">Loading...</p> : (
        <div className="leaderboard-list">
          {rows.map((r, i) => (
            <div key={r.id} className={`leaderboard-row${r.count === 0 ? ' zero' : ''}`}>
              <span className="lb-rank">{i < 3 ? MEDALS[i] : i + 1}</span>
              <span className={`lb-name${r.count === 0 ? ' zero' : ''}`}>{r.name}</span>
              <span className={`lb-count${r.count === 0 ? ' zero' : ''}`}>{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
