import { RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface TransferChangedBannerProps {
  readonly onReload: () => void
  readonly onDismiss: () => void
}

/** Báo có thay đổi từ người khác mà không xóa dữ liệu đang nhập; lần lưu tiếp theo vẫn bị BE kiểm phiên bản. */
export function TransferChangedBanner({ onReload, onDismiss }: TransferChangedBannerProps) {
  return (
    <Alert role="status" aria-live="polite" className="shrink-0">
      <RefreshCw aria-hidden="true" />
      <AlertTitle>Dữ liệu vừa thay đổi</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-2">
        <span>
          Có người vừa cập nhật phiếu này. Dữ liệu bạn đang nhập được giữ nguyên; tải lại để xem bản
          mới nhất.
        </span>
        <span className="flex gap-2">
          <Button type="button" size="sm" onClick={onReload}>
            Tải lại
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
            Để sau
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  )
}
