import { useEffect, useState } from 'react'
import { getSessionCountForAthleteThisWeek } from '../../services/checkins'
import { getBookingsForAthleteOnDate } from '../../services/bookings'
import { getConfig } from '../../services/config'
import { getLocalDate } from '../../lib/dates'
import { getActiveSlot, SLOTS } from '../../lib/slots'

const RESET_SECONDS = 4

export default function StepConfirm({ athlete, onReset }) {
  const [count, setCount]               = useState(null)
  const [weeklyTarget, setWeeklyTarget] = useState(null)
  const [bookedSlot, setBookedSlot]     = useState(null)
  const [seconds, setSeconds]           = useState(RESET_SECONDS)

  useEffect(() => {
    const today = getLocalDate()
    const activeSlot = getActiveSlot()

    Promise.all([
      getSessionCountForAthleteThisWeek(athlete.id, today),
      getConfig(),
      activeSlot ? getBookingsForAthleteOnDate(athlete.id, today) : Promise.resolve([]),
    ])
      .then(([c, cfg, bookings]) => {
        setCount(c)
        setWeeklyTarget(cfg.weeklyTarget)
        if (activeSlot && bookings.some(b => b.slot === activeSlot)) {
          setBookedSlot(activeSlot)
        }
      })
      .catch(() => {})
  }, [athlete.id])

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => {
      if (s <= 1) { clearInterval(t); onReset(); return 0 }
      return s - 1
    }), 1000)
    return () => clearInterval(t)
  }, [onReset])

  const firstName = athlete.name.split(' ')[0].toUpperCase()

  const timeStr = new Date().toLocaleString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon'
  })

  return (
    <div className="confirm-screen">
      {/* Auto-reset countdown bar at top of screen */}
      <div className="confirm-countdown-bar">
        <div
          className="confirm-countdown-fill"
          style={{ animationDuration: `${RESET_SECONDS}s` }}
        />
      </div>

      <div className="confirm-ring">
        <span className="confirm-checkmark">✓</span>
      </div>
      <h1 className="confirm-title">Check-in<br />Realizado!</h1>

      {/* Athlete first name — Saira Condensed 700, 32px, uppercase */}
      <p className="confirm-firstname">{firstName}</p>
      <p className="confirm-athlete">{athlete.name}</p>
      <p className="confirm-time">{timeStr}</p>

      {count !== null && (
        <div className="confirm-sessions">
          {weeklyTarget
            ? `Esta semana: ${count}/${weeklyTarget} sessões`
            : `Esta semana: ${count} sessão${count !== 1 ? 'ões' : ''} ✓`}
        </div>
      )}

      {bookedSlot && (
        <div style={{
          background: 'var(--green-bg)', border: '1px solid rgba(0,200,83,0.2)',
          borderRadius: 4, padding: '10px 20px', marginTop: -8,
          fontFamily: 'Saira Condensed, sans-serif', fontSize: 13, fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--green)',
        }}>
          Sessão reservada ✓ — {SLOTS[bookedSlot].label}
        </div>
      )}

      <div className="confirm-continue">
        <button className="btn-primary" onClick={onReset}>Continuar</button>
      </div>
      <p className="confirm-reset">Reinicia automaticamente em {seconds}s</p>
    </div>
  )
}
