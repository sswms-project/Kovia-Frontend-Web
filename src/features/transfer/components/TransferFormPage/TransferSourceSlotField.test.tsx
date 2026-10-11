import { cleanup, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TransferRequestFormValues } from '../../schemas/transfer-request.schema'
import { TransferSourceSlotField } from './TransferSourceSlotField'

const queryMock = vi.hoisted(() => vi.fn())
vi.mock('../../hooks/use-transfers', () => ({ useTransferSourceLocationsQuery: queryMock }))

afterEach(() => {
  cleanup()
  queryMock.mockReset()
})

function Harness({ locked = false, slotId = '' }: { locked?: boolean; slotId?: string }) {
  const form = useForm<TransferRequestFormValues>({
    defaultValues: {
      lines: [
        {
          itemId: locked ? 'item-1' : null,
          productId: 'product-1',
          unitId: '',
          destinationSlotId: '',
          sourceSlotId: slotId,
          quantity: 1,
        },
      ],
    } as TransferRequestFormValues,
  })
  return (
    <TransferSourceSlotField
      index={0}
      form={form}
      sourceWarehouseId="warehouse-1"
      knownOption={slotId ? { value: slotId, label: 'Khu K01 / Kệ A07 / A-01' } : undefined}
      locked={locked}
    />
  )
}

describe('TransferSourceSlotField', () => {
  it('asks for the slots that hold the chosen product in the source warehouse', () => {
    queryMock.mockReturnValue({ data: [], isFetching: false })
    render(<Harness />)
    expect(queryMock).toHaveBeenCalledWith(
      { sourceWarehouseId: 'warehouse-1', productId: 'product-1' },
      true
    )
    expect(screen.getByRole('combobox', { name: 'Vị trí đi dòng 1' })).toBeInTheDocument()
  })

  it('shows the saved slot and offers to clear it while the line is still editable', () => {
    queryMock.mockReturnValue({ data: [], isFetching: false })
    render(<Harness slotId="slot-1" />)
    expect(screen.getByRole('combobox', { name: 'Vị trí đi dòng 1' })).toHaveValue(
      'Khu K01 / Kệ A07 / A-01'
    )
    expect(screen.getByRole('button', { name: 'Bỏ vị trí đi dòng 1' })).toBeInTheDocument()
  })

  it('does not load or change anything on a line that already reserved stock', () => {
    queryMock.mockReturnValue({ data: undefined, isFetching: false })
    render(<Harness locked />)
    expect(queryMock).toHaveBeenCalledWith(
      { sourceWarehouseId: 'warehouse-1', productId: 'product-1' },
      false
    )
    expect(screen.getByText('Hệ thống tự phân bổ')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Bỏ vị trí đi/ })).toBeNull()
  })
})
