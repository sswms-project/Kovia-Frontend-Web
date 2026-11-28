/**
 * What the confirmation card shows. The server status stays Pending/Executed/Cancelled/Expired;
 * this is derived from it plus local activity by `getAiDraftViewState`.
 */
export const AI_DRAFT_VIEW_STATES = {
  PREVIEW: 'PREVIEW',
  EDITING: 'EDITING',
  VALIDATING: 'VALIDATING',
  READY_TO_CONFIRM: 'READY_TO_CONFIRM',
  CONFIRMING: 'CONFIRMING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  CONFLICT: 'CONFLICT',
} as const

export type AiDraftViewState = (typeof AI_DRAFT_VIEW_STATES)[keyof typeof AI_DRAFT_VIEW_STATES]

/** Codes of the 409 answers of the edit and confirm endpoints. */
export const AI_DRAFT_CONFLICT_CODES = {
  revisionMismatch: 'DRAFT_REVISION_MISMATCH',
  notPending: 'DRAFT_NOT_PENDING',
  expired: 'DRAFT_EXPIRED',
} as const

export type AiDraftConflictCode =
  (typeof AI_DRAFT_CONFLICT_CODES)[keyof typeof AI_DRAFT_CONFLICT_CODES]

/** `400` code of an action type the BE does not allow to edit. */
export const AI_DRAFT_TYPE_NOT_EDITABLE_CODE = 'DRAFT_TYPE_NOT_EDITABLE'

/** Warning codes that only inform (nothing for the user to fix or re-check). */
export const AI_DRAFT_INFO_WARNING_CODES: readonly string[] = ['UNIT_CHANGED_QUANTITY_KEPT']

export interface AiDraftUpdateLine {
  readonly productId: string
  readonly unitId: string
  readonly quantity: number
}

/** Body of `PUT api/ai/actions/{id}` for a stock issue: every editable field, always (the BE keeps the rest). */
export interface AiDraftStockIssueUpdateRequest {
  readonly revision: string
  readonly warehouseId: string
  readonly recipientId: string
  readonly purpose: string
  readonly lines: readonly AiDraftUpdateLine[]
}

/** Body for an inbound request. A missing `expectedDate` keeps the stored one. */
export interface AiDraftInboundUpdateRequest {
  readonly revision: string
  readonly warehouseId: string
  readonly supplierId: string
  readonly expectedDate?: string
  readonly lines: readonly AiDraftUpdateLine[]
}

/** Body for a transfer. Lines are in the product base unit; the BE converts any other unit. */
export interface AiDraftTransferUpdateRequest {
  readonly revision: string
  readonly sourceWarehouseId: string
  readonly destinationWarehouseId: string
  readonly lines: readonly AiDraftUpdateLine[]
}

/** Body for a supplier return (`reason` is required, 1..500 characters). */
export interface AiDraftSupplierReturnUpdateRequest {
  readonly revision: string
  readonly warehouseId: string
  readonly supplierId: string
  readonly reason: string
  readonly lines: readonly AiDraftUpdateLine[]
}

export type AiDraftUpdateRequest =
  | AiDraftStockIssueUpdateRequest
  | AiDraftInboundUpdateRequest
  | AiDraftTransferUpdateRequest
  | AiDraftSupplierReturnUpdateRequest

/** Body of `POST api/ai/actions/{id}/confirm`; required by the BE for editable draft types. */
export interface AiDraftConfirmRequest {
  readonly expectedRevision?: string
}

/** `lines.{index}.product|unit|quantity` messages, by line index of the request. */
export type AiDraftLineFieldErrors = Readonly<
  Record<number, { readonly product?: string; readonly unit?: string; readonly quantity?: string }>
>
