export interface AlertSpeechCounts {
  readonly belowMinimum: number
  readonly expiring: number
  readonly expired?: number
}

/** Cảnh báo khẩn: hàng dưới tối thiểu hoặc đã quá hạn. */
export function hasUrgentAlerts(counts: AlertSpeechCounts): boolean {
  return counts.belowMinimum > 0 || (counts.expired ?? 0) > 0
}

function describe(count: number, label: string): string {
  return count > 0 ? `${count} mặt hàng ${label}` : ''
}

export function buildAlertSpeech(counts: AlertSpeechCounts, warehouseName?: string): string {
  const parts = [
    describe(counts.belowMinimum, 'dưới mức tối thiểu'),
    describe(counts.expiring, 'sắp hết hạn'),
    describe(counts.expired ?? 0, 'đã quá hạn'),
  ].filter(Boolean)
  if (parts.length === 0) return 'Không có cảnh báo tồn kho'
  const scope = warehouseName ? ` kho ${warehouseName}` : ''
  return `Cảnh báo tồn kho${scope}. ${parts.join('. ')}. Vui lòng kiểm tra.`
}
