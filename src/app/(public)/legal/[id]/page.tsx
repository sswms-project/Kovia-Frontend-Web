import LegalPublicPage from '@/features/legal-documents/pages/LegalPublicPage'

export default async function Page({ params }: { readonly params: Promise<{ id: string }> }) {
  return <LegalPublicPage id={(await params).id} />
}
