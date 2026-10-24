import { afterEach, describe, expect, it, vi } from 'vitest'
import { playScanFeedback } from './scan-feedback'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function mockAudio(initialState = 'suspended') {
  const start = vi.fn()
  const oscillator = { type: '', frequency: { value: 0 }, connect: vi.fn(), start, stop: vi.fn() }
  const gain = {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  }
  oscillator.connect.mockReturnValue(gain)
  const context = {
    state: initialState,
    currentTime: 0,
    destination: {},
    resume: vi.fn(async () => {
      context.state = 'running'
    }),
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gain),
  }
  const construct = vi.fn()
  vi.stubGlobal(
    'AudioContext',
    class {
      constructor() {
        construct()
        return context
      }
    }
  )
  return { context, construct, start }
}

describe('playScanFeedback', () => {
  it('unlocks audio during a user action without a false success tone, then reuses it', async () => {
    vi.resetModules()
    const { prepareScanFeedback, playScanFeedback } = await import('./scan-feedback')
    const { context, construct, start } = mockAudio()
    prepareScanFeedback()
    expect(context.resume).toHaveBeenCalledOnce()
    expect(start).not.toHaveBeenCalled()
    playScanFeedback('success')
    await vi.waitFor(() => expect(start).toHaveBeenCalledOnce())
    expect(construct).toHaveBeenCalledOnce()
  })

  it('waits for audio resume before scheduling a decoded success tone', async () => {
    vi.resetModules()
    const { playScanFeedback } = await import('./scan-feedback')
    const { context, start } = mockAudio()
    let resume: (() => void) | undefined
    context.resume.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resume = () => {
            context.state = 'running'
            resolve()
          }
        })
    )
    playScanFeedback('success')
    expect(start).not.toHaveBeenCalled()
    resume?.()
    await vi.waitFor(() => expect(start).toHaveBeenCalledOnce())
  })

  it('contains asynchronous audio denial and still provides vibration', async () => {
    vi.resetModules()
    const { prepareScanFeedback, playScanFeedback } = await import('./scan-feedback')
    const { context, start } = mockAudio()
    context.resume.mockRejectedValue(new Error('autoplay blocked'))
    const vibrate = vi.fn()
    Object.defineProperty(window.navigator, 'vibrate', { value: vibrate, configurable: true })
    prepareScanFeedback()
    playScanFeedback('error')
    await Promise.resolve()
    await Promise.resolve()
    expect(start).not.toHaveBeenCalled()
    expect(vibrate).toHaveBeenCalledWith([120, 80, 120])
  })

  it('recreates a closed context when starting a new scan session', async () => {
    vi.resetModules()
    const { prepareScanFeedback } = await import('./scan-feedback')
    const { context, construct } = mockAudio('running')
    prepareScanFeedback()
    context.state = 'closed'
    prepareScanFeedback()
    expect(construct).toHaveBeenCalledTimes(2)
  })

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
