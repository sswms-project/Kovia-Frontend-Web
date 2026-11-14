import { APP_ROUTES } from '@/routes/app-routes'
import { inboundService } from '../services/inbound.service'

export async function getReceiptApprovalDestination(receiptId: string) {
  const [{ data: receipt }, { data: actions }] = await Promise.all([
    inboundService.getReceipt(receiptId),
    inboundService.getAllowedActions(receiptId),
  ])
  const canOpenPutaway =
    receipt.status === 'Approved' &&
    receipt.items.some((item) => item.remainingPutAwayQuantity > 0) &&
    (actions.allowedActions.includes('PlanPutAway') || actions.allowedActions.includes('PutAway'))

  return canOpenPutaway
    ? APP_ROUTES.inboundPutawayDetail(receiptId)
    : APP_ROUTES.goodsReceiptDetail(receiptId)
}
