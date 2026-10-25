import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { WarehousePendingPlacementDialog } from './WarehousePendingPlacementDialog'

const geometry = { x: 20, y: 40, width: 120, height: 40, rotation: 0, zIndex: 1 }

it('keeps manual input after a refused placement and submits by keyboard without saving automatically', async () => {
  const user = userEvent.setup()
  const onPlace = vi
    .fn()
    .mockReturnValueOnce('Kệ đang chồng lên một kệ hiện có.')
    .mockReturnValue(null)
  const onClose = vi.fn()
  render(
    <WarehousePendingPlacementDialog
      initialGeometry={geometry}
      label="Khu K01 → Kệ A04"
      disabled={false}
      onPlace={onPlace}
      onClose={onClose}
    />
  )
  await user.clear(screen.getByLabelText('Vị trí ngang (X)'))
  await user.type(screen.getByLabelText('Vị trí ngang (X)'), '0')
  await user.clear(screen.getByLabelText('Góc xoay (độ)'))
  await user.type(screen.getByLabelText('Góc xoay (độ)'), '90{Enter}')
  expect(await screen.findByRole('alert')).toHaveTextContent('Kệ đang chồng')
  expect(screen.getByLabelText('Góc xoay (độ)')).toHaveValue(90)
  expect(onClose).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Đặt vào bản nháp' }))
  await waitFor(() => expect(onPlace).toHaveBeenCalledTimes(2))
  expect(onPlace).toHaveBeenLastCalledWith({ ...geometry, x: 0, rotation: 90 })
})

it('blocks submit and cancellation while editing is locked', async () => {
  const onPlace = vi.fn(),
    onClose = vi.fn()
  render(
    <WarehousePendingPlacementDialog
      initialGeometry={geometry}
      label="Kệ A04"
      disabled
      onPlace={onPlace}
      onClose={onClose}
    />
  )
  expect(screen.getByRole('button', { name: 'Đặt vào bản nháp' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Hủy' })).toBeDisabled()
  expect(screen.getByLabelText('Vị trí ngang (X)')).toBeDisabled()
  await act(async () => {
    fireEvent.submit(document.querySelector('form')!)
  })
  expect(onPlace).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
})
