import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CameraScanPanel } from './CameraScanPanel'

const { startCameraScan, isCameraScanSupported, stop } = vi.hoisted(() => ({
  startCameraScan: vi.fn(),
  isCameraScanSupported: vi.fn(),
  stop: vi.fn(),
}))
vi.mock('@/lib/camera-scan', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/camera-scan')>()),
  startCameraScan,
  isCameraScanSupported,
}))
vi.mock('../../utils/scan-feedback', () => ({ playScanFeedback: vi.fn() }))

function TestPanel(props: Partial<ComponentProps<typeof CameraScanPanel>>) {
  const [open, setOpen] = useState(false)
  return (
    <CameraScanPanel
      label="Quét mã vị trí"
      open={open}
      onOpenChange={setOpen}
      onCode={vi.fn()}
      {...props}
    />
  )
}
async function start() {
  await userEvent.click(screen.getByRole('button', { name: /Bật camera quét:/ }))
  await waitFor(() => expect(startCameraScan).toHaveBeenCalledTimes(1))
}
beforeEach(() => {
  vi.clearAllMocks()
  isCameraScanSupported.mockReturnValue(true)
  startCameraScan.mockResolvedValue({ stop })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('mobile transfer camera surface', () => {
  it('keeps a visible frame and full-width start control without acquiring a camera on mount', async () => {
    render(<TestPanel />)
    expect(screen.getByText('Khung quét mã QR / mã vạch')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bật camera/ })).toHaveClass('h-11', 'w-full')
    expect(startCameraScan).not.toHaveBeenCalled()
    await start()
    expect(screen.getByText(/Đang mở camera/)).toBeInTheDocument()
    fireEvent.playing(screen.getByLabelText('Hình ảnh từ camera'))
    expect(screen.queryByText(/Đang mở camera/)).not.toBeInTheDocument()
  })

  it.each([false, true])(
    'explains unavailable camera on secure=%s without hiding the surface',
    (secure) => {
      Object.defineProperty(window, 'isSecureContext', { value: secure, configurable: true })
      isCameraScanSupported.mockReturnValue(false)
      render(<TestPanel />)
      expect(screen.getByRole('status', { name: 'Trạng thái camera' })).toHaveTextContent(
        secure ? 'không hỗ trợ' : 'HTTPS'
      )
      expect(screen.getByRole('button', { name: /Bật camera/ })).toBeDisabled()
      expect(screen.getByText('Khung quét mã QR / mã vạch')).toBeInTheDocument()
      expect(startCameraScan).not.toHaveBeenCalled()
    }
  )

  it('retries a denied camera with a mounted video and stops the prior session', async () => {
    startCameraScan.mockImplementationOnce(async (_video, _code, onError) => {
      onError('denied')
      return { stop }
    })
    render(<TestPanel />)
    await start()
    expect(await screen.findByRole('alert')).toHaveTextContent('chưa cho phép')
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại camera' }))
    await waitFor(() => expect(startCameraScan).toHaveBeenCalledTimes(2))
    expect(startCameraScan.mock.calls[1]?.[0]).toBeInstanceOf(HTMLVideoElement)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(stop).toHaveBeenCalled()
  })

  it('serializes async code validation and ignores camera callbacks after stopping', async () => {
    let finish: ((valid: boolean) => void) | undefined
    const onCode = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve
        })
    )
    render(<TestPanel onCode={onCode} />)
    await start()
    const decode = startCameraScan.mock.calls[0]?.[1]
    act(() => {
      decode('A01')
      decode('A02')
    })
    expect(onCode).toHaveBeenCalledExactlyOnceWith('A01')
    await act(async () => finish?.(true))
    await userEvent.click(screen.getByRole('button', { name: /Tắt camera/ }))
    act(() => decode('LATE'))
    expect(onCode).toHaveBeenCalledTimes(1)
    expect(stop).toHaveBeenCalled()
  })

  it('releases the camera during a pending write, retaining the frame and a usable stop button', async () => {
    const view = render(<TestPanel />)
    await start()
    view.rerender(<TestPanel disabled />)
    expect(screen.queryByLabelText('Hình ảnh từ camera')).not.toBeInTheDocument()
    expect(screen.getByText('Camera tạm dừng')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tắt camera/ })).toBeEnabled()
    expect(stop).toHaveBeenCalled()
  })

  it('releases a camera acquired after the user has already stopped it', async () => {
    let acquired: ((handle: { stop: () => void }) => void) | undefined
    startCameraScan.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          acquired = resolve
        })
    )
    render(<TestPanel />)
    await start()
    await userEvent.click(screen.getByRole('button', { name: /Tắt camera/ }))
    await act(async () => acquired?.({ stop }))
    expect(stop).toHaveBeenCalledExactlyOnceWith()
  })
})
