import StockIssueRequestDetailPage from '@/features/stock-issue/pages/StockIssueRequestDetailPage'

interface StockIssueRequestDetailRoutePageProps {
  readonly params: Promise<{ stockIssueRequestId: string }>
}

export default async function StockIssueRequestDetailRoutePage({
  params,
}: StockIssueRequestDetailRoutePageProps) {
  const { stockIssueRequestId } = await params
  return <StockIssueRequestDetailPage stockIssueRequestId={stockIssueRequestId} />
}
