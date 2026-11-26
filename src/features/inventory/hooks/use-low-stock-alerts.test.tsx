import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InventoryFiltersProvider } from './use-inventory-filter'
import { useLowStockAlerts } from './use-low-stock-alerts'
const mocks = vi.hoisted(() => ({
  search: '',
  query: vi.fn(),
  list: undefined as
    | { isSuccess: boolean; isFetching: boolean; data: { totalCount: number } }
    | undefined,
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/inventory/low-stock-alerts',
  useSearchParams: () => new URLSearchParams(mocks.search),
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQuery: (options: unknown) => {
    mocks.query(options)
    const key = (options as { queryKey: readonly unknown[] }).queryKey
    return key.includes('list') ? (mocks.list ?? {}) : {}
  },
}))
vi.mock('@/features/auth/hooks/use-auth', async () => {
  const { P } = await import('@/config/permissionCodes')
  return { useMeQuery: () => ({ data: { permissions: [P.INVENTORY_VIEW] } }) }
})
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (value: unknown) => unknown) =>
    selector({ user: { id: 'user-a', tenantId: 'tenant-a' } }),
}))
function wrapper({ children }: { children: ReactNode }) {
  return <InventoryFiltersProvider>{children}</InventoryFiltersProvider>
}
beforeEach(() => {
  mocks.search = ''
  mocks.list = undefined
  mocks.query.mockClear()
  vi.spyOn(window.history, 'replaceState').mockImplementation((_state, _unused, url) => {
    mocks.search = String(url).split('?')[1] ?? ''
  })
  vi.spyOn(window.history, 'pushState').mockImplementation((_state, _unused, url) => {
    mocks.search = String(url).split('?')[1] ?? ''
  })
})
describe('low stock URL and retained filters', () => {
  it('retains namespaced filters on tab return and explicitly clears saved values on reset', () => {
    mocks.search = 'searchTerm=Pin&statusFilter=All&pageSize=30'
    const { result, rerender } = renderHook(() => useLowStockAlerts(), { wrapper })
    expect(result.current.filters.searchTerm).toBe('Pin')
    act(() => {
      mocks.search = ''
    })
    rerender()
    expect(result.current.filters.searchTerm).toBe('Pin')
    expect(result.current.filters.pageSize).toBe(30)
    act(() => result.current.reset())
    rerender()
    expect(result.current.filters.searchTerm).toBeUndefined()
    expect(result.current.filters.statusFilter).toBe('Active')
    expect(result.current.filters.pageSize).toBe(30)
  })
  it('gives URL priority, preserves explicit all-warehouse, and never queries malformed IDs', () => {
    mocks.search = 'warehouseId=11111111-1111-4111-8111-111111111111'
    const { result, rerender } = renderHook(() => useLowStockAlerts(), { wrapper })
    expect(result.current.filters.warehouseId).toContain('11111111')
    act(() => result.current.update({ warehouseId: '' }))
    rerender()
    expect(result.current.filters.warehouseId).toBeUndefined()
    act(() => {
      mocks.search = 'warehouseId=bad'
    })
    rerender()
    expect(result.current.validationError).not.toBeNull()
    expect(result.current.enabled).toBe(false)
    const options = mocks.query.mock.calls.slice(-2).map((call) => call[0] as { enabled: boolean })
    expect(options.every((option) => !option.enabled)).toBe(true)
  })
})

it('clamps the URL after Open results shrink, preserving filters and the open detail', () => {
  const alertId = '22222222-2222-4222-8222-222222222222'
  mocks.search = `pageNumber=2&pageSize=20&statusFilter=Open&searchTerm=Pin&alertId=${alertId}`
  mocks.list = { isSuccess: true, isFetching: false, data: { totalCount: 21 } }
  const { result, rerender } = renderHook(() => useLowStockAlerts(), { wrapper })
  expect(result.current.filters.pageNumber).toBe(2)
  act(() => {
    mocks.list = { isSuccess: true, isFetching: false, data: { totalCount: 20 } }
  })
  rerender()
  rerender()
  expect(result.current.filters.pageNumber).toBe(1)
  expect(result.current.filters.statusFilter).toBe('Open')
  expect(result.current.filters.searchTerm).toBe('Pin')
  expect(result.current.alertId).toBe(alertId)
})

it('waits for refetch before clamping and returns to page1 for an empty result', () => {
  mocks.search = 'pageNumber=2&pageSize=20&statusFilter=Open'
  mocks.list = { isSuccess: true, isFetching: true, data: { totalCount: 0 } }
  const { result, rerender } = renderHook(() => useLowStockAlerts(), { wrapper })
  expect(result.current.filters.pageNumber).toBe(2)
  act(() => {
    mocks.list = { isSuccess: true, isFetching: false, data: { totalCount: 0 } }
  })
  rerender()
  rerender()
  expect(result.current.filters.pageNumber).toBe(1)
})
