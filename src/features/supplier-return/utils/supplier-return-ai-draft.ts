import type { AiSupplierReturnPayload } from '@/features/ai-assistant/types/ai-action-draft-payloads.types'
import { formatInventoryLocation } from '@/features/inventory/utils/inventory-format'
import type { CreateSupplierReturnFormValues } from '../schemas/supplier-return.schema'
import type { SupplierReturnStockOption } from '../types/supplier-return.types'

type CreateSupplierReturnLines = CreateSupplierReturnFormValues['lines']

/**
 * Maps an AI draft to the create dialog. The draft carries only stock ids and quantities, so each
 * line starts with minimal display data; `enrichSupplierReturnLines` fills it in from the source stocks.
 */
export function supplierReturnFormValuesFromAiDraft(
  payload: AiSupplierReturnPayload
): CreateSupplierReturnFormValues {
  return {
    warehouseId: payload.warehouseId,
    supplierId: payload.supplierId,
    sourceGoodsReceiptId: payload.sourceGoodsReceiptId ?? '',
    reason: payload.reason,
    negotiationNote: payload.negotiationNote ?? '',
    lines: payload.lines.map((line) => ({
      inventoryStockId: line.inventoryStockId,
      label: line.inventoryStockId,
      maxQuantity: line.quantity,
      unit: '',
      quantity: line.quantity,
      quantityPrecision: 2,
    })),
  }
}

/** Adds label, unit, limits and source group (as the dialog does when a stock is picked) to prefilled lines. */
export function enrichSupplierReturnLines(
  lines: CreateSupplierReturnLines,
  stocks: readonly SupplierReturnStockOption[]
): CreateSupplierReturnLines {
  return lines.map((line) => {
    const stock = stocks.find((candidate) => candidate.id === line.inventoryStockId)
    if (!stock) return line
    return {
      ...line,
      label: `${stock.sku} - ${stock.productName} · ${formatInventoryLocation(stock)}${stock.lotNumber ? ` · Lô ${stock.lotNumber}` : ''}`,
      maxQuantity: stock.returnableQuantity,
      unit: stock.unitName ?? '',
      quantityPrecision: stock.quantityPrecision ?? 2,
      sourceGroupKey: `${stock.productId}:${stock.lotId ?? ''}`,
      sourceRemainingQuantity: stock.sourceRemainingQuantity,
    }
  })
}
