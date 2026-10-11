import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import type { TransferRequestFormValues } from '../../schemas/transfer-request.schema'
import { emptyTransferForm } from '../../utils/transfer-form'
import { TransferGeneralSection, type TransferFormMode } from './TransferGeneralSection'

const DESTINATION = { id: 'dst', name: 'KHO-B · Kho B', address: 'Phường Bình Đức, An Giang' }
const SOURCE = { id: 'src', name: 'KHO-A · Kho A', address: 'K229/22b Trường Chinh, Đà Nẵng' }

function Harness({
  mode = 'create',
  canCreateRelocation = true,
  onSelectInternalRelocation = () => undefined,
  defaults = {},
}: {
  mode?: TransferFormMode
  canCreateRelocation?: boolean
  onSelectInternalRelocation?: () => void
  defaults?: Partial<TransferRequestFormValues>
}) {
  const form = useForm<TransferRequestFormValues>({
    defaultValues: { ...emptyTransferForm(), ...defaults },
  })
  return (
    <TransferGeneralSection
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
})
