import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import type { ReportOptions, WarehouseReport } from '../../schemas/warehouse-report.schema'
import { reportStatusLabel } from '../../utils/report-status'

interface ReportSummaryProps {
  readonly report: WarehouseReport
  readonly options?: ReportOptions
}
export function ReportSummary({ report, options }: ReportSummaryProps) {
  const filters = report.appliedFilters
  const warehouses = filters.warehouseIds.map(
    (id) =>
      options?.warehouses.find((item) => item.id === id)?.name ??
      report.items.find((item) => item.warehouseId === id)?.warehouseName ??
      id
  )
  const product = options?.products.find((item) => item.id === filters.productId)
  const productName = product
    ? `${product.sku} · ${product.name}`
    : (report.items.find((item) => item.productId === filters.productId)?.productName ??
      filters.productId)
  const scope = [
    warehouses.length ? `Kho: ${warehouses.join(', ')}` : 'Không có kho trong phạm vi',
    filters.dateFrom
      ? `Kỳ: ${filters.dateFrom} → ${filters.dateTo}`
      : report.reportType === 'inventory-snapshot' || report.reportType === 'replenishment'
        ? 'Thời điểm hiện tại'
        : 'Tất cả ngày',
    filters.productId ? `Mặt hàng: ${productName}` : undefined,
    filters.categoryId
      ? `Nhóm hàng: ${filters.categoryName ?? options?.categories?.find((item) => item.id === filters.categoryId)?.name ?? filters.categoryId} (gồm nhóm con)`
      : undefined,
    filters.search ? `Từ khóa: ${filters.search}` : undefined,
    filters.status ? `Trạng thái: ${reportStatusLabel(filters.status)}` : undefined,
    filters.assigneeId
      ? `Người được giao: ${options?.assignees.find((item) => item.id === filters.assigneeId)?.name ?? filters.assigneeId}`
      : undefined,
    filters.taskType ? `Loại: ${reportStatusLabel(filters.taskType)}` : undefined,
    filters.deadline ? `Hạn: ${reportStatusLabel(filters.deadline)}` : undefined,
  ].filter(Boolean)
  const compactScope = [
    warehouses.length === 1 ? warehouses[0] : `${warehouses.length} kho`,
    ...scope.slice(1),
  ].join(' · ')
  return (
    <section
      aria-label="Phạm vi báo cáo đã áp dụng"
      className="flex min-w-0 shrink-0 items-center gap-3 text-sm"
    >
      <p className="text-muted-foreground min-w-0 flex-1 truncate" title={scope.join(' · ')}>
        {compactScope}
      </p>
      <Sheet>
        <SheetTrigger asChild>
          <Button type="button" variant="ghost" className="h-10 shrink-0 text-sm">
            Thông tin báo cáo
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Thông tin báo cáo</SheetTitle>
            <SheetDescription>Phạm vi đã áp dụng và cách đọc số liệu.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 text-sm">
            <p className="text-muted-foreground">
              Tạo lúc{' '}
              {new Date(report.generatedAt).toLocaleString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
              })}
            </p>
            <ul className="list-disc space-y-2 pl-5">
              {scope.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h2 className="font-semibold">
              Cách đọc số liệu{report.warnings.length ? ` · ${report.warnings.length} lưu ý` : ''}
            </h2>
            <p>{report.timeBasis}</p>
            {report.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
            <p className="text-muted-foreground">
              Excel xuất toàn bộ dữ liệu theo phạm vi này. Không cộng số lượng khác SKU/ĐVT.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  )
}
