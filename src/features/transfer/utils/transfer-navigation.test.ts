import { describe, expect, it } from 'vitest'
import { parseTransferDetailTab } from './transfer-detail-tabs'
import { readTransferListState, transferStatusHref } from './transfer-list-state'

describe('transfer navigation', () => {
  it.each([
    ['request', ''],
    ['transfer', 'InProgress'],
    ['discrepancy', 'AwaitingResolution'],
  ])('maps old list tab %s', (tab, status) => {
    expect(readTransferListState(new URLSearchParams({ tab })).status).toBe(status)
  })
  it('validates pagination and retains search/warehouse filters when selecting status', () => {
    expect(readTransferListState(new URLSearchParams('page=-1&pageSize=999&status=oops'))).toEqual({
      page: 1,
      pageSize: 10,
      status: '',
      search: '',
    })
    expect(
      transferStatusHref(
        '/transfers',
        'tab=transfer&page=7&pageSize=20&search=milk&sourceWarehouseId=w1',
        'Completed'
      )
    ).toBe('/transfers?pageSize=20&search=milk&sourceWarehouseId=w1&status=Completed')
    expect(transferStatusHref('/transfers', 'status=Cancelled&page=2', '')).toBe('/transfers')
  })
  it('maps every legacy work tab into execution while keeping goods and history', () => {
    expect(parseTransferDetailTab('shipments')).toBe('execution')
    expect(parseTransferDetailTab('pick')).toBe('execution')
    expect(parseTransferDetailTab('feedback')).toBe('execution')
    expect(parseTransferDetailTab('goods')).toBe('goods')
    expect(parseTransferDetailTab('history')).toBe('history')
    expect(parseTransferDetailTab('anything')).toBeNull()
  })
})
