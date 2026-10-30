export interface AlertSpeechCounts {
  readonly belowMinimum: number
  readonly expiring: number
  readonly expired?: number
  /** Tên mặt hàng dưới mức tối thiểu (trang đầu), dùng để đọc rõ từng mặt hàng. */
  readonly belowMinimumNames?: readonly string[]
  readonly expiringNames?: readonly string[]
}

const MAX_NAMES = 5

/** Cảnh báo khẩn: hàng dưới tối thiểu hoặc đã quá hạn. */
export function hasUrgentAlerts(counts: AlertSpeechCounts): boolean {
  return counts.belowMinimum > 0 || (counts.expired ?? 0) > 0
}

function describe(count: number, label: string, names: readonly string[] = []): string {
  if (count <= 0) return ''
  const head = `${count} mặt hàng ${label}`
  const spoken = names.slice(0, MAX_NAMES)
  if (spoken.length === 0) return head
  const rest = count - spoken.length
  const tail = rest > 0 ? ` và ${rest} mặt hàng khác` : ''
  return `${head}: ${spoken.join(', ')}${tail}`
}

export function buildAlertSpeech(counts: AlertSpeechCounts, warehouseName?: string): string {
  const parts = [
    describe(counts.belowMinimum, 'dưới mức tối thiểu', counts.belowMinimumNames),
    describe(counts.expiring, 'sắp hết hạn', counts.expiringNames),
    describe(counts.expired ?? 0, 'đã quá hạn'),
  ].filter(Boolean)
  if (parts.length === 0) return 'Không có cảnh báo tồn kho'
  const scope = warehouseName ? ` kho ${warehouseName}` : ''
  return `Cảnh báo tồn kho${scope}. ${parts.join('. ')}. Vui lòng kiểm tra.`
}
