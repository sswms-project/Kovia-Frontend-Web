import type {
  DamageCaseStatus,
  DamageDisposition,
  InventoryEligibilityStatus,
  QualityStatus,
} from '../types/inventory.types'

export function formatInventoryLocation(location: {
  readonly slotCode: string
  readonly zoneCode?: string | null
  readonly rackCode?: string | null
  readonly isSystemDefaultSlot?: boolean
}): string {
  const isRackLocation = location.isSystemDefaultSlot || location.slotCode === '__SYSTEM_DEFAULT__'
  return [
    location.zoneCode ? `Khu vực ${location.zoneCode}` : null,
    location.rackCode ? `Kệ ${location.rackCode}` : isRackLocation ? 'Kệ chưa xác định' : null,
    !isRackLocation ? location.slotCode || 'Vị trí chưa xác định' : null,
  ]
    .filter(Boolean)
    .join(' / ')
}

export function formatInventoryQuantity(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
}

export function formatQualityStatus(value: QualityStatus): string {
  return {
    Good: 'Tốt',
    Damaged: 'Hư hỏng',
    Quarantine: 'Cách ly',
  }[value]
}

export function formatEligibilityStatus(value: InventoryEligibilityStatus): string {
  return {
    Available: 'Khả dụng',
    InspectionHold: 'Chờ kiểm tra',
    DamageHold: 'Giữ do hư hỏng',
    Quarantine: 'Cách ly',
  }[value]
}

export function formatInventoryDate(value: string | null): string {
  if (!value) return 'Chưa cập nhật'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Không xác định'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export function formatInventoryDateOnly(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(date)
}

export const DAMAGE_STATUS_LABELS: Record<DamageCaseStatus, string> = {
  Open: 'Đang giữ',
  Resolved: 'Đã xử lý',
}

export const DAMAGE_DISPOSITION_LABELS: Record<DamageDisposition, string> = {
  ReturnToAvailable: 'Trả lại khả dụng',
  ContinueHold: 'Tiếp tục giữ',
  SupplierReturn: 'Trả nhà cung cấp',
  InventoryAdjustment: 'Điều chỉnh giảm tồn',
  RequestEvidence: 'Yêu cầu bổ sung bằng chứng',
}

// Nhật ký hệ thống lưu mã hành động tiếng Anh; hiển thị bằng tiếng Việt cho người đọc.
const DAMAGE_EVENT_LABELS: Record<string, string> = {
  ReportDamaged: 'Báo hàng hỏng',
  ReportDamagedFromCycleCount: 'Tạo từ phiếu kiểm kê',
  DecideDisposition: 'Quyết định xử lý',
  RequestEvidence: 'Yêu cầu bổ sung bằng chứng',
  AddEvidence: 'Bổ sung bằng chứng',
}

export function formatDamageEvent(action: string): string {
  return DAMAGE_EVENT_LABELS[action] ?? action
}

export function formatDamageState(state: string | null): string {
  if (!state) return 'Khởi tạo'
  return DAMAGE_STATUS_LABELS[state as DamageCaseStatus] ?? state
}
