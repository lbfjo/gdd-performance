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

// Returns the day-of-week index treating Monday=0 … Friday=4, Sat/Sun=5/6
function weekdayIndex(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay() // 0=Sun
  return dow === 0 ? 6 : dow - 1 // Mon=0 … Sun=6
}

function isWeekend(dateStr) {
  const wi = weekdayIndex(dateStr)
  return wi >= 5
}

// Returns the number of consecutive weekdays (Mon–Fri) with a check-in,
// counting backwards from today. A single missing weekday breaks the streak.
function calculateStreak(checkins) {
  if (!checkins || checkins.length === 0) return 0

  const checkedSet = new Set(checkins.map(c => c.date))
  const today = getLocalDate()

  // Walk backwards from today through weekdays only
  let streak = 0
  const cursor = new Date(today + 'T12:00:00')

  // If today is a weekend day, rewind to last Friday first
  while (isWeekend(cursor.toLocaleDateString('sv-SE'))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  // Walk back through weekdays
  while (true) {
    const ds = cursor.toLocaleDateString('sv-SE')
    if (isWeekend(ds)) {
      cursor.setDate(cursor.getDate() - 1)
      continue
    }
    if (checkedSet.has(ds)) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

// SVG circular progress ring
function CircularRing({ count, target }) {
  const size    = 120
  const stroke  = 8
  const radius  = (size - stroke) / 2
  const circ    = 2 * Math.PI * radius
  const ratio   = Math.min(1, count / target)
  const offset  = circ * (1 - ratio)
  const done    = count >= target
  const color   = done ? 'var(--green)' : 'var(--red)'
  const cx      = size / 2
  const cy      = size / 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="progress-ring-svg"
    >
      {/* background track */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke="var(--card2)"
        strokeWidth={stroke}
      />
      {/* progress arc */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        className="progress-ring-arc"
      />
      {/* centre text */}
      <text
        x={cx} y={cy - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Saira Condensed', sans-serif"
        fontWeight="700"
        fontSize="24"
        fill={color}
      >
        {count}/{target}
      </text>
      <text
        x={cx} y={cy + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Inter', sans-serif"
        fontSize="11"
        fill="var(--muted)"
      >
        sessões
      </text>
    </svg>
  )
}

export default function TabHome({ athlete }) {
  const [total, setTotal]               = useState(null)
  const [weekCount, setWeekCount]       = useState(null)
  const [weeklyTarget, setWeeklyTarget] = useState(null)
  const [lastCheckin, setLastCheckin]   = useState(null)
  const [checkedIn, setCheckedIn]       = useState(false)
  const [checking, setChecking]         = useState(false)
  const [offline, setOffline]           = useState(!navigator.onLine)
  const [loading, setLoading]           = useState(true)
  const [allCheckins, setAllCheckins]   = useState([])

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
    setAllCheckins(all)
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
      // Optimistically add to streak data
      const today = getLocalDate()
      setAllCheckins(prev => [{ id: '_opt', date: today }, ...prev])
    } catch {
      enqueueCheckin({ athleteId: athlete.id, athleteName: athlete.name, date: getLocalDate() })
      setCheckedIn(true)
      setWeekCount(c => (c || 0) + 1)
    } finally { setChecking(false) }
  }

  const firstName = athlete.name.split(' ')[0]
  const streak    = calculateStreak(allCheckins)
  const wc        = weekCount ?? 0
  const wt        = weeklyTarget

  // Motivational banner state
  let banner = null
  if (wt && wc !== null) {
    if (wc === 0) {
      banner = { type: 'amber', text: 'Começa a semana forte 💪' }
    } else if (wc >= wt) {
      banner = { type: 'green', text: 'Objetivo atingido! ✓' }
    }
  }

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

      {/* Weekly progress: circular ring or flat stat */}
      {wt ? (
        <div className="home-weekly-ring-wrap">
          <CircularRing count={wc} target={wt} />
          <p className="home-stat-label" style={{ marginTop: 6, textAlign: 'center' }}>
            Objetivo semanal
          </p>
        </div>
      ) : (
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
      )}

      {/* When ring is shown, show total sessions as a single stat beneath */}
      {wt && (
        <div className="home-stats" style={{ marginTop: 0 }}>
          <div className="home-stat">
            <div className="home-stat-number" style={{ color: 'var(--white)' }}>
              {total ?? '—'}
            </div>
            <div className="home-stat-label">Total sessões</div>
          </div>

          {/* Streak card */}
          <div className="home-stat">
            {streak > 0 ? (
              <>
                <div className="home-stat-number" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <span style={{ fontSize: 26 }}>🔥</span>
                  <span style={{ color: 'var(--amber)', fontFamily: "'Saira Condensed', sans-serif", fontWeight: 700, fontSize: 28 }}>
                    {streak}
                  </span>
                </div>
                <div className="home-stat-label">dias seguidos</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 22, marginBottom: 4, opacity: 0.3 }}>🔥</div>
                <div className="home-stat-label" style={{ fontSize: 11 }}>Sem streak ativo</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Motivational banner */}
      {banner && (
        <div className={`home-banner home-banner-${banner.type}`}>
          {banner.text}
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
