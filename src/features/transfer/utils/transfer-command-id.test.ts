import { afterEach, describe, expect, it, vi } from 'vitest'
import { newCommandId } from './transfer-command-id'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => vi.unstubAllGlobals())

describe('newCommandId', () => {
  it('returns a different valid UUID each time', () => {
    const first = newCommandId()
    expect(first).toMatch(UUID)
    expect(newCommandId()).not.toBe(first)
  })

  it('still works on an insecure page where crypto.randomUUID is missing', () => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(7) })
    expect(newCommandId()).toMatch(UUID)
  })

  it('falls back to Math.random when no crypto exists', () => {
    vi.stubGlobal('crypto', undefined)
    expect(newCommandId()).toMatch(UUID)
  })
})
