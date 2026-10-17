import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { DamageCaseDirectory } from './DamageCaseDirectory'

it('refreshes damage cases and locks the reload button during fetching', () => {
  const noop = vi.fn()
  const props: ComponentProps<typeof DamageCaseDirectory> = {
    permissions: [],
    currentUserId: null,
    items: [],
    page: 1,
    pageSize: 20,
    totalCount: 0,
    warehouseId: '',
    productId: '',
    statusFilter: '',
    dateFrom: '',
    dateTo: '',
    warehouseOptions: [],
    productOptions: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    isPending: false,
    canDecide: false,
    recipientOptions: [],
    areRecipientsLoading: false,
    onRetry: vi.fn(),
    onPageChange: noop,
    onWarehouseChange: noop,
    onProductChange: noop,
    onStatusChange: noop,
    onDateFromChange: noop,
    onDateToChange: noop,
    onDecide: vi.fn(),
    onAddEvidence: vi.fn(),
  }
  const view = render(<DamageCaseDirectory {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Làm mới hàng hỏng' }))
  expect(props.onRetry).toHaveBeenCalledOnce()
  view.rerender(<DamageCaseDirectory {...props} isFetching />)
  expect(screen.getByRole('button', { name: 'Làm mới hàng hỏng' })).toBeDisabled()
})
