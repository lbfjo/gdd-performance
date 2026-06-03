import { useState, useEffect } from 'react'
import { getBookingsForAthlete, addBooking, hasBooking } from '../../services/bookings'
import { getLocalDate, getWeekBounds } from '../../lib/dates'
import { SLOTS, SLOT_ORDER, isWeekday, isSlotBookable } from '../../lib/slots'

const PT_DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function getWeekdays(mondayStr) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mondayStr + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d.toLocaleDateString('sv-SE')
  })
}

export default function TabBookings({ athlete }) {
  const today = getLocalDate()
  const { start: monday } = getWeekBounds(today)
  const weekdays = getWeekdays(monday)

  const [selectedDay, setSelectedDay] = useState(today)
  const [allBookings, setAllBookings] = useState([])
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBookingsForAthlete(athlete.id)
      .then(setAllBookings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [athlete.id])

  const bookedSet = new Set(allBookings.map(b => `${b.date}|${b.slot}`))

  async function handleBook(slot) {
    if (booking) return
    const already = await hasBooking(athlete.id, selectedDay, slot)
    if (already) {
      setAllBookings(prev => [...prev, { id: `${selectedDay}-${slot}`, athleteId: athlete.id, date: selectedDay, slot }])
      return
    }
    setBooking(slot)
    try {
      await addBooking({ athleteId: athlete.id, athleteName: athlete.name, date: selectedDay, slot })
      setAllBookings(prev => [...prev, { id: `${selectedDay}-${slot}-${Date.now()}`, athleteId: athlete.id, date: selectedDay, slot }])
    } catch { /* silently fail */ }
    finally { setBooking(null) }
  }

  const now = new Date()
  const upcomingBookings = allBookings
    .filter(b => b.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot))

  if (loading) return <p className="loading-state">A carregar…</p>

  return (
    <>
      {/* Day strip */}
      <div className="booking-day-strip">
        {weekdays.map(dateStr => {
          const d = new Date(dateStr + 'T12:00:00')
          const allPast = SLOT_ORDER.every(s => !isSlotBookable(s, dateStr, now)) && dateStr <= today
          return (
            <button
              key={dateStr}
              className={`booking-day-btn${selectedDay === dateStr ? ' active' : ''}${allPast && dateStr < today ? ' dimmed' : ''}`}
              onClick={() => setSelectedDay(dateStr)}
            >
              <span className="booking-day-name">{PT_DAYS[d.getDay()]}</span>
              <span className="booking-day-num">{d.getDate()}</span>
            </button>
          )
        })}
      </div>

      {/* Slot cards */}
      {!isWeekday(selectedDay) ? (
        <p style={{ color: 'var(--muted)', fontFamily: 'Inter, sans-serif', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
          Sem treinos ao fim de semana.
        </p>
      ) : (
        SLOT_ORDER.map(slotKey => {
          const slot = SLOTS[slotKey]
          const isBooked = bookedSet.has(`${selectedDay}|${slotKey}`)
          const bookable = isSlotBookable(slotKey, selectedDay, now)

          return (
            <div key={slotKey} className={`slot-card${isBooked ? ' booked' : ''}${!bookable && !isBooked ? ' closed' : ''}`}>
              <div className="slot-info">
                <p className="slot-label">{slot.label}</p>
                <p className="slot-time">{slot.start} – {slot.end}</p>
              </div>
              {isBooked ? (
                <span className="pill pill-green">✓ Reservado</span>
              ) : bookable ? (
                <button className="slot-book-btn" onClick={() => handleBook(slotKey)} disabled={booking === slotKey}>
                  {booking === slotKey ? '…' : 'Reservar'}
                </button>
              ) : (
                <span className="slot-status-closed">Terminado</span>
              )}
            </div>
          )
        })
      )}

      {/* Upcoming bookings */}
      {upcomingBookings.length > 0 && (
        <div className="upcoming-section">
          <p className="upcoming-title">Próximas Reservas</p>
          {upcomingBookings.map(b => {
            const d = new Date(b.date + 'T12:00:00')
            const dateLabel = d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'short' })
            const slot = SLOTS[b.slot]
            return (
              <div key={b.id} className="upcoming-item">
                <span className="upcoming-date">{dateLabel}</span>
                <span className="upcoming-slot">{slot.label} · {slot.start}</span>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
