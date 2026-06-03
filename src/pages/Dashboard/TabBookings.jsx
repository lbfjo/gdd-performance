import { useState, useEffect } from 'react'
import { getBookingsForDate, getCheckinsForDate } from '../../services/bookings'
import { getLocalDate, getWeekBounds } from '../../lib/dates'
import { SLOTS, SLOT_ORDER } from '../../lib/slots'

const PT_DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function getWeekdays(mondayStr) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mondayStr + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d.toLocaleDateString('sv-SE')
  })
}

export default function TabBookings() {
  const today = getLocalDate()
  const { start: monday } = getWeekBounds(today)
  const weekdays = getWeekdays(monday)

  const [selectedDay, setSelectedDay] = useState(today)
  const [bookings, setBookings] = useState([])
  const [checkedInIds, setCheckedInIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({ morning: true, lunch: true, evening: true })

  useEffect(() => {
    setLoading(true)
    const fetchCheckins = selectedDay === today
      ? getCheckinsForDate(selectedDay)
      : Promise.resolve(new Set())

    Promise.all([getBookingsForDate(selectedDay), fetchCheckins])
      .then(([b, c]) => { setBookings(b); setCheckedInIds(c) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedDay, today])

  function toggleSlot(key) {
    setExpanded(e => ({ ...e, [key]: !e[key] }))
  }

  const bySlot = {}
  for (const key of SLOT_ORDER) {
    bySlot[key] = bookings
      .filter(b => b.slot === key)
      .sort((a, b) => a.athleteName.localeCompare(b.athleteName))
  }

  return (
    <>
      {/* Day strip */}
      <div className="db-booking-strip">
        {weekdays.map(dateStr => {
          const d = new Date(dateStr + 'T12:00:00')
          return (
            <button
              key={dateStr}
              className={`db-day-btn${selectedDay === dateStr ? ' active' : ''}${dateStr < today ? ' past' : ''}`}
              onClick={() => setSelectedDay(dateStr)}
            >
              <span className="db-day-name">{PT_DAYS[d.getDay()]}</span>
              <span className="db-day-num">{d.getDate()}</span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className="loading-state">A carregar…</p>
      ) : (
        SLOT_ORDER.map(key => {
          const slot = SLOTS[key]
          const athletes = bySlot[key]
          const isOpen = expanded[key]

          return (
            <div key={key} className="db-slot-section">
              <div className="db-slot-header" onClick={() => toggleSlot(key)}>
                <div className="db-slot-header-left">
                  <p className="db-slot-name">{slot.label}</p>
                  <p className="db-slot-time">{slot.start} – {slot.end}</p>
                </div>
                <span className="db-slot-count">
                  {athletes.length} atleta{athletes.length !== 1 ? 's' : ''} {isOpen ? '▴' : '▾'}
                </span>
              </div>

              {isOpen && athletes.length > 0 && (
                <div className="db-athlete-list">
                  {athletes.map(b => {
                    const didCheckIn = selectedDay === today && checkedInIds.has(b.athleteId)
                    return (
                      <div key={b.id} className="db-athlete-row">
                        <div className={`db-athlete-dot ${didCheckIn ? 'checked' : 'pending'}`} />
                        <span className="db-athlete-name">{b.athleteName}</span>
                        {selectedDay === today && (
                          <span className={`db-checkin-badge ${didCheckIn ? 'done' : 'pending'}`}>
                            {didCheckIn ? 'Check-in ✓' : 'Reservado'}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {isOpen && athletes.length === 0 && (
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--muted)' }}>
                    Sem reservas para este slot.
                  </p>
                </div>
              )}
            </div>
          )
        })
      )}
    </>
  )
}
