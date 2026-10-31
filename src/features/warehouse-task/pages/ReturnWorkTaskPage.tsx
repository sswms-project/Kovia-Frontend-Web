'use client'

import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { P } from '@/config/permissionCodes'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import GoodsReturnRequestsPage from '@/features/stock-issue/pages/GoodsReturnRequestsPage'
import SupplierReturnsPage from '@/features/supplier-return/pages/SupplierReturnsPage'
import { queryKeys } from '@/lib/query-keys'
import { returnWorkService } from '../services/return-work.service'

interface ReturnWorkTaskPageProps {
  readonly supplier: boolean
  readonly taskId: string
}

export default function ReturnWorkTaskPage({ supplier, taskId }: ReturnWorkTaskPageProps) {
  const me = useMeQuery()
  const granted = me.data?.permissions ?? []
  const canRead = [
    P.WAREHOUSE_TASKS_VIEW_OWN,
    P.WAREHOUSE_TASKS_MANAGE_OWN,
    supplier ? P.SUPPLIER_RETURNS_VIEW : P.GOODS_RETURN_REQUESTS_VIEW,
    supplier ? P.SUPPLIER_RETURNS_DISPATCH : P.GOODS_RETURN_REQUESTS_RESTOCK,
  ].every((permission) => granted.includes(permission))
  const query = useQuery({
    queryKey: queryKeys.returnWork.task(supplier, taskId),
    queryFn: () => returnWorkService.mine(supplier, taskId),
    enabled: canRead,
  })
  if (me.isLoading) return <p className="p-4">Đang kiểm tra quyền truy cập…</p>
  if (!canRead) return <p className="p-4">Bạn chưa có đủ quyền thực hiện nhiệm vụ trả hàng này.</p>
  if (query.isLoading) return <p className="p-4">Đang tải nhiệm vụ…</p>
  if (!query.data)
    return (
      <div className="flex flex-col items-start gap-3 p-4">
        <p>Không thể mở nhiệm vụ. Phân công hoặc quyền truy cập có thể đã thay đổi.</p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Thử lại
        </Button>
      </div>
    )
  return supplier ? (
    <SupplierReturnsPage
      taskView
      key={query.data.sourceDocumentId}
      returnId={query.data.sourceDocumentId}
    />
  ) : (
    <GoodsReturnRequestsPage
      taskView
      key={query.data.sourceDocumentId}
      returnId={query.data.sourceDocumentId}
    />
  )
}
