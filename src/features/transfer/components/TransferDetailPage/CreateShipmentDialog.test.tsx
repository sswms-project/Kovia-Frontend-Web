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
}: {
  uncertain?: boolean
  canAssign?: boolean
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
  it('defaults to one full shipment and combines staff choice into its confirmation', async () => {
    render(<Fixture />)
    expect(screen.getByRole('spinbutton')).toBeDisabled()
    expect(screen.getByRole('spinbutton')).toHaveValue(10)
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
    expect(screen.getByRole('spinbutton')).toBeEnabled()
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3' } })
    fireEvent.click(split)
    expect(screen.getByRole('spinbutton')).toHaveValue(10)
    expect(screen.getByRole('spinbutton')).toBeDisabled()
  })
  it('does not offer assignment when permission is missing', () => {
    render(<Fixture canAssign={false} />)
    expect(screen.queryByLabelText('Người lấy hàng')).not.toBeInTheDocument()
  })
  it('freezes editable fields but keeps the exact-command replay available after an uncertain response', () => {
    render(<Fixture uncertain />)
    expect(screen.getByLabelText('Người lấy hàng')).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Chia hàng thành nhiều chuyến' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Kiểm tra lại thao tác' })).toBeEnabled()
  })
})
