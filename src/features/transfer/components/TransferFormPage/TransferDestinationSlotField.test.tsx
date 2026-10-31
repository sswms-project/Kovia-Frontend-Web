import { cleanup, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { afterEach, expect, it, vi } from 'vitest'
import { TransferDestinationSlotField } from './TransferDestinationSlotField'
import { emptyTransferForm, EMPTY_TRANSFER_LINE } from '../../utils/transfer-form'
import type { TransferRequestFormValues } from '../../schemas/transfer-request.schema'

vi.mock('./TransferSlotMapDialog', () => ({ TransferSlotMapDialog: () => null }))
afterEach(cleanup)
function Fixture({ available = true }: { available?: boolean }) {
  const form = useForm<TransferRequestFormValues>({
    defaultValues: {
      ...emptyTransferForm(),
      lines: [{ ...EMPTY_TRANSFER_LINE, destinationSlotId: 'slot' }],
    },
  })
  return (
    <TransferDestinationSlotField
      index={0}
      form={form}
      options={
        available
          ? [{ value: 'slot', label: 'Khu K01 / Kệ A04', description: 'Đang chứa 12 / 50 Thùng' }]
          : []
      }
      knownOption={{
        value: 'slot',
        label: 'Khu K01 / Kệ A04',
        description: 'Đang chứa 12 / 50 Thùng',
      }}
      isLoading={false}
      locked={false}
      onSearchChange={() => undefined}
    />
  )
}
it('shows capacity beneath the selected input even when search options no longer include it', () => {
  const view = render(<Fixture />)
  expect(screen.getByText('Đang chứa 12 / 50 Thùng')).toBeInTheDocument()
  view.rerender(<Fixture available={false} />)
  expect(screen.getByText('Đang chứa 12 / 50 Thùng')).toBeInTheDocument()
})
