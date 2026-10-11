'use client'

import Link from 'next/link'
import {
  Boxes,
  ChartNoAxesColumnIncreasing,
  History,
  LockKeyhole,
  ShieldAlert,
  PackagePlus,
  Scale,
  SlidersHorizontal,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { P } from '@/config/permissionCodes'
import { APP_ROUTES } from '@/routes/app-routes'
import { cn } from '@/lib/utils'

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

interface InventoryWorkspaceNavigationProps {
  readonly currentView: InventoryWorkspaceView
  readonly permissions: readonly string[]
}

export function InventoryWorkspaceNavigation({
  currentView,
  permissions,
}: InventoryWorkspaceNavigationProps) {
  const navigationRef = useRef<HTMLElement>(null)
  const permissionSignature = permissions.join('|')

  useEffect(() => {
    const activeLink = navigationRef.current?.querySelector<HTMLElement>('[aria-current="page"]')
    activeLink?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [currentView, permissionSignature])

  const linkClassName = (view: InventoryWorkspaceView) =>
    cn(
      'flex h-9 shrink-0 touch-manipulation items-center gap-2 rounded-sm border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
      view === currentView
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
    )

  return (
    <nav
      ref={navigationRef}
      className="flex shrink-0 gap-1 overflow-x-auto border-b px-1 pb-1"
      aria-label="Không gian kiểm soát tồn kho"
    >
      {permissions.includes(P.INVENTORY_VIEW) ? (
        <Link
          href={APP_ROUTES.inventory}
          aria-current={currentView === 'availability' ? 'page' : undefined}
          className={linkClassName('availability')}
        >
          <Boxes className="size-4" aria-hidden="true" />
          Tồn kho khả dụng
        </Link>
      ) : null}
      {/* Tạm ẩn tab Kiểm kê (đã chuyển sang sidebar Hoạt Động Kho)
      {permissions.includes(P.CYCLE_COUNTS_VIEW) ? (
        <Link
          href={APP_ROUTES.cycleCounts}
          aria-current={currentView === 'cycle-counts' ? 'page' : undefined}
          className={linkClassName('cycle-counts')}
        >
          <ClipboardCheck className="size-4" aria-hidden="true" />
          Kiểm kê
        </Link>
      ) : null}
      */}
      {permissions.includes(P.STOCK_ADJUSTMENTS_VIEW) ? (
        <Link
          href={APP_ROUTES.stockAdjustments}
          aria-current={currentView === 'adjustments' ? 'page' : undefined}
          className={linkClassName('adjustments')}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Điều chỉnh
        </Link>
      ) : null}
      {permissions.includes(P.INVENTORY_VIEW) ? (
        <>
          <Link
            href={APP_ROUTES.inventoryMovements}
            aria-current={currentView === 'movements' ? 'page' : undefined}
            className={linkClassName('movements')}
          >
            <History className="size-4" aria-hidden="true" />
            Lịch sử biến động
          </Link>
          <Link
            href={APP_ROUTES.inventoryReservations}
            aria-current={currentView === 'reservations' ? 'page' : undefined}
            className={linkClassName('reservations')}
          >
            <LockKeyhole className="size-4" aria-hidden="true" />
            Tồn đang giữ
          </Link>
          <Link
            href={APP_ROUTES.inventoryDamageCases}
            aria-current={currentView === 'damage-cases' ? 'page' : undefined}
            className={linkClassName('damage-cases')}
          >
            <ShieldAlert className="size-4" aria-hidden="true" />
            Hàng hỏng
          </Link>
          <Link
            href={APP_ROUTES.inventoryOpeningStocks}
            aria-current={currentView === 'opening-stocks' ? 'page' : undefined}
            className={linkClassName('opening-stocks')}
          >
            <PackagePlus className="size-4" aria-hidden="true" />
            Tồn đầu
          </Link>
          <Link
            href={APP_ROUTES.inventoryAbcClassification}
            aria-current={currentView === 'abc' ? 'page' : undefined}
            className={linkClassName('abc')}
          >
            <ChartNoAxesColumnIncreasing className="size-4" aria-hidden="true" />
            Phân loại ABC
          </Link>
          <Link
            href={APP_ROUTES.inventoryDiscrepancies}
            aria-current={currentView === 'discrepancies' ? 'page' : undefined}
            className={linkClassName('discrepancies')}
          >
            <Scale className="size-4" aria-hidden="true" />
            Chênh lệch
          </Link>
        </>
      ) : null}
    </nav>
  )
}
