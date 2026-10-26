'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/ErrorState'
import { logApiError } from '@/lib/api-error'

// Lưới an toàn cho trang public; trang private đã có app/(private)/error.tsx giữ layout.
export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => logApiError(error), [error])

  return (
    <main className="bg-background text-foreground flex min-h-dvh">
      <ErrorState error={error} onRetry={unstable_retry} />
    </main>
  )
}
