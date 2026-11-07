'use client'

import { USER_ROLES } from '@/config/roles'
import { LegalTermsReminder } from '@/features/legal-documents/components/LegalTermsReminder'
import { RoleGuard } from '../components/shared/RoleGuard'
import WarehouseOverviewPage from './WarehouseOverviewPage'

export function TenantOwnerDashboardPage() {
  return (
    <RoleGuard allowedRoles={[USER_ROLES.TenantOwner]}>
      <LegalTermsReminder />
      <WarehouseOverviewPage />
    </RoleGuard>
  )
}
