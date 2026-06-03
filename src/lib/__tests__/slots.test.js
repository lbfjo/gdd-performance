import { isWeekday, getActiveSlot, isSlotBookable, SLOTS, SLOT_ORDER } from '../slots'

describe('isWeekday', () => {
  it('returns true for Monday 2026-06-01', () => expect(isWeekday('2026-06-01')).toBe(true))
  it('returns true for Friday 2026-06-05', () => expect(isWeekday('2026-06-05')).toBe(true))
  it('returns false for Saturday 2026-06-06', () => expect(isWeekday('2026-06-06')).toBe(false))
  it('returns false for Sunday 2026-06-07', () => expect(isWeekday('2026-06-07')).toBe(false))
})

describe('getActiveSlot', () => {
  // Lisbon summer = UTC+1
  it('returns morning at 07:30 Lisbon (06:30 UTC)', () => {
    expect(getActiveSlot(new Date('2026-06-03T06:30:00Z'))).toBe('morning')
  })
  it('returns null at 10:00 Lisbon (09:00 UTC) — between slots', () => {
    expect(getActiveSlot(new Date('2026-06-03T09:00:00Z'))).toBe(null)
  })
  it('returns lunch at 13:00 Lisbon (12:00 UTC)', () => {
    expect(getActiveSlot(new Date('2026-06-03T12:00:00Z'))).toBe('lunch')
  })
  it('returns null at 15:00 Lisbon (14:00 UTC) — after lunch', () => {
    expect(getActiveSlot(new Date('2026-06-03T14:00:00Z'))).toBe(null)
  })
  it('returns evening at 19:00 Lisbon (18:00 UTC)', () => {
    expect(getActiveSlot(new Date('2026-06-03T18:00:00Z'))).toBe('evening')
  })
  it('returns null after 20:00 Lisbon (19:00 UTC)', () => {
    expect(getActiveSlot(new Date('2026-06-03T19:00:00Z'))).toBe(null)
  })
})

describe('isSlotBookable', () => {
  it('returns false for Saturday', () => {
    expect(isSlotBookable('morning', '2026-06-06', new Date('2026-06-06T06:00:00Z'))).toBe(false)
  })
  it('returns false for past day', () => {
    expect(isSlotBookable('morning', '2026-06-01', new Date('2026-06-03T08:00:00Z'))).toBe(false)
  })
  it('returns false for same-day slot already started (morning after 07:00 Lisbon)', () => {
    // 06:30 UTC = 07:30 Lisbon — after 07:00 start
    expect(isSlotBookable('morning', '2026-06-03', new Date('2026-06-03T06:30:00Z'))).toBe(false)
  })
  it('returns true for same-day slot not yet started (lunch before 12:00 Lisbon)', () => {
    // 08:00 UTC = 09:00 Lisbon — before 12:00 lunch start
    expect(isSlotBookable('lunch', '2026-06-03', new Date('2026-06-03T08:00:00Z'))).toBe(true)
  })
  it('returns true for any slot on future weekday', () => {
    expect(isSlotBookable('morning', '2026-06-04', new Date('2026-06-03T23:00:00Z'))).toBe(true)
  })
  it('returns false for unknown slot key', () => {
    expect(isSlotBookable('unknown', '2026-06-03', new Date('2026-06-03T08:00:00Z'))).toBe(false)
  })
})

describe('SLOTS and SLOT_ORDER', () => {
  it('SLOT_ORDER has 3 entries in correct order', () => {
    expect(SLOT_ORDER).toEqual(['morning', 'lunch', 'evening'])
  })
  it('each slot has key, label, start, end', () => {
    for (const key of SLOT_ORDER) {
      expect(SLOTS[key]).toMatchObject({ key, label: expect.any(String), start: expect.any(String), end: expect.any(String) })
    }
  })
})
