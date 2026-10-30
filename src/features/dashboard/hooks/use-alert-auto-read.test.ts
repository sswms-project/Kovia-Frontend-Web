import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { speak } from '@/lib/speech'
import { resetAnnouncedAlerts, useAlertAutoRead } from './use-alert-auto-read'

vi.mock('@/lib/speech', () => ({ speak: vi.fn(() => true) }))

const urgent = { belowMinimum: 3, expiring: 1 }
const calm = { belowMinimum: 0, expiring: 2 }

function render(overrides: Partial<Parameters<typeof useAlertAutoRead>[0]> = {}) {
  return renderHook((props) => useAlertAutoRead(props), {
    initialProps: {
      enabled: true,
      available: true,
      scopeKey: 'wh-1',
      counts: urgent,
      ...overrides,
    },
  })
}

describe('useAlertAutoRead', () => {
  beforeEach(() => {
    vi.mocked(speak).mockClear()
    resetAnnouncedAlerts()
  })

  it('reads immediately once when the browser allows it', () => {
    const { rerender } = render()
    expect(speak).toHaveBeenCalledTimes(1)
    rerender({ enabled: true, available: true, scopeKey: 'wh-1', counts: { ...urgent } })
    expect(speak).toHaveBeenCalledTimes(1)
  })

  it('retries on the first gesture when the browser blocks speech', () => {
    vi.mocked(speak).mockImplementationOnce((_text, onBlocked) => {
      onBlocked?.()
      return true
    })
    render()
    expect(speak).toHaveBeenCalledTimes(1)
    act(() => {
      window.dispatchEvent(new Event('pointerdown'))
    })
    expect(speak).toHaveBeenCalledTimes(2)
    act(() => {
      window.dispatchEvent(new Event('keydown'))
    })
    expect(speak).toHaveBeenCalledTimes(2)
  })

  it('stays silent when disabled, unavailable, or not urgent', () => {
    render({ enabled: false })
    render({ available: false })
    render({ counts: calm, scopeKey: 'wh-2' })
    expect(speak).not.toHaveBeenCalled()
  })
})
