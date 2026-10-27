import type { ReturnGoodsPreviewRow } from '@/components/operations/ReturnGoodsPreview'
import type { GoodsReturnRequestSummary } from '../types/stock-issue.types'
import { RETURN_ITEM_CONDITION_LABELS, formatStockIssueQuantity } from './stock-issue-format'

export const CUSTOMER_RETURN_GOODS_COLUMNS = [
  'Mã hàng',
  'Tên hàng',
  'ĐVT',
  'SL trả',
  'Tình trạng trên phiếu',
  'Tình trạng thực nhận',
  'Vị trí nhập lại',
  'Lô',
] as const

export function customerReturnGoodsRows(
  document: GoodsReturnRequestSummary
): ReturnGoodsPreviewRow[] {
  const restocked = document.status === 'Restocked'
  return document.items.map((line) => {
    const location = line.restockLocation
      ?.split(/\s*\/\s*/)
      .filter((part) => part && part !== '__SYSTEM_DEFAULT__')
      .join(' / ')
    const scrapped = restocked && (line.actualCondition ?? line.condition) === 'Scrap'
    return {
      id: line.id,
      cells: [
        line.sku,
        line.productName,
        line.unitName || '—',
        formatStockIssueQuantity(line.quantity),
        RETURN_ITEM_CONDITION_LABELS[line.condition],
        restocked && line.actualCondition
          ? RETURN_ITEM_CONDITION_LABELS[line.actualCondition]
          : 'Chưa ghi nhận',
        scrapped
          ? 'Không nhập kho'
          : location
            ? `${restocked ? '' : 'Dự kiến: '}${location}`
            : 'Chưa ghi nhận',
        line.lotNumber || 'Không theo lô',
      ],
    }
  })
}
