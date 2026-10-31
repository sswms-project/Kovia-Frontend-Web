import { InboundRequestFormPage } from '@/features/inbound-request/pages'

interface CreateInboundRequestRoutePageProps {
  readonly searchParams: Promise<{ readonly aiDraft?: string | string[] }>
}

export default async function CreateInboundRequestRoutePage({
  searchParams,
}: CreateInboundRequestRoutePageProps) {
  const { aiDraft } = await searchParams
  return <InboundRequestFormPage aiDraftId={typeof aiDraft === 'string' ? aiDraft : undefined} />
}
