import { recordFailedAttempt, isLockedOut, getRemainingSeconds, clearAttempts } from '../rateLimit'

describe('PIN rate limiter', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('isLockedOut returns false with no attempts', () => {
    expect(isLockedOut('a1')).toBe(false)
  })

  it('isLockedOut returns false after fewer than 5 attempts', () => {
    for (let i = 0; i < 4; i++) recordFailedAttempt('a1')
    expect(isLockedOut('a1')).toBe(false)
  })

  it('isLockedOut returns true after 5 attempts', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('a1')
    expect(isLockedOut('a1')).toBe(true)
  })

  it('clearAttempts removes lockout', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('a1')
    clearAttempts('a1')
    expect(isLockedOut('a1')).toBe(false)
  })

  it('getRemainingSeconds returns >0 when locked', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('a1')
    expect(getRemainingSeconds('a1')).toBeGreaterThan(0)
  })
})
