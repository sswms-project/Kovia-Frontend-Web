import type { AiFormValues } from '../schemas/ai-form-card.schema'
import { AI_ACTIONS } from '../types/ai-assistant.types'
import { AI_FORM_LOOKUPS, type AiFormFieldErrors } from '../types/ai-form.types'
import type { AiDraftEditDescriptor } from './ai-draft-edit-descriptors'
import { toAiFormSubmitLines } from './ai-form-lines'
import { validateAiFormLines, type AiFormLimits } from './ai-form-validation'

// The BE caps both documents at 20 rows; their reason is 1..500 characters.
const WAREHOUSE_LIMITS: AiFormLimits = { maxLines: 20, purposeMaxLength: 500 }

/** Rows of a document that takes its products out of one warehouse. */
function validateWarehouseLines(values: AiFormValues, limits: AiFormLimits): AiFormFieldErrors {
  const linesError =
    values.lines.length > limits.maxLines
      ? `Tối đa ${limits.maxLines} sản phẩm mỗi phiếu.`
      : validateAiFormLines(values.lines)
  return linesError ? { lines: linesError } : {}
}

const TRANSFER: AiDraftEditDescriptor = {
  legend: 'Chỉnh sửa bản nháp phiếu chuyển kho',
  linesLegend: 'Sản phẩm chuyển kho',
  readyNote:
    'Bản nháp hợp lệ · sẵn sàng xác nhận. Điều kiện chuyển kho được kiểm tra ở bước xử lý phiếu.',
  warehouseLabel: 'Kho nguồn',
  partner: {
    key: 'destinationWarehouse',
    label: 'Kho đích',
    lookup: AI_FORM_LOOKUPS.warehouses,
  },
  purposeLabel: null,
  expectedDateLabel: null,
  isStockBound: true,
  baseUnitOnly: true,
  limits: WAREHOUSE_LIMITS,
  validate: (values, limits) => {
    const { warehouse, destinationWarehouse } = values
    const destinationError = !destinationWarehouse
      ? 'Chọn kho đích.'
      : warehouse?.id === destinationWarehouse.id
        ? 'Kho nguồn và kho đích phải khác nhau.'
        : undefined
    return {
      ...(warehouse ? {} : { warehouse: 'Chọn kho nguồn.' }),
      ...(destinationError ? { destinationWarehouse: destinationError } : {}),
      ...validateWarehouseLines(values, limits),
    }
  },
  toRequest: (revision, values) => {
    if (!values.warehouse || !values.destinationWarehouse) return null
    return {
      revision,
      sourceWarehouseId: values.warehouse.id,
      destinationWarehouseId: values.destinationWarehouse.id,
      lines: toAiFormSubmitLines(values.lines),
    }
  },
}

const SUPPLIER_RETURN: AiDraftEditDescriptor = {
  legend: 'Chỉnh sửa bản nháp phiếu trả hàng nhà cung cấp',
  linesLegend: 'Sản phẩm trả hàng',
  readyNote:
    'Bản nháp hợp lệ · sẵn sàng xác nhận. Điều kiện trả hàng được kiểm tra ở bước xử lý phiếu.',
  warehouseLabel: 'Kho trả hàng',
  partner: {
    key: 'supplier',
    label: 'Nhà cung cấp',
    lookup: AI_FORM_LOOKUPS.suppliers,
    placeholder: 'Tìm theo tên nhà cung cấp',
  },
  purposeLabel: 'Lý do trả hàng',
  expectedDateLabel: null,
  isStockBound: true,
  baseUnitOnly: true,
  limits: WAREHOUSE_LIMITS,
  validate: (values, limits) => {
    const reason = values.purpose.trim()
    return {
      ...(values.warehouse ? {} : { warehouse: 'Chọn kho trả hàng.' }),
      ...(values.supplier ? {} : { supplier: 'Chọn nhà cung cấp.' }),
      ...validateWarehouseLines(values, limits),
      ...(reason ? {} : { purpose: 'Nhập lý do trả hàng.' }),
      ...(reason.length > limits.purposeMaxLength
        ? { purpose: `Lý do trả hàng tối đa ${limits.purposeMaxLength} ký tự.` }
        : {}),
    }
  },
  toRequest: (revision, values) => {
    if (!values.warehouse || !values.supplier) return null
    return {
      revision,
      warehouseId: values.warehouse.id,
      supplierId: values.supplier.id,
      reason: values.purpose.trim(),
      lines: toAiFormSubmitLines(values.lines),
    }
  },
}

export const AI_DRAFT_WAREHOUSE_DESCRIPTORS: Readonly<Record<string, AiDraftEditDescriptor>> = {
  [AI_ACTIONS.createTransfer]: TRANSFER,
  [AI_ACTIONS.createSupplierReturn]: SUPPLIER_RETURN,
}
