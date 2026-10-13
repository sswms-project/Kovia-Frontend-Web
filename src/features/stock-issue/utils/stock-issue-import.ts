import type {
  ImportStockIssueRequestGroup,
  StockIssueImportPreviewRow,
} from '../types/stock-issue.types'

export const STOCK_ISSUE_IMPORT_MAX_ROWS = 1000

/** Các dòng cùng đơn vị nhận và tham chiếu gộp thành một phiếu; cả tệp đã thuộc một kho. */
export function groupStockIssueImportRows(
  rows: readonly StockIssueImportPreviewRow[]
): ImportStockIssueRequestGroup[] {
  const groups = new Map<string, ImportStockIssueRequestGroup>()
  for (const row of rows) {
    if (!row.stockRecipientId || !row.productId || !row.quantity) continue
    const key = `${row.stockRecipientId}|${row.referenceCode ?? ''}`
    const group = groups.get(key) ?? {
      stockRecipientId: row.stockRecipientId,
      referenceCode: row.referenceCode,
      purpose: row.purpose,
      items: [],
    }
    group.purpose ??= row.purpose
    group.items.push({ productId: row.productId, quantity: row.quantity, unitId: row.unitId })
    groups.set(key, group)
  }
  return [...groups.values()]
}
