import type { InboundRequestLine } from '@/features/inbound-request/types/inbound-request.types'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type { GoodsReceiptItem, ReceivingTaskLine } from '../types/inbound.types'
import { formatInventoryLocation } from '@/features/inventory/utils/inventory-format'

export interface InboundGoodsPreviewRow {
  readonly id: string
  readonly sku: string
  readonly name: string
  readonly unit: string
  readonly conversion: string | null
  readonly requested: number
  readonly received: number
  readonly closed?: number
  readonly remaining?: number
  readonly locations: readonly {
    readonly id: string
    readonly label: string
    readonly quantity: number
  }[]
  readonly lotNumber: string | null
  readonly expiryDate: string | null
}

export function requestGoodsPreviewRows(
  lines: readonly InboundRequestLine[]
): InboundGoodsPreviewRow[] {
  return lines.map((line) => ({
    id: line.id,
    sku: line.productSKU,
    name: line.productName,
    unit: line.unitName ?? '—',
    conversion:
      line.enteredUnitId !== line.baseUnitId &&
      line.enteredUnitName &&
      line.conversionFactorSnapshot > 0
        ? `1 ${line.enteredUnitName} = ${formatQuantity(line.conversionFactorSnapshot)} ${line.unitName ?? ''}`
        : null,
    requested: line.quantity,
    received: line.receivedQuantity,
    closed: line.closedQuantity,
    remaining: line.remainingQuantity,
    locations: [],
    lotNumber: null,
    expiryDate: null,
  }))
}

export function receivingGoodsPreviewRows(
  lines: readonly ReceivingTaskLine[]
): InboundGoodsPreviewRow[] {
  return lines.map((line) => ({
    id: line.inboundRequestItemId,
    sku: line.productSKU,
    name: line.productName,
    unit: '—',
    conversion: null,
    requested: line.orderedQuantity,
    received: line.receivedQuantity,
    locations: [],
    lotNumber: null,
    expiryDate: null,
  }))
}

export function receiptGoodsPreviewRows(
  items: readonly GoodsReceiptItem[]
): InboundGoodsPreviewRow[] {
  return items.map((item) => ({
    id: item.id,
    sku: item.productSKU,
    name: item.productName,
    unit: item.baseUnitName,
    conversion:
      item.enteredUnitId &&
      item.enteredUnitId !== item.baseUnitId &&
      item.enteredUnitName &&
      item.conversionFactorSnapshot > 0
        ? `1 ${item.enteredUnitName} = ${formatQuantity(item.conversionFactorSnapshot)} ${item.baseUnitName}`
        : null,
    requested: item.orderedQuantity,
    received: item.receivedQuantity,
    locations: item.putAwayDetails.map((detail) => ({
      id: detail.id,
      label: detail.isSystemDefaultSlot ? `Kệ ${detail.rackCode}` : detail.slotCode,
      quantity: detail.quantity,
    })),
    lotNumber: item.lotNumber,
    expiryDate: item.expiryDate,
  }))
}

export type InboundGoodsStage = 'receiving' | 'receipt' | 'putaway'
export interface InboundStageGoodsRow {
  readonly id: string
  readonly sku: string
  readonly name: string
  readonly unit: string
  readonly conversion: string | null
  readonly lot: string | null
  readonly expiry: string | null
  readonly quantities: Readonly<Record<string, number | undefined>>
  readonly plan: readonly {
    readonly id: string
    readonly label: string
    readonly quantity: number
  }[]
  readonly planState?: string
  readonly kept?: number
}

export const INBOUND_STAGE_COLUMNS: Record<
  InboundGoodsStage,
  readonly { readonly key: string; readonly label: string }[]
> = {
  receiving: [
    { key: 'requested', label: 'SL yêu cầu' },
    { key: 'received', label: 'Đã nhận' },
    { key: 'remaining', label: 'Còn cần nhận' },
  ],
  receipt: [
    { key: 'received', label: 'SL thực nhận' },
    { key: 'usable', label: 'Hàng đạt' },
    { key: 'damaged', label: 'Hàng hỏng' },
    { key: 'rejected', label: 'Từ chối' },
  ],
  putaway: [
    { key: 'usable', label: 'Hàng đạt' },
    { key: 'putaway', label: 'Đã cất' },
    { key: 'remaining', label: 'Còn cất' },
  ],
}

export function receivingStageGoodsRows(
  lines: readonly ReceivingTaskLine[]
): InboundStageGoodsRow[] {
  return lines.map((line) => ({
    id: line.inboundRequestItemId,
    sku: line.productSKU,
    name: line.productName,
    unit: line.baseUnitName ?? '—',
    conversion:
      line.enteredUnitId !== line.baseUnitId &&
      line.enteredUnitName &&
      (line.conversionFactorSnapshot ?? 0) > 0
        ? `1 ${line.enteredUnitName} = ${formatQuantity(line.conversionFactorSnapshot!)} ${line.baseUnitName ?? ''}`
        : null,
    lot: null,
    expiry: null,
    plan: [],
    quantities: {
      requested: line.orderedQuantity,
      received: line.receivedQuantity,
      remaining: line.remainingQuantity,
    },
  }))
}

export function receiptStageGoodsRows(
  items: readonly GoodsReceiptItem[],
  stage: 'receipt' | 'putaway'
): InboundStageGoodsRow[] {
  return items.map((item) => ({
    id: item.id,
    sku: item.productSKU,
    name: item.productName,
    unit: item.baseUnitName,
    conversion:
      item.enteredUnitId &&
      item.enteredUnitId !== item.baseUnitId &&
      item.enteredUnitName &&
      item.conversionFactorSnapshot > 0
        ? `1 ${item.enteredUnitName} = ${formatQuantity(item.conversionFactorSnapshot)} ${item.baseUnitName}`
        : null,
    lot: item.lotNumber,
    expiry: item.expiryDate,
    quantities:
      stage === 'receipt'
        ? {
            received: item.receivedQuantity,
            usable: item.usableQuantity,
            damaged: item.damagedQuantity,
            rejected: item.rejectedQuantity,
          }
        : {
            usable: item.usableQuantity,
            putaway: item.putAwayQuantity,
            remaining: item.remainingPutAwayQuantity,
          },
    kept: item.keptAtReceivingQuantity,
    planState: item.remainingPutAwayQuantity <= 0 ? 'Không còn cần cất' : 'Chưa cấu hình',
    plan:
      stage === 'putaway' && item.remainingPutAwayQuantity > 0
        ? item.putAwayPlan
            .filter((plan) => plan.quantity > 0)
            .map((plan) => ({
              id: plan.id,
              label: `${formatInventoryLocation({ ...plan, zoneCode: plan.zoneCode && plan.zoneName ? `${plan.zoneCode} · ${plan.zoneName}` : plan.zoneCode })}${!plan.zoneCode ? ' · Chưa có thông tin khu vực' : ''}`,
              quantity: plan.quantity,
            }))
        : [],
  }))
}
