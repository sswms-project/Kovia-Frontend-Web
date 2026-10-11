'use client'

import { useMemo } from 'react'
import { USER_ROLES } from '@/config/roles'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useAuthStore } from '@/stores/auth.store'
import type { TransferViewer } from '../utils/transfer-capabilities'

/** Gom quyền hiệu lực và danh tính người xem để page truyền cho các hàm capability. */
export function useTransferViewer(): { viewer: TransferViewer; isReady: boolean } {
  const meQuery = useMeQuery()
  const isTenantOwner = useAuthStore((state) => state.user?.role === USER_ROLES.TenantOwner)
  const permissions = meQuery.data?.permissions
  const currentUserId = meQuery.data?.id ?? null
  const assignedWarehouses = meQuery.data?.assignedWarehouses
  const viewer = useMemo<TransferViewer>(
    () => ({
      permissions: permissions ?? [],
      currentUserId,
      isTenantOwner,
      warehouseIds: isTenantOwner
        ? undefined
        : assignedWarehouses?.map((warehouse) => warehouse.id),
    }),
    [permissions, currentUserId, isTenantOwner, assignedWarehouses]
  )
  return { viewer, isReady: Boolean(meQuery.data) }
}
