import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InventoryFiltersProvider } from './use-inventory-filter'
import { useLowStockAlerts } from './use-low-stock-alerts'
const mocks = vi.hoisted(() => ({ search: '', query: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/inventory/low-stock-alerts',
  useSearchParams: () => new URLSearchParams(mocks.search),
}))
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => {
    mocks.query(options)
    return {}
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
  mocks.query.mockClear()
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
