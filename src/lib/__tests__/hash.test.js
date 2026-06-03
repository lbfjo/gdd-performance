import { hashPin } from '../hash'

describe('hashPin', () => {
  it('returns a 64-char hex string for a 4-digit PIN', async () => {
    const result = await hashPin('1234')
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic — same PIN produces same hash', async () => {
    const a = await hashPin('5678')
    const b = await hashPin('5678')
    expect(a).toBe(b)
  })

  it('produces different hashes for different PINs', async () => {
    const a = await hashPin('1234')
    const b = await hashPin('1235')
    expect(a).not.toBe(b)
  })
})
