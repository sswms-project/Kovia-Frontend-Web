'use client'

import { BulkImportPendingBody } from '@/components/operations/BulkImportWorkspace'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { OpeningStockImportSession } from '../components/OpeningStockImportSession'

export default function OpeningStockImportPage() {
  const me = useMeQuery()
  if (me.isPending) return <BulkImportPendingBody />
  if (
    me.isError ||
    !me.data?.permissions.includes(P.INVENTORY_VIEW) ||
    !me.data.permissions.includes(P.INVENTORY_RESERVE)
  )
    return <p role="status">Bạn không có quyền nhập tồn kho đầu kỳ.</p>
  return <OpeningStockImportSession key={`${me.data.tenantId}:${me.data.id}`} />
}
