import { useState, useEffect } from 'react'
import { getCheckinsForAthlete } from '../../services/checkins'
import { getLocalDate } from '../../lib/dates'

const PT_MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const PT_WEEKDAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']

function getCalendarDays(year, month) {
  const firstDow = new Date(year, month, 1).getDay() // 0=Sun
  const offset   = firstDow === 0 ? 6 : firstDow - 1 // Monday-first
  const total    = new Date(year, month + 1, 0).getDate()
  const cells    = Array(offset).fill(null)
  for (let d = 1; d <= total; d++) cells.push(d)
  return cells
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

export default function TabHistory({ athlete }) {
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading]   = useState(true)
  const today = getLocalDate()
  const [viewYear,  setViewYear]  = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())

  useEffect(() => {
    getCheckinsForAthlete(athlete.id)
      .then(setCheckins)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [athlete.id])

  const checkinDates = new Set(checkins.map(c => c.date))
  const calDays = getCalendarDays(viewYear, viewMonth)

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    const now = new Date()
    if (viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth >= now.getMonth())) return
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const isCurrentMonth = viewYear === new Date().getFullYear() && viewMonth === new Date().getMonth()

  // Sessions in viewed month for list
  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}`
  const monthCheckins = checkins
    .filter(c => c.date.startsWith(monthStr))
    .sort((a, b) => b.date.localeCompare(a.date))

  if (loading) return <p className="loading-state">A carregar…</p>

  return (
    <>
      {/* Calendar header */}
      <div className="cal-header">
        <button className="cal-nav" onClick={prevMonth}>‹</button>
        <span className="cal-month">{PT_MONTHS[viewMonth]} {viewYear}</span>
        <button className="cal-nav" onClick={nextMonth} disabled={isCurrentMonth}
          style={{ opacity: isCurrentMonth ? 0.25 : 1 }}>›</button>
      </div>

      {/* Calendar grid */}
      <div className="cal-grid">
        {PT_WEEKDAYS.map(d => (
          <div key={d} className="cal-weekday">{d}</div>
        ))}
        {calDays.map((day, i) => {
          if (!day) return <div key={`e${i}`} />
          const dateStr = toDateStr(viewYear, viewMonth, day)
          const checked = checkinDates.has(dateStr)
          const isToday = dateStr === today
          return (
            <div
              key={dateStr}
              className={[
                'cal-day',
                'has-number',
                checked     ? 'checked'      : '',
                isToday && !checked ? 'today-marker' : '',
                isToday &&  checked ? 'today-marker checked' : '',
              ].join(' ').trim()}
            >
              {day}
            </div>
          )
        })}
      </div>

      {/* Session list for this month */}
      {monthCheckins.length > 0 && (
        <>
          <p className="history-section-title">Sessões — {PT_MONTHS[viewMonth]}</p>
          <div className="history-list">
            {monthCheckins.map(c => {
              const d = new Date(c.date + 'T12:00:00')
              return (
                <div key={c.id} className="history-item">
                  <div>
                    <p className="history-date">
                      {d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <span className="pill pill-green">Check-in</span>
                </div>
              )
            })}
          </div>
        </>
      )}
      {monthCheckins.length === 0 && (
        <p style={{ color: 'var(--muted)', textAlign: 'center', paddingTop: 12, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
          Sem sessões em {PT_MONTHS[viewMonth]}
        </p>
      )}
    </>
  )
}
