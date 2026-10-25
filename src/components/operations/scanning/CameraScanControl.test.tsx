import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCameraScanStore } from '@/stores/camera-scan.store'
import { resetScanPreferencesCache } from '@/lib/scan-preferences'
import { setScanPreferences } from '@/features/transfer/utils/scan-preferences'
import { CameraScanControl } from './CameraScanControl'

const { startCameraScan, isCameraScanSupported, stop, playScanFeedback, prepareScanFeedback } =
  vi.hoisted(() => ({
    startCameraScan: vi.fn(),
    isCameraScanSupported: vi.fn(),
    stop: vi.fn(),
    playScanFeedback: vi.fn(),
    prepareScanFeedback: vi.fn(),
  }))
vi.mock('@/lib/scan-feedback', () => ({ playScanFeedback, prepareScanFeedback }))
vi.mock('@/lib/camera-scan', async (original) => ({
  ...(await original<typeof import('@/lib/camera-scan')>()),
  startCameraScan,
  isCameraScanSupported,
}))
beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.removeItem('kovia.transfer.scan-preferences')
  resetScanPreferencesCache()
  isCameraScanSupported.mockReturnValue(true)
  startCameraScan.mockResolvedValue({ stop })
})
afterEach(() => {
  cleanup()
  useCameraScanStore.setState({ activeId: null })
  vi.restoreAllMocks()
})

async function start(label = 'Hàng nhận') {
  await userEvent.click(screen.getByRole('button', { name: `Bật camera: ${label}` }))
  await waitFor(() => expect(startCameraScan).toHaveBeenCalled())
  const decode: (code: string) => void = startCameraScan.mock.calls.at(-1)![1]
  return decode
}

