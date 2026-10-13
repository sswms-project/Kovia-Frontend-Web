import StockIssueRequestFormPage from '@/features/stock-issue/pages/StockIssueRequestFormPage'

interface EditStockIssueRequestRoutePageProps {
  readonly params: Promise<{ stockIssueRequestId: string }>
}

export default async function EditStockIssueRequestRoutePage({
  params,
}: EditStockIssueRequestRoutePageProps) {
  const { stockIssueRequestId } = await params
  return <StockIssueRequestFormPage stockIssueRequestId={stockIssueRequestId} />
}
