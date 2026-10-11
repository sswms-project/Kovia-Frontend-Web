'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import type { StockIssueRequestStatus } from '../../types/stock-issue.types'
import { STOCK_ISSUE_REQUEST_STATUS_LABELS } from '../../utils/stock-issue-format'

export function StockIssueRequestStatusBadge({
  status,
}: {
  readonly status: StockIssueRequestStatus
}) {
  const reduceMotion = useReducedMotion()
  const variant =
    status === 'Cancelled'
      ? 'destructive'
      : status === 'Pending'
        ? 'outline'
        : status === 'Dispatched'
          ? 'default'
          : 'secondary'

  return (
    <motion.span
      key={status}
      className="inline-flex max-w-full"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Badge variant={variant} className="max-w-full">
        <span className="truncate">{STOCK_ISSUE_REQUEST_STATUS_LABELS[status]}</span>
      </Badge>
    </motion.span>
  )
}
