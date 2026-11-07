'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/routes/app-routes'
import { useAuthStore } from '@/stores/auth.store'
import { useMyLegalTerms } from '../hooks/use-legal-documents'

export function LegalTermsReminder() {
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  const [dismissed, setDismissed] = useState<string | null>(null)
  const { data } = useMyLegalTerms(actorId, 1, Boolean(actorId))
  const current = data?.current
  if (!current || !data?.needsConfirmation || dismissed === current.id) return null

  return (
    <Alert className="mb-3">
      <AlertTitle>Điều khoản sử dụng có bản mới</AlertTitle>
      <AlertDescription>
        <p>Chủ doanh nghiệp có thể đọc và xác nhận phiên bản {current.version} khi thuận tiện.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" asChild>
            <Link href={APP_ROUTES.myLegalTerms}>Xem thay đổi</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDismissed(current.id)}>
            Để sau
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
