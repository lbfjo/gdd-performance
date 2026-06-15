import {
  buildNutritionSlotTimes,
  isNutritionSlotPast,
  nutritionSlotId,
} from '../nutritionSlots'

describe('buildNutritionSlotTimes', () => {
  it('creates 15-minute slots without including the end time', () => {
    expect(buildNutritionSlotTimes('18:00', '19:00')).toEqual([
      '18:00',
      '18:15',
      '18:30',
      '18:45',
    ])
  })

  it('supports a custom interval', () => {
    expect(buildNutritionSlotTimes('11:15', '12:15', 30)).toEqual([
      '11:15',
      '11:45',
    ])
  })

  it('returns no slots for an invalid range', () => {
    expect(buildNutritionSlotTimes('18:00', '18:00')).toEqual([])
    expect(buildNutritionSlotTimes('19:00', '18:00')).toEqual([])
  })
})

describe('nutritionSlotId', () => {
  it('creates a stable id from date and time', () => {
    expect(nutritionSlotId('2026-06-16', '18:15')).toBe('2026-06-16_1815')
  })
})

describe('isNutritionSlotPast', () => {
  it('uses Lisbon time to identify past slots', () => {
    const now = new Date('2026-06-16T17:30:00Z') // 18:30 Lisbon
    expect(isNutritionSlotPast({ date: '2026-06-16', time: '18:15' }, now)).toBe(true)
    expect(isNutritionSlotPast({ date: '2026-06-16', time: '18:45' }, now)).toBe(false)
  })
})
