import { USER_ROLES } from '@/config/roles'
import type {
  AccessControlMode,
  PermissionCategoryGroup,
  PersonalPermissionFilter,
  PermissionRowViewModel,
  TenantAssignablePermission,
  TenantRolePolicy,
} from '../types/tenant-access-control.types'

export function isAccessControlMode(value: string): value is AccessControlMode {
  return value === 'role' || value === 'personal'
}

export function isPersonalPermissionFilter(value: string): value is PersonalPermissionFilter {
  return value === 'all' || value === 'customized'
}

const ROLE_CONTENT: Record<string, { label: string; description: string }> = {
  [USER_ROLES.WarehouseManager]: {
    label: 'Quản lý kho',
    description: 'Điều phối vận hành, phê duyệt và cấu hình trong phạm vi được giao.',
  },
  [USER_ROLES.WarehouseStaff]: {
    label: 'Nhân viên kho',
    description: 'Thực hiện các nghiệp vụ kho hằng ngày theo quyền được cấp.',
  },
}

export function getTenantRoleContent(roleName: string) {
  return (
    ROLE_CONTENT[roleName] ?? {
      label: roleName,
      description: 'Vai trò vận hành trong doanh nghiệp hiện tại.',
    }
  )
}

export function arePermissionSetsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>) {
  return left.size === right.size && [...left].every((permissionId) => right.has(permissionId))
}

export function rebasePermissionDraft(
  baselineIds: ReadonlySet<string>,
  draftIds: ReadonlySet<string>,
  authoritativeIds: ReadonlySet<string>,
  eligibleIds: ReadonlySet<string>
) {
  const localAdditions = [...draftIds].filter(
    (permissionId) => !baselineIds.has(permissionId) && eligibleIds.has(permissionId)
  )
  const localRemovals = new Set(
    [...baselineIds].filter((permissionId) => !draftIds.has(permissionId))
  )
  const nextBaselineIds = new Set(
    [...authoritativeIds].filter((permissionId) => eligibleIds.has(permissionId))
  )
  const nextDraftIds = new Set(
    [...nextBaselineIds, ...localAdditions].filter(
      (permissionId) => !localRemovals.has(permissionId)
    )
  )

  return { baselineIds: nextBaselineIds, draftIds: nextDraftIds }
}

export function groupTenantPermissions(
  permissions: TenantAssignablePermission[]
): PermissionCategoryGroup[] {
  const categories = new Map<string, PermissionCategoryGroup>()

  for (const permission of permissions) {
    let category = categories.get(permission.category)
    if (!category) {
      category = {
        category: permission.category,
        categoryDisplayName: permission.categoryDisplayName,
        categoryDescription: permission.categoryDescription,
        categoryOrder: permission.categoryOrder,
        modules: [],
      }
      categories.set(permission.category, category)
    }

    const permissionModule = category.modules.find((group) => group.module === permission.module)
    if (permissionModule) permissionModule.permissions.push(permission)
    else {
      category.modules.push({
        module: permission.module,
        moduleDisplayName: permission.moduleDisplayName,
        moduleOrder: permission.moduleOrder,
        permissions: [permission],
      })
    }
  }

  return [...categories.values()]
    .map((category) => ({
      ...category,
      modules: category.modules
        .map((module) => ({
          ...module,
          permissions: module.permissions.toSorted((left, right) =>
            left.displayName.localeCompare(right.displayName, 'vi')
          ),
        }))
        .toSorted((left, right) => left.moduleOrder - right.moduleOrder),
    }))
    .toSorted((left, right) => left.categoryOrder - right.categoryOrder)
}

export function filterPermissionGroups(groups: PermissionCategoryGroup[], searchText: string) {
  const normalizedSearch = searchText.trim().toLocaleLowerCase('vi')
  if (!normalizedSearch) return groups

  return groups
    .map((category) => {
      const categoryMatches = [
        category.category,
        category.categoryDisplayName,
        category.categoryDescription,
      ].some((value) => value.toLocaleLowerCase('vi').includes(normalizedSearch))

      return {
        ...category,
        modules: category.modules
          .map((module) => {
            const moduleMatches = [module.module, module.moduleDisplayName].some((value) =>
              value.toLocaleLowerCase('vi').includes(normalizedSearch)
            )
            return {
              ...module,
              permissions:
                categoryMatches || moduleMatches
                  ? module.permissions
                  : module.permissions.filter((permission) =>
                      [
                        permission.displayName,
                        permission.description,
                        permission.permissionKey,
                      ].some((value) => value.toLocaleLowerCase('vi').includes(normalizedSearch))
                    ),
            }
          })
          .filter((module) => module.permissions.length > 0),
      }
    })
    .filter((category) => category.modules.length > 0)
}

export function getRoleById(roles: TenantRolePolicy[], roleId: string) {
  return roles.find((role) => role.roleId === roleId)
}

export function filterPermissionGroupsByIds(
  groups: PermissionCategoryGroup[],
  permissionIds: ReadonlySet<string>
) {
  return groups
    .map((category) => ({
      ...category,
      modules: category.modules
        .map((module) => ({
          ...module,
          permissions: module.permissions.filter((permission) => permissionIds.has(permission.id)),
        }))
        .filter((module) => module.permissions.length > 0),
    }))
    .filter((category) => category.modules.length > 0)
}

export function getCustomizedPermissionIds(
  effectiveIds: ReadonlySet<string>,
  roleDefaultIds: ReadonlySet<string>
) {
  return new Set(
    [...new Set([...effectiveIds, ...roleDefaultIds])].filter(
      (permissionId) => effectiveIds.has(permissionId) !== roleDefaultIds.has(permissionId)
    )
  )
}

export function createRolePermissionRow(
  permission: TenantAssignablePermission,
  selectedIds: ReadonlySet<string>
): PermissionRowViewModel {
  return {
    permission,
    checked: selectedIds.has(permission.id),
    editable: true,
    presentation: 'role-assigned',
  }
}

export function createPersonalPermissionRow(
  permission: TenantAssignablePermission,
  selectedIds: ReadonlySet<string>,
  roleDefaultIds: ReadonlySet<string>
): PermissionRowViewModel {
  const customized = selectedIds.has(permission.id) !== roleDefaultIds.has(permission.id)
  return {
    permission,
    checked: selectedIds.has(permission.id),
    editable: true,
    presentation: customized ? 'personal-customized' : 'personal-default',
  }
}
