import type { PermissionCode } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useAuthStore } from '@/stores/auth.store'
import { hasAiEntityPermission } from '../utils/ai-entity-selector-kinds'

/** Whether the signed-in user may list the entity; `isChecking` while their permissions are loading. */
export function useAiEntityAccess(permission: PermissionCode | undefined) {
  const role = useAuthStore((state) => state.user?.role ?? null)
  const meQuery = useMeQuery()
  const permissions = meQuery.data?.permissions
  const hasAccess = hasAiEntityPermission(role, permissions ?? [], permission)
  const isChecking =
    !hasAccess && permission !== undefined && permissions === undefined && !meQuery.isError
  return { hasAccess, isChecking }
}
