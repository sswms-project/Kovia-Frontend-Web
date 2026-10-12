import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  REPEAT_GUARD_MS,
  describeCameraFailure,
  isCameraScanSupported,
  startCameraScan,
} from './camera-scan'

function setSecureContext(value: boolean) {
  Object.defineProperty(window, 'isSecureContext', { value, configurable: true })
}

beforeEach(() => {
  // jsdom không phải secure context; camera chỉ chạy trên HTTPS/localhost nên test bật lại.
  setSecureContext(true)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.doUnmock('@zxing/browser')
})

describe('describeCameraFailure', () => {
  it('maps browser errors to a message the user can act on', () => {
    expect(describeCameraFailure(Object.assign(new Error('x'), { name: 'NotAllowedError' }))).toBe(
      'denied'
    )
    expect(describeCameraFailure(Object.assign(new Error('x'), { name: 'NotFoundError' }))).toBe(
      'no-camera'
    )
    expect(describeCameraFailure(new Error('boom'))).toBe('unknown')
  })

  it('reports an insecure page before anything else', () => {
    setSecureContext(false)
    expect(describeCameraFailure(new Error('x'))).toBe('insecure')
    expect(isCameraScanSupported()).toBe(false)
  })
})

describe('startCameraScan', () => {
  it('delivers the first decoded code once, trimmed, and stops the camera', async () => {
    const stop = vi.fn()
    let report: ((result: { getText: () => string } | undefined) => void) | undefined
    vi.doMock('@zxing/browser', () => ({
      BrowserMultiFormatReader: class {
        async decodeFromConstraints(
          _constraints: unknown,
          _video: unknown,
          callback: typeof report
        ) {
          report = callback
          return { stop }
        }
      },
    }))
    const onCode = vi.fn()
    const onError = vi.fn()
    await startCameraScan(document.createElement('video'), onCode, onError)

    report?.(undefined)
    report?.({ getText: () => '  A07 ' })
    report?.({ getText: () => 'B09' })

    expect(onCode).toHaveBeenCalledExactlyOnceWith('A07')
    expect(stop).toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('reports a failure instead of throwing when the camera cannot be opened', async () => {
    vi.doMock('@zxing/browser', () => ({
      BrowserMultiFormatReader: class {
        async decodeFromConstraints() {
          throw Object.assign(new Error('denied'), { name: 'NotAllowedError' })
        }
      },
    }))
    const onError = vi.fn()
    await startCameraScan(document.createElement('video'), vi.fn(), onError)
    expect(onError).toHaveBeenCalledWith('denied')
  })

  it('keeps scanning in continuous mode and ignores the same code held in front of the camera', async () => {
    vi.useFakeTimers()
    const stop = vi.fn()
    let report: ((result: { getText: () => string } | undefined) => void) | undefined
    vi.doMock('@zxing/browser', () => ({
      BrowserMultiFormatReader: class {
        async decodeFromConstraints(
          _constraints: unknown,
          _video: unknown,
          callback: typeof report
        ) {
          report = callback
          return { stop }
        }
      },
    }))
    const onCode = vi.fn()
    const handle = await startCameraScan(document.createElement('video'), onCode, vi.fn(), {
      continuous: true,
    })

    report?.({ getText: () => 'A07' })
    vi.advanceTimersByTime(300)
    report?.({ getText: () => 'A07' })
    vi.advanceTimersByTime(300)
    report?.({ getText: () => 'B09' })
    vi.advanceTimersByTime(REPEAT_GUARD_MS + 100)
    report?.({ getText: () => 'B09' })

    expect(onCode.mock.calls.map(([code]) => code)).toEqual(['A07', 'B09', 'B09'])
    expect(stop).not.toHaveBeenCalled()
    handle.stop()
    expect(stop).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
