import AdminLegalDocumentPage from '@/features/legal-documents/pages/AdminLegalDocumentPage'

export default async function Page({ params }: { readonly params: Promise<{ id: string }> }) {
  return <AdminLegalDocumentPage id={(await params).id} />
}
