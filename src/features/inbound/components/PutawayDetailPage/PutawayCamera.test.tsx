import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PutawaySlotCodeConfirm } from './PutawaySlotCodeConfirm'
import { PutawayScanBar } from './PutawayScanBar'

const { startCameraScan, stop } = vi.hoisted(() => ({ startCameraScan: vi.fn(), stop: vi.fn() }))
vi.mock('@/lib/camera-scan', async (original) => ({
  ...(await original<typeof import('@/lib/camera-scan')>()),
  startCameraScan,
  isCameraScanSupported: () => true,
}))
beforeEach(() => {
  vi.clearAllMocks()
  startCameraScan.mockResolvedValue({ stop })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const slots = [
  { id: 'a', code: 'A01', scanCodes: ['Z-A01', 'KOVIA:LOC:RACK:rack-a'] },
  { id: 'b', code: 'B01' },
]
function ScanForm({ onSubmit }: { readonly onSubmit: () => void }) {
  const [confirmed, setConfirmed] = useState<string>()
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <PutawayScanBar
        slots={slots}
        lines={[{ index: 0, slotId: 'a', confirmedSlotCode: confirmed }]}
        state={{
          requiredCount: 1,
          confirmedCount: confirmed ? 1 : 0,
          skipRequested: false,
          onSkip: vi.fn(),
        }}
        disabled={false}
        onConfirm={(_index, code) => setConfirmed(code)}
      />
      <output aria-label="Mã gửi BE">{confirmed}</output>
    </form>
  )
}

describe('inbound putaway camera routing', () => {
  it.each([false, true])('focuses manual input only for a fine pointer (fine=%s)', async (fine) => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: fine }))
    )
    render(
      <PutawaySlotCodeConfirm
        id="row-focus"
        slots={slots}
        slotId="a"
        confirmedCode={undefined}
        disabled={false}
        onConfirm={vi.fn()}
        onClear={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Quét mã vị trí' }))
    const input = screen.getByRole('textbox')
    if (fine) expect(input).toHaveFocus()
    else expect(input).not.toHaveFocus()
  })
  it('validates destination and retains raw QR evidence without submitting; stops when complete', async () => {
    const onSubmit = vi.fn()
    render(<ScanForm onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Bật camera: Vị trí cất hàng' }))
    await waitFor(() => expect(startCameraScan).toHaveBeenCalledTimes(1))
    const decode = startCameraScan.mock.calls[0]![1]
    act(() => decode('B01'))
    expect(screen.getByRole('alert')).toHaveTextContent('không nằm trong phân bổ')
    act(() => decode('__SYSTEM_DEFAULT__'))
    expect(screen.getByLabelText('Mã gửi BE')).toHaveTextContent('')
    act(() => decode('KOVIA:LOC:RACK:rack-a'))
    expect(screen.getByLabelText('Mã gửi BE')).toHaveTextContent('KOVIA:LOC:RACK:rack-a')
    expect(stop).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Bật camera: Vị trí cất hàng' })).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('uses the selected-row resolver for both manual and camera codes', async () => {
    const onConfirm = vi.fn()
    render(
      <PutawaySlotCodeConfirm
        id="row"
        slots={slots}
        slotId="a"
        confirmedCode={undefined}
        disabled={false}
        onConfirm={onConfirm}
        onClear={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Quét mã vị trí' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Bật camera: Mã vị trí của dòng cất' })
    )
    await waitFor(() => expect(startCameraScan).toHaveBeenCalledTimes(1))
    const decode = startCameraScan.mock.calls[0]![1]
    act(() => decode('B01'))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('không phải vị trí đang chọn')
    act(() => decode('Z-A01'))
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith('a', 'Z-A01')
    expect(stop).toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Quét mã vị trí' }))
    await userEvent.type(screen.getByRole('textbox'), 'A01{Enter}')
    expect(onConfirm).toHaveBeenLastCalledWith('a', 'A01')
  })

  it('releases a row camera when its destination changes and rejects callbacks from the old row', async () => {
    const onConfirm = vi.fn()
    const view = render(
      <PutawaySlotCodeConfirm
        id="row"
        slots={slots}
        slotId="a"
        confirmedCode={undefined}
        disabled={false}
        onConfirm={onConfirm}
        onClear={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Quét mã vị trí' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Bật camera: Mã vị trí của dòng cất' })
    )
    await waitFor(() => expect(startCameraScan).toHaveBeenCalledTimes(1))
    const decode = startCameraScan.mock.calls[0]![1]
    view.rerender(
      <PutawaySlotCodeConfirm
        id="row"
        slots={slots}
        slotId="b"
        confirmedCode={undefined}
        disabled={false}
        onConfirm={onConfirm}
        onClear={vi.fn()}
      />
    )
    act(() => decode('A01'))
    expect(stop).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
