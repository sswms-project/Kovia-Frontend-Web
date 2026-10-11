import { TransferPickTaskPage } from '@/features/transfer/pages'

interface TransferPickTaskRoutePageProps {
  readonly params: Promise<{ transferId: string; shipmentId: string }>
}

export default async function TransferPickTaskRoutePage({
  params,
}: TransferPickTaskRoutePageProps) {
  const { transferId, shipmentId } = await params
  return <TransferPickTaskPage transferId={transferId} shipmentId={shipmentId} />
}
