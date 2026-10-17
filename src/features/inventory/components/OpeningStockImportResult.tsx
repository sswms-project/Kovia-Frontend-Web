import Link from 'next/link'
import { BulkImportResult } from '@/components/operations/BulkImportResult'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/routes/app-routes'
import type { OpeningStockImportPreview } from '../types/opening-stock-import.types'

export function OpeningStockImportResult({
  id,
  code,
  preview,
  selected,
  onRestart,
}: {
  readonly id: string
  readonly code?: string
  readonly preview: OpeningStockImportPreview
  readonly selected: readonly string[]
  readonly onRestart: () => void
}) {
  return (
    <BulkImportResult
      entityLabel="dòng tồn đầu"
      title={`Đã tạo phiếu nháp${code ? ` ${code}` : ''}`}
      summary={
        <>
          Đã lưu {selected.length} dòng; không đưa {preview.totalCount - selected.length} dòng vào
          phiếu. Tồn kho chưa thay đổi; phiếu cần được gửi và duyệt.
        </>
      }
      listHref={APP_ROUTES.inventoryOpeningStocks}
      listLabel="Về danh sách tồn đầu kỳ"
      resultFileName="Ket_qua_ton_dau_ky.csv"
      onRestart={onRestart}
      items={preview.rows.map((row) => ({
        rowNumber: row.rowNumber,
        label: `${row.sheetName} · ${row.sku} · ${row.productName}`,
        isImported: selected.includes(row.rowKey),
        result: selected.includes(row.rowKey)
          ? 'Đã lưu vào phiếu nháp'
          : row.errors.join(' | ') || 'Không được chọn',
      }))}
    >
      <div>
        <Button asChild>
          <Link href={`/inventory/opening-stocks/${id}`}>Mở phiếu nháp</Link>
        </Button>
        <p className="text-muted-foreground mt-3 text-xs">
          Tệp nguồn đã được đính kèm làm bằng chứng. Báo cáo CSV gồm toàn bộ dòng, kể cả dòng không
          được chọn.
        </p>
      </div>
    </BulkImportResult>
  )
}
