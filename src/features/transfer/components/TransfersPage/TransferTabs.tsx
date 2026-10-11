'use client'

import Link from 'next/link'
import { APP_ROUTES } from '@/routes/app-routes'
import type { TransferStage } from '../../types/transfer.types'

export const TRANSFER_STAGE_LABELS: Readonly<Record<TransferStage, string>> = {
  request: 'Yêu cầu điều chuyển',
  transfer: 'Điều chuyển',
  discrepancy: 'Chờ xử lý chênh lệch',
}

const STAGE_ORDER: readonly TransferStage[] = ['request', 'transfer', 'discrepancy']

interface TransferTabsProps {
  readonly stage: TransferStage
  readonly openDiscrepancyCount: number
}

/** Tab theo giai đoạn nghiệp vụ, cùng kiểu thanh điều hướng của trang Nhập kho; trạng thái chi tiết nằm ở ô lọc. */
export function TransferTabs({ stage, openDiscrepancyCount }: TransferTabsProps) {
  return (
    <nav data-slot="operational-workspace-navigation" aria-label="Nghiệp vụ điều chuyển kho">
      {STAGE_ORDER.map((value) => (
        <Link
          key={value}
          href={APP_ROUTES.transfersTab(value)}
          aria-current={value === stage ? 'page' : undefined}
          className="focus-visible:ring-ring touch-manipulation focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
        >
          {TRANSFER_STAGE_LABELS[value]}
          {value === 'discrepancy' && openDiscrepancyCount > 0 ? (
            <span className="bg-primary text-primary-foreground ml-2 min-w-5 px-1.5 text-center text-xs tabular-nums">
              {openDiscrepancyCount}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  )
}
