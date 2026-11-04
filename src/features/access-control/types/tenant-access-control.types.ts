export interface TenantRolePolicy {
  roleId: string
  roleName: string
  assignedPermissionIds: string[]
  recommendedPermissionIds?: string[] | null
  unavailableRecommendedPermissions?: string[] | null
}

export interface TenantAssignablePermission {
  id: string
  permissionKey: string
  module: string
  moduleDisplayName: string
  displayName: string
  description: string
  category: string
  categoryDisplayName: string
  categoryDescription: string
  categoryOrder: number
  moduleOrder: number
}

export interface TenantRolePermissionWorkspace {
  roles: TenantRolePolicy[]
  permissions: TenantAssignablePermission[]
}

export interface PermissionModuleGroup {
  module: string
  moduleDisplayName: string
  moduleOrder: number
  permissions: TenantAssignablePermission[]
}

export interface PermissionCategoryGroup {
  category: string
  categoryDisplayName: string
  categoryDescription: string
  categoryOrder: number
  modules: PermissionModuleGroup[]
}

export interface TenantUserPermissionSubjectQuery extends QueryInfo {
  top: number
  skip: number
  needTotalCount: true
  roleId: string
}

export interface TenantUserPermissionSubject {
  userId: string
  fullName: string
  email: string
  roleId: string
  roleName: string
  assignedWarehouseCount: number
  customizedPermissionCount: number
}

export interface TenantUserPermissionWarehouse {
  id: string
  code: string
  name: string
}

export interface TenantUserPermissionSubjectDetails {
  userId: string
  fullName: string
  email: string
  roleId: string
  roleName: string
  warehouses: TenantUserPermissionWarehouse[]
}

export interface TenantUserPermissionWorkspace {
  subject: TenantUserPermissionSubjectDetails
  roleDefaultPermissionIds: string[]
  grantedOverridePermissionIds: string[]
  deniedOverridePermissionIds: string[]
  effectivePermissionIds: string[]
  customizedPermissionIds: string[]
}

export type AccessControlMode = 'role' | 'personal'
export type PersonalPermissionFilter = 'all' | 'customized'

export type PermissionRowPresentation = 'role-assigned' | 'personal-default' | 'personal-customized'

export interface PermissionRowViewModel {
  permission: TenantAssignablePermission
  checked: boolean
  editable: boolean
  presentation: PermissionRowPresentation
}

export type PermissionCatalogContext =
  | {
      kind: 'role'
      subjectId: string
      selectedIds: ReadonlySet<string>
    }
  | {
      kind: 'personal'
      subjectId: string
      selectedIds: ReadonlySet<string>
      roleDefaultIds: ReadonlySet<string>
    }
import type { QueryInfo } from '@/types/api'
