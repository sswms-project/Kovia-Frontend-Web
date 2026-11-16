import { formatPlatformDateTime } from '@/features/platform-services/utils/platform-services-format'
import type {
  AlertFact,
  AlertFeedbackKind,
  AlertSeverity,
  AlertStatus,
  WatchRuleStatus,
} from '../types/ai-alerts.types'

export const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  Critical: 'Nghiêm trọng',
  High: 'Cao',
  Medium: 'Trung bình',
  Low: 'Thấp',
  Info: 'Thông tin',
}

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  Open: 'Mới',
  Acknowledged: 'Đã ghi nhận',
  Snoozed: 'Đang tạm hoãn',
  Resolved: 'Đã đóng',
}

export const RULE_STATUS_LABELS: Record<WatchRuleStatus, string> = {
  Active: 'Đang theo dõi',
  Paused: 'Tạm dừng',
  Suspended: 'Bị tạm ngưng',
  Completed: 'Đã hoàn thành',
}

export const FEEDBACK_LABELS: Record<AlertFeedbackKind, string> = {
  useful: 'Hữu ích',
  irrelevant: 'Không liên quan',
  duplicate: 'Trùng lặp',
  wrong_data: 'Sai dữ liệu',
  unclear: 'Khó hiểu',
}

export const SNOOZE_OPTIONS = [
  { hours: 1, label: '1 giờ' },
  { hours: 4, label: '4 giờ' },
  { hours: 24, label: '24 giờ' },
  { hours: 72, label: '3 ngày' },
] as const

// Nhãn cho các khóa dữ kiện backend ghi kèm cảnh báo; khóa lạ vẫn hiển thị nguyên tên.
const FACT_LABELS: Record<string, string> = {
  code: 'Mã phiếu',
  createdAt: 'Tạo lúc',
  ageHours: 'Đã chờ (giờ)',
  thresholdHours: 'Ngưỡng (giờ)',
  stageSince: 'Ở bước hiện tại từ',
  flagged: 'Cần đối soát',
  inboundRequestCode: 'Yêu cầu nhập',
  availableBase: 'Tồn khả dụng (đơn vị cơ sở)',
  thresholdBase: 'Ngưỡng (đơn vị cơ sở)',
  threshold: 'Ngưỡng',
  unit: 'Đơn vị',
  minStock: 'Tồn tối thiểu',
  projectedWithScheduled: 'Dự kiến còn (gồm hàng sắp về)',
  estimatedDemand: 'Nhu cầu ước tính',
  averageDailyDemand: 'Nhu cầu trung bình/ngày',
  daysUntilBelowMin: 'Số ngày tới dưới tối thiểu',
  plannedDate: 'Ngày dự kiến',
  skippedInsufficientHistory: 'Bỏ qua do thiếu lịch sử',
  lotNumber: 'Số lô',
  expiryDate: 'Hạn dùng',
  daysToExpiry: 'Số ngày tới hạn',
  available: 'Khả dụng',
  documentType: 'Loại phiếu',
}

const numberFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

export function formatAlertTime(value: string | null): string {
  return value ? formatPlatformDateTime(value) : '—'
}

function formatFactValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Có' : 'Không'
  if (typeof value === 'number') return numberFormatter.format(value)
  if (typeof value === 'string')
    return isoDateTimePattern.test(value) ? formatPlatformDateTime(value) : value
  if (Array.isArray(value)) return value.map(formatFactValue).join(', ')
  return JSON.stringify(value)
}

/** Dữ kiện là JSON tùy loại quy tắc: chấp nhận object {khóa: giá trị} hoặc mảng {label, value}. */
export function toAlertFacts(facts: unknown): AlertFact[] {
  if (Array.isArray(facts)) {
    return facts.flatMap((fact) => {
      if (typeof fact !== 'object' || fact === null) return []
      const { label, value } = fact as { label?: unknown; value?: unknown }
      return typeof label === 'string' ? [{ label, value: formatFactValue(value) }] : []
    })
  }
  if (typeof facts !== 'object' || facts === null) return []
  return Object.entries(facts).map(([key, value]) => ({
    label: FACT_LABELS[key] ?? key,
    value: formatFactValue(value),
  }))
}

export function formatHours(hours: number | null): string {
  if (hours === null) return '—'
  return hours < 24
    ? `${numberFormatter.format(hours)} giờ`
    : `${numberFormatter.format(hours / 24)} ngày`
}
