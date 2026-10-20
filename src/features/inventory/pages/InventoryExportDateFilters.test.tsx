import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DamageCasesPage from './DamageCasesPage'
import StockDiscrepanciesPage from './StockDiscrepanciesPage'

const reads = vi.hoisted(() => ({ damage: vi.fn(), discrepancy: vi.fn(), export: vi.fn() }))
const emptyQuery = () => ({ data: { items: [], totalCount: 0 }, isFetching: false, isError: false })
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useMeQuery: () => ({ data: { permissions: [] } }),
}))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({
  useWarehousesQuery: () => emptyQuery(),
  useWarehouseLocationsQuery: () => emptyQuery(),
}))
vi.mock('@/features/inbound-request/hooks/use-inbound-requests', () => ({
  useProductOptionsQuery: () => emptyQuery(),
}))
vi.mock('@/features/product/hooks/use-products', () => ({
  useProductLotsQuery: () => ({ data: [] }),
}))
vi.mock('@/features/staff/hooks/use-staff', () => ({ useStaffListQuery: () => emptyQuery() }))
vi.mock('@/features/supplier/hooks/use-suppliers', () => ({
  useSuppliersQuery: () => emptyQuery(),
}))
vi.mock('@/features/list-export/hooks/use-list-export', () => ({
  useListExport: (options: unknown) => {
    reads.export(options)
    return { canExport: false }
  },
}))
vi.mock('../hooks/use-inventory', () => ({
  useDamageCasesQuery: (filters: unknown) => {
    reads.damage(filters)
    return emptyQuery()
  },
  useStockDiscrepanciesQuery: (filters: unknown) => {
    reads.discrepancy(filters)
    return emptyQuery()
  },
  useMyWarehouseTasksQuery: () => emptyQuery(),
  useAddDamageCaseEvidenceMutation: () => ({}),
  useDecideDamageCaseDispositionMutation: () => ({}),
  useUploadInventoryEvidenceMutation: () => ({}),
  useCreateStockDiscrepancyMutation: () => ({}),
  useReviewStockDiscrepancyMutation: () => ({}),
  useAddStockDiscrepancyEvidenceMutation: () => ({}),
}))

interface DateFilterProps {
  dateFrom: string
  dateTo: string
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
}
function DateFilters(props: DateFilterProps) {
  return (
    <>
      <input
        aria-label="Từ ngày"
        value={props.dateFrom}
        onChange={(event) => props.onDateFromChange(event.target.value)}
      />
      <input
        aria-label="Đến ngày"
        value={props.dateTo}
        onChange={(event) => props.onDateToChange(event.target.value)}
      />
    </>
  )
}
vi.mock('../components/DamageCasesPage', () => ({
  DamageCaseDirectory: (props: DateFilterProps) => <DateFilters {...props} />,
}))
vi.mock('../components/StockDiscrepanciesPage', () => ({
  StockDiscrepancyDirectory: (props: DateFilterProps) => <DateFilters {...props} />,
}))

beforeEach(() => vi.clearAllMocks())
describe('Vietnam calendar-day filters shared by lists and Excel', () => {
  it.each(['damage', 'discrepancy'] as const)(
    'keeps %s inside the selected Vietnam day',
    (dataset) => {
      render(dataset === 'damage' ? <DamageCasesPage /> : <StockDiscrepanciesPage />)
      fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-10-20' } })
      fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-10-20' } })
      const filters = reads[dataset].mock.lastCall?.[0]
      expect(filters).toMatchObject({
        dateFrom: '2026-10-20T00:00:00+07:00',
        dateTo: '2026-10-20T23:59:59.999+07:00',
      })
      expect(reads.export.mock.lastCall?.[0].filters).toBe(filters)
      expect(Date.parse('2026-10-20T00:00:00+07:00')).toBe(Date.parse(filters.dateFrom))
      expect(Date.parse('2026-10-20T23:59:59.999+07:00')).toBe(Date.parse(filters.dateTo))
      expect(Date.parse('2026-10-21T00:00:00+07:00')).toBeGreaterThan(Date.parse(filters.dateTo))
      expect(Date.parse('2026-10-21T06:30:00+07:00')).toBeGreaterThan(Date.parse(filters.dateTo))
      fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '' } })
      fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '' } })
      expect(reads[dataset].mock.lastCall?.[0]).not.toHaveProperty('dateFrom')
      expect(reads[dataset].mock.lastCall?.[0]).not.toHaveProperty('dateTo')
    }
  )
})
