import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getApiErrorMessage } from '@/lib/api-error'

interface AiDraftPrefillNoticeProps {
  readonly isLoading: boolean
  /** Lỗi tải hoặc bản nháp không dùng được; form vẫn để trống để nhập tay. */
  readonly error: unknown
}

/** Dòng báo trên đầu form tạo phiếu khi form được mở từ bản nháp của Trợ lý AI. */
export function AiDraftPrefillNotice({ isLoading, error }: AiDraftPrefillNoticeProps) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Không thể điền sẵn từ bản nháp của Trợ lý AI</AlertTitle>
        <AlertDescription>{getApiErrorMessage(error)}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert role="status">
      <AlertDescription>
        {isLoading
          ? 'Đang tải bản nháp của Trợ lý AI…'
          : 'Đang điền sẵn từ bản nháp của Trợ lý AI. Hãy kiểm tra lại trước khi lưu.'}
      </AlertDescription>
    </Alert>
  )
}
