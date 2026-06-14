const TZ = 'Europe/Lisbon'

export function getLocalDate(date = new Date()) {
  return date.toLocaleDateString('sv-SE', { timeZone: TZ })
}

export function getWeekBounds(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diffToMonday = (day === 0 ? -6 : 1 - day)
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toLocaleDateString('sv-SE'),
    end: sunday.toLocaleDateString('sv-SE'),
  }
}

export function formatDay(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' })
}

export function getPreviousWeekBounds(dateStr) {
  const { start } = getWeekBounds(dateStr)
  const prevMonday = new Date(start + 'T12:00:00')
  prevMonday.setDate(prevMonday.getDate() - 7)
  return getWeekBounds(prevMonday.toLocaleDateString('sv-SE'))
}

export function getBookingWeekdays(dateStr) {
  const date = new Date(dateStr + 'T12:00:00')
  const { start } = getWeekBounds(dateStr)
  const monday = new Date(start + 'T12:00:00')

  if (date.getDay() === 0 || date.getDay() === 6) {
    monday.setDate(monday.getDate() + 7)
  }

  return Array.from({ length: 5 }, (_, index) => {
    const weekday = new Date(monday)
    weekday.setDate(monday.getDate() + index)
    return weekday.toLocaleDateString('sv-SE')
  })
}
