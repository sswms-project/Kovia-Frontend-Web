'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import { rowActivationProps } from '@/features/inbound/utils/row-activation-props'
import { APP_ROUTES } from '@/routes/app-routes'
import type {
  StockIssueCapabilities,
  StockIssueRequestSummary,
  StockIssueRowActionHandlers,
} from '../../types/stock-issue.types'
import {
  formatStockIssueDate,
  summarizeStockIssueProgress,
  summarizeStockIssueSlots,
} from '../../utils/stock-issue-format'
import { StockIssueRequestRowActions } from './StockIssueRequestRowActions'
import { StockIssueRequestStatusBadge } from './StockIssueRequestStatusBadge'

interface StockIssueRequestMobileListProps {
  readonly items: readonly StockIssueRequestSummary[]
  readonly capabilities: StockIssueCapabilities
  readonly handlers: StockIssueRowActionHandlers
}

export function StockIssueRequestMobileList({
  items,
  capabilities,
  handlers,
}: StockIssueRequestMobileListProps) {
  const router = useRouter()
  return (
    <ItemGroup className="gap-0 md:hidden">
      {items.map((item) => {
        const detailHref = APP_ROUTES.stockIssueRequestDetail(item.id) as Route
        const progress = summarizeStockIssueProgress(item)
        const pendingSlots = summarizeStockIssueSlots(item)
        return (
          <Item
            key={item.id}
            {...rowActivationProps(() => router.push(detailHref), 'border-b last:border-b-0')}
          >
            <ItemContent className="min-w-0">
              <ItemTitle className="flex flex-wrap items-center gap-2">
                <Link
                  href={detailHref}
                  className="text-primary max-w-full min-w-0 truncate font-mono font-semibold underline-offset-4 hover:underline"
                  translate="no"
                >
                  {item.stockIssueRequestCode}
                </Link>
                <StockIssueRequestStatusBadge status={item.status} />
              </ItemTitle>
              <ItemDescription>Tạo lúc {formatStockIssueDate(item.createdAt)}</ItemDescription>
              <ItemDescription>
                {item.recipientName} · {item.warehouseName}
                {item.assignedStaffName ? ` · Lấy hàng: ${item.assignedStaffName}` : ''}
              </ItemDescription>
              <ItemDescription>
                {progress.doneText} / {progress.totalText} {progress.suffix} đã lấy ·{' '}
                {item.items.length} dòng hàng
              </ItemDescription>
              {pendingSlots ? <ItemDescription>Kệ cần lấy: {pendingSlots}</ItemDescription> : null}
            </ItemContent>
            <div data-row-ignore>
              <StockIssueRequestRowActions
                order={item}
                capabilities={capabilities}
                handlers={handlers}
              />
            </div>
          </Item>
        )
      })}
    </ItemGroup>
  )
}
