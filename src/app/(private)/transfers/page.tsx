import { TransferPage } from '@/features/transfer/pages'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/routes/app-routes'

export default async function TransfersRoutePage({
  searchParams,
}: {
  searchParams: Promise<{ transferId?: string }>
}) {
  const { transferId } = await searchParams
  if (transferId) redirect(APP_ROUTES.transferDetail(transferId))
  return <TransferPage />
}
