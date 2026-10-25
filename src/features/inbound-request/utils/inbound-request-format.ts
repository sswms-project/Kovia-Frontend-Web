import type { InboundRequestFormValues } from '../schemas/inbound-request.schema'
import {
  INBOUND_SOURCE_TYPE,
  type InboundRequestStatus,
  type LookupOption,
  type SaveInboundRequestRequest,
} from '../types/inbound-request.types'

const OPERATIONAL_TIME_ZONE = 'Asia/Ho_Chi_Minh'
const OPERATIONAL_DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeZone: OPERATIONAL_TIME_ZONE,
})
const OPERATIONAL_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: OPERATIONAL_TIME_ZONE,
})
const DATE_INPUT_PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: OPERATIONAL_TIME_ZONE,
})

export const INBOUND_REQUEST_STATUS_LABELS: Record<InboundRequestStatus, string> = {
  Draft: 'Bản nháp',
  PendingApproval: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Bị từ chối',
  Sent: 'Đã gửi nhà cung cấp',
  Confirmed: 'Nhà cung cấp xác nhận',
  PartiallyReceived: 'Nhận một phần',
  Received: 'Đã nhận đủ',
  Cancelled: 'Đã hủy',
  Closed: 'Đã đóng phần còn lại',
}

function parseOperationalDate(value: string | null | undefined): Date | null {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function toOperationalDateInputValue(value: string | null | undefined): string {
  const date = parseOperationalDate(value)
  if (!date) return ''

  const parts = DATE_INPUT_PARTS_FORMATTER.formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  return year && month && day ? `${year}-${month}-${day}` : ''
}

export function toOperationalDateApiValue(value: string): string | null {
  return value ? `${value}T00:00:00.000Z` : null
}

export function toOperationalDateTimeStart(value: string): string {
  return value.includes('T') ? `${value}:00+07:00` : `${value}T00:00:00+07:00`
}

export function toOperationalDateTimeEnd(value: string): string {
  return value.includes('T') ? `${value}:59.999+07:00` : `${value}T23:59:59.999+07:00`
}

export function toInboundRequestSaveRequest(
  values: InboundRequestFormValues
): SaveInboundRequestRequest {
  return {
    inboundRequestCode: values.inboundRequestCode.trim().toUpperCase(),
    warehouseId: values.warehouseId,
    sourceType: values.sourceType,
    supplierId: values.sourceType === INBOUND_SOURCE_TYPE.Supplier ? values.supplierId : null,
    sourceName:
      values.sourceType === INBOUND_SOURCE_TYPE.Supplier ? null : values.sourceName.trim(),
    sourceReference: values.sourceReference.trim() || null,
    expectedDate: toOperationalDateApiValue(values.expectedDate),
    lines: values.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      unitId: line.unitId || null,
    })),
  }
}

export function formatOperationalDate(value: string | null | undefined): string {
  if (!value) return 'Chưa xác định'

  const date = parseOperationalDate(value)
  return date ? OPERATIONAL_DATE_FORMATTER.format(date) : 'Không xác định'
}

export function formatOperationalDateTime(value: string | null | undefined): string {
  const date = parseOperationalDate(value)
  return date ? OPERATIONAL_DATE_TIME_FORMATTER.format(date) : 'Không xác định'
}

export function formatQuantity(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 6 }).format(value)
}

export function mergeLookupOptions(
  options: readonly LookupOption[],
  fallbackOptions: readonly LookupOption[]
): LookupOption[] {
  return Array.from(
    new Map([...fallbackOptions, ...options].map((option) => [option.value, option])).values()
  )
}
