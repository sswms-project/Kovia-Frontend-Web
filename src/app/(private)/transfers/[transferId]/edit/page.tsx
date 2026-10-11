import { TransferFormPage } from '@/features/transfer/pages'

interface TransferEditRoutePageProps {
  readonly params: Promise<{ transferId: string }>
}

export default async function TransferEditRoutePage({ params }: TransferEditRoutePageProps) {
  const { transferId } = await params
  return <TransferFormPage transferId={transferId} />
}
