'use client'

import Link from 'next/link'
import { useEffect, useRef, type ReactNode } from 'react'
import { P } from '@/config/permissionCodes'
import { APP_ROUTES } from '@/routes/app-routes'

type InventoryWorkspaceView =
  | 'availability'
  | 'movements'
  | 'reservations'
  | 'abc'
  | 'cycle-counts'
  | 'adjustments'
  | 'damage-cases'
  | 'opening-stocks'
  | 'discrepancies'
  | 'anomalies'

interface InventoryWorkspaceNavigationProps {
  readonly currentView: InventoryWorkspaceView
  readonly permissions: readonly string[]
  readonly actions?: ReactNode
}

export function InventoryWorkspaceNavigation({
  currentView,
  permissions,
  actions,
}: InventoryWorkspaceNavigationProps) {
  const navigationRef = useRef<HTMLElement>(null)
  const permissionSignature = permissions.join('|')

  useEffect(() => {
    const activeLink = navigationRef.current?.querySelector<HTMLElement>('[aria-current="page"]')
    activeLink?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [currentView, permissionSignature])

  const linkClassName =
    'focus-visible:ring-ring touch-manipulation focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none'

  return (
    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <nav
        ref={navigationRef}
        data-slot="operational-workspace-navigation"
        data-scrollbar="slim"
        className="w-full min-w-0 flex-1"
        aria-label="Không gian kiểm soát tồn kho"
      >
        {permissions.includes(P.INVENTORY_VIEW) ? (
          <Link
            href={APP_ROUTES.inventory}
            aria-current={currentView === 'availability' ? 'page' : undefined}
            className={linkClassName}
          >
            Tồn kho khả dụng
          </Link>
        ) : null}
        {/* Tạm ẩn tab Kiểm kê (đã chuyển sang sidebar Hoạt Động Kho)
      {permissions.includes(P.CYCLE_COUNTS_VIEW) ? (
        <Link
          href={APP_ROUTES.cycleCounts}
          aria-current={currentView === 'cycle-counts' ? 'page' : undefined}
          className={linkClassName}
        >
          Kiểm kê
        </Link>
      ) : null}
      */}
        {permissions.includes(P.STOCK_ADJUSTMENTS_VIEW) ? (
          <Link
            href={APP_ROUTES.stockAdjustments}
            aria-current={currentView === 'adjustments' ? 'page' : undefined}
            className={linkClassName}
          >
            Điều chỉnh
          </Link>
        ) : null}
        {permissions.includes(P.INVENTORY_VIEW) ? (
          <>
            <Link
              href={APP_ROUTES.inventoryMovements}
              aria-current={currentView === 'movements' ? 'page' : undefined}
              className={linkClassName}
            >
              Lịch sử biến động
            </Link>
            <Link
              href={APP_ROUTES.inventoryReservations}
              aria-current={currentView === 'reservations' ? 'page' : undefined}
              className={linkClassName}
            >
              Tồn đang giữ
            </Link>
            <Link
              href={APP_ROUTES.inventoryDamageCases}
              aria-current={currentView === 'damage-cases' ? 'page' : undefined}
              className={linkClassName}
            >
              Hàng hỏng
            </Link>
            <Link
              href={APP_ROUTES.inventoryOpeningStocks}
              aria-current={currentView === 'opening-stocks' ? 'page' : undefined}
              className={linkClassName}
            >
              Tồn đầu
            </Link>
            <Link
              href={APP_ROUTES.inventoryAbcClassification}
              aria-current={currentView === 'abc' ? 'page' : undefined}
              className={linkClassName}
            >
              Phân loại ABC
            </Link>
            <Link
              href={APP_ROUTES.inventoryDiscrepancies}
              aria-current={currentView === 'discrepancies' ? 'page' : undefined}
              className={linkClassName}
            >
              Chênh lệch
            </Link>
          </>
        ) : null}
        {permissions.includes(P.INVENTORY_ANOMALIES_VIEW) ? (
          <Link
            href={APP_ROUTES.inventoryAnomalies}
            aria-current={currentView === 'anomalies' ? 'page' : undefined}
            className={linkClassName}
          >
            Bất thường
          </Link>
        ) : null}
      </nav>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
