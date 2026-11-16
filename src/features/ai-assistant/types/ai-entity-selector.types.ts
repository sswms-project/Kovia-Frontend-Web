import type { LookupOption } from '@/features/inbound-request/types/inbound-request.types'

export type AiEntityKind =
  | 'warehouse'
  | 'product'
  | 'recipient'
  | 'supplier'
  | 'document'
  | 'lot'
  | 'location'
  | 'staff'

/** The business document a `document` selector lists; each type has its own backend list. */
export type AiDocumentType =
  | 'inbound_request'
  | 'stock_issue_request'
  | 'transfer'
  | 'goods_receipt'
  | 'goods_return'
  | 'supplier_return'

/** What a kind needs to know before it can list anything (for example the warehouse a location belongs to). */
export interface AiEntityScope {
  readonly documentType?: AiDocumentType
  readonly warehouseId?: string
  readonly productId?: string
}

export type AiEntityScopeKey = keyof AiEntityScope

/** `value` is the canonical backend GUID; `label` and `description` come from the backend record. */
export interface AiEntityOption extends LookupOption {
  readonly code?: string
}

export interface AiEntityPageRequest {
  readonly scope: AiEntityScope
  /** Trimmed text typed by the user; empty means no filter. */
  readonly searchTerm: string
  /** Zero-based, whatever paging style the backend list uses. */
  readonly page: number
}

export interface AiEntityPage {
  readonly options: readonly AiEntityOption[]
  readonly totalCount: number
}
