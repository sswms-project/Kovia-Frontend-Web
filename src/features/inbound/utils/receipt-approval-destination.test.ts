import { beforeEach, describe, expect, it, vi } from 'vitest'
import { inboundService } from '../services/inbound.service'
import type { GoodsReceiptDetail, InboundAllowedActionsResponse } from '../types/inbound.types'
import { getReceiptApprovalDestination } from './receipt-approval-destination'

vi.mock('../services/inbound.service', () => ({
  inboundService: { getReceipt: vi.fn(), getAllowedActions: vi.fn() },
}))

describe('getReceiptApprovalDestination', () => {
  beforeEach(() => vi.resetAllMocks())

  it.each([
    ['Approved', 5, ['PlanPutAway'], '/inbound/putaway/r1'],
    ['Approved', 5, ['PutAway'], '/inbound/putaway/r1'],
    ['Approved', 5, ['AssignPutAway'], '/inbound/receipts/r1'],
    ['Approved', 0, ['PlanPutAway'], '/inbound/receipts/r1'],
    ['Completed', 5, ['PlanPutAway'], '/inbound/receipts/r1'],
  ])('routes %s receipts with %s remaining and %j', async (status, remaining, actions, path) => {
    vi.mocked(inboundService.getReceipt).mockResolvedValue({
      data: { status, items: [{ remainingPutAwayQuantity: remaining }] } as GoodsReceiptDetail,
    } as Awaited<ReturnType<typeof inboundService.getReceipt>>)
    vi.mocked(inboundService.getAllowedActions).mockResolvedValue({
      data: { allowedActions: actions } as InboundAllowedActionsResponse,
    } as Awaited<ReturnType<typeof inboundService.getAllowedActions>>)

    await expect(getReceiptApprovalDestination('r1')).resolves.toBe(path)
  })
})