describe('mobile-first shared camera', () => {
  it('unlocks sound on the camera button gesture before permission or decoding', async () => {
    render(<CameraScanControl label="Hàng nhận" disabled={false} onCode={() => true} />)
    expect(prepareScanFeedback).not.toHaveBeenCalled()
    await start()
    expect(prepareScanFeedback).toHaveBeenCalledOnce()
    expect(prepareScanFeedback.mock.invocationCallOrder[0]).toBeLessThan(
      startCameraScan.mock.invocationCallOrder[0]!
    )
    expect(playScanFeedback).not.toHaveBeenCalled()
  })

  it.each([true, false])(
    'plays the validation result %s rather than assuming every decoded barcode is correct',
    async (accepted) => {
      const validate = vi.fn(() => accepted)
      render(<CameraScanControl label="Hàng nhận" disabled={false} onCode={validate} />)
      const decode = await start()
      act(() => decode('CODE'))
      expect(validate).toHaveBeenCalledWith('CODE')
      expect(playScanFeedback).toHaveBeenCalledExactlyOnceWith(accepted ? 'success' : 'error')
      expect(validate.mock.invocationCallOrder[0]).toBeLessThan(
        playScanFeedback.mock.invocationCallOrder[0]!
      )
    }
  )

  it('respects the device sound preference and can turn it back on without reopening the camera', async () => {
    setScanPreferences({ feedback: false })
    render(<CameraScanControl label="Hàng nhận" disabled={false} onCode={() => true} />)
    const decode = await start()
    act(() => decode('MUTED'))
    expect(prepareScanFeedback).not.toHaveBeenCalled()
    expect(playScanFeedback).not.toHaveBeenCalled()
    act(() => setScanPreferences({ feedback: true }))
    act(() => decode('AUDIBLE'))
    expect(playScanFeedback).toHaveBeenCalledExactlyOnceWith('success')
  })
  it('requests no permission on mount and has a labelled full-width touch control', async () => {
    const onCode = vi.fn(() => true)
    render(<CameraScanControl label="Hàng nhận" disabled={false} onCode={onCode} />)
    expect(startCameraScan).not.toHaveBeenCalled()
    expect(screen.getByRole('button')).toHaveClass('h-11', 'w-full', 'touch-manipulation')
    const decode = await start()
    expect(startCameraScan.mock.calls[0]![3]).toEqual({
      continuous: true,
      repeatGuardMs: undefined,
    })
    act(() => decode('893001'))
    expect(onCode).toHaveBeenCalledExactlyOnceWith('893001')
    await userEvent.click(screen.getByRole('button', { name: 'Tắt camera: Hàng nhận' }))
    expect(stop).toHaveBeenCalled()
    act(() => decode('LATE'))
    expect(onCode).toHaveBeenCalledTimes(1)
    expect(playScanFeedback).toHaveBeenCalledExactlyOnceWith('success')
  })

  it('switches camera ownership between inputs and ignores the old decoder', async () => {
    const first = vi.fn(() => true)
    const second = vi.fn(() => true)
    render(
      <>
        <CameraScanControl label="Hàng nhận" disabled={false} onCode={first} />
        <CameraScanControl label="Vị trí" disabled={false} onCode={second} />
      </>
    )
    const oldDecode = await start()
    const nextDecode = await start('Vị trí')
    expect(screen.getAllByLabelText('Hình ảnh từ camera')).toHaveLength(1)
    expect(stop).toHaveBeenCalled()
    act(() => {
      oldDecode('OLD')
      nextDecode('A01')
    })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledExactlyOnceWith('A01')
    expect(playScanFeedback).toHaveBeenCalledExactlyOnceWith('success')
  })

  it('keeps single-scan camera open for invalid codes, closes only after acceptance', async () => {
    const onCode = vi.fn((code: string) => code === 'A01')
    render(<CameraScanControl label="Hàng nhận" disabled={false} mode="single" onCode={onCode} />)
    const decode = await start()
    act(() => decode('WRONG'))
    expect(screen.getByLabelText('Hình ảnh từ camera')).toBeInTheDocument()
    act(() => {
      decode('A01')
      decode('DUPLICATE')
    })
    expect(onCode.mock.calls.map(([code]) => code)).toEqual(['WRONG', 'A01'])
    expect(playScanFeedback.mock.calls.map(([kind]) => kind)).toEqual(['error', 'success'])
    expect(screen.queryByLabelText('Hình ảnh từ camera')).not.toBeInTheDocument()
    expect(stop).toHaveBeenCalled()
  })

  it('stops on pending save and never automatically reacquires after unlocking', async () => {
    const onCode = vi.fn(() => true)
    const view = render(<CameraScanControl label="Hàng nhận" disabled={false} onCode={onCode} />)
    const decode = await start()
    view.rerender(<CameraScanControl label="Hàng nhận" disabled onCode={onCode} />)
    act(() => decode('LATE'))
    expect(onCode).not.toHaveBeenCalled()
    expect(playScanFeedback).not.toHaveBeenCalled()
    expect(stop).toHaveBeenCalled()
    view.rerender(<CameraScanControl label="Hàng nhận" disabled={false} onCode={onCode} />)
    expect(startCameraScan).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button')).toHaveTextContent('Quét bằng camera')
  })

  it.each(['denied', 'no-camera'])(
    'explains %s and permits retry with the video mounted',
    async (failure) => {
      startCameraScan.mockImplementationOnce(async (_video, _code, onError) => {
        onError(failure)
        return { stop }
      })
      render(<CameraScanControl label="Hàng nhận" disabled={false} onCode={() => true} />)
      await start()
      expect(screen.getByRole('alert')).toHaveTextContent(
        failure === 'denied' ? 'chưa cho phép' : 'Không tìm thấy camera'
      )
      await userEvent.click(screen.getByRole('button', { name: 'Thử lại camera' }))
      await waitFor(() => expect(startCameraScan).toHaveBeenCalledTimes(2))
      expect(startCameraScan.mock.calls[1]![0]).toBeInstanceOf(HTMLVideoElement)
      expect(stop).toHaveBeenCalled()
    }
  )

  it('releases a stream granted after unmount', async () => {
    let acquired: ((handle: { stop: () => void }) => void) | undefined
    startCameraScan.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          acquired = resolve
        })
    )
    const view = render(
      <CameraScanControl label="Hàng nhận" disabled={false} onCode={() => true} />
    )
    await start()
    view.unmount()
    await act(async () => acquired?.({ stop }))
    expect(stop).toHaveBeenCalledExactlyOnceWith()
  })

  it('stops when the tab is hidden', async () => {
    render(<CameraScanControl label="Hàng nhận" disabled={false} onCode={() => true} />)
    await start()
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(stop).toHaveBeenCalled()
    expect(screen.queryByLabelText('Hình ảnh từ camera')).not.toBeInTheDocument()
  })

  it.each([false, true])(
    'shows an actionable fallback when secure=%s but unavailable',
    (secure) => {
      Object.defineProperty(window, 'isSecureContext', { value: secure, configurable: true })
      isCameraScanSupported.mockReturnValue(false)
      render(<CameraScanControl label="Hàng nhận" disabled={false} onCode={() => true} />)
      expect(screen.getByRole('button')).toBeDisabled()
      expect(screen.getByRole('status')).toHaveTextContent(secure ? 'không hỗ trợ' : 'HTTPS')
      expect(startCameraScan).not.toHaveBeenCalled()
    }
  )
})
