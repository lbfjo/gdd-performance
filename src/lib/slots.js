const TZ = 'Europe/Lisbon'

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

export function isSlotBookable(slotKey, dateStr, now = new Date()) {
  if (!isWeekday(dateStr)) return false
  const todayStr = now.toLocaleDateString('sv-SE', { timeZone: TZ })
  if (dateStr < todayStr) return false
  if (dateStr > todayStr) return true
  return nowInLisbonMinutes(now) < toMinutes(SLOTS[slotKey].start)
}
