import type { TransferNextStep } from './transfer-next-steps'

export type TransferDetailTab =
  | 'goods'
  | 'pick'
  | 'receive'
  | 'putaway'
  | 'discrepancies'
  | 'history'
export function parseTransferDetailTab(value: string | null): TransferDetailTab | null {
  // Legacy notifications refer to the shipment flow, not specifically to source picking.
  if (value === 'shipments') return null
  if (value === 'feedback') return 'discrepancies'
  return value === 'goods' ||
    value === 'pick' ||
    value === 'receive' ||
    value === 'putaway' ||
    value === 'discrepancies' ||
    value === 'history'
    ? value
    : null
}
export function defaultTransferDetailTab(steps: readonly TransferNextStep[]): TransferDetailTab {
  const action = steps[0]?.action
  if (!action) return 'goods'
  if (
    action.type === 'openPutAway' ||
    action.type === 'openPutAwayPlan' ||
    (action.type === 'assign' && action.kind === 'putaway')
  )
    return 'putaway'
  if (
    action.type === 'openReceive' ||
    action.type === 'startReceiving' ||
    (action.type === 'assign' && action.kind === 'receive')
  )
    return 'receive'
  if (action.type === 'resolveDiscrepancy') return 'discrepancies'
  return 'pick'
}
