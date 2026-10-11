import { afterEach, describe, expect, it, vi } from 'vitest'
import { playScanFeedback } from './scan-feedback'

afterEach(() => vi.restoreAllMocks())

describe('playScanFeedback', () => {
  it('vibrates with a longer pattern for an error than for a success', () => {
    const vibrate = vi.fn()
    Object.defineProperty(window.navigator, 'vibrate', { value: vibrate, configurable: true })
    playScanFeedback('success')
    playScanFeedback('error')
    expect(vibrate).toHaveBeenNthCalledWith(1, 40)
    expect(vibrate).toHaveBeenNthCalledWith(2, [120, 80, 120])
  })

  it('never throws when audio or vibration are unavailable or blocked', () => {
    Object.defineProperty(window.navigator, 'vibrate', {
      value: () => {
        throw new Error('blocked')
      },
      configurable: true,
    })
    expect(() => playScanFeedback('error')).not.toThrow()
  })
})
