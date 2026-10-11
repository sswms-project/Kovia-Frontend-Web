import type { AuditLogItem, AuditLogTimeRange } from '../../types/platform-services.types'

export interface AuditLogFilterValues {
  readonly search: string
  readonly timeRange: AuditLogTimeRange
  readonly dateFrom: string
  readonly dateTo: string
}

export interface AuditLogDirectoryProps {
  readonly title?: string
  readonly description?: string
  readonly items: AuditLogItem[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly filters: AuditLogFilterValues
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly hasActiveFilters: boolean
  readonly onApplyFilters: (filters: AuditLogFilterValues) => void
  readonly onClearFilters: () => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onRetry: () => void
  readonly onRefresh: () => void
}
