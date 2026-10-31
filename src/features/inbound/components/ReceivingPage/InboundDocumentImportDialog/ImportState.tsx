import { AlertCircle, CheckCircle2, FileSearch, PackagePlus, RotateCcw, Undo2 } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { APP_ROUTES } from '@/routes/app-routes'
import type { InboundDocumentImport } from '../../../types/inbound.types'

interface ImportStateProps {
  readonly importData: InboundDocumentImport | null
  readonly draftReceiptId: string | null
  readonly isLoading: boolean
  readonly onManualFallback: () => void
  readonly onCancel: () => void
}

export function ImportState({
  importData,
  draftReceiptId,
  isLoading,
  onManualFallback,
  onCancel,
}: ImportStateProps) {
  if (draftReceiptId) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 className="text-primary size-10" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">Đã tạo phiếu nhận hàng nháp</h3>
          <p className="text-muted-foreground max-w-md text-sm">
            Phiếu vẫn cần được gửi và duyệt kết quả kiểm hàng trước khi hàng được cất vào vị trí
            kho.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href={APP_ROUTES.goodsReceiptDetail(draftReceiptId) as Route}>
              <PackagePlus data-icon="inline-start" aria-hidden="true" />
              Mở phiếu để gửi duyệt
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={APP_ROUTES.goodsReceipts as Route}>Xem danh sách phiếu nhận hàng</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (
    isLoading ||
    !importData ||
    ['Pending', 'Uploaded', 'Scanning', 'Processing'].includes(importData.status)
  ) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center" aria-live="polite">
        <Spinner className="size-8" />
        <div>
          <h3 className="text-sm font-semibold">Đang phân tích chứng từ…</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Hệ thống đang trích xuất, đối chiếu yêu cầu nhập kho và kiểm tra số lượng.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          <Undo2 data-icon="inline-start" aria-hidden="true" />
          Hủy / Chọn tệp khác
        </Button>
      </div>
    )
  }

  if (importData.status === 'Failed') {
    const isQuotaExceeded = importData.failureCode === 'ProviderQuotaExceeded'
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>
            {isQuotaExceeded ? 'Đã hết hạn mức phân tích AI' : 'Không thể phân tích chứng từ'}
          </AlertTitle>
          <AlertDescription>
            {isQuotaExceeded
              ? 'Hạn mức phân tích chứng từ tạm thời đã hết. Vui lòng thử lại sau ít phút hoặc tiếp tục nhập hàng thủ công.'
              : (importData.failureMessage ??
                'Bạn có thể thử lại hoặc tiếp tục nhập hàng thủ công.')}
          </AlertDescription>
        </Alert>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            <Undo2 data-icon="inline-start" aria-hidden="true" />
            Hủy / Chọn tệp khác
          </Button>
          <Button type="button" variant="outline" onClick={onManualFallback}>
            <RotateCcw data-icon="inline-start" />
            Tiếp tục nhập thủ công
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Alert>
      <FileSearch aria-hidden="true" />
      <AlertTitle>Chưa có dữ liệu review</AlertTitle>
      <AlertDescription>Hãy đóng cửa sổ và thử phân tích lại chứng từ.</AlertDescription>
    </Alert>
  )
}
