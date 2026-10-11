'use client'

import { USER_ROLES } from '@/config/roles'
import { RoleGuard } from '../components/shared/RoleGuard'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { getApiErrorMessage } from '@/lib/api-error'
import { PersonalWorkOverview } from '../components/WarehouseOverview'
import { usePersonalWorkOverviewQuery } from '../hooks/use-warehouse-overview'

export function WarehouseStaffDashboardPage() {
  const me = useMeQuery()
  const permissions = me.data?.permissions ?? []
  const canRead = permissions.includes(P.WAREHOUSE_TASKS_VIEW_OWN)
  const tasks = usePersonalWorkOverviewQuery(canRead, [...permissions].sort().join('|'))
  return (
    <RoleGuard allowedRoles={[USER_ROLES.WarehouseStaff]}>
      <PersonalWorkOverview
        data={canRead ? tasks.data : undefined}
        isPending={me.isPending || (canRead && tasks.isPending)}
        isFetching={tasks.isFetching}
        errorMessage={
          me.isError
            ? getApiErrorMessage(me.error)
            : !me.isPending && !canRead
              ? 'Bạn chưa được cấp quyền xem công việc của tôi.'
              : tasks.isError
                ? getApiErrorMessage(tasks.error)
                : undefined
        }
        onRefresh={() => {
          void tasks.refetch()
        }}
      />
    </RoleGuard>
  )
}
