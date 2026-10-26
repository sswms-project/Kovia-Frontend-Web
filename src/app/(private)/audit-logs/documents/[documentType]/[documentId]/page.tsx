import ArchivedDocumentPage from '@/features/platform-services/pages/ArchivedDocumentPage'

export default async function Page({
  params,
}: {
  readonly params: Promise<{ documentType: string; documentId: string }>
}) {
  const { documentType, documentId } = await params
  return <ArchivedDocumentPage documentType={documentType} documentId={documentId} />
}
