'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { APP_ROUTES } from '@/routes/app-routes'

/** Chuyển sang trang không có quyền khi đã biết quyền của người dùng và quyền đó không đủ. */
export function useUnauthorizedRedirect(isResolved: boolean, isAllowed: boolean): void {
  const router = useRouter()

  useEffect(() => {
    if (isResolved && !isAllowed) router.replace(APP_ROUTES.unauthorized)
  }, [isAllowed, isResolved, router])
}
