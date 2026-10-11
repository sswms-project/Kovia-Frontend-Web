import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as feedback from '../../utils/scan-feedback'
import { resetScanPreferencesCache, setScanPreferences } from '../../utils/scan-preferences'
import { ScanInput } from './ScanInput'
import { ScanPreferencesBar } from './ScanPreferencesBar'

beforeEach(() => {
  window.localStorage.clear()
  resetScanPreferencesCache()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ScanInput feedback', () => {
  it('plays a success tone for an accepted scan and an error tone for a rejected one', async () => {
    const play = vi.spyOn(feedback, 'playScanFeedback').mockImplementation(() => undefined)
    const user = userEvent.setup()
    const onScan = vi.fn().mockReturnValueOnce(true).mockResolvedValueOnce(false)
    render(<ScanInput id="s" label="Quét" autoFocus onScan={onScan} />)

    await user.keyboard('A07{Enter}')
    await user.keyboard('B09{Enter}')

    expect(play).toHaveBeenNthCalledWith(1, 'success')
    expect(play).toHaveBeenNthCalledWith(2, 'error')
  })

  it('stays silent when the caller gives no result or feedback is turned off', async () => {
    const play = vi.spyOn(feedback, 'playScanFeedback').mockImplementation(() => undefined)
    const user = userEvent.setup()
    const onScan = vi.fn()
    render(<ScanInput id="s" label="Quét" autoFocus onScan={onScan} />)
    await user.keyboard('A07{Enter}')
    expect(play).not.toHaveBeenCalled()

    act(() => setScanPreferences({ feedback: false }))
    onScan.mockReturnValue(true)
    await user.keyboard('A07{Enter}')
    expect(play).not.toHaveBeenCalled()
  })
})

describe('ScanInput keyboard handling', () => {
  it('hides the on-screen keyboard only in scanner mode', () => {
    render(<ScanInput id="s" label="Quét" onScan={vi.fn()} />)
    expect(screen.getByLabelText('Quét')).not.toHaveAttribute('inputmode')
    act(() => setScanPreferences({ scannerMode: true }))
    expect(screen.getByLabelText('Quét')).toHaveAttribute('inputmode', 'none')
  })

  it('calls onEmptyEnter when Enter is pressed on an empty field', async () => {
    const user = userEvent.setup()
    const onEmptyEnter = vi.fn()
    const onScan = vi.fn()
    render(<ScanInput id="s" label="Quét" autoFocus onEmptyEnter={onEmptyEnter} onScan={onScan} />)
    await user.keyboard('{Enter}')
    expect(onEmptyEnter).toHaveBeenCalledTimes(1)
    expect(onScan).not.toHaveBeenCalled()
  })

  it('hides the camera button when the page cannot use the camera', () => {
    render(<ScanInput id="s" label="Quét" onScan={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /camera/i })).not.toBeInTheDocument()
  })
})

describe('ScanPreferencesBar', () => {
  it('toggles and remembers the preferences, with the per-unit mode only when requested', async () => {
    const user = userEvent.setup()
    const view = render(<ScanPreferencesBar />)
    expect(screen.queryByLabelText('Quét từng đơn vị')).not.toBeInTheDocument()
    await user.click(screen.getByLabelText('Dùng máy quét (ẩn bàn phím ảo)'))
    expect(screen.getByLabelText('Dùng máy quét (ẩn bàn phím ảo)')).toBeChecked()

    view.rerender(<ScanPreferencesBar showEachUnit />)
    await user.click(screen.getByLabelText('Quét từng đơn vị'))
    expect(
      JSON.parse(window.localStorage.getItem('kovia.transfer.scan-preferences') ?? '{}')
    ).toMatchObject({
      scannerMode: true,
      eachUnit: true,
    })
  })
})
