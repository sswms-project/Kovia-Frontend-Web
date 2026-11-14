import {
  STOCK_ISSUE_REQUEST_STATUSES,
  type StockIssueRequestStatus,
} from '../types/stock-issue.types'

/** Filters a link may open the list with (e.g. Kovia AI's "Xem tất cả N phiếu đã xuất"). */
export interface StockIssueListInitialFilters {
  readonly status?: StockIssueRequestStatus
  readonly warehouseId?: string
  /** Dispatch-date range (`YYYY-MM-DD`, Vietnam days), distinct from the creation-date filter of the page. */
  readonly dispatchedFrom?: string
  readonly dispatchedTo?: string
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DAY = /^\d{4}-\d{2}-\d{2}$/

function isDay(value: string | undefined): value is string {
  return (
    typeof value === 'string' && DAY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  )
}

/** Invalid values are dropped, not guessed; a dispatch range needs both ends in order. */
export function parseStockIssueListSearchParams(params: {
  readonly status?: string
  readonly warehouseId?: string
  readonly dispatchedFrom?: string
  readonly dispatchedTo?: string
}): StockIssueListInitialFilters {
  const status = STOCK_ISSUE_REQUEST_STATUSES.find((value) => value === params.status)
  const range =
    isDay(params.dispatchedFrom) &&
    isDay(params.dispatchedTo) &&
    params.dispatchedFrom <= params.dispatchedTo
      ? { dispatchedFrom: params.dispatchedFrom, dispatchedTo: params.dispatchedTo }
      : {}
  return {
    ...(status ? { status } : {}),
    ...(params.warehouseId && GUID.test(params.warehouseId)
      ? { warehouseId: params.warehouseId }
      : {}),
    ...range,
  }
}
