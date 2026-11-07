import MyLegalTermsPage from '@/features/legal-documents/pages/MyLegalTermsPage'

export default async function MyLegalTermsRoute({
  searchParams,
}: {
  readonly searchParams: Promise<{ view?: string | string[] }>
}) {
  const { view } = await searchParams
  return <MyLegalTermsPage historyRequested={view === 'history'} />
}
