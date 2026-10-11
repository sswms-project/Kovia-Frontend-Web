import { z } from 'zod'
import type { ReportFilterValues } from '../schemas/warehouse-report.schema'
import type { WarehouseReportQuery } from '../types/warehouse-report.types'

export type ReportRouteFilters = Readonly<Record<string, string | string[] | undefined>>
export function routeFilter(filters: ReportRouteFilters | undefined, key: string): string {
  const value = filters?.[key]
  return typeof value === 'string' ? value : ''
}
export function initialReportFilters(
  type: string,
  filters?: ReportRouteFilters
): ReportFilterValues {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(
    new Date()
  )
  const dateFrom = routeFilter(filters, 'dateFrom')
  const dateTo = routeFilter(filters, 'dateTo')
  const historyDefault = [
    'inbound-progress',
    'outbound-progress',
    'transfer-reconciliation',
    'count-adjustment',
    'task-progress',
  ].includes(type)
  return {
    warehouseId: routeFilter(filters, 'warehouseId'),
    productId: routeFilter(filters, 'productId'),
    search: routeFilter(filters, 'search'),
    status: routeFilter(filters, 'status'),
    assigneeId: routeFilter(filters, 'assigneeId'),
    taskType: routeFilter(filters, 'taskType'),
    deadline: routeFilter(filters, 'deadline'),
    allDates:
      !['inventory-balance', 'slow-moving'].includes(type) &&
      (routeFilter(filters, 'allDates') === '1' || (!dateFrom && historyDefault)),
    dateFrom: z.iso.date().safeParse(dateFrom).success ? dateFrom : `${today.slice(0, 7)}-01`,
    dateTo: z.iso.date().safeParse(dateTo).success ? dateTo : today,
  }
}
export function buildReportQuery(
  type: string,
  values: ReportFilterValues,
  usesPeriod: boolean
): WarehouseReportQuery {
  return {
    warehouseIds: values.warehouseId ? [values.warehouseId] : undefined,
    productId: type !== 'task-progress' ? values.productId || undefined : undefined,
    search: values.search || undefined,
    status: values.status || undefined,
    assigneeId: type === 'task-progress' ? values.assigneeId || undefined : undefined,
    taskType: type === 'task-progress' ? values.taskType || undefined : undefined,
    deadline: type === 'task-progress' ? values.deadline || undefined : undefined,
    dateFrom: usesPeriod && !values.allDates ? values.dateFrom : undefined,
    dateTo: usesPeriod && !values.allDates ? values.dateTo : undefined,
    pageNumber: 1,
    pageSize: 25,
  }
}
export function rememberReportFilters(values: ReportFilterValues): void {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values))
    if (typeof value === 'string' && value) params.set(key, value)
  if (values.allDates) {
    params.set('allDates', '1')
    params.delete('dateFrom')
    params.delete('dateTo')
  }
  params.set('autoRun', '1')
  window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
}
