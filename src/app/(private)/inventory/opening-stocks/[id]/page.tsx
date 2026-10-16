import OpeningStocksPage from '@/features/inventory/pages/OpeningStocksPage'

export default async function Page({ params }: { readonly params: Promise<{ id: string }> }) {
  const { id } = await params
  return <OpeningStocksPage recordId={id} />
}
