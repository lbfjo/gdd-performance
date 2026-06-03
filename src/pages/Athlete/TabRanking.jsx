import { useState, useEffect } from 'react'
import { getAthletes } from '../../services/athletes'
import { getCheckinsForWeek, getCheckinsForAthlete } from '../../services/checkins'
import { getLocalDate } from '../../lib/dates'

const MEDALS = ['🥇', '🥈', '🥉']

export default function TabRanking({ athlete }) {
  const [rows, setRows]     = useState([])
  const [mode, setMode]     = useState('week')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const athletes = await getAthletes()
      if (mode === 'week') {
        const checkins = await getCheckinsForWeek(getLocalDate())
        const countMap = {}
        checkins.forEach(c => { countMap[c.athleteId] = (countMap[c.athleteId] || 0) + 1 })
        setRows(
          athletes
            .map(a => ({ ...a, count: countMap[a.id] || 0 }))
            .sort((a, b) => b.count - a.count)
        )
      } else {
        const all = await Promise.all(athletes.map(a => getCheckinsForAthlete(a.id)))
        setRows(
          athletes
            .map((a, i) => ({ ...a, count: all[i].length }))
            .sort((a, b) => b.count - a.count)
        )
      }
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [mode])

  return (
    <>
      <div className="ranking-header">
        <h2 className="ranking-title">Ranking</h2>
        <p className="ranking-sub">
          {mode === 'week' ? 'Sessões esta semana' : 'Total de sessões — off-season'}
        </p>
      </div>

      {/* Toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        <button
          className={`toggle-btn${mode === 'week' ? ' active' : ''}`}
          onClick={() => setMode('week')}
          style={{ background: mode === 'week' ? 'var(--red)' : 'var(--card2)', border: '1px solid var(--border)', color: mode === 'week' ? 'var(--white)' : 'var(--muted)', padding: '8px 18px', borderRadius: 4, fontFamily: 'Saira Condensed, sans-serif', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Esta semana
        </button>
        <button
          className={`toggle-btn${mode === 'all' ? ' active' : ''}`}
          onClick={() => setMode('all')}
          style={{ background: mode === 'all' ? 'var(--red)' : 'var(--card2)', border: '1px solid var(--border)', color: mode === 'all' ? 'var(--white)' : 'var(--muted)', padding: '8px 18px', borderRadius: 4, fontFamily: 'Saira Condensed, sans-serif', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Total
        </button>
      </div>

      {loading ? (
        <p className="loading-state">A carregar…</p>
      ) : (
        <div className="ranking-list">
          {rows.map((r, i) => {
            const isMe = r.id === athlete.id
            return (
              <div key={r.id} className={`ranking-row${isMe ? ' me' : ''}`}>
                <span className="ranking-pos">
                  {i < 3 ? <span style={{ fontSize: 20 }}>{MEDALS[i]}</span> : i + 1}
                </span>
                <span className={`ranking-name${isMe ? ' me' : ''}`}>
                  {r.name}
                  {isMe && <span className="ranking-me-tag"> (tu)</span>}
                </span>
                <span className={`ranking-badge${r.count === 0 ? ' zero' : ''}`}>
                  {r.count}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
