import { useState, useEffect } from 'react'
import { getBookingsForAthlete, addBooking, hasBooking, getBookingCountForSlot, cancelBooking, isCancellable } from '../../services/bookings'
import { getBookingWeekdays, getLocalDate } from '../../lib/dates'
import { SLOTS, SLOT_ORDER, getSlotBookingStatus, isWeekday, isSlotBookable } from '../../lib/slots'

const PT_DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

export default function TabBookings({ athlete }) {
  const today = getLocalDate()
  const weekdays = getBookingWeekdays(today)

  const [selectedDay, setSelectedDay] = useState(() => isWeekday(today) ? today : weekdays[0])
  const [allBookings, setAllBookings] = useState([])
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [slotCounts, setSlotCounts] = useState({})
  const [cancelling, setCancelling] = useState(null)

  useEffect(() => {
    getBookingsForAthlete(athlete.id)
      .then(setAllBookings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [athlete.id])

  useEffect(() => {
    if (!isWeekday(selectedDay)) {
      setSlotCounts({})
      return
    }
    Promise.all(
      SLOT_ORDER.map(slotKey =>
        getBookingCountForSlot(selectedDay, slotKey).then(count => [slotKey, count])
      )
    ).then(entries => {
      setSlotCounts(Object.fromEntries(entries))
    }).catch(() => {})
  }, [selectedDay])

  const bookedSet = new Set(allBookings.map(b => `${b.date}|${b.slot}`))
  // Map "date|slot" -> booking id so we can cancel
  const bookedIdMap = Object.fromEntries(allBookings.map(b => [`${b.date}|${b.slot}`, b.id]))

  async function handleBook(slot) {
    if (booking) return
    if (!isSlotBookable(slot, selectedDay)) return
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

  async function handleCancel(slotKey) {
    const bookingId = bookedIdMap[`${selectedDay}|${slotKey}`]
    if (!bookingId) return
    const confirmed = window.confirm('Tens a certeza que queres cancelar esta reserva?')
    if (!confirmed) return
    setCancelling(slotKey)
    try {
      await cancelBooking(bookingId)
      setAllBookings(prev => prev.filter(b => b.id !== bookingId))
      // Refresh count for this slot
      getBookingCountForSlot(selectedDay, slotKey).then(count =>
        setSlotCounts(prev => ({ ...prev, [slotKey]: count }))
      ).catch(() => {})
    } catch { /* silently fail */ }
    finally { setCancelling(null) }
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
          const bookingStatus = getSlotBookingStatus(slotKey, selectedDay, now)
          const bookable = bookingStatus === 'open'
          const count = slotCounts[slotKey]
          const cancellable = isCancellable(slotKey, selectedDay)

          return (
            <div key={slotKey} className={`slot-card${isBooked ? ' booked' : ''}${!bookable && !isBooked ? ' closed' : ''}`}>
              <div className="slot-info">
                <p className="slot-label">{slot.label}</p>
                <p className="slot-time">{slot.start} – {slot.end}</p>
                {isBooked ? (
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--green)', marginTop: 4 }}>
                    A tua reserva ✓
                  </p>
                ) : count !== undefined ? (
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {count} atleta{count !== 1 ? 's' : ''} reservado{count !== 1 ? 's' : ''}
                  </p>
                ) : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                {isBooked ? (
                  <>
                    <span className="pill pill-green">✓ Reservado</span>
                    {cancellable ? (
                      <button
                        className="slot-cancel-btn"
                        onClick={() => handleCancel(slotKey)}
                        disabled={cancelling === slotKey}
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: 11,
                          color: 'var(--muted)',
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '3px 8px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cancelling === slotKey ? '…' : 'Cancelar'}
                      </button>
                    ) : (
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'var(--muted)' }}>
                        Cancelamento indisponível
                      </span>
                    )}
                  </>
                ) : bookable ? (
                  <button className="slot-book-btn" onClick={() => handleBook(slotKey)} disabled={booking === slotKey}>
                    {booking === slotKey ? '…' : 'Reservar'}
                  </button>
                ) : (
                  <span className="slot-status-closed">
                    {bookingStatus === 'too-early' ? 'Disponível 24h antes' : 'Terminado'}
                  </span>
                )}
              </div>
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
