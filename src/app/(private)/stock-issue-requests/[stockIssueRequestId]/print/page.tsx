import StockIssuePickSheetPage from '@/features/stock-issue/pages/StockIssuePickSheetPage'

interface StockIssuePickSheetRoutePageProps {
  readonly params: Promise<{ stockIssueRequestId: string }>
}

export default async function StockIssuePickSheetRoutePage({
  params,
}: StockIssuePickSheetRoutePageProps) {
  const { stockIssueRequestId } = await params
  return <StockIssuePickSheetPage stockIssueRequestId={stockIssueRequestId} />
}
