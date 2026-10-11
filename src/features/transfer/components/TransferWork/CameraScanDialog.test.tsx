import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CameraScanDialog } from './CameraScanDialog'

const startCameraScan = vi.fn()
vi.mock('../../utils/camera-scan', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/camera-scan')>()),
  startCameraScan: (...args: unknown[]) => startCameraScan(...args),
}))

afterEach(() => {
  cleanup()
  startCameraScan.mockReset()
})

describe('CameraScanDialog', () => {
  it('returns the decoded code and closes itself', async () => {
    const stop = vi.fn()
    startCameraScan.mockImplementation(async (_video, onCode) => {
      onCode('A07')
      return { stop }
    })
    const onDecoded = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <CameraScanDialog
        open
        title="Quét mã vị trí"
        onOpenChange={onOpenChange}
        onDecoded={onDecoded}
      />
    )

    await waitFor(() => expect(onDecoded).toHaveBeenCalledExactlyOnceWith('A07'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('explains why the camera cannot be used', async () => {
    startCameraScan.mockImplementation(async (_video, _onCode, onError) => {
      onError('denied')
      return { stop: vi.fn() }
    })
    render(
      <CameraScanDialog open title="Quét mã vị trí" onOpenChange={vi.fn()} onDecoded={vi.fn()} />
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('chưa cho phép dùng camera')
  })

  it('stops the camera when the dialog is closed', async () => {
    const stop = vi.fn()
    startCameraScan.mockResolvedValue({ stop })
    const view = render(
      <CameraScanDialog open title="Quét" onOpenChange={vi.fn()} onDecoded={vi.fn()} />
    )
    await waitFor(() => expect(startCameraScan).toHaveBeenCalled())
    await waitFor(() => expect(startCameraScan.mock.results[0]?.value).toBeDefined())
    view.unmount()
    await waitFor(() => expect(stop).toHaveBeenCalled())
  })
})
