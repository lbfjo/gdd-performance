import { getLocalDate, getWeekBounds, formatDay, getPreviousWeekBounds } from '../dates'

describe('getLocalDate', () => {
  it('returns YYYY-MM-DD string in Europe/Lisbon timezone', () => {
    // Create a UTC timestamp at midnight UTC on 3 Jun 2026
    // Europe/Lisbon (UTC+1 in summer) → should return 2026-06-03
    const ts = new Date('2026-06-03T00:30:00Z')
    expect(getLocalDate(ts)).toBe('2026-06-03')
  })
})

describe('getWeekBounds', () => {
  it('returns Monday as start and Sunday as end for a mid-week date', () => {
    const { start, end } = getWeekBounds('2026-06-03') // Wednesday
    expect(start).toBe('2026-06-01') // Monday
    expect(end).toBe('2026-06-07')   // Sunday
  })

  it('returns the same week when given Monday', () => {
    const { start, end } = getWeekBounds('2026-06-01') // Monday
    expect(start).toBe('2026-06-01')
    expect(end).toBe('2026-06-07')
  })

  it('returns the same week when given Sunday', () => {
    const { start, end } = getWeekBounds('2026-06-07') // Sunday
    expect(start).toBe('2026-06-01')
    expect(end).toBe('2026-06-07')
  })
})

describe('formatDay', () => {
  it('formats a YYYY-MM-DD date to short day name', () => {
    expect(formatDay('2026-06-01')).toBe('Mon')
    expect(formatDay('2026-06-07')).toBe('Sun')
  })
})

describe('getPreviousWeekBounds', () => {
  it('returns the previous ISO week bounds for a mid-week date', () => {
    const { start, end } = getPreviousWeekBounds('2026-06-03') // Wednesday of week Jun 1-7
    expect(start).toBe('2026-05-25') // previous Monday
    expect(end).toBe('2026-05-31')   // previous Sunday
  })
})
