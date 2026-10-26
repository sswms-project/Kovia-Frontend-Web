import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOverviewNavigation } from './use-overview-navigation'

const route = vi.hoisted(() => ({ search: '' }))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(route.search),
  usePathname: () => '/dashboard/tenant',
}))
beforeEach(() => {
  route.search = ''
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('overview URL state', () => {
  it('restores an applied quarter from URL and rejects an invalid range instead of querying another period', () => {
    route.search = 'tab=activity&activityPeriod=quarter&activityYear=2024&activityQuarter=1'
    const view = renderHook(useOverviewNavigation)
    expect(view.result.current.activityRange).toEqual({
      dateFrom: '2024-01-01',
      dateTo: '2024-03-31',
    })
    route.search =
      'tab=activity&activityPeriod=custom&activityFrom=2026-10-19&activityTo=2026-10-18'
    view.rerender()
    expect(view.result.current.activityRange).toBeUndefined()
  })
  it('defaults to alerts and keeps a malformed warehouse explicit rather than widening its scope', () => {
    route.search = 'warehouseId=invalid&tab=unknown&alert=unknown&expiringDays=999'
    const { result } = renderHook(useOverviewNavigation)
    expect(result.current).toMatchObject({
      warehouseId: 'invalid',
      invalidWarehouse: true,
      tab: 'alerts',
      kind: 'below-minimum',
      expiringDays: 5,
    })
  })
  it('reads navigation changes without retaining a previous warehouse or N-day window', () => {
    route.search = 'warehouseId=00000000-0000-0000-0000-000000000001&expiringDays=30&alert=expired'
    const view = renderHook(useOverviewNavigation)
    expect(view.result.current).toMatchObject({
      invalidWarehouse: false,
      expiringDays: 30,
      kind: 'expired',
    })
    route.search = 'tab=activity&expiringDays=5'
    view.rerender()
    expect(view.result.current).toMatchObject({ warehouseId: '', tab: 'activity', expiringDays: 5 })
  })
  it('writes a scoped history entry and preserves unrelated URL parameters', () => {
    route.search = 'tab=alerts&expiringDays=5&other=keep'
    const push = vi.spyOn(window.history, 'pushState').mockImplementation(() => {})
    const { result } = renderHook(useOverviewNavigation)
    result.current.updateLocation({ alert: 'expired', expiringDays: '30' })
    expect(push).toHaveBeenCalledWith(
      null,
      '',
      '/dashboard/tenant?tab=alerts&expiringDays=30&other=keep&alert=expired'
    )
  })
})
