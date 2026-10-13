import {
  isOperationalDateTimeInput,
  operationalToday,
  toOperationalDateTimeApi,
  toOperationalDateTimeInput,
  compareOperationalInstants,
} from '@/lib/operational-date-time'

export interface TransferFormDates {
  readonly plannedTransferDate?: string
  readonly requiredBy: string
}

export interface TransferStoredDates {
  readonly plannedTransferDate?: string | null
  readonly requiredBy?: string | null
}

const PAST_TOLERANCE_MS = 5 * 60 * 1000

export function transferDateIssues(
  values: TransferFormDates,
  original?: TransferStoredDates,
  now = new Date()
) {
  const issues: { path: 'plannedTransferDate' | 'requiredBy'; message: string }[] = []
  const changed = (key: keyof TransferFormDates) =>
    !original || (values[key] ?? '') !== toOperationalDateTimeInput(original[key])
  for (const key of ['plannedTransferDate', 'requiredBy'] as const) {
    const value = values[key] ?? ''
    if (!value) continue
    if (!isOperationalDateTimeInput(value)) {
      issues.push({ path: key, message: 'Ngày hoặc giờ không hợp lệ.' })
      continue
    }
    if (!changed(key)) continue
    const past = value.includes('T')
      ? new Date(toOperationalDateTimeApi(value)!).getTime() < now.getTime() - PAST_TOLERANCE_MS
      : value < operationalToday(now)
    if (past) issues.push({ path: key, message: 'Ngày đã qua. Vui lòng chọn lại ngày.' })
  }
  const planned = values.plannedTransferDate ?? ''
  if (
    planned &&
    values.requiredBy &&
    (changed('plannedTransferDate') || changed('requiredBy')) &&
    issues.length === 0
  ) {
    const wrongOrder =
      !planned.includes('T') || !values.requiredBy.includes('T')
        ? values.requiredBy.slice(0, 10) < planned.slice(0, 10)
        : compareOperationalInstants(
            toOperationalDateTimeApi(values.requiredBy, original?.requiredBy)!,
            toOperationalDateTimeApi(planned, original?.plannedTransferDate)!
          ) < 0
    if (wrongOrder)
      issues.push({
        path: 'requiredBy',
        message: 'Ngày hàng về không được trước ngày dự kiến điều chuyển.',
      })
  }
  return issues
}
