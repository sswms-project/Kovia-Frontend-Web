'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { StockIssueRequestSummary } from '../../types/stock-issue.types'
import { StockIssueAuditTimeline } from '../StockIssueRequestsPage'

export function StockIssueAuditCard({ order }: { readonly order: StockIssueRequestSummary }) {
  const [open, setOpen] = useState(false)

  return (
    <section
      className="bg-card order-3 w-full min-w-0 border"
      aria-labelledby="stock-issue-request-audit"
    >
      <div className="border-b p-4">
        <h2 id="stock-issue-request-audit" className="text-sm font-semibold">
          Nhật ký thao tác
        </h2>
        <p className="text-muted-foreground mt-1 text-xs">3 hoạt động gần nhất</p>
      </div>
      <div className="flex flex-col gap-4 p-4">
        <StockIssueAuditTimeline stockIssueRequestId={order.id} limit={3} />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" className="w-full">
              Xem toàn bộ nhật ký
            </Button>
          </SheetTrigger>
          <SheetContent
            className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
            aria-describedby="stock-issue-history-description"
          >
            <SheetHeader className="shrink-0 border-b pr-12">
              <SheetTitle>Nhật ký thao tác</SheetTitle>
              <SheetDescription id="stock-issue-history-description">
                {order.stockIssueRequestCode} · Mới nhất trước
              </SheetDescription>
            </SheetHeader>
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
              data-scrollbar="slim"
            >
              {open ? <StockIssueAuditTimeline stockIssueRequestId={order.id} /> : null}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </section>
  )
}
