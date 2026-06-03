import { useEffect, useState } from 'react'
import { getSessionCountForAthleteThisWeek } from '../../services/checkins'
import { getLocalDate } from '../../lib/dates'

export default function StepConfirm({ athlete, onReset }) {
  const [count, setCount] = useState(null)
  const [seconds, setSeconds] = useState(8)

  useEffect(() => {
    getSessionCountForAthleteThisWeek(athlete.id, getLocalDate())
      .then(setCount)
      .catch(() => {})
  }, [athlete.id])

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => {
      if (s <= 1) { clearInterval(t); onReset(); return 0 }
      return s - 1
    }), 1000)
    return () => clearInterval(t)
  }, [onReset])

  const now = new Date()
  const timeStr = now.toLocaleString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon'
  })

  return (
    <div className="confirm-screen">
      <div className="confirm-ring">
        <span className="confirm-checkmark">✓</span>
      </div>

      <h1 className="confirm-title">Check-in<br />Realizado!</h1>
      <p className="confirm-athlete">{athlete.name}</p>
      <p className="confirm-time">{timeStr}</p>

      {count !== null && (
        <div className="confirm-sessions">
          Esta semana: {count} sessão{count !== 1 ? 'ões' : ''} ✓
        </div>
      )}

      <div className="confirm-continue">
        <button className="btn-primary" onClick={onReset}>
          Continuar
        </button>
      </div>
      <p className="confirm-reset">Reinicia automaticamente em {seconds}s</p>
    </div>
  )
}
