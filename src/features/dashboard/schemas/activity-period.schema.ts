import { z } from 'zod'

const dayMilliseconds = 86_400_000
const periodFields = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year', 'custom']),
  week: z.string(),
  month: z.string(),
  quarter: z.string(),
  year: z.string(),
  dateFrom: z.string(),
  dateTo: z.string(),
})
export type ActivityPeriodValues = z.infer<typeof periodFields>
export interface ActivityDateRange {
  readonly dateFrom: string
  readonly dateTo: string
}

const isoDate = (date: Date) => date.toISOString().slice(0, 10)
const dateAt = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day))

export function resolveActivityPeriod(values: ActivityPeriodValues): ActivityDateRange | undefined {
  const year = Number(values.year)
  if (values.period === 'custom') {
    return { dateFrom: values.dateFrom, dateTo: values.dateTo }
  }
  if (values.period === 'week') {
    if (!/^\d{4}-W\d{2}$/.test(values.week)) return undefined
    const [weekYear, weekNumber] = values.week.split('-W').map(Number)
    if (!weekYear || !weekNumber || weekNumber > 53) return undefined
    const jan4 = dateAt(weekYear, 0, 4)
    const monday = new Date(
      jan4.getTime() + ((weekNumber - 1) * 7 - ((jan4.getUTCDay() + 6) % 7)) * dayMilliseconds
    )
    const thursday = new Date(monday.getTime() + 3 * dayMilliseconds)
    if (thursday.getUTCFullYear() !== weekYear) return undefined
    return {
      dateFrom: isoDate(monday),
      dateTo: isoDate(new Date(monday.getTime() + 6 * dayMilliseconds)),
    }
  }
  if (values.period === 'month') {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(values.month)) return undefined
    const [monthYear, monthNumber] = values.month.split('-').map(Number)
    if (!monthYear || !monthNumber || monthYear < 1900 || monthYear > 9998) return undefined
    return {
      dateFrom: isoDate(dateAt(monthYear, monthNumber - 1, 1)),
      dateTo: isoDate(dateAt(monthYear, monthNumber, 0)),
    }
  }
  if (!/^\d{4}$/.test(values.year) || year < 1900 || year > 9998) return undefined
  const quarter = Number(values.quarter)
  if (values.period === 'quarter' && !/^[1-4]$/.test(values.quarter)) return undefined
  const firstMonth = values.period === 'quarter' ? (quarter - 1) * 3 : 0
  const afterMonth = values.period === 'quarter' ? firstMonth + 3 : 12
  return {
    dateFrom: isoDate(dateAt(year, firstMonth, 1)),
    dateTo: isoDate(dateAt(year, afterMonth, 0)),
  }
}

export const activityPeriodSchema = periodFields.superRefine((values, context) => {
  const range = resolveActivityPeriod(values)
  const validDate = (value: string) => z.iso.date().safeParse(value).success
  if (
    !range ||
    !validDate(range.dateFrom) ||
    !validDate(range.dateTo) ||
    range.dateFrom < '1900-01-01' ||
    range.dateTo > '9998-12-31'
  ) {
    context.addIssue({
      code: 'custom',
      path: ['period'],
      message: 'Vui lòng chọn kỳ hợp lệ từ năm 1900 đến 9998.',
    })
    return
  }
  const days = (Date.parse(range.dateTo) - Date.parse(range.dateFrom)) / dayMilliseconds + 1
  if (days < 1 || days > 366) {
    context.addIssue({
      code: 'custom',
      path: ['period'],
      message: 'Từ ngày không được sau đến ngày và khoảng thời gian tối đa 366 ngày.',
    })
  }
})

export function defaultActivityPeriod(now = new Date()): ActivityPeriodValues {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const part = (kind: string) => parts.find((item) => item.type === kind)?.value ?? ''
  const today = `${part('year')}-${part('month')}-${part('day')}`
  const thursday = new Date(`${today}T00:00:00Z`)
  thursday.setUTCDate(thursday.getUTCDate() + 3 - ((thursday.getUTCDay() + 6) % 7))
  const weekYear = thursday.getUTCFullYear()
  const weekNumber = Math.ceil(
    ((thursday.getTime() - dateAt(weekYear, 0, 1).getTime()) / dayMilliseconds + 1) / 7
  )
  return {
    period: 'month',
    week: `${weekYear}-W${String(weekNumber).padStart(2, '0')}`,
    month: today.slice(0, 7),
    year: part('year'),
    quarter: String(Math.ceil(Number(part('month')) / 3)),
    dateFrom: `${today.slice(0, 7)}-01`,
    dateTo: today,
  }
}

export function activityPeriodParams(values: ActivityPeriodValues): Record<string, string> {
  return {
    activityPeriod: values.period,
    activityWeek: values.period === 'week' ? values.week : '',
    activityMonth: values.period === 'month' ? values.month : '',
    activityYear: ['year', 'quarter'].includes(values.period) ? values.year : '',
    activityQuarter: values.period === 'quarter' ? values.quarter : '',
    activityFrom: values.period === 'custom' ? values.dateFrom : '',
    activityTo: values.period === 'custom' ? values.dateTo : '',
  }
}
