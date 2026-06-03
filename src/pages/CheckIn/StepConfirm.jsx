import { useEffect, useState } from 'react'
import { getSessionCountForAthleteThisWeek } from '../../services/checkins'
import { getLocalDate } from '../../lib/dates'

export default function StepConfirm({ athlete, onReset }) {
  const [count, setCount] = useState(null)
  const [seconds, setSeconds] = useState(5)

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
  const timeStr = now.toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon'
  })

  return (
    <div className="confirm-wrap">
      <div className="confirm-icon">✅</div>
      <p className="confirm-name">Checked in!</p>
      <p style={{ color: '#9ca3af', fontSize: 15 }}>{athlete.name}</p>
      <p className="confirm-time">{timeStr}</p>
      {count !== null && (
        <div className="confirm-week">This week: {count} session{count !== 1 ? 's' : ''} ✓</div>
      )}
      <p className="confirm-reset">Resetting in {seconds}s…</p>
    </div>
  )
}
