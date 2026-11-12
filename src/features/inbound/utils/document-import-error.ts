import { isApiErrorResponse } from '@/lib/api-error'

const QUOTA_MESSAGE =
  'Đã hết hạn mức phân tích AI tạm thời. Vui lòng thử lại sau hoặc nhập hàng thủ công.'
const FALLBACK_MESSAGE = 'Không thể phân tích chứng từ. Bạn vẫn có thể nhập hàng thủ công.'

/** Maps a failed import start to a user-facing message; server validation messages are already Vietnamese. */
export function startImportErrorMessage(error: unknown): string {
  if (!isApiErrorResponse(error)) return FALLBACK_MESSAGE
  if (error.statusCode === 429) return QUOTA_MESSAGE
  if ((error.statusCode === 400 || error.statusCode === 415) && error.message) return error.message
  return FALLBACK_MESSAGE
}
