import type { TransferReceiptEntryValues } from '../schemas/transfer-fulfillment.schema'
import type { TransferReceiveSheet } from '../types/transfer.types'

const cents = (value: number) => Math.round(value * 100)
export interface ReceiptPlanState {
  isPlanned: boolean
  isOffPlan: boolean
  budgetBefore: number
  withinPlan: number
  excess: number
}

/** Một ngân sách (item, vị trí) cho toàn request, không lặp ngân sách theo lô. Khớp thứ tự BE duyệt entry. */
export function receiptPlanStates(
  sheet: TransferReceiveSheet,
  entries: readonly TransferReceiptEntryValues[]
): ReceiptPlanState[] {
  const lines = new Map(sheet.lines.map((line) => [line.lineId, line]))
  const budgets = new Map<string, number>()
  for (const line of sheet.lines)
    for (const lot of line.lots)
      for (const plan of lot.plan ?? []) {
        const key = `${line.itemId}|${plan.slotId}`
        budgets.set(key, Math.max(budgets.get(key) ?? 0, cents(plan.remainingBudget)))
      }
  return entries.map((entry) => {
    const line = lines.get(entry.lineId)
    const isPlanned = line?.planMode === 'Planned'
    const key = `${line?.itemId ?? entry.lineId}|${entry.destinationSlotId}`
    const budget = budgets.get(key) ?? 0
    const good = cents(entry.goodQuantity || 0)
    const within = Math.min(good, budget)
    if (isPlanned) budgets.set(key, Math.max(0, budget - good))
    return {
      isPlanned,
      isOffPlan: isPlanned && Boolean(entry.destinationSlotId) && good > budget,
      budgetBefore: budget / 100,
      withinPlan: within / 100,
      excess: Math.max(0, good - budget) / 100,
    }
  })
}

export function splitReceiptExcess(
  entries: readonly TransferReceiptEntryValues[],
  index: number,
  state: ReceiptPlanState
): TransferReceiptEntryValues[] {
  const entry = entries[index]
  if (!entry || state.withinPlan <= 0 || state.excess <= 0) return [...entries]
  const next = [...entries]
  next.splice(
    index,
    1,
    { ...entry, goodQuantity: state.withinPlan, deviationReasonCode: '' },
    {
      ...entry,
      goodQuantity: state.excess,
      damagedQuantity: 0,
      missingQuantity: 0,
      reasonCode: '',
    }
  )
  return next
}

export function receiveScanProgress(entries: readonly TransferReceiptEntryValues[]) {
  const required = entries.filter((entry) => entry.goodQuantity > 0 || entry.damagedQuantity > 0)
  return {
    required: required.length,
    confirmed: required.filter(
      (entry) => entry.destinationSlotId && (entry.scannedSlotCode || entry.slotCodeUnreadable)
    ).length,
  }
}

/** So kế hoạch theo dòng, không đánh dấu mọi dòng chỉ vì token toàn phiếu đổi. */
export function changedReceivePlanLines(
  previous: TransferReceiveSheet,
  fresh: TransferReceiveSheet
) {
  const fingerprint = (sheet: TransferReceiveSheet, lineId: string) => {
    const line = sheet.lines.find((line) => line.lineId === lineId)
    return JSON.stringify([
      line?.planMode,
      line?.lots.map((lot) => [lot.lotId, lot.plan, lot.unplannedQuantity]),
      line?.planWarnings,
    ])
  }
  return new Set(
    fresh.lines
      .filter((line) => fingerprint(previous, line.lineId) !== fingerprint(fresh, line.lineId))
      .map((line) => line.lineId)
  )
}
