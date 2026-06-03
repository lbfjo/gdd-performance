import { useState, useEffect } from 'react'
import {
  getCheckinsForAthlete,
  hasCheckedInToday,
  addCheckin,
  getSessionCountForAthleteThisWeek,
} from '../../services/checkins'
import { getConfig } from '../../services/config'
import { getLocalDate } from '../../lib/dates'
import { enqueueCheckin, getPendingQueue, removeFromQueue } from '../../lib/offline'

export default function TabHome({ athlete }) {
  const [total, setTotal]               = useState(null)
  const [weekCount, setWeekCount]       = useState(null)
  const [weeklyTarget, setWeeklyTarget] = useState(null)
  const [lastCheckin, setLastCheckin]   = useState(null)
  const [checkedIn, setCheckedIn]       = useState(false)
  const [checking, setChecking]         = useState(false)
  const [offline, setOffline]           = useState(!navigator.onLine)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    const goOnline  = () => { setOffline(false); syncQueue() }
    const goOffline = () => setOffline(true)
    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  async function syncQueue() {
    for (const item of getPendingQueue()) {
      try {
        await addCheckin(item.athleteId, item.athleteName)
        removeFromQueue(item.id)
      } catch { /* retry next time */ }
    }
  }

  async function load() {
    const today = getLocalDate()
    const [all, wc, already, cfg] = await Promise.all([
      getCheckinsForAthlete(athlete.id),
      getSessionCountForAthleteThisWeek(athlete.id, today),
      hasCheckedInToday(athlete.id),
      getConfig(),
    ])
    setTotal(all.length)
    setWeekCount(wc)
    setCheckedIn(already)
    setWeeklyTarget(cfg.weeklyTarget)
    if (all.length > 0) setLastCheckin(all[0].date)
    setLoading(false)
  }

  useEffect(() => { load().catch(() => setLoading(false)) }, [athlete.id])

  async function handleCheckin() {
    if (checking || checkedIn) return
    setChecking(true)
    try {
      if (navigator.onLine) {
        await addCheckin(athlete.id, athlete.name)
      } else {
        enqueueCheckin({ athleteId: athlete.id, athleteName: athlete.name, date: getLocalDate() })
      }
      setCheckedIn(true)
      setWeekCount(c => (c || 0) + 1)
      setTotal(t => (t || 0) + 1)
      setLastCheckin(getLocalDate())
    } catch {
      enqueueCheckin({ athleteId: athlete.id, athleteName: athlete.name, date: getLocalDate() })
      setCheckedIn(true)
      setWeekCount(c => (c || 0) + 1)
    } finally { setChecking(false) }
  }

  const firstName = athlete.name.split(' ')[0]

  if (loading) return <p className="loading-state">A carregar…</p>

  return (
    <>
      {offline && (
        <div style={{
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 4, padding: '10px 14px', marginBottom: 16,
          fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--amber)'
        }}>
          Sem ligação — o check-in será sincronizado quando voltares a estar online.
        </div>
      )}

      <div className="home-greeting">
        <p className="home-greeting-sub">Bem-vindo de volta</p>
        <h1 className="home-greeting-name">{firstName}</h1>
      </div>

      <div className="home-stats">
        <div className="home-stat">
          <div className="home-stat-number" style={{ color: 'var(--red)' }}>
            {weeklyTarget
              ? `${weekCount ?? 0}/${weeklyTarget}`
              : weekCount ?? '—'}
          </div>
          <div className="home-stat-label">{weeklyTarget ? 'Objetivo semanal' : 'Esta semana'}</div>
        </div>
        <div className="home-stat">
          <div className="home-stat-number" style={{ color: 'var(--white)' }}>
            {total ?? '—'}
          </div>
          <div className="home-stat-label">Total sessões</div>
        </div>
      </div>

      {weeklyTarget && weekCount !== null && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '12px 16px', marginBottom: 16
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginBottom: 8,
            fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--muted)'
          }}>
            <span>PROGRESSO SEMANAL</span>
            <span style={{ color: weekCount >= weeklyTarget ? 'var(--green)' : 'var(--white)' }}>
              {weekCount >= weeklyTarget ? '✓ Objetivo atingido' : `Faltam ${weeklyTarget - weekCount}`}
            </span>
          </div>
          <div style={{ background: 'var(--card2)', borderRadius: 3, height: 6 }}>
            <div style={{
              background: weekCount >= weeklyTarget ? 'var(--green)' : 'var(--red)',
              width: `${Math.min(100, (weekCount / weeklyTarget) * 100)}%`,
              height: 6, borderRadius: 3, transition: 'width 0.4s ease'
            }} />
          </div>
        </div>
      )}

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
