import { TransferDetailPage } from '@/features/transfer/pages'

interface TransferDetailRoutePageProps {
  readonly params: Promise<{ transferId: string }>
}

export default async function TransferDetailRoutePage({ params }: TransferDetailRoutePageProps) {
  const { transferId } = await params
  return <TransferDetailPage transferId={transferId} />
}
