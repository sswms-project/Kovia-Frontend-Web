'use client'

import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'
import type { Route } from 'next'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/routes/app-routes'
import { StockIssuePickSheet } from '../components/StockIssueRequestDetailPage'
import { useStockIssueRequestQuery } from '../hooks/use-stock-issue-requests'

export default function StockIssuePickSheetPage({
  stockIssueRequestId,
}: {
  readonly stockIssueRequestId: string
}) {
  const detailQuery = useStockIssueRequestQuery(stockIssueRequestId)

  if (detailQuery.isLoading) return <OperationalLoadingState rows={6} />
  if (detailQuery.isError || !detailQuery.data)
    return (
      <OperationalErrorState
        title="Không thể tải phiếu lấy hàng"
        onRetry={() => void detailQuery.refetch()}
      />
    )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link href={APP_ROUTES.stockIssueRequestDetail(stockIssueRequestId) as Route}>
            <ArrowLeft aria-hidden="true" />
            Quay lại chi tiết
          </Link>
        </Button>
        <Button type="button" size="sm" onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          In phiếu lấy hàng
        </Button>
      </div>
      <StockIssuePickSheet order={detailQuery.data} />
    </div>
  )
}
