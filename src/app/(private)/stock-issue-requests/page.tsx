import type { Route } from 'next'
import { redirect } from 'next/navigation'
import StockIssueRequestPage from '@/features/stock-issue/pages/StockIssueRequestPage'
import { parseStockIssueListSearchParams } from '@/features/stock-issue/utils/stock-issue-list-filters'
import { APP_ROUTES } from '@/routes/app-routes'

export default async function StockIssueRequestsRoutePage({
  searchParams,
}: {
  searchParams: Promise<{
    requestId?: string
    id?: string
    status?: string
    warehouseId?: string
    dispatchedFrom?: string
    dispatchedTo?: string
  }>
}) {
  const params = await searchParams
  // Liên kết cũ từ thông báo và báo cáo mở phiếu bằng query; giờ phiếu có trang chi tiết riêng.
  const requestId = params.requestId ?? params.id
  if (requestId) redirect(APP_ROUTES.stockIssueRequestDetail(requestId) as Route)
  const initialFilters = parseStockIssueListSearchParams(params)
  return (
    <StockIssueRequestPage
      // A new link (e.g. from Kovia AI) starts from its own filters instead of the previous ones.
      key={JSON.stringify(initialFilters)}
      initialFilters={initialFilters}
    />
  )
}
