import SupplierReturnsPage from '@/features/supplier-return/pages/SupplierReturnsPage'

export default async function Page({ params }: { readonly params: Promise<{ returnId: string }> }) {
  const { returnId } = await params
  return <SupplierReturnsPage returnId={returnId} />
}
