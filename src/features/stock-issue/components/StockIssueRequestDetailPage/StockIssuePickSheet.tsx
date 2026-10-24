import { formatDisplayDate, isoDateStringToDate } from '@/lib/date-format'
import { formatStockIssueLocation } from '../../utils/stock-issue-location'
import type { StockIssueRequestSummary } from '../../types/stock-issue.types'
import {
  formatStockIssueDate,
  formatStockIssueUnitQuantity,
  stockIssueItemFactor,
} from '../../utils/stock-issue-format'

interface PickSheetRow {
  readonly directFromReceiving?: boolean
  readonly key: string
  readonly sortKey: string
  readonly slotCode: string
  readonly sku: string
  readonly productName: string
  readonly lot: string
  readonly quantity: string
}

function expiryText(value: string | null): string {
  const date = value ? isoDateStringToDate(value.slice(0, 10)) : undefined
  return date ? ` (HSD ${formatDisplayDate(date)})` : ''
}

/** Mỗi vị trí còn phải lấy là một dòng, xếp theo khu, kệ, ô để đi kho một lượt. */
function buildRows(order: StockIssueRequestSummary): PickSheetRow[] {
  return order.items
    .flatMap((item) =>
      item.pickLocations.map((location) => ({
        key: `${item.id}:${location.inventoryStockId}`,
        sortKey: `${location.zoneCode}/${location.rackCode}/${location.slotCode}`,
        slotCode: formatStockIssueLocation(location),
        sku: item.sku,
        productName: item.productName,
        directFromReceiving: location.directFromReceiving,
        lot: location.lotNumber ? `${location.lotNumber}${expiryText(location.expiryDate)}` : '—',
        quantity: formatStockIssueUnitQuantity(
          location.reservedQuantity / stockIssueItemFactor(item),
          item.enteredUnitName
        ),
      }))
    )
    .sort((left, right) => left.sortKey.localeCompare(right.sortKey, 'vi', { numeric: true }))
}

export function StockIssuePickSheet({ order }: { readonly order: StockIssueRequestSummary }) {
  const rows = buildRows(order)

  return (
    <article className="bg-card mx-auto w-full max-w-4xl border p-6 print:max-w-none print:border-0 print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase">Phiếu lấy hàng</p>
          <h1 className="font-mono text-2xl font-semibold" translate="no">
            {order.stockIssueRequestCode}
          </h1>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Kho</dt>
          <dd className="font-medium">{order.warehouseName}</dd>
          <dt className="text-muted-foreground">Người lấy</dt>
          <dd className="font-medium">{order.assignedStaffName ?? 'Chưa giao'}</dd>
          <dt className="text-muted-foreground">Nhận hàng</dt>
          <dd className="font-medium">{order.recipientName}</dd>
          <dt className="text-muted-foreground">In lúc</dt>
          <dd className="font-medium">{formatStockIssueDate(new Date().toISOString())}</dd>
        </dl>
      </header>

      {rows.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Phiếu chưa giữ hàng tại vị trí nào nên chưa có gì để lấy. Hãy giao việc lấy hàng trước.
        </p>
      ) : (
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="w-8 py-2 pr-2">
                <span className="sr-only">Đã lấy</span>
              </th>
              <th className="py-2 pr-3">Vị trí</th>
              <th className="py-2 pr-3">Sản phẩm</th>
              <th className="py-2 pr-3">Lô</th>
              <th className="py-2 text-right">Số lượng lấy</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="break-inside-avoid border-b align-top">
                <td className="py-2 pr-2">
                  <span className="inline-block size-4 border-2" aria-hidden="true" />
                </td>
                <td className="py-2 pr-3">
                  <span className="font-mono font-semibold" translate="no">
                    {row.slotCode}
                  </span>
                  {row.directFromReceiving && (
                    <span className="block text-xs font-medium">Đi thẳng khu nhận → khu xuất</span>
                  )}
                </td>
                <td className="py-2 pr-3">
                  {row.productName}
                  <span className="text-muted-foreground block font-mono text-xs" translate="no">
                    {row.sku}
                  </span>
                </td>
                <td className="py-2 pr-3">{row.lot}</td>
                <td className="py-2 text-right font-medium tabular-nums">{row.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <footer className="text-muted-foreground mt-6 flex justify-between border-t pt-3 text-xs">
        <span>Chỉ lấy nguyên kiện theo đơn vị ghi trên phiếu.</span>
        <span>Chữ ký người lấy: ______________</span>
      </footer>
    </article>
  )
}
