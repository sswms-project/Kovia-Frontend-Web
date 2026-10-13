import { getApiErrorMessage, isApiErrorResponse, logApiError } from '@/lib/api-error'

export type TransferErrorKind = 'conflict' | 'unknown-result' | 'rejected'

const NETWORK_FAILURE_PATTERN =
  /network error|timeout of \d+ms exceeded|econnaborted|failed to fetch/i

// Các bản BE hiện tại chưa trả mã lỗi trạng thái; chỉ nhận diện các câu kiểm tra workflow đã biết.
const STALE_TRANSFER_PATTERN =
  /(?:đã|vừa) thay đổi|tải lại|hãy bắt đầu nhận hàng trước khi nộp phiếu kiểm hàng|đợt xuất chưa có phiếu kiểm hàng đang chờ cất/i

export interface TransferErrorDescription {
  readonly kind: TransferErrorKind
  readonly message: string
}

/**
 * HTTP 409 dùng cả cho dữ liệu cũ và lỗi nghiệp vụ; chỉ dữ liệu cũ mới cần tải lại. Lỗi mạng chưa rõ
 * kết quả nên không được báo thành công giả hoặc tự thao tác lại trước khi đối chiếu.
 */
export function describeTransferError(error: unknown, fallback: string): TransferErrorDescription {
  if (!isApiErrorResponse(error)) {
    return { kind: 'unknown-result', message: getApiErrorMessage(error, fallback) }
  }
  if (error.statusCode === 409) {
    const message = error.message.trim()
    const sentence = message.charAt(0).toLocaleUpperCase('vi') + message.slice(1)
    const staleData =
      error.errors?.code?.includes('TRANSFER_PUTAWAY_PLAN_CHANGED') ||
      STALE_TRANSFER_PATTERN.test(message)
    return {
      kind: staleData ? 'conflict' : 'rejected',
      // 409 cũng dùng cho lỗi nghiệp vụ (ví dụ vị trí không cho trộn sản phẩm): chỉ gợi ý tải lại khi lỗi
      // nói dữ liệu đã thay đổi mà chưa kèm gợi ý.
      message:
        staleData && !/tải lại/i.test(sentence)
          ? `${sentence} Hãy tải lại dữ liệu mới nhất rồi thao tác lại.`
          : sentence,
    }
  }
  if (
    error.statusCode >= 500 ||
    error.statusCode <= 0 ||
    NETWORK_FAILURE_PATTERN.test(error.message)
  ) {
    return {
      kind: 'unknown-result',
      message:
        'Chưa xác định được kết quả do mất kết nối. Hãy tải lại dữ liệu để kiểm tra trước khi thao tác lại.',
    }
  }
  return { kind: 'rejected', message: getApiErrorMessage(error, fallback) }
}

/** Ghi log lỗi của lệnh điều chuyển theo cùng quy tắc lỗi 4xx của mọi lệnh ghi. */
export const logTransferError = logApiError
