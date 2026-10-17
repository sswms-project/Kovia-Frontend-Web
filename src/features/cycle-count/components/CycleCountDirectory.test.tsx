import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { CycleCountDirectory } from './CycleCountDirectory'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }))

it('prevents vertical tab scrolling without changing status filtering', () => {
  const noop = vi.fn()
  const props: ComponentProps<typeof CycleCountDirectory> = {
    items: [],
    totalCount: 0,
    statusCounts: { Scheduled: 0, Completed: 32 },
    needsAdjustmentCount: 0,
    urgentOpenCount: 0,
    urgentOnly: false,
    page: 1,
    pageSize: 20,
    warehouseId: '',
    sortBy: 'priority',
    status: '',
    searchTerm: '',
    warehouses: [],
    canCreate: false,
    isLoading: false,
    isFetching: false,
    isError: false,
    onWarehouseChange: noop,
    onSortChange: noop,
    onStatusChange: vi.fn(),
    onUrgentOnlyChange: noop,
    onSearchTermChange: noop,
    onPageChange: noop,
    onPageSizeChange: noop,
    onRetry: noop,
    onPrefetchDetail: noop,
  }
  render(<CycleCountDirectory {...props} />)
  expect(screen.getByRole('tablist').parentElement).toHaveClass(
    'shrink-0',
    'overflow-x-auto',
    'overflow-y-hidden',
    'p-1'
  )
  fireEvent.mouseDown(screen.getByRole('tab', { name: /^Hoàn tất/ }), {
    button: 0,
    ctrlKey: false,
  })
  expect(props.onStatusChange).toHaveBeenCalledWith('Closed')
})
