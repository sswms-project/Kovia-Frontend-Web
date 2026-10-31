import StockIssueRequestFormPage from '@/features/stock-issue/pages/StockIssueRequestFormPage'

interface StockIssueRequestCreateRoutePageProps {
  readonly searchParams: Promise<{ readonly aiDraft?: string | string[] }>
}

export default async function StockIssueRequestCreateRoutePage({
  searchParams,
}: StockIssueRequestCreateRoutePageProps) {
  const { aiDraft } = await searchParams
  return <StockIssueRequestFormPage aiDraftId={typeof aiDraft === 'string' ? aiDraft : undefined} />
}
