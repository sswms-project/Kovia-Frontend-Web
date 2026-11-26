import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { useForecastWorkspace } from './use-forecast-workspace'
vi.mock('@/features/product/hooks/use-products', () => ({ useProductSuppliersQuery: () => ({}) }))
vi.mock('@/features/warehouse/hooks/use-warehouse', () => ({
  useWarehouseLocationsQuery: () => ({}),
}))
vi.mock('./use-inventory', () =>
  Object.fromEntries(
    [
      'useCreateForecastRunMutation',
      'useExecuteForecastRunMutation',
      'useForecastRunQuery',
      'useForecastRunsQuery',
      'useAcceptReplenishmentSuggestionMutation',
      'useRejectForecastSuggestionMutation',
      'useEvaluateForecastRunMutation',
      'useAcceptRebalancingSuggestionMutation',
      'useWaitForForecastRun',
    ].map((name) => [name, () => ({ isPending: false })])
  )
)
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
}
describe('forecast linked product filter', () => {
  it('preserves the target across saved-run selection and clears only on explicit action', () => {
    const { result } = renderHook(
      () => useForecastWorkspace({ warehouseId: 'warehouse-a', productId: 'product-a' }),
      { wrapper }
    )
    expect(result.current.warehouseId).toBe('warehouse-a')
    expect(result.current.targetProductId).toBe('product-a')
    act(() => result.current.selectRun('run-a'))
    expect(result.current.targetProductId).toBe('product-a')
    act(() => result.current.selectRun('run-b'))
    expect(result.current.targetProductId).toBe('product-a')
    act(() => result.current.clearTargetProduct())
    expect(result.current.targetProductId).toBe('')
  })
  it('drops the target when changing warehouse and keeps normal defaults intact', () => {
    const linked = renderHook(
      () => useForecastWorkspace({ warehouseId: 'warehouse-a', productId: 'product-a' }),
      { wrapper }
    )
    act(() => linked.result.current.changeWarehouse('warehouse-b'))
    expect(linked.result.current.targetProductId).toBe('')
    const normal = renderHook(() => useForecastWorkspace(), { wrapper })
    expect(normal.result.current.warehouseId).toBe('')
    expect(normal.result.current.targetProductId).toBe('')
  })
})
