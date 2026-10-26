'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { useStockIssueRequestAuditLogsQuery } from '../../hooks/use-stock-issue-requests'
import { formatStockIssueDate } from '../../utils/stock-issue-format'

const PAGE_SIZE = 10

interface StockIssueAuditTimelineProps {
  readonly stockIssueRequestId: string
  readonly limit?: number
}

export function StockIssueAuditTimeline({
  stockIssueRequestId,
  limit,
}: StockIssueAuditTimelineProps) {
  const reduceMotion = useReducedMotion()
  const [pageNumber, setPageNumber] = useState(1)
  const query = useStockIssueRequestAuditLogsQuery(stockIssueRequestId, {
    pageNumber,
    pageSize: limit ?? PAGE_SIZE,
  })
  const data = query.data?.data
  const items = data?.items ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1

  if (query.isLoading) return <OperationalLoadingState />
  if (query.isError)
    return (
      <OperationalErrorState
        title="Không thể tải nhật ký thao tác"
        onRetry={() => void query.refetch()}
      />
    )
  if (items.length === 0)
    return <p className="text-muted-foreground text-sm">Chưa có nhật ký thao tác.</p>

  return (
    <div className="flex flex-col gap-3">
      <ol className="border-border relative ml-2 flex flex-col gap-4 border-l pl-4">
        <AnimatePresence initial={false} mode="popLayout">
          {items.slice(0, limit ?? items.length).map((log, index) => (
            <motion.li
              key={log.id}
              layout={!reduceMotion}
              className="relative min-w-0 break-words"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2, delay: reduceMotion ? 0 : index * 0.04 }}
            >
              <span
                aria-hidden="true"
                className="bg-primary absolute top-1.5 -left-[1.3rem] size-2 rounded-full"
              />
              <p className={cn('text-sm font-medium', limit && 'line-clamp-2')}>
                {log.actionLabel}
              </p>
              <p className={cn('text-muted-foreground text-xs', limit && 'line-clamp-2')}>
                {log.actorName} · {formatStockIssueDate(log.createdAt)}
              </p>
              {log.description ? (
                <p className={cn('text-xs', limit && 'line-clamp-2')}>{log.description}</p>
              ) : null}
              {log.reason ? (
                <p className={cn('text-muted-foreground text-xs', limit && 'line-clamp-2')}>
                  Lý do: {log.reason}
                </p>
              ) : null}
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      {!limit && totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((value) => value - 1)}
          >
            Trước
          </Button>
          <span className="text-muted-foreground text-xs tabular-nums">
            {pageNumber}/{totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pageNumber >= totalPages}
            onClick={() => setPageNumber((value) => value + 1)}
          >
            Sau
          </Button>
        </div>
      ) : null}
    </div>
  )
}
