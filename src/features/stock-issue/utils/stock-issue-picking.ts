import type { RecordStockPickingFormValues } from '../schemas/stock-issue.schema'
import type { StockIssueRequestSummary } from '../types/stock-issue.types'
import { stockIssueItemFactor } from './stock-issue-format'

export type StockPickingLine = RecordStockPickingFormValues['lines'][number]

export type StockPickingScanResult =
  | { readonly kind: 'shelf'; readonly slotCode: string; readonly lineIndex: number }
  | { readonly kind: 'product'; readonly lineIndex: number; readonly pickedQuantity: number }
  | { readonly kind: 'rejected'; readonly message: string }

const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' })

/** Cùng cách chuẩn hoá với backend để "A-01" và "a01" là một vị trí. */
export function normalizeScanCode(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function sameCode(left: string | null | undefined, right: string): boolean {
  const normalized = normalizeScanCode(left)
  return normalized !== '' && normalized === normalizeScanCode(right)
}

/**
 * Mỗi vị trí hệ thống đã giữ hàng cho phiếu thành một dòng lấy hàng, xếp theo khu, kệ, ô để nhân viên
 * đi một lượt. Số lượng tính theo đơn vị của dòng (thùng, kiện…) vì chỉ lấy nguyên kiện. Vị trí và
 * lô đã được giữ theo FEFO lúc giao việc nên không cho chọn lại ở đây.
 */
export function buildStockPickingLines(order: StockIssueRequestSummary): StockPickingLine[] {
  const entries = order.items.flatMap<{ sortKey: string; line: StockPickingLine }>((item) => {
    const factor = stockIssueItemFactor(item)
    const remainingQuantity = Math.max(0, item.quantity - item.pickedQuantity) / factor
    if (remainingQuantity <= 0) return []
    const base = {
      stockIssueRequestItemId: item.id,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      barcode: item.barcode,
      remainingQuantity,
      pickedQuantity: 0,
      scannedBarcode: '',
      scannedSlotCode: '',
      unitName: item.enteredUnitName,
      unitFactor: factor,
    }
    if (item.pickLocations.length === 0)
      return [
        {
          sortKey: '',
          line: {
            ...base,
            inventoryStockId: '',
            availableQuantity: 0,
            slotCode: '',
            lotNumber: null,
          },
        },
      ]
    return item.pickLocations.map((location) => ({
      sortKey: `${location.zoneCode}/${location.rackCode}/${location.slotCode}`,
      line: {
        ...base,
        inventoryStockId: location.inventoryStockId,
        availableQuantity: location.reservedQuantity / factor,
        slotCode: location.slotCode,
        lotNumber: location.lotNumber,
        directFromReceiving: location.directFromReceiving,
        allocationReason: location.allocationReason,
      },
    }))
  })

  return entries
    .sort(
      (left, right) =>
        collator.compare(left.sortKey, right.sortKey) ||
        collator.compare(left.line.sku, right.line.sku)
    )
    .map((entry) => entry.line)
}

function pickableQuantity(lines: readonly StockPickingLine[], index: number): number {
  const line = lines[index]
  if (!line) return 0
  const pickedForItem = lines.reduce(
    (total, candidate) =>
      candidate.stockIssueRequestItemId === line.stockIssueRequestItemId
        ? total + (candidate.pickedQuantity || 0)
        : total,
    0
  )
  return Math.min(
    line.availableQuantity - (line.pickedQuantity || 0),
    line.remainingQuantity - pickedForItem
  )
}

/**
 * Một ô quét cho cả mã kệ lẫn mã hàng: mã kệ chuyển vị trí đang đứng, mã hàng điền đủ số lượng cần
 * lấy của dòng tại vị trí đó (hoặc dòng còn thiếu đầu tiên theo lộ trình nếu chưa quét kệ).
 */
export function resolveStockPickingScan(
  lines: readonly StockPickingLine[],
  code: string,
  currentSlotCode: string | null
): StockPickingScanResult {
  const shelfIndex = lines.findIndex((line) => sameCode(line.slotCode, code))
  if (shelfIndex >= 0) {
    const slotCode = lines[shelfIndex]?.slotCode ?? ''
    const pendingAtShelf = lines.findIndex(
      (line, index) => sameCode(line.slotCode, slotCode) && pickableQuantity(lines, index) > 0
    )
    return { kind: 'shelf', slotCode, lineIndex: pendingAtShelf >= 0 ? pendingAtShelf : shelfIndex }
  }

  const productLines = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => sameCode(line.barcode, code) || sameCode(line.sku, code))
  const first = productLines[0]
  if (!first) return { kind: 'rejected', message: `Mã "${code}" không thuộc phiếu này.` }

  const candidates = currentSlotCode
    ? productLines.filter(({ line }) => sameCode(line.slotCode, currentSlotCode))
    : productLines
  if (candidates.length === 0)
    return {
      kind: 'rejected',
      message: `${first.line.productName} không được giữ tại vị trí ${currentSlotCode}.`,
    }

  const target = candidates.find(({ index }) => pickableQuantity(lines, index) > 0)
  if (!target)
    return {
      kind: 'rejected',
      message: currentSlotCode
        ? `${first.line.productName} đã lấy đủ tại vị trí ${currentSlotCode}.`
        : `${first.line.productName} đã quét đủ số lượng cần lấy.`,
    }

  return {
    kind: 'product',
    lineIndex: target.index,
    pickedQuantity: (target.line.pickedQuantity || 0) + pickableQuantity(lines, target.index),
  }
}
