import { useState, useEffect } from 'react'
import {
  getCheckinsForAthlete,
  hasCheckedInToday,
  addCheckin,
  getSessionCountForAthleteThisWeek,
} from '../../services/checkins'
import { getLocalDate, getWeekBounds } from '../../lib/dates'

export default function TabHome({ athlete }) {
  const [total, setTotal]         = useState(null)
  const [weekCount, setWeekCount] = useState(null)
  const [lastCheckin, setLastCheckin] = useState(null)
  const [checkedIn, setCheckedIn] = useState(false)
  const [checking, setChecking]   = useState(false)
  const [loading, setLoading]     = useState(true)

  async function load() {
    const today = getLocalDate()
    const [all, wc, already] = await Promise.all([
      getCheckinsForAthlete(athlete.id),
      getSessionCountForAthleteThisWeek(athlete.id, today),
      hasCheckedInToday(athlete.id),
    ])
    setTotal(all.length)
    setWeekCount(wc)
    setCheckedIn(already)
    if (all.length > 0) setLastCheckin(all[0].date)
    setLoading(false)
  }

  useEffect(() => { load().catch(() => setLoading(false)) }, [athlete.id])

  async function handleCheckin() {
    if (checking || checkedIn) return
    setChecking(true)
    try {
      await addCheckin(athlete.id, athlete.name)
      setCheckedIn(true)
      setWeekCount(c => (c || 0) + 1)
      setTotal(t => (t || 0) + 1)
      setLastCheckin(getLocalDate())
    } catch { /* silently ignore */ }
    finally { setChecking(false) }
  }

  const firstName = athlete.name.split(' ')[0]

  if (loading) return <p className="loading-state">A carregar…</p>

  return (
    <>
      <div className="home-greeting">
        <p className="home-greeting-sub">Bem-vindo de volta</p>
        <h1 className="home-greeting-name">{firstName}</h1>
      </div>

      <div className="home-stats">
        <div className="home-stat">
          <div className="home-stat-number" style={{ color: 'var(--red)' }}>
            {weekCount ?? '—'}
          </div>
          <div className="home-stat-label">Esta semana</div>
        </div>
        <div className="home-stat">
          <div className="home-stat-number" style={{ color: 'var(--white)' }}>
            {total ?? '—'}
          </div>
          <div className="home-stat-label">Total sessões</div>
        </div>
      </div>

      {lastCheckin && (
        <div className="home-last-checkin">
          <div>
            <p className="home-last-label">Último check-in</p>
            <p className="home-last-value">
              {new Date(lastCheckin + 'T12:00:00').toLocaleDateString('pt-PT', {
                weekday: 'long', day: 'numeric', month: 'long'
              })}
            </p>
          </div>
          <span className="pill pill-green">Check-in</span>
        </div>
      )}

      <div className="home-checkin-btn">
        {checkedIn ? (
          <div className="home-already">
            <span style={{ fontSize: 20 }}>✓</span>
            <p className="home-already-text">Check-in feito hoje!</p>
          </div>
        ) : (
          <button className="btn-primary" onClick={handleCheckin} disabled={checking}>
            {checking ? 'A registar…' : 'Fazer Check-in'}
          </button>
        )}
      </div>
    </>
  )
}
