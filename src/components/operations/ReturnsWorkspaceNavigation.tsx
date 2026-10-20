import Link from 'next/link'
import type { Route } from 'next'
import { P } from '@/config/permissionCodes'
import { APP_ROUTES } from '@/routes/app-routes'

type ReturnsWorkspaceView = 'goodsReturnRequests' | 'supplierReturns'

interface ReturnsWorkspaceNavigationProps {
  readonly currentView: ReturnsWorkspaceView
  readonly permissions: readonly string[]
}

/** Chọn loại trả hàng trong cùng một màn: khách trả hàng về kho hoặc kho trả hàng cho nhà cung cấp. */
export function ReturnsWorkspaceNavigation({
  currentView,
  permissions,
}: ReturnsWorkspaceNavigationProps) {
  const linkClassName =
    'focus-visible:ring-ring touch-manipulation focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none'

  return (
    <nav data-slot="operational-workspace-navigation" aria-label="Không gian trả hàng">
      {permissions.includes(P.GOODS_RETURN_REQUESTS_VIEW) ? (
        <Link
          href={APP_ROUTES.goodsReturnRequests as Route}
          aria-current={currentView === 'goodsReturnRequests' ? 'page' : undefined}
          className={linkClassName}
        >
          Trả hàng khách
        </Link>
      ) : null}
      {permissions.includes(P.SUPPLIER_RETURNS_VIEW) ? (
        <Link
          href={APP_ROUTES.supplierReturns as Route}
          aria-current={currentView === 'supplierReturns' ? 'page' : undefined}
          className={linkClassName}
        >
          Trả hàng NCC
        </Link>
      ) : null}
    </nav>
  )
}
