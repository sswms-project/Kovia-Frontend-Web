import { isPastInboundExpectedDate } from '@/features/inbound-request/utils/inbound-request-format'
import type { AiFormValues } from '../schemas/ai-form-card.schema'
import { AI_ACTIONS } from '../types/ai-assistant.types'
import type { AiDraftUpdateRequest } from '../types/ai-draft-edit.types'
import {
  AI_FORM_LOOKUPS,
  type AiFormEntityLookupKey,
  type AiFormFieldErrors,
} from '../types/ai-form.types'
import { AI_DRAFT_WAREHOUSE_DESCRIPTORS } from './ai-draft-edit-warehouse-descriptors'
import { toAiFormSubmitLines } from './ai-form-lines'
import {
  DEFAULT_LIMITS,
  validateAiFormLines,
  validateAiFormStep,
  type AiFormLimits,
} from './ai-form-validation'

export interface AiDraftEditDescriptor {
  /** Sr-only legend of the editor's fieldset. */
  readonly legend: string
  readonly linesLegend: string
  /** Note under a card whose saved edit the BE accepted. */
  readonly readyNote: string
  /** The warehouse the products belong to (source/return/receiving); also names it in the "changing it clears rows" notes. */
  readonly warehouseLabel: string
  /**
   * The second picker: the recipient of a stock issue, the supplier of an inbound request or a
   * supplier return, the destination warehouse of a transfer.
   */
  readonly partner: {
    readonly key: 'recipient' | 'supplier' | 'destinationWarehouse'
    readonly label: string
    readonly lookup: AiFormEntityLookupKey
    readonly placeholder?: string
  }
  /** The free-text field (purpose, or the reason of a supplier return). Null: the type has no such field. */
  readonly purposeLabel: string | null
  readonly expectedDateLabel: string | null
  /**
   * Products belong to the warehouse's stock: only in-stock products can be added, rows show what is
   * available, another warehouse empties the rows, and a shortage is advised. False for inbound, where
   * any active product can arrive in any warehouse.
   */
  readonly isStockBound: boolean
  /** Rows are in the product base unit (the BE converts), so the unit is shown as text, not chosen. */
  readonly baseUnitOnly: boolean
  /** Row count and text length the editor allows; the BE stays the source of truth. */
  readonly limits: AiFormLimits
  /** Errors of the whole editor; an empty object means the draft may be saved. `now` is for tests. */
  readonly validate: (values: AiFormValues, limits: AiFormLimits, now?: Date) => AiFormFieldErrors
  /** Null while a required party is missing; call it only after `validate` passed. */
  readonly toRequest: (revision: string, values: AiFormValues) => AiDraftUpdateRequest | null
}

const STOCK_ISSUE: AiDraftEditDescriptor = {
  legend: 'Chỉnh sửa bản nháp phiếu xuất kho',
  linesLegend: 'Sản phẩm xuất kho',
  readyNote:
    'Bản nháp hợp lệ · sẵn sàng xác nhận. Điều kiện xuất kho được kiểm tra ở bước xử lý phiếu.',
  warehouseLabel: 'Kho xuất',
  partner: { key: 'recipient', label: 'Người nhận', lookup: AI_FORM_LOOKUPS.recipients },
  purposeLabel: 'Mục đích xuất',
  expectedDateLabel: null,
  isStockBound: true,
  baseUnitOnly: false,
  limits: DEFAULT_LIMITS,
  validate: (values, limits) => ({
    ...validateAiFormStep(1, values, limits),
    ...validateAiFormStep(2, values, limits),
  }),
  toRequest: (revision, values) => {
    if (!values.warehouse || !values.recipient) return null
    return {
      revision,
      warehouseId: values.warehouse.id,
      recipientId: values.recipient.id,
      purpose: values.purpose.trim(),
      lines: toAiFormSubmitLines(values.lines),
    }
  },
}

const INBOUND_REQUEST: AiDraftEditDescriptor = {
  legend: 'Chỉnh sửa bản nháp yêu cầu nhập kho',
  linesLegend: 'Sản phẩm nhập kho',
  readyNote: 'Bản nháp hợp lệ · sẵn sàng xác nhận.',
  warehouseLabel: 'Kho nhận',
  partner: {
    key: 'supplier',
    label: 'Nhà cung cấp',
    lookup: AI_FORM_LOOKUPS.suppliers,
    placeholder: 'Tìm theo tên nhà cung cấp',
  },
  purposeLabel: null,
  expectedDateLabel: 'Ngày dự kiến nhận',
  isStockBound: false,
  baseUnitOnly: false,
  limits: DEFAULT_LIMITS,
  validate: (values, _limits, now) => {
    const linesError = validateAiFormLines(values.lines)
    return {
      ...(values.warehouse ? {} : { warehouse: 'Chọn kho nhận.' }),
      ...(values.supplier ? {} : { supplier: 'Chọn nhà cung cấp.' }),
      ...(linesError ? { lines: linesError } : {}),
      // Compared as a Vietnam calendar date, like the inbound-request form.
      ...(isPastInboundExpectedDate(values.expectedDate ?? '', now)
        ? { expectedDate: 'Ngày dự kiến nhận không được trong quá khứ.' }
        : {}),
    }
  },
  toRequest: (revision, values) => {
    if (!values.warehouse || !values.supplier) return null
    return {
      revision,
      warehouseId: values.warehouse.id,
      supplierId: values.supplier.id,
      // Left out when empty: the BE then keeps the stored date.
      ...(values.expectedDate ? { expectedDate: values.expectedDate } : {}),
      lines: toAiFormSubmitLines(values.lines),
    }
  },
}

/** What differs per editable draft type. A new type is one more entry here, not another branch. */
export const AI_DRAFT_EDIT_DESCRIPTORS: Readonly<Record<string, AiDraftEditDescriptor>> = {
  [AI_ACTIONS.createStockIssueRequest]: STOCK_ISSUE,
  [AI_ACTIONS.createInboundRequest]: INBOUND_REQUEST,
  ...AI_DRAFT_WAREHOUSE_DESCRIPTORS,
}

/**
 * The editor of a draft's action, or undefined for a type this FE cannot edit. An editor that names
 * no action (a BE from before more types were editable) is the stock-issue one.
 */
export function getAiDraftEditDescriptor(
  action: string | null | undefined
): AiDraftEditDescriptor | undefined {
  return AI_DRAFT_EDIT_DESCRIPTORS[action || AI_ACTIONS.createStockIssueRequest]
}
