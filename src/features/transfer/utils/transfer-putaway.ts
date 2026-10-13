import type { TransferPutAwaySheet, TransferPutAwaySheetRow } from '../types/transfer-receipt.types'
import type { TransferPutAwayEntryValues } from '../schemas/transfer-putaway.schema'
import type { ReceiptPlanState } from './transfer-receive-plan'

export function putAwayRowKey(row: {
  lineId: string
  lotId: string | null
  qualityStatus: string
}) {
  return `${row.lineId}|${row.lotId ?? ''}|${row.qualityStatus}`
}

function entryFor(
  row: TransferPutAwaySheetRow,
  quantity: number,
  slotId = '',
  path = ''
): TransferPutAwayEntryValues {
  return {
    lineId: row.lineId,
    lotId: row.lotId,
    qualityStatus: row.qualityStatus,
    quantity,
    destinationSlotId: slotId,
    slotLabel: path,
    plannedSlotId: slotId,
    plannedSlotLabel: path,
    scannedSlotCode: '',
    scannedProductCode: '',
    deviationReasonCode: '',
    note: '',
    slotCodeUnreadable: false,
  }
}

/** Một ngân sách dùng chung qua các lô; không lặp lại ngân sách của từng row trong response. */
export function buildTransferPutAwayEntries(
  sheet: TransferPutAwaySheet
): TransferPutAwayEntryValues[] {
  const budgets = new Map<string, number>()
  const entries: TransferPutAwayEntryValues[] = []
  for (const row of sheet.rows) {
    let remaining = Math.round(row.remainingQuantity * 100)
    if (remaining <= 0) continue
    if (row.qualityStatus === 'Good')
      for (const budget of row.planBudgets) {
        const key = `${row.itemId}|${budget.slotId}`
        const available = budgets.get(key) ?? Math.round(budget.remainingBudget * 100)
        const allocated = Math.min(remaining, Math.max(0, available))
        budgets.set(key, available - allocated)
        if (allocated > 0) entries.push(entryFor(row, allocated / 100, budget.slotId, budget.path))
        remaining -= allocated
      }
    if (remaining > 0) entries.push(entryFor(row, remaining / 100))
  }
  return entries
}

export function transferPutAwayPlanStates(
  sheet: TransferPutAwaySheet,
  entries: readonly TransferPutAwayEntryValues[]
): ReceiptPlanState[] {
  const rows = new Map(sheet.rows.map((row) => [putAwayRowKey(row), row]))
  const budgets = new Map<string, number>()
  for (const row of sheet.rows)
    for (const budget of row.planBudgets)
      budgets.set(`${row.itemId}|${budget.slotId}`, Math.round(budget.remainingBudget * 100))
  return entries.map((entry) => {
    const row = rows.get(putAwayRowKey(entry))
    const isPlanned = row?.planMode === 'Planned' && entry.qualityStatus === 'Good'
    const key = `${row?.itemId}|${entry.destinationSlotId}`
    const budget = budgets.get(key) ?? 0
    const quantity = Math.round((entry.quantity || 0) * 100)
    if (isPlanned) budgets.set(key, Math.max(0, budget - quantity))
    return {
      isPlanned,
      isOffPlan: Boolean(isPlanned && entry.destinationSlotId && quantity > budget),
      budgetBefore: budget / 100,
      withinPlan: Math.min(quantity, budget) / 100,
      excess: Math.max(0, quantity - budget) / 100,
    }
  })
}

export function splitTransferPutAwayExcess(
  entries: readonly TransferPutAwayEntryValues[],
  index: number,
  state: ReceiptPlanState
) {
  const entry = entries[index]
  if (!entry || state.withinPlan <= 0 || state.excess <= 0) return [...entries]
  const next = [...entries]
  next.splice(
    index,
    1,
    { ...entry, quantity: state.withinPlan, deviationReasonCode: '' },
    { ...entry, quantity: state.excess }
  )
  return next
}
