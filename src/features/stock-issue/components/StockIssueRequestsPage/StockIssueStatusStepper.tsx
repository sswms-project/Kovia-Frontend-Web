'use client'

import { Check, ChevronDown, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { StockIssueRequestStatus } from '../../types/stock-issue.types'
import { STOCK_ISSUE_REQUEST_STATUS_LABELS } from '../../utils/stock-issue-format'

const FLOW_STEPS: readonly StockIssueRequestStatus[] = [
  'Pending',
  'ReleasedForPicking',
  'Picking',
  'Picked',
  'AuthorizedForDispatch',
  'Dispatched',
]

const STEP_ACTORS: Partial<Record<StockIssueRequestStatus, string>> = {
  Pending: 'Người lập phiếu tạo',
  ReleasedForPicking: 'Quản lý kho giao việc',
  Picking: 'Nhân viên kho lấy hàng',
  Picked: 'Nhân viên kho lấy đủ hàng',
  AuthorizedForDispatch: 'Chủ doanh nghiệp cho phép',
  Dispatched: 'Nhân viên kho xác nhận rời kho',
}

interface StockIssueStatusStepperProps {
  readonly status: StockIssueRequestStatus
  readonly hasAssignedPicker?: boolean
}

export function StockIssueStatusStepper({
  status,
  hasAssignedPicker = false,
}: StockIssueStatusStepperProps) {
  const [expanded, setExpanded] = useState(false)
  const isCancelled = status === 'Cancelled'
  const effectiveStatus: StockIssueRequestStatus =
    status === 'Pending' && hasAssignedPicker ? 'ReleasedForPicking' : status
  const currentIndex = isCancelled ? -1 : FLOW_STEPS.indexOf(effectiveStatus)
  const isFinished = status === 'Dispatched'
  const nextStep = !isCancelled && !isFinished ? FLOW_STEPS[currentIndex + 1] : undefined

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="flex items-start justify-between gap-3 md:hidden">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">Tiến trình xuất kho</p>
          <p className="mt-1 text-sm font-semibold">
            {STOCK_ISSUE_REQUEST_STATUS_LABELS[effectiveStatus]}
          </p>
          {nextStep ? (
            <p className="text-muted-foreground mt-1 text-xs">
              Tiếp theo: {STOCK_ISSUE_REQUEST_STATUS_LABELS[nextStep]}
            </p>
          ) : null}
        </div>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm">
            {expanded ? 'Thu gọn' : 'Xem các bước'}
            <ChevronDown aria-hidden="true" className={cn(expanded && 'rotate-180')} />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent forceMount className="hidden data-[state=open]:block md:block">
        <ol
          aria-label="Tiến trình xuất kho"
          className="mt-4 flex flex-col gap-3 md:mt-0 md:grid md:grid-cols-6 md:gap-4"
        >
          {FLOW_STEPS.map((step, index) => {
            const isDone = isFinished || index < currentIndex
            const isCurrent = !isFinished && index === currentIndex
            return (
              <li
                key={step}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex min-w-0 items-start gap-2 md:flex-col',
                  isCancelled && 'opacity-50'
                )}
              >
                <div className="flex w-full items-center gap-2 max-md:w-auto">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs',
                      isDone && 'border-primary bg-primary text-primary-foreground',
                      isCurrent && 'border-primary bg-muted text-primary ring-primary/15 ring-4',
                      !isDone && !isCurrent && 'text-muted-foreground'
                    )}
                  >
                    {isDone ? <Check className="size-3.5" /> : index + 1}
                  </span>
                  {index < FLOW_STEPS.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'hidden h-px flex-1 md:block',
                        isDone ? 'bg-primary' : 'bg-border'
                      )}
                    />
                  ) : null}
                </div>
                <span className="flex min-w-0 flex-col gap-1">
                  <span
                    className={cn(
                      'text-xs',
                      isCurrent ? 'font-semibold' : isDone ? 'font-medium' : 'text-muted-foreground'
                    )}
                  >
                    {STOCK_ISSUE_REQUEST_STATUS_LABELS[step]}
                  </span>
                  <span className="text-muted-foreground text-xs">{STEP_ACTORS[step]}</span>
                </span>
              </li>
            )
          })}
          {isCancelled ? (
            <li
              aria-current="step"
              className="text-destructive flex items-center gap-2 text-sm font-semibold md:col-span-6"
            >
              <X aria-hidden="true" className="size-4" />
              {STOCK_ISSUE_REQUEST_STATUS_LABELS.Cancelled}
            </li>
          ) : null}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  )
}
