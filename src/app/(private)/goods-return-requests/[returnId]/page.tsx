import GoodsReturnRequestsPage from '@/features/stock-issue/pages/GoodsReturnRequestsPage'

export default async function Page({ params }: { readonly params: Promise<{ returnId: string }> }) {
  const { returnId } = await params
  return <GoodsReturnRequestsPage returnId={returnId} />
}
