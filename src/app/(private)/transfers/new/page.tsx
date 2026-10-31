import { TransferFormPage } from '@/features/transfer/pages'

interface TransferCreateRoutePageProps {
  readonly searchParams: Promise<{ readonly aiDraft?: string | string[] }>
}

export default async function TransferCreateRoutePage({
  searchParams,
}: TransferCreateRoutePageProps) {
  const { aiDraft } = await searchParams
  return <TransferFormPage aiDraftId={typeof aiDraft === 'string' ? aiDraft : undefined} />
}
