import { vi } from 'vitest'

// Mock firebase module so the env-var guard doesn't fire during import
vi.mock('../../firebase', () => ({ db: {} }))

// Also mock firebase/firestore so Firestore SDK imports resolve cleanly
vi.mock('firebase/firestore', () => ({}))

import { buildWeekGrid } from '../checkins'

// buildWeekGrid is a pure function — no Firestore needed
describe('buildWeekGrid', () => {
  it('maps checkins to a set of date strings', () => {
    const checkins = [
      { date: '2026-06-01' },
      { date: '2026-06-03' },
    ]
    const grid = buildWeekGrid(checkins, '2026-06-01', '2026-06-07')
    expect(grid.has('2026-06-01')).toBe(true)
    expect(grid.has('2026-06-03')).toBe(true)
    expect(grid.has('2026-06-02')).toBe(false)
  })

  it('returns empty set for no checkins', () => {
    const grid = buildWeekGrid([], '2026-06-01', '2026-06-07')
    expect(grid.size).toBe(0)
  })
})
