import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SupplierInboundResponsePreview } from '../../types/inbound-request.types'
import { formatOperationalDate, formatQuantity } from '../../utils/inbound-request-format'

export function SupplierOrderSummary({
  preview,
}: {
  readonly preview: SupplierInboundResponsePreview
}) {
  return (
    <section className="space-y-4" aria-labelledby="supplier-order-summary">
      <div>
        <p className="text-primary text-xs font-medium">Đơn đặt hàng từ {preview.tenantName}</p>
        <h1 id="supplier-order-summary" className="mt-1 font-mono text-2xl font-semibold">
          {preview.inboundRequestCode}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Gửi tới {preview.supplierName || 'quý nhà cung cấp'}. Vui lòng kiểm tra và phản hồi đơn
          hàng bên dưới.
        </p>
      </div>
      <dl className="grid gap-4 border p-4 sm:grid-cols-2">
        <SummaryItem
          label="Địa chỉ giao hàng"
          value={
            preview.warehouseAddress?.trim() || 'Chưa cập nhật — vui lòng liên hệ bên đặt hàng'
          }
        />
        <SummaryItem label="Kho nhận" value={preview.warehouseName ?? 'Chưa xác định'} />
        <SummaryItem
          label="Ngày giao dự kiến"
          value={formatOperationalDate(preview.expectedDate)}
        />
        {preview.sourceReference ? (
          <SummaryItem label="Mã tham chiếu" value={preview.sourceReference} />
        ) : null}
      </dl>
      <div className="overflow-x-auto border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead className="text-right">Số lượng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.lines.map((line) => (
              <TableRow key={`${line.sku}-${line.unit}`}>
                <TableCell className="font-mono text-xs">{line.sku}</TableCell>
                <TableCell>{line.productName}</TableCell>
                <TableCell className="text-right whitespace-nowrap tabular-nums">
                  {formatQuantity(line.quantity)} {line.unit}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

function SummaryItem({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 text-sm font-medium break-words">{value}</dd>
    </div>
  )
}
