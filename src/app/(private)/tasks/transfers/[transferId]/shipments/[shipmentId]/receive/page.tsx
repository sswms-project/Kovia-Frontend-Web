import { TransferReceiveTaskPage } from '@/features/transfer/pages'

interface TransferReceiveTaskRoutePageProps {
  readonly params: Promise<{ transferId: string; shipmentId: string }>
}

export default async function TransferReceiveTaskRoutePage({
  params,
}: TransferReceiveTaskRoutePageProps) {
  const { transferId, shipmentId } = await params
  return (
    <TransferReceiveTaskPage
      key={`${transferId}-${shipmentId}`}
      transferId={transferId}
      shipmentId={shipmentId}
    />
  )
}
