export function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export function buildNutritionSlotTimes(startTime, endTime, intervalMinutes = 15) {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)

  if (!Number.isInteger(intervalMinutes) || intervalMinutes < 5 || start >= end) {
    return []
  }

  const times = []
  for (let current = start; current < end; current += intervalMinutes) {
    times.push(minutesToTime(current))
  }
  return times
}

export function nutritionSlotId(date, time) {
  return `${date}_${time.replace(':', '')}`
}

export function isNutritionSlotPast(slot, now = new Date()) {
  const today = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' })
  if (slot.date < today) return true
  if (slot.date > today) return false

  const currentTime = now.toLocaleTimeString('sv-SE', {
    timeZone: 'Europe/Lisbon',
    hour: '2-digit',
    minute: '2-digit',
  })
  return slot.time <= currentTime
}
