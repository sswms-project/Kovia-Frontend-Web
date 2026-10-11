import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ProductImportPreview } from '../../types/product-import.types'
import type { ProductImportReviewFilters } from './ProductImportReview'

export function ProductImportResultTable({
  preview,
  importedRows,
  view,
  onViewChange,
}: {
  readonly preview: ProductImportPreview
  readonly importedRows: readonly number[]
  readonly view: ProductImportReviewFilters
  readonly onViewChange: (view: ProductImportReviewFilters) => void
}) {
  const imported = new Set(importedRows)
  const visible = preview.rows.slice((view.page - 1) * view.pageSize, view.page * view.pageSize)
  return (
    <OperationalListPanel aria-label="Kết quả từng sản phẩm">
      <Table>
        <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10">
          <TableRow>
            <TableHead>Dòng nguồn</TableHead>
            <TableHead>Mã hàng</TableHead>
            <TableHead>Tên hàng</TableHead>
            <TableHead>Kết quả</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((row) => (
            <TableRow key={row.rowNumber}>
              <TableCell className="max-w-48 wrap-anywhere whitespace-normal">
                {row.sheetName}:{row.rowNumber}
              </TableCell>
              <TableCell className="max-w-48 font-mono wrap-anywhere whitespace-normal">
                {row.sku}
              </TableCell>
              <TableCell className="max-w-80 min-w-48 wrap-anywhere whitespace-normal">
                <details>
                  <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2">
                    <span className="line-clamp-2" title={row.productName}>
                      {row.productName}
                    </span>
                  </summary>
                  <p className="mt-2">{row.productName}</p>
                </details>
              </TableCell>
              <TableCell className="max-w-96 min-w-56 wrap-anywhere whitespace-normal">
                <Badge variant={imported.has(row.rowNumber) ? 'default' : 'outline'}>
                  {imported.has(row.rowNumber) ? 'Đã nhập' : 'Bỏ qua'}
                </Badge>
                <p className="mt-1 text-xs">
                  {imported.has(row.rowNumber)
                    ? `${row.unitConversions.length} đơn vị quy đổi`
                    : row.errors.length
                      ? row.errors.map((issue) => issue.message).join(' ')
                      : 'Không được chọn hoặc quy đổi không hợp lệ.'}
                </p>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <OperationalPagination
        page={view.page}
        pageSize={view.pageSize}
        totalCount={preview.rows.length}
        onPageChange={(page) => onViewChange({ ...view, page })}
        onPageSizeChange={(pageSize) => onViewChange({ ...view, page: 1, pageSize })}
      />
    </OperationalListPanel>
  )
}
