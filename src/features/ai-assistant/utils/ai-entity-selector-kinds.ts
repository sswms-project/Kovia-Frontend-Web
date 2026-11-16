import { P, type PermissionCode } from '@/config/permissionCodes'
import { USER_ROLES, type UserRole } from '@/config/roles'
import type {
  AiDocumentType,
  AiEntityKind,
  AiEntityScope,
  AiEntityScopeKey,
} from '../types/ai-entity-selector.types'

export const AI_ENTITY_NO_PERMISSION_MESSAGE = 'Bạn không có quyền xem danh sách này.'

export const AI_ENTITY_MISSING_SCOPE_MESSAGES: Record<AiEntityScopeKey, string> = {
  documentType: 'Chưa chọn loại phiếu.',
  warehouseId: 'Chọn kho trước.',
  productId: 'Chọn sản phẩm trước.',
}

interface AiEntityKindConfig {
  readonly label: string
  readonly searchPlaceholder: string
  readonly emptyMessage: string
  /** Absent for `document`: the permission depends on the document type. */
  readonly permission?: PermissionCode
  /** Scope keys that change what is listed (they belong in the query key). */
  readonly scopeKeys: readonly AiEntityScopeKey[]
  /** Scope keys without which the list cannot be requested. */
  readonly requiredScope: readonly AiEntityScopeKey[]
}

export const AI_ENTITY_KINDS: Record<AiEntityKind, AiEntityKindConfig> = {
  warehouse: {
    label: 'Kho',
    searchPlaceholder: 'Tìm theo mã hoặc tên kho',
    emptyMessage: 'Không có kho phù hợp.',
    permission: P.WAREHOUSES_VIEW,
    scopeKeys: [],
    requiredScope: [],
  },
  product: {
    label: 'Sản phẩm',
    searchPlaceholder: 'Tìm theo SKU hoặc tên sản phẩm',
    emptyMessage: 'Không có sản phẩm phù hợp.',
    permission: P.PRODUCTS_VIEW,
    scopeKeys: [],
    requiredScope: [],
  },
  recipient: {
    label: 'Người nhận hàng',
    searchPlaceholder: 'Tìm theo mã hoặc tên người nhận',
    emptyMessage: 'Không có người nhận phù hợp.',
    permission: P.STOCK_RECIPIENTS_VIEW,
    scopeKeys: [],
    requiredScope: [],
  },
  supplier: {
    label: 'Nhà cung cấp',
    searchPlaceholder: 'Tìm theo mã hoặc tên nhà cung cấp',
    emptyMessage: 'Không có nhà cung cấp phù hợp.',
    permission: P.SUPPLIERS_VIEW,
    scopeKeys: [],
    requiredScope: [],
  },
  document: {
    label: 'Phiếu nghiệp vụ',
    searchPlaceholder: 'Tìm theo mã phiếu',
    emptyMessage: 'Không có phiếu phù hợp.',
    scopeKeys: ['documentType'],
    requiredScope: ['documentType'],
  },
  lot: {
    label: 'Lô hàng',
    searchPlaceholder: 'Tìm theo số lô',
    emptyMessage: 'Không có lô hàng phù hợp.',
    permission: P.PRODUCTS_VIEW,
    scopeKeys: ['productId', 'warehouseId'],
    requiredScope: ['productId'],
  },
  location: {
    label: 'Vị trí lưu trữ',
    searchPlaceholder: 'Tìm theo mã vị trí',
    emptyMessage: 'Không có vị trí phù hợp.',
    permission: P.WAREHOUSES_VIEW,
    scopeKeys: ['warehouseId'],
    requiredScope: ['warehouseId'],
  },
  staff: {
    label: 'Nhân viên',
    searchPlaceholder: 'Tìm theo tên hoặc email',
    emptyMessage: 'Không có nhân viên phù hợp.',
    permission: P.STAFF_VIEW,
    scopeKeys: [],
    requiredScope: [],
  },
}

export const AI_DOCUMENT_TYPES: Record<
  AiDocumentType,
  { readonly label: string; readonly permission: PermissionCode }
> = {
  inbound_request: { label: 'Yêu cầu nhập kho', permission: P.INBOUND_REQUESTS_VIEW },
  stock_issue_request: { label: 'Yêu cầu xuất kho', permission: P.STOCK_ISSUE_REQUESTS_VIEW },
  transfer: { label: 'Phiếu chuyển kho', permission: P.TRANSFERS_VIEW },
  goods_receipt: { label: 'Phiếu nhập kho', permission: P.GOODS_RECEIPTS_VIEW },
  goods_return: { label: 'Yêu cầu trả hàng', permission: P.GOODS_RETURN_REQUESTS_VIEW },
  supplier_return: { label: 'Phiếu trả nhà cung cấp', permission: P.SUPPLIER_RETURNS_VIEW },
}

/** The permission the list endpoint needs; `undefined` only while a document type is still missing. */
export function getAiEntityPermission(
  kind: AiEntityKind,
  scope: AiEntityScope
): PermissionCode | undefined {
  if (kind !== 'document') return AI_ENTITY_KINDS[kind].permission
  return scope.documentType ? AI_DOCUMENT_TYPES[scope.documentType].permission : undefined
}

export function getMissingAiEntityScope(
  kind: AiEntityKind,
  scope: AiEntityScope
): AiEntityScopeKey | undefined {
  return AI_ENTITY_KINDS[kind].requiredScope.find((key) => !scope[key])
}

/** Only the scope keys the kind lists by, so unrelated keys never split the cache. */
export function pickAiEntityScope(kind: AiEntityKind, scope: AiEntityScope): AiEntityScope {
  return Object.fromEntries(AI_ENTITY_KINDS[kind].scopeKeys.map((key) => [key, scope[key]]))
}

/** Frontend checks only shape the UI; the backend enforces the permission on every request. */
export function hasAiEntityPermission(
  role: UserRole | null,
  permissions: readonly string[],
  permission: PermissionCode | undefined
): boolean {
  if (!permission) return false
  return role === USER_ROLES.TenantOwner || permissions.includes(permission)
}
