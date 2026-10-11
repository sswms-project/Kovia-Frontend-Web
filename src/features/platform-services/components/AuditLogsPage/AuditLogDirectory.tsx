'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { Button } from '@/components/ui/button'
import type { AuditLogItem } from '../../types/platform-services.types'
import { AuditLogDetailSheet } from './AuditLogDetailSheet'
import { AuditLogFilters } from './AuditLogFilters'
import { AuditLogList } from './AuditLogList'
import type { AuditLogDirectoryProps } from './types'

export function AuditLogDirectory(props: AuditLogDirectoryProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null)
  return (
    <section
      className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3"
      aria-labelledby="audit-title"
    >
      <div>
        <h2 id="audit-title" className="text-xl font-semibold">
          {props.title ?? 'Nhật ký hoạt động'}
        </h2>
        {props.description ? (
          <p className="text-muted-foreground mt-1 text-sm">{props.description}</p>
        ) : null}
      </div>
      <OperationalListPanel aria-label="Nhật ký hoạt động">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <AuditLogFilters
            key={`${props.filters.timeRange}-${props.filters.dateFrom}-${props.filters.dateTo}-${props.filters.search}`}
            filters={props.filters}
            onApply={props.onApplyFilters}
            onClear={props.onClearFilters}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Làm mới nhật ký hoạt động"
            disabled={props.isFetching}
            onClick={props.onRefresh}
          >
            <RefreshCw
              className={props.isFetching ? 'motion-safe:animate-spin' : undefined}
              aria-hidden="true"
            />
          </Button>
        </div>
        <div data-slot="operational-list-body" className="min-h-0">
          <AuditLogList
            items={props.items}
            isLoading={props.isLoading}
            isFetching={props.isFetching}
            isError={props.isError}
            hasActiveFilters={props.hasActiveFilters}
            onView={setSelectedLog}
            onRetry={props.onRetry}
          />
        </div>
        {!props.isLoading && !props.isError && props.totalCount > 0 ? (
          <OperationalPagination
            page={props.page}
            pageSize={props.pageSize}
            totalCount={props.totalCount}
            isPending={props.isFetching}
            onPageChange={props.onPageChange}
            onPageSizeChange={props.onPageSizeChange}
          />
        ) : null}
      </OperationalListPanel>
      <AuditLogDetailSheet
        log={selectedLog}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null)
        }}
      />
    </section>
  )
}
