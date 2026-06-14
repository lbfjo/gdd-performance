const TZ = 'Europe/Lisbon'
const BOOKING_WINDOW_MS = 24 * 60 * 60 * 1000

export const SLOTS = {
  morning: { key: 'morning', label: 'Manhã',  start: '07:00', end: '09:00' },
  lunch:   { key: 'lunch',   label: 'Almoço', start: '12:00', end: '14:00' },
  evening: { key: 'evening', label: 'Tarde',  start: '18:00', end: '20:00' },
}

export const SLOT_ORDER = ['morning', 'lunch', 'evening']

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function nowInLisbonMinutes(now) {
  const str = now.toLocaleTimeString('sv-SE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  return toMinutes(str)
}

function getSlotStart(slotKey, dateStr) {
  const start = SLOTS[slotKey].start
  const [startHour, startMinute] = start.split(':').map(Number)
  const approxUtc = new Date(`${dateStr}T${start}:00Z`)
  const lisbonParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(approxUtc)
  const lisbonHour = Number(lisbonParts.find(part => part.type === 'hour').value)
  const lisbonMinute = Number(lisbonParts.find(part => part.type === 'minute').value)
  const offsetMs = (
    (lisbonHour * 60 + lisbonMinute) - (startHour * 60 + startMinute)
  ) * 60 * 1000

  return new Date(approxUtc.getTime() - offsetMs)
}

export function isWeekday(dateStr) {
  const day = new Date(dateStr + 'T12:00:00').getDay()
  return day >= 1 && day <= 5
}

export function getActiveSlot(now = new Date()) {
  const mins = nowInLisbonMinutes(now)
  for (const key of SLOT_ORDER) {
    const s = SLOTS[key]
    if (mins >= toMinutes(s.start) && mins < toMinutes(s.end)) return key
  }
  return null
}

export function getSlotBookingStatus(slotKey, dateStr, now = new Date()) {
  if (!SLOTS[slotKey] || !isWeekday(dateStr)) return 'closed'

  const msUntilSlot = getSlotStart(slotKey, dateStr).getTime() - now.getTime()
  if (msUntilSlot <= 0) return 'closed'
  if (msUntilSlot > BOOKING_WINDOW_MS) return 'too-early'
  return 'open'
}

export function isSlotBookable(slotKey, dateStr, now = new Date()) {
  return getSlotBookingStatus(slotKey, dateStr, now) === 'open'
}
