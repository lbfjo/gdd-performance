import { enqueueCheckin, getPendingQueue, clearQueue, removeFromQueue } from '../offline'

describe('offline check-in queue', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('enqueueCheckin adds item to queue', () => {
    enqueueCheckin({ athleteId: 'a1', athleteName: 'Duarte Diniz', date: '2026-06-03' })
    const q = getPendingQueue()
    expect(q).toHaveLength(1)
    expect(q[0].athleteId).toBe('a1')
    expect(q[0].id).toBeDefined()
  })

  it('getPendingQueue returns empty array when nothing queued', () => {
    expect(getPendingQueue()).toEqual([])
  })

  it('removeFromQueue removes the correct item by id', () => {
    enqueueCheckin({ athleteId: 'a1', athleteName: 'A', date: '2026-06-03' })
    enqueueCheckin({ athleteId: 'a2', athleteName: 'B', date: '2026-06-03' })
    const q = getPendingQueue()
    removeFromQueue(q[0].id)
    expect(getPendingQueue()).toHaveLength(1)
    expect(getPendingQueue()[0].athleteId).toBe('a2')
  })

  it('clearQueue empties the queue', () => {
    enqueueCheckin({ athleteId: 'a1', athleteName: 'A', date: '2026-06-03' })
    clearQueue()
    expect(getPendingQueue()).toEqual([])
  })
})
