import StockIssueRequestPage from '@/features/stock-issue/pages/StockIssueRequestPage'

export default async function StockIssueRequestsRoutePage({
  searchParams,
}: {
  searchParams: Promise<{ requestId?: string; id?: string }>
}) {
  const params = await searchParams
  const requestId = params.requestId ?? params.id
  return <StockIssueRequestPage key={requestId ?? 'list'} initialRequestId={requestId} />
}
