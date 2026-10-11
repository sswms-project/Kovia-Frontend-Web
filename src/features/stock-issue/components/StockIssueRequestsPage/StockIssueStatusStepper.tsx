'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Check, X } from 'lucide-react'
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

interface StockIssueStatusStepperProps {
  readonly status: StockIssueRequestStatus
  readonly hasAssignedPicker?: boolean
}

export function StockIssueStatusStepper({
  status,
  hasAssignedPicker = false,
}: StockIssueStatusStepperProps) {
  const reduceMotion = useReducedMotion()
  const isCancelled = status === 'Cancelled'
  const effectiveStatus: StockIssueRequestStatus =
    status === 'Pending' && hasAssignedPicker ? 'ReleasedForPicking' : status
  const currentIndex = isCancelled ? -1 : FLOW_STEPS.indexOf(effectiveStatus)

  return (
    <ol aria-label="Tiến trình xuất kho" className="space-y-0">
      {FLOW_STEPS.map((step, index) => {
        const isDone = index < currentIndex
        const isCurrent = index === currentIndex
        const isLast = index === FLOW_STEPS.length - 1
        return (
          <motion.li
            key={step}
            aria-current={isCurrent ? 'step' : undefined}
            className="relative flex gap-3 pb-4 last:pb-0"
            initial={reduceMotion ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: isCancelled ? 0.5 : 1, x: 0 }}
            transition={{ duration: 0.25, delay: reduceMotion ? 0 : index * 0.05 }}
          >
            {!isLast ? (
              <span aria-hidden="true" className="bg-border absolute top-6 bottom-0 left-3 w-px">
                <motion.span
                  className="bg-primary block h-full w-full origin-top"
                  initial={reduceMotion ? false : { scaleY: 0 }}
                  animate={{ scaleY: isDone ? 1 : 0 }}
                  transition={{ duration: 0.3, delay: reduceMotion ? 0 : index * 0.08 }}
                />
              </span>
            ) : null}
            <motion.span
              aria-hidden="true"
              className={cn(
                'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs',
                isDone && 'bg-primary text-primary-foreground border-primary',
                isCurrent && 'border-primary text-primary bg-background',
                !isDone && !isCurrent && 'bg-background text-muted-foreground'
              )}
              animate={isCurrent && !reduceMotion ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={
                isCurrent && !reduceMotion
                  ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.2 }
              }
            >
              {isDone ? <Check className="size-3.5" /> : index + 1}
            </motion.span>
            <span
              className={cn(
                'pt-0.5 text-sm',
                isCurrent ? 'font-semibold' : isDone ? 'font-medium' : 'text-muted-foreground'
              )}
            >
              {STOCK_ISSUE_REQUEST_STATUS_LABELS[step]}
            </span>
          </motion.li>
        )
      })}
      {isCancelled ? (
        <motion.li
          aria-current="step"
          className="text-destructive flex items-center gap-3 pt-2 text-sm font-semibold"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          <span className="border-destructive flex size-6 items-center justify-center rounded-full border">
            <X className="size-3.5" aria-hidden="true" />
          </span>
          {STOCK_ISSUE_REQUEST_STATUS_LABELS.Cancelled}
        </motion.li>
      ) : null}
    </ol>
  )
}
