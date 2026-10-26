import { TransferPutAwayPage } from '@/features/transfer/pages'

export default async function TransferPutAwayRoute({
  params,
}: {
  readonly params: Promise<{ transferId: string; shipmentId: string }>
}) {
  const { transferId, shipmentId } = await params
  return (
    <TransferPutAwayPage
      key={`${transferId}-${shipmentId}`}
      transferId={transferId}
      shipmentId={shipmentId}
      initialTab="plan"
    />
  )
}
