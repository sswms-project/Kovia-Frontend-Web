'use client'

import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { ROUTE_CAPABILITIES } from '@/config/route-permissions'
import { APP_ROUTES } from '@/routes/app-routes'
import { Skeleton } from '@/components/ui/skeleton'
import ProductImportSessionPage from './ProductImportSessionPage'

export default function ProductImportPage() {
  const me = useMeQuery()
  if (me.isPending)
    return <Skeleton className="h-full min-h-64 w-full" aria-label="Đang kiểm tra quyền" />
  if (me.isError || !me.data?.permissions.includes(ROUTE_CAPABILITIES[APP_ROUTES.productImport]))
    return <p role="status">Bạn không có quyền nhập vật tư hàng hóa từ tệp.</p>
  return <ProductImportSessionPage key={`${me.data.tenantId}:${me.data.id}`} />
}
