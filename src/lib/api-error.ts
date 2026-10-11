import type { ApiErrorResponse } from '@/types/api'
import { logger } from './logger'

const FALLBACK_MESSAGE = 'Đã xảy ra lỗi. Vui lòng thử lại.'

export const isApiErrorResponse = (value: unknown): value is ApiErrorResponse =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ApiErrorResponse).statusCode === 'number' &&
  typeof (value as ApiErrorResponse).message === 'string'

// FluentValidation returns { field: [msg, ...] }; flatten it so the user sees which
// field failed instead of a bare "Validation failed".
const flattenFieldErrors = (errors: Record<string, string[]>): string =>
  Object.entries(errors)
    .filter(([field]) => field !== 'code')
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
    .join(' | ')

/** Stable machine-readable error code returned through the API error envelope. */
export function getApiErrorCode(error: unknown): string | undefined {
  if (!isApiErrorResponse(error)) return undefined
  return error.errors?.code?.find((code) => code.trim().length > 0)
}

/** Human-readable message for a toast. */
export function getApiErrorMessage(error: unknown, fallback = FALLBACK_MESSAGE): string {
  if (!isApiErrorResponse(error)) return error instanceof Error ? error.message : fallback

  const fieldErrors = error.errors ? flattenFieldErrors(error.errors) : ''
  return fieldErrors ? `${error.message} — ${fieldErrors}` : error.message
}

/**
 * Single-line form for `logger.error`. Plain objects serialize to `{}` in the Next.js
 * dev overlay, which hides the status code and field errors we actually need.
 */
export function formatApiError(error: unknown): string {
  if (!isApiErrorResponse(error)) return String(error)
  return `[${error.statusCode}] ${getApiErrorMessage(error)}`
}

/**
 * Lỗi 4xx là server từ chối có chủ đích (thiếu quyền, dữ liệu đã đổi, quét sai mã...) và đã báo cho người dùng,
 * nên chỉ cảnh báo kèm nội dung; chỉ lỗi bất ngờ mới ghi ở mức lỗi (hiện overlay khi dev).
 */
export function logApiError(error: unknown) {
  if (isApiErrorResponse(error) && error.statusCode >= 400 && error.statusCode < 500) {
    logger.warn(`Yêu cầu bị từ chối (${error.statusCode}): ${error.message}`)
    return
  }
  logger.error(error)
}
