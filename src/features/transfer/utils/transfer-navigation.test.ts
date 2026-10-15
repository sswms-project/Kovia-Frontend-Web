import { describe, expect, it } from 'vitest'
import { defaultTransferDetailTab, parseTransferDetailTab } from './transfer-detail-tabs'
import { readTransferListState, transferStatusHref } from './transfer-list-state'
import type { TransferNextStep } from './transfer-next-steps'

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
  it('maps old detail tabs and defaults to the first actionable stage', () => {
    expect(parseTransferDetailTab('shipments')).toBeNull()
    expect(parseTransferDetailTab('pick')).toBe('pick')
    expect(parseTransferDetailTab('feedback')).toBe('discrepancies')
    expect(parseTransferDetailTab('anything')).toBeNull()
    const step = (action: TransferNextStep['action']): TransferNextStep => ({
      id: '1',
      title: '',
      description: '',
      actionLabel: '',
      action,
    })
    expect(defaultTransferDetailTab([])).toBe('goods')
    expect(defaultTransferDetailTab([step({ type: 'openReceive', shipmentId: 's1' })])).toBe(
      'receive'
    )
    expect(defaultTransferDetailTab([step({ type: 'resolveDiscrepancy' })])).toBe('discrepancies')
    expect(defaultTransferDetailTab([step({ type: 'createShipment' })])).toBe('pick')
  })
})
