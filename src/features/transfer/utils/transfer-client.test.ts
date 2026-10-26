import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('Transfer tab identity', () => {
  it('stays stable per tab and supports warehouse scanners on insecure HTTP', async () => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(7) })
    const { getTransferClientId, transferWriteConfig } = await import('./transfer-client')
    const id = getTransferClientId()
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(getTransferClientId()).toBe(id)
    expect(transferWriteConfig()).toEqual({ headers: { 'X-Transfer-Client-Id': id } })
  })

  it('does not allocate or share a client identity during SSR', async () => {
    vi.stubGlobal('window', undefined)
    const { getTransferClientId, transferWriteConfig } = await import('./transfer-client')
    expect(getTransferClientId()).toBeUndefined()
    expect(transferWriteConfig()).toBeUndefined()
  })
})
