import {
  compareOperationalInstants,
  toOperationalDateTimeInput,
  toOperationalDateTimeApi,
} from '@/lib/operational-date-time'
import type {
  TransferRequestFormValues,
  TransferLineFormValues,
} from '../schemas/transfer-request.schema'
import type {
  SaveTransferDraftRequest,
  TransferDetail,
  TransferItem,
  TransferLineInput,
  UpdateTransferRequest,
} from '../types/transfer.types'

export const EMPTY_TRANSFER_LINE: TransferLineFormValues = {
  itemId: null,
  productId: '',
  unitId: '',
  destinationSlotId: '',
  sourceSlotId: '',
  quantity: 1,
}

export function emptyTransferForm(): TransferRequestFormValues {
  return {
    transferCode: '',
    requesterName: '',
    requestingDepartment: '',
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    reason: '',
    requiredBy: '',
    plannedTransferDate: '',
    note: '',
    lines: [{ ...EMPTY_TRANSFER_LINE }],
  }
}

/** Dòng bị bỏ khỏi phiếu được BE giữ lại với số lượng 0 nên không đưa lại vào form. */
export function visibleTransferItems(items: readonly TransferItem[]): TransferItem[] {
  return items.filter((item) => item.quantity > 0 || item.dispatchedQuantity > 0)
}

export function transferToFormValues(detail: TransferDetail): TransferRequestFormValues {
  const items = visibleTransferItems(detail.items)
  return {
    transferCode: detail.transferCode,
    requesterName: detail.requesterName ?? '',
    requestingDepartment: detail.requestingDepartment ?? '',
    sourceWarehouseId: detail.sourceWarehouseId,
    destinationWarehouseId: detail.destinationWarehouseId,
    reason: detail.reason ?? '',
    requiredBy: toOperationalDateTimeInput(detail.requiredBy),
    plannedTransferDate: toOperationalDateTimeInput(detail.plannedTransferDate),
    note: detail.note ?? '',
    lines:
      items.length > 0
        ? items.map((item) => ({
            itemId: item.id,
            productId: item.productId,
            unitId: item.unitId ?? item.baseUnitId ?? '',
            destinationSlotId: item.destinationSlotId ?? '',
            sourceSlotId: item.sourceSlotId ?? '',
            quantity: item.requestedQuantity > 0 ? item.requestedQuantity : item.quantity,
          }))
        : [{ ...EMPTY_TRANSFER_LINE }],
  }
}

/** Số lượng đã xuất quy về ĐVT người tạo đã chọn: dòng không được giảm thấp hơn số này. */
export function dispatchedInEnteredUnit(
  item: Pick<TransferItem, 'dispatchedQuantity' | 'conversionFactor'>
) {
  const factor = item.conversionFactor > 0 ? item.conversionFactor : 1
  return item.dispatchedQuantity / factor
}

export function toTransferLineInputs(
  lines: readonly TransferLineFormValues[]
): TransferLineInput[] {
  return lines.map((line) => ({
    itemId: line.itemId,
    productId: line.productId,
    unitId: line.unitId || null,
    quantity: line.quantity,
    destinationSlotId: line.destinationSlotId || null,
    sourceSlotId: line.sourceSlotId || null,
  }))
}

export function toSaveDraftRequest(
  values: TransferRequestFormValues,
  expectedVersion: string | null,
  original?: Pick<TransferDetail, 'requiredBy' | 'plannedTransferDate'>
): SaveTransferDraftRequest {
  return {
    expectedVersion,
    transferCode: values.transferCode || null,
    requesterName: values.requesterName || null,
    requestingDepartment: values.requestingDepartment || null,
    sourceWarehouseId: values.sourceWarehouseId,
    destinationWarehouseId: values.destinationWarehouseId,
    reason: values.reason || null,
    requiredBy: toOperationalDateTimeApi(values.requiredBy, original?.requiredBy),
    plannedTransferDate: toOperationalDateTimeApi(
      values.plannedTransferDate ?? '',
      original?.plannedTransferDate
    ),
    note: values.note || null,
    items: toTransferLineInputs(values.lines),
  }
}

/** A later read can belong to another tab; accept its version only for the content just saved. */
export function matchesSavedTransferDraft(
  request: SaveTransferDraftRequest,
  saved: TransferDetail
): boolean {
  const text = (value: string | null | undefined) => value?.trim() || null
  const sameDate = (expected: string | null | undefined, actual: string | null | undefined) =>
    !expected || !actual ? !expected && !actual : compareOperationalInstants(expected, actual) === 0
  if (
    saved.status !== 'Draft' ||
    request.sourceWarehouseId !== saved.sourceWarehouseId ||
    request.destinationWarehouseId !== saved.destinationWarehouseId ||
    (text(request.transferCode) &&
      text(request.transferCode)?.toUpperCase() !== saved.transferCode) ||
    text(request.requesterName) !== text(saved.requesterName) ||
    text(request.requestingDepartment) !== text(saved.requestingDepartment) ||
    text(request.reason) !== text(saved.reason) ||
    text(request.note) !== text(saved.note) ||
    !sameDate(request.requiredBy, saved.requiredBy) ||
    !sameDate(request.plannedTransferDate, saved.plannedTransferDate) ||
    request.items.length !== saved.items.length
  )
    return false
  return request.items.every((input) => {
    const item = saved.items.find((candidate) => candidate.productId === input.productId)
    return (
      item !== undefined &&
      (!input.itemId || input.itemId === item.id) &&
      (input.unitId || item.baseUnitId) === item.unitId &&
      input.quantity === item.requestedQuantity &&
      (input.destinationSlotId ?? null) === item.destinationSlotId &&
      (input.sourceSlotId ?? null) === item.sourceSlotId
    )
  })
}

export function toUpdateTransferRequest(
  values: TransferRequestFormValues,
  original: Pick<TransferDetail, 'sourceWarehouseId' | 'destinationWarehouseId'> &
    Partial<Pick<TransferDetail, 'requiredBy' | 'plannedTransferDate'>>,
  expectedVersion: string
): UpdateTransferRequest {
  return {
    expectedVersion,
    requesterName: values.requesterName,
    requestingDepartment: values.requestingDepartment,
    sourceWarehouseId:
      values.sourceWarehouseId !== original.sourceWarehouseId ? values.sourceWarehouseId : null,
    destinationWarehouseId:
      values.destinationWarehouseId !== original.destinationWarehouseId
        ? values.destinationWarehouseId
        : null,
    reason: values.reason || null,
    requiredBy: toOperationalDateTimeApi(values.requiredBy, original.requiredBy),
    plannedTransferDate: toOperationalDateTimeApi(
      values.plannedTransferDate ?? '',
      original.plannedTransferDate
    ),
    clearRequiredBy: !values.requiredBy && Boolean(original.requiredBy),
    clearPlannedTransferDate: !values.plannedTransferDate && Boolean(original.plannedTransferDate),
    note: values.note || null,
    items: toTransferLineInputs(values.lines),
  }
}

/** Tên kho đang chọn để hiện trong hộp xác nhận; '—' khi chưa chọn hoặc chưa tải xong danh sách. */
export function findWarehouseName(
  options: readonly { readonly id: string; readonly name: string }[],
  warehouseId: string
): string {
  return options.find((option) => option.id === warehouseId)?.name ?? '—'
}
