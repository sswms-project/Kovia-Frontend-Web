import type { ForecastRun, ForecastRunStatus } from '../types/inventory.types'

export type ForecastRisk = 'stockout' | 'watch' | 'ok' | 'unknown'

export interface ForecastOverviewRow {
  productId: string
  sku: string
  productName: string
  unitName: string
  modelLabel: string
  totalDemand: number | null
  averageDailyDemand: number | null
  availableQuantity: number | null
  daysOfCover: number | null
  // Length of the forecast period; the cover bar is drawn against it.
  periodDays: number | null
  stockoutDate: string | null
  wape: number | null
  risk: ForecastRisk
}

export const FORECAST_RISK_LABELS: Record<ForecastRisk, string> = {
  stockout: 'Sắp hết',
  watch: 'Cần theo dõi',
  ok: 'Ổn',
  unknown: 'Chưa đủ dữ liệu',
}

/** Accuracy compares days that have ended: a run starting today (business date) has none yet. */
export function hasEndedForecastDays(forecastStartDate: string, today: string): boolean {
  return forecastStartDate < today
}

/** The first date on which the run has an ended day to compare: the day after it starts. */
export function forecastEvaluationStartDate(forecastStartDate: string): string {
  const next = new Date(`${forecastStartDate}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10)
}

// Running out this soon leaves no room to wait for the next run.
const URGENT_COVER_DAYS = 7
const RISK_ORDER: readonly ForecastRisk[] = ['stockout', 'watch', 'ok', 'unknown']

const MODEL_LABELS: Record<string, string> = {
  'naive-average': 'Trung bình',
  'weekday-average': 'Trung bình theo thứ',
  'croston-sba': 'Croston (bán ngắt quãng)',
  'holt-winters-weekly': 'Holt-Winters theo tuần',
  'lightgbm-global': 'LightGBM (học máy)',
}

const RUN_STATUS_LABELS: Record<ForecastRunStatus, string> = {
  Pending: 'Chờ chạy',
  Running: 'Đang chạy',
  Completed: 'Hoàn tất',
  Failed: 'Thất bại',
}

export function forecastModelLabel(method: string): string {
  // Runs saved before model selection stored a descriptive string starting with the method.
  if (method.startsWith('LinearRegression')) return 'Hồi quy tuyến tính'
  return MODEL_LABELS[method] ?? method
}

export function forecastRunStatusLabel(status: ForecastRunStatus): string {
  return RUN_STATUS_LABELS[status]
}

/**
 * One line per product of a run: expected demand against the stock that was available when the
 * run was calculated. Incoming and planned quantities are deliberately left out — the question
 * answered here is how long the stock on the shelves lasts.
 */
export function buildForecastOverview(
  run: Pick<ForecastRun, 'details' | 'results'>
): ForecastOverviewRow[] {
  const rows = (run.details?.products ?? []).map((product): ForecastOverviewRow => {
    const forecast = run.results
      .filter((result) => result.productId === product.productId)
      .sort((left, right) => left.forecastDate.localeCompare(right.forecastDate))
    const availableQuantity = product.availableQuantity ?? null
    const base = {
      productId: product.productId,
      sku: product.sku,
      productName: product.productName,
      unitName: product.unitName,
      availableQuantity,
      wape: product.holdoutWape,
    }
    if (product.basis !== 'Forecast' || forecast.length === 0) {
      return {
        ...base,
        modelLabel: '—',
        totalDemand: null,
        averageDailyDemand: null,
        daysOfCover: null,
        periodDays: null,
        stockoutDate: null,
        risk: 'unknown',
      }
    }

    const totalDemand = forecast.reduce((sum, point) => sum + point.forecastQuantity, 0)
    const averageDailyDemand = totalDemand / forecast.length
    const demand = {
      totalDemand,
      averageDailyDemand,
      periodDays: forecast.length,
      modelLabel: forecastModelLabel(product.method),
    }
    if (availableQuantity === null) {
      return { ...base, ...demand, daysOfCover: null, stockoutDate: null, risk: 'unknown' }
    }

    let remaining = availableQuantity
    const stockout = forecast.find((point) => {
      remaining -= point.forecastQuantity
      return remaining < 0
    })
    if (stockout) {
      const daysOfCover = forecast.indexOf(stockout)
      return {
        ...base,
        ...demand,
        daysOfCover,
        stockoutDate: stockout.forecastDate,
        risk: daysOfCover < URGENT_COVER_DAYS ? 'stockout' : 'watch',
      }
    }
    return {
      ...base,
      ...demand,
      daysOfCover:
        averageDailyDemand > 0 ? Math.floor(availableQuantity / averageDailyDemand) : null,
      stockoutDate: null,
      risk: 'ok',
    }
  })

  return rows.sort(
    (left, right) =>
      RISK_ORDER.indexOf(left.risk) - RISK_ORDER.indexOf(right.risk) ||
      (left.daysOfCover ?? Infinity) - (right.daysOfCover ?? Infinity) ||
      left.sku.localeCompare(right.sku)
  )
}

const CSV_HEADER = [
  'SKU',
  'Mặt hàng',
  'ĐVT',
  'Mô hình',
  'Nhu cầu cả kỳ',
  'Trung bình/ngày',
  'Tồn khả dụng',
  'Số ngày đủ hàng',
  'Ngày dự kiến hết hàng',
  'WAPE (%)',
  'Mức rủi ro',
]

function csvCell(value: string | number | null): string {
  if (value === null) return ''
  const text = typeof value === 'number' ? String(Math.round(value * 100) / 100) : value
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function forecastOverviewCsv(rows: readonly ForecastOverviewRow[]): string {
  return [
    CSV_HEADER,
    ...rows.map((row) => [
      row.sku,
      row.productName,
      row.unitName,
      row.modelLabel,
      row.totalDemand,
      row.averageDailyDemand,
      row.availableQuantity,
      row.daysOfCover,
      row.stockoutDate,
      row.wape,
      FORECAST_RISK_LABELS[row.risk],
    ]),
  ]
    .map((line) => line.map(csvCell).join(','))
    .join('\r\n')
}

export type ForecastRiskFilter = ForecastRisk | 'all'

export function filterForecastOverview(
  rows: readonly ForecastOverviewRow[],
  search: string,
  risk: ForecastRiskFilter
): ForecastOverviewRow[] {
  const keyword = search.trim().toLocaleLowerCase('vi')
  return rows.filter(
    (row) =>
      (risk === 'all' || row.risk === risk) &&
      (!keyword ||
        row.sku.toLocaleLowerCase('vi').includes(keyword) ||
        row.productName.toLocaleLowerCase('vi').includes(keyword))
  )
}

export function countForecastRisks(
  rows: readonly ForecastOverviewRow[]
): Record<ForecastRisk, number> {
  const counts: Record<ForecastRisk, number> = { stockout: 0, watch: 0, ok: 0, unknown: 0 }
  for (const row of rows) counts[row.risk] += 1
  return counts
}
