'use client'

import { useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { USER_ROLES } from '@/config/roles'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { APP_ROUTES } from '@/routes/app-routes'
import { AuditLogDirectory, type AuditLogFilterValues } from '../components/AuditLogsPage'
import { useAuditLogsQuery } from '../hooks/use-platform-services'
import { auditLogFiltersSchema } from '../schemas/platform-services.schema'
import { buildAuditLogQuery } from '../utils/platform-services-query'
import { canViewAuditLogs } from '../utils/platform-services-permissions'
import { AUDIT_LOG_TIME_RANGES } from '../types/platform-services.types'

export default function AuditLogsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const serializedParams = searchParams.toString()
  const params = useMemo(() => new URLSearchParams(serializedParams), [serializedParams])
  const queryParams = useMemo(() => buildAuditLogQuery(params), [params])
  const meQuery = useMeQuery()
  const hasAuditLogPermission = canViewAuditLogs(meQuery.data?.permissions ?? [])
  const isWarehouseStaff = meQuery.data?.role === USER_ROLES.WarehouseStaff
  const auditLogsQuery = useAuditLogsQuery(queryParams, meQuery.isSuccess && hasAuditLogPermission)

  useEffect(() => {
    if (meQuery.isSuccess && !hasAuditLogPermission) {
      router.replace(APP_ROUTES.unauthorized)
    }
  }, [hasAuditLogPermission, meQuery.isSuccess, router])
  const filters: AuditLogFilterValues = {
    search: params.get('search') ?? '',
    timeRange:
      AUDIT_LOG_TIME_RANGES.find((item) => item === params.get('timeRange')) ?? 'this-week',
    dateFrom: params.get('dateFrom') ?? '',
    dateTo: params.get('dateTo') ?? '',
  }
  const hasActiveFilters = Boolean(params.get('search')) || filters.timeRange !== 'this-week'

  function applyFilters(values: AuditLogFilterValues) {
    const result = auditLogFiltersSchema.safeParse(values)
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Bộ lọc không hợp lệ.')
      return
    }
    const next = new URLSearchParams()
    next.set('pageSize', String(queryParams.pageSize))
    for (const [key, value] of Object.entries(result.data)) {
      if (value) next.set(key, value)
    }
    navigate(next)
  }

  if (meQuery.isLoading || (meQuery.isSuccess && !hasAuditLogPermission)) {
    return (
      <div className="flex min-h-48 items-center justify-center" role="status">
        <span className="text-muted-foreground text-sm">Đang kiểm tra quyền truy cập…</span>
      </div>
    )
  }

  if (meQuery.isError) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3" role="alert">
        <p>Không thể kiểm tra quyền truy cập.</p>
        <Button type="button" variant="outline" onClick={() => void meQuery.refetch()}>
          Thử lại
        </Button>
      </div>
    )
  }

  return (
    <AuditLogDirectory
      title={isWarehouseStaff ? 'Hoạt động của tôi' : 'Nhật ký hoạt động'}
      description={
        isWarehouseStaff
          ? 'Các thao tác do bạn thực hiện trong những kho được phân công.'
          : 'Theo dõi các thay đổi nghiệp vụ trong phạm vi được phép.'
      }
      items={auditLogsQuery.data?.items ?? []}
      totalCount={auditLogsQuery.data?.totalCount ?? 0}
      page={queryParams.pageNumber}
      pageSize={queryParams.pageSize}
      filters={filters}
      isLoading={auditLogsQuery.isLoading}
      isFetching={auditLogsQuery.isFetching}
      isError={auditLogsQuery.isError}
      hasActiveFilters={hasActiveFilters}
      onApplyFilters={applyFilters}
      onClearFilters={() => {
        const next = new URLSearchParams()
        next.set('pageSize', String(queryParams.pageSize))
        navigate(next)
      }}
      onPageChange={(page) => {
        const next = new URLSearchParams(params)
        next.set('page', String(page))
        navigate(next)
      }}
      onPageSizeChange={(pageSize) => {
        const next = new URLSearchParams(params)
        next.set('page', '1')
        next.set('pageSize', String(pageSize))
        navigate(next)
      }}
      onRetry={() => void auditLogsQuery.refetch()}
      onRefresh={() => void auditLogsQuery.refetch()}
    />
  )
}

function navigate(params: URLSearchParams) {
  const query = params.toString()
  window.history.pushState(
    null,
    '',
    query ? `${APP_ROUTES.auditLogs}?${query}` : APP_ROUTES.auditLogs
  )
}
