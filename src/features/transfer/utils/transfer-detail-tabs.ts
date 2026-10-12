import type { TransferNextStep } from './transfer-next-steps'

export type TransferDetailTab = 'goods' | 'pick' | 'receive' | 'discrepancies' | 'history'
export function parseTransferDetailTab(value: string | null): TransferDetailTab | null {
  if (value === 'shipments') return 'pick'
  if (value === 'feedback') return 'discrepancies'
  return value === 'goods' ||
    value === 'pick' ||
    value === 'receive' ||
    value === 'discrepancies' ||
    value === 'history'
    ? value
    : null
}
export function defaultTransferDetailTab(steps: readonly TransferNextStep[]): TransferDetailTab {
  const action = steps[0]?.action
  if (!action) return 'goods'
  if (
    action.type === 'openReceive' ||
    action.type === 'setPutAwaySlots' ||
    (action.type === 'assign' && action.kind === 'receive')
  )
    return 'receive'
  if (action.type === 'resolveDiscrepancy') return 'discrepancies'
  return 'pick'
}
