'use client'

import { USER_ROLES } from '@/config/roles'
import { RoleGuard } from '../components/shared/RoleGuard'
import WarehouseOverviewPage from './WarehouseOverviewPage'

export function TenantOwnerDashboardPage() {
  return (
    <RoleGuard allowedRoles={[USER_ROLES.TenantOwner]}>
      <WarehouseOverviewPage />
    </RoleGuard>
  )
}
