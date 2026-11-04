import type { StockIssueRequestItem } from '../types/stock-issue.types'

/** Quantities in pick details are base units; returned stock does not undo the original dispatch. */
export function stockIssuePdfQuantities(item: StockIssueRequestItem) {
  const factor = item.conversionFactor
  if (
    !Number.isFinite(factor) ||
    factor <= 0 ||
    !Number.isFinite(item.enteredQuantity) ||
    item.enteredQuantity < 0
  )
    throw new Error('Không thể xuất PDF: số lượng hoặc hệ số quy đổi không hợp lệ.')
  if (
    !Number.isFinite(item.quantity) ||
    Math.abs(item.enteredQuantity * factor - item.quantity) > 0.000001
  )
    throw new Error('Không thể xuất PDF: số lượng yêu cầu không khớp hệ số quy đổi.')
  const issued = item.pickDetails.filter((detail) => detail.issuedAt !== null)
  if (issued.some((detail) => !Number.isFinite(detail.pickedQuantity) || detail.pickedQuantity < 0))
    throw new Error('Không thể xuất PDF: số lượng thực xuất không hợp lệ.')
  return {
    requested: item.enteredQuantity,
    issued: issued.reduce((sum, detail) => sum + detail.pickedQuantity, 0) / factor,
  }
}
