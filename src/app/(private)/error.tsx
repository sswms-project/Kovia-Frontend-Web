'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/ErrorState'
import { logApiError } from '@/lib/api-error'

// Bắt lỗi render/dữ liệu của mọi trang private; layout (sidebar, header) vẫn giữ nguyên.
export default function PrivateError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => logApiError(error), [error])

  return <ErrorState error={error} onRetry={unstable_retry} />
}
