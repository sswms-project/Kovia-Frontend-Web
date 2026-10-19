import Link from 'next/link'
import type { Route } from 'next'
import { P } from '@/config/permissionCodes'
import { APP_ROUTES } from '@/routes/app-routes'

type StockIssueWorkspaceView = 'stockIssueRequests' | 'goodsReturnRequests' | 'supplierReturns'

interface StockIssueWorkspaceNavigationProps {
  readonly currentView: StockIssueWorkspaceView
  readonly permissions: readonly string[]
}

export function StockIssueWorkspaceNavigation({
  currentView,
  permissions,
}: StockIssueWorkspaceNavigationProps) {
  const linkClassName =
    'focus-visible:ring-ring touch-manipulation focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none'

  return (
    <nav data-slot="operational-workspace-navigation" aria-label="Không gian xuất kho và trả hàng">
      {permissions.includes(P.STOCK_ISSUE_REQUESTS_VIEW) ? (
        <Link
          href={APP_ROUTES.stockIssueRequests as Route}
          aria-current={currentView === 'stockIssueRequests' ? 'page' : undefined}
          className={linkClassName}
        >
          Xuất kho
        </Link>
      ) : null}
      {permissions.includes(P.GOODS_RETURN_REQUESTS_VIEW) ? (
        <Link
          href={APP_ROUTES.goodsReturnRequests as Route}
          aria-current={currentView === 'goodsReturnRequests' ? 'page' : undefined}
          className={linkClassName}
        >
          Trả hàng
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
