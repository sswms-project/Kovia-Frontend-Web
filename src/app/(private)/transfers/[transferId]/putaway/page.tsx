import { TransferPutAwayPage } from '@/features/transfer/pages'

export default async function TransferPlanRoute({
  params,
}: {
  readonly params: Promise<{ transferId: string }>
}) {
  const { transferId } = await params
  return <TransferPutAwayPage key={transferId} transferId={transferId} />
}
