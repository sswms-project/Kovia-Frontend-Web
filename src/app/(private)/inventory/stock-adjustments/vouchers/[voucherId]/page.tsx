import { StockAdjustmentVoucherDetailPage } from '@/features/cycle-count/pages'

export default async function Page({
  params,
}: {
  readonly params: Promise<{ voucherId: string }>
}) {
  const { voucherId } = await params
  return <StockAdjustmentVoucherDetailPage voucherId={voucherId} />
}
