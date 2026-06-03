const KEY = 'gdd_pin_attempts'
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 30_000

function getAttempts(athleteId) {
  try { return JSON.parse(localStorage.getItem(`${KEY}_${athleteId}`)) || [] }
  catch { return [] }
}

function saveAttempts(athleteId, attempts) {
  localStorage.setItem(`${KEY}_${athleteId}`, JSON.stringify(attempts))
}

function recentAttempts(athleteId) {
  const now = Date.now()
  return getAttempts(athleteId).filter(ts => now - ts < LOCKOUT_MS)
}

export function recordFailedAttempt(athleteId) {
  const attempts = recentAttempts(athleteId)
  attempts.push(Date.now())
  saveAttempts(athleteId, attempts)
}

export function isLockedOut(athleteId) {
  return recentAttempts(athleteId).length >= MAX_ATTEMPTS
}

export function getRemainingSeconds(athleteId) {
  const attempts = recentAttempts(athleteId)
  if (attempts.length < MAX_ATTEMPTS) return 0
  const newest = Math.max(...attempts)
  return Math.ceil((LOCKOUT_MS - (Date.now() - newest)) / 1000)
}

export function clearAttempts(athleteId) {
  localStorage.removeItem(`${KEY}_${athleteId}`)
}
