import { zodResolver } from '@hookform/resolvers/zod'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import {
  transferRequestSchema,
  type TransferRequestFormValues,
} from '../../schemas/transfer-request.schema'
import { emptyTransferForm } from '../../utils/transfer-form'
import { TransferGeneralSection, type TransferFormMode } from './TransferGeneralSection'
import type { TransferDestinationLoad } from '../../types/transfer.types'

const DESTINATION = { id: 'dst', name: 'KHO-B · Kho B', address: 'Phường Bình Đức, An Giang' }
const SOURCE = { id: 'src', name: 'KHO-A · Kho A', address: 'K229/22b Trường Chinh, Đà Nẵng' }

function Harness({
  mode = 'create',
  canCreateRelocation = true,
  onSelectInternalRelocation = () => undefined,
  defaults = {},
  destinationLoad,
  validate = false,
}: {
  mode?: TransferFormMode
  canCreateRelocation?: boolean
  onSelectInternalRelocation?: () => void
  defaults?: Partial<TransferRequestFormValues>
  destinationLoad?: TransferDestinationLoad
  validate?: boolean
}) {
  const form = useForm<TransferRequestFormValues>({
    resolver: validate ? zodResolver(transferRequestSchema) : undefined,
    defaultValues: { ...emptyTransferForm(), ...defaults },
  })
  return (
    <TransferGeneralSection
      destinationLoad={destinationLoad}
      form={form}
      mode={mode}
      destinationOptions={[DESTINATION]}
      sourceOptions={[SOURCE]}
      warehousesLocked={false}
      requesterNames={['Chủ A', 'Quản lý B']}
      canCreateRelocation={canCreateRelocation}
      onCodeChange={() => undefined}
      onDestinationChange={() => undefined}
      onSourceChange={() => undefined}
      onSelectInternalRelocation={onSelectInternalRelocation}
    />
  )
}

describe('TransferGeneralSection', () => {
  it.each([1, 2, 3])(
    'only shows the advisory warning at the server threshold, total=%s',
    (total) => {
      render(
        <Harness
          destinationLoad={{
            total,
            threshold: 2,
            inboundRequestCount: 1,
            transferCount: total - 1,
          }}
        />
      )
      if (total < 2) expect(screen.queryByRole('status')).not.toBeInTheDocument()
      else {
        expect(screen.getByRole('status')).toHaveTextContent(`Kho nhập đã có ${total} yêu cầu`)
        expect(screen.getByRole('status')).toHaveTextContent('Bạn vẫn có thể tiếp tục.')
        expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
      }
      expect(screen.getByRole('button', { name: 'Ngày hàng dự kiến về kho nhập' })).toBeEnabled()
      expect(screen.getByLabelText('Người yêu cầu')).toBeEnabled()
    }
  )
  it('shows both date/time pickers and keeps a date-only arrival distinct from midnight', () => {
    render(
      <Harness defaults={{ plannedTransferDate: '2026-10-20T00:00', requiredBy: '2026-10-20' }} />
    )
    expect(screen.getByRole('button', { name: 'Ngày dự kiến điều chuyển' })).toHaveTextContent(
      '20/10/2026 00:00'
    )
    expect(screen.getByRole('button', { name: 'Ngày hàng dự kiến về kho nhập' })).toHaveTextContent(
      '20/10/2026'
    )
    expect(screen.queryByText('Hạn cần hàng')).not.toBeInTheDocument()
  })
  it('fills the warehouse addresses from the chosen warehouses', () => {
    render(<Harness defaults={{ destinationWarehouseId: 'dst', sourceWarehouseId: 'src' }} />)

    expect(screen.getByLabelText('Địa chỉ kho nhập')).toHaveValue(DESTINATION.address)
    expect(screen.getByLabelText('Địa chỉ kho xuất')).toHaveValue(SOURCE.address)
    expect(screen.getByLabelText('Địa chỉ kho nhập')).toHaveAttribute('readonly')
  })

  it('offers owners and managers for the requester but still accepts typed text', async () => {
    render(<Harness />)
    const input = screen.getByLabelText('Người yêu cầu')

    expect(document.querySelectorAll('#transfer-requester-options option')).toHaveLength(2)
    await userEvent.type(input, 'Người ngoài hệ thống')
    expect(input).toHaveValue('Người ngoài hệ thống')
  })

  it('sends the user to the relocation task form for an in-warehouse transfer', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelectInternalRelocation={onSelect} />)

    await userEvent.click(
      screen.getByRole('radio', { name: /Điều chuyển nội bộ vị trí trong kho/ })
    )
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('disables the in-warehouse option without permission to create warehouse tasks', () => {
    render(<Harness canCreateRelocation={false} />)
    expect(
      screen.getByRole('radio', { name: /Điều chuyển nội bộ vị trí trong kho/ })
    ).toBeDisabled()
  })

  it('keeps the code fixed once the request has been sent and hides the kind picker', () => {
    render(<Harness mode="edit" defaults={{ transferCode: 'PDC000007' }} />)

    expect(screen.getByLabelText('Mã yêu cầu điều chuyển')).toBeDisabled()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('shows the date-order error under the arrival date as soon as the planned date moves past it', async () => {
    render(
      <Harness
        validate
        defaults={{ plannedTransferDate: '2099-01-10', requiredBy: '2099-01-05' }}
      />
    )
    expect(screen.queryByText(/không được trước ngày dự kiến điều chuyển/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ngày dự kiến điều chuyển' }))
    await userEvent.click(screen.getByRole('button', { name: /ngày 12 tháng 01 năm 2099/ }))

    expect(
      await screen.findByText('Ngày hàng về không được trước ngày dự kiến điều chuyển.')
    ).toBeInTheDocument()
  })
})
