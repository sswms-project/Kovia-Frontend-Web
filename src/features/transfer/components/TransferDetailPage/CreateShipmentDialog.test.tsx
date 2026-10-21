import { zodResolver } from '@hookform/resolvers/zod'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createShipmentSchema,
  type CreateShipmentFormValues,
} from '../../schemas/transfer-actions.schema'
import { CreateShipmentDialog } from './CreateShipmentDialog'

const staffId = '10000000-0000-4000-8000-000000000001'
const onSubmit = vi.fn()
function Fixture({
  uncertain = false,
  canAssign = true,
  precision = 0,
  isLoadingStaff = false,
}: {
  uncertain?: boolean
  canAssign?: boolean
  precision?: number
  isLoadingStaff?: boolean
}) {
  const form = useForm<CreateShipmentFormValues>({
    resolver: zodResolver(createShipmentSchema),
    defaultValues: {
      staffId: '',
      lines: [
        {
          itemId: '20000000-0000-4000-8000-000000000001',
          label: 'SKU-1 · Hàng kiểm thử',
          unitName: 'Cái',
          selected: true,
          maximum: 10,
          quantity: 10,
          precision,
        },
      ],
    },
  })
  return (
    <CreateShipmentDialog
      open
      form={form}
      isPending={false}
      uncertain={uncertain}
      canAssign={canAssign}
      isLoadingStaff={isLoadingStaff}
      currentUserId={staffId}
      staff={[
        {
          id: staffId,
          fullName: 'Nhân viên A',
          email: 'qa@local',
          openReceivingTasks: 0,
          openPutAwayTasks: 0,
          hasTaskInProgress: false,
        },
      ]}
      onOpenChange={vi.fn()}
      onSubmit={onSubmit}
    />
  )
}
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Shipment preparation dialog', () => {
  it('distinguishes staff loading from choosing to assign later', () => {
    render(<Fixture isLoadingStaff />)
    expect(screen.getByLabelText('Người lấy hàng')).toBeDisabled()
    expect(screen.getByRole('option', { name: 'Đang tải người lấy hàng…' })).toBeInTheDocument()
  })
  it('defaults to one full shipment and combines staff choice into its confirmation', async () => {
    render(<Fixture />)
    expect(screen.getByRole('textbox', { name: /Số lượng đưa vào đợt/ })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: /Số lượng đưa vào đợt/ })).toHaveValue('10')
    expect(screen.getByRole('checkbox', { name: 'Chia hàng thành nhiều chuyến' })).not.toBeChecked()
    fireEvent.change(screen.getByLabelText('Người lấy hàng'), { target: { value: staffId } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận chuẩn bị xuất' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      staffId,
      lines: [{ quantity: 10, selected: true }],
    })
  })
  it('allows explicit splitting and restores all quantities when splitting is turned off', () => {
    render(<Fixture />)
    const split = screen.getByRole('checkbox', { name: 'Chia hàng thành nhiều chuyến' })
    fireEvent.click(split)
    expect(screen.getByRole('textbox', { name: /Số lượng đưa vào đợt/ })).toBeEnabled()
    fireEvent.change(screen.getByRole('textbox', { name: /Số lượng đưa vào đợt/ }), {
      target: { value: '3' },
    })
    fireEvent.click(split)
    expect(screen.getByRole('textbox', { name: /Số lượng đưa vào đợt/ })).toHaveValue('10')
    expect(screen.getByRole('textbox', { name: /Số lượng đưa vào đợt/ })).toBeDisabled()
  })
  it('does not offer assignment when permission is missing', () => {
    render(<Fixture canAssign={false} />)
    expect(screen.queryByLabelText('Người lấy hàng')).not.toBeInTheDocument()
  })
  it('uses a wheel-safe text quantity and blocks fractional integer-unit splits inline', () => {
    render(<Fixture />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chia hàng thành nhiều chuyến' }))
    const input = screen.getByRole('textbox', { name: /Số lượng đưa vào đợt/ })
    expect(input).toHaveAttribute('inputmode', 'numeric')
    fireEvent.wheel(input, { deltaY: -100 })
    expect(input).toHaveValue('10')
    fireEvent.change(input, { target: { value: '0.5' } })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(
      screen.getByText('Đơn vị này chỉ nhận số nguyên, không được nhập số lẻ.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xác nhận chuẩn bị xuất' })).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })
  it('allows localized decimal quantities only for the unit precision', async () => {
    render(<Fixture precision={1} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chia hàng thành nhiều chuyến' }))
    const input = screen.getByRole('textbox', { name: /Số lượng đưa vào đợt/ })
    fireEvent.change(input, { target: { value: '1,25' } })
    expect(screen.getByRole('button', { name: 'Xác nhận chuẩn bị xuất' })).toBeDisabled()
    fireEvent.change(input, { target: { value: '1,5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận chuẩn bị xuất' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]![0].lines[0].quantity).toBe(1.5)
  })
  it('freezes editable fields but keeps the exact-command replay available after an uncertain response', () => {
    render(<Fixture uncertain />)
    expect(screen.getByLabelText('Người lấy hàng')).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Chia hàng thành nhiều chuyến' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Kiểm tra lại thao tác' })).toBeEnabled()
  })
})
