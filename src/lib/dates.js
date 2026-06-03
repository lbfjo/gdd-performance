const TZ = 'Europe/Lisbon'

export function getLocalDate(date = new Date()) {
  return date.toLocaleDateString('sv-SE', { timeZone: TZ })
}

export function getWeekBounds(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay() // 0=Sun, 1=Mon ... 6=Sat
  const diffToMonday = (day === 0 ? -6 : 1 - day)
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  }
}

export function formatDay(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' })
}

export function getPreviousWeekBounds(dateStr) {
  const { start } = getWeekBounds(dateStr)
  const prevMonday = new Date(start + 'T12:00:00')
  prevMonday.setDate(prevMonday.getDate() - 7)
  return getWeekBounds(prevMonday.toISOString().slice(0, 10))
}
