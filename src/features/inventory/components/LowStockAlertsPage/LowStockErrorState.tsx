'use client'
import Link from 'next/link'
import { RefreshCw, TriangleAlert, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import { getErrorKind, getApiErrorMessage, isApiErrorResponse } from '@/lib/api-error'
import { loginUrlFor } from '@/features/auth/utils/auth-return-url'
import { APP_ROUTES } from '@/routes/app-routes'
export function LowStockErrorState({
  title,
  error,
  onRetry,
}: {
  readonly title: string
  readonly error: unknown
  readonly onRetry: () => void
}) {
  const kind = getErrorKind(error).kind
  const changedSession =
    isApiErrorResponse(error) && error.statusCode === 409 && /phiên|tài khoản/i.test(error.message)
  const returnUrl =
    typeof window === 'undefined'
      ? APP_ROUTES.inventoryLowStockAlerts
      : window.location.pathname + window.location.search
  return (
    <Empty role="alert" className="min-h-64 flex-1 border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlert aria-hidden="true" className="text-destructive" />
        </EmptyMedia>
        <EmptyTitle>{kind === 'unauthorized' ? 'Phiên đăng nhập đã kết thúc' : title}</EmptyTitle>
        <EmptyDescription>
          {kind === 'unauthorized'
            ? 'Vui lòng đăng nhập lại để tiếp tục. Bộ lọc và trang đang xem sẽ được giữ trong đường dẫn quay lại.'
            : getApiErrorMessage(error, 'Không thể tải dữ liệu. Vui lòng thử lại.')}
        </EmptyDescription>
      </EmptyHeader>
      {kind === 'unauthorized' ? (
        <Button asChild>
          <Link href={loginUrlFor(returnUrl)}>
            <LogIn aria-hidden="true" />
            Đăng nhập lại
          </Link>
        </Button>
      ) : changedSession ? (
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw aria-hidden="true" />
          Tải lại trang
        </Button>
      ) : kind !== 'forbidden' && kind !== 'notFound' ? (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Thử lại
        </Button>
      ) : null}
    </Empty>
  )
}
