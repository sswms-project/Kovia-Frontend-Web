'use client'

import { USER_ROLES } from '@/config/roles'
import { RoleGuard } from '../components/shared/RoleGuard'
import WarehouseOverviewPage from './WarehouseOverviewPage'

export function WarehouseManagerDashboardPage() {
  return (
    <RoleGuard allowedRoles={[USER_ROLES.WarehouseManager]}>
      <WarehouseOverviewPage />
    </RoleGuard>
  )
}
