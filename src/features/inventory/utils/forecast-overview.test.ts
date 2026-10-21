import { describe, expect, it } from 'vitest'
import type {
  DemandForecastDiagnostics,
  ForecastRun,
  ForecastRunResult,
} from '../types/inventory.types'
import {
  buildForecastOverview,
  countForecastRisks,
  filterForecastOverview,
  forecastModelLabel,
  forecastEvaluationStartDate,
  forecastOverviewCsv,
  forecastRunStatusLabel,
  hasEndedForecastDays,
} from './forecast-overview'

function product(overrides: Partial<DemandForecastDiagnostics>): DemandForecastDiagnostics {
  return {
    productId: 'p1',
    sku: 'SKU-1',
    productName: 'Bút bi',
    unitName: 'cái',
    basis: 'Forecast',
    method: 'weekday-average',
    historyFrom: '2026-09-01',
    historyTo: '2026-10-11',
    observationDays: 41,
    stockoutDays: 0,
    warning: null,
    holdoutMae: 1,
    baselineMae: 2,
    holdoutWape: 12.5,
    history: [],
    candidates: [],
    availableQuantity: 0,
    ...overrides,
  }
}

function results(productId: string, daily: number[]): ForecastRunResult[] {
  return daily.map((quantity, index) => ({
    id: `${productId}-${index}`,
    productId,
    sku: productId,
    productName: productId,
    forecastDate: `2026-10-${String(12 + index).padStart(2, '0')}`,
    forecastQuantity: quantity,
    lowerQuantity: quantity,
    upperQuantity: quantity,
    actualQuantity: null,
    accuracyPercent: null,
  }))
}

function run(
  products: DemandForecastDiagnostics[],
  forecast: ForecastRunResult[]
): Pick<ForecastRun, 'details' | 'results'> {
  return { details: { products, draftCreationNotice: null }, results: forecast }
}

describe('forecast overview', () => {
  it('reports demand, cover and the day stock runs out within the period', () => {
    const [row] = buildForecastOverview(
      run([product({ availableQuantity: 25 })], results('p1', Array(14).fill(10)))
    )

    // 25 on hand covers the 12th and 13th; the 14th cannot be served in full.
    expect(row).toMatchObject({
      totalDemand: 140,
      averageDailyDemand: 10,
      daysOfCover: 2,
      stockoutDate: '2026-10-14',
      risk: 'stockout',
    })
  })

  it('asks to watch a product that runs out later in the period', () => {
    const [row] = buildForecastOverview(
      run([product({ availableQuantity: 95 })], results('p1', Array(14).fill(10)))
    )

    expect(row).toMatchObject({ stockoutDate: '2026-10-21', risk: 'watch' })
  })

  it('extends cover beyond the period at the average rate when stock lasts', () => {
    const [row] = buildForecastOverview(
      run([product({ availableQuantity: 300 })], results('p1', Array(14).fill(10)))
    )

    expect(row).toMatchObject({ stockoutDate: null, daysOfCover: 30, risk: 'ok' })
  })

  it('has no cover figure for a product nobody is expected to buy', () => {
    const [row] = buildForecastOverview(
      run([product({ availableQuantity: 5 })], results('p1', Array(14).fill(0)))
    )

    expect(row).toMatchObject({ daysOfCover: null, risk: 'ok' })
  })

  it('does not rate products without a forecast or a stock snapshot', () => {
    const rows = buildForecastOverview(
      run(
        [
          product({ productId: 'p1', basis: 'PolicyFallback', availableQuantity: 3 }),
          product({ productId: 'p2', availableQuantity: null }),
        ],
        results('p2', Array(14).fill(10))
      )
    )

    expect(rows.map((row) => row.risk)).toEqual(['unknown', 'unknown'])
    expect(rows.map((row) => row.totalDemand)).toEqual([null, 140])
  })

  it('lists the most urgent products first', () => {
    const rows = buildForecastOverview(
      run(
        [
          product({ productId: 'ok', sku: 'OK', availableQuantity: 500 }),
          product({ productId: 'none', sku: 'NONE', basis: 'PolicyFallback' }),
          product({ productId: 'watch', sku: 'WATCH', availableQuantity: 95 }),
          product({ productId: 'out', sku: 'OUT', availableQuantity: 5 }),
        ],
        ['ok', 'watch', 'out'].flatMap((id) => results(id, Array(14).fill(10)))
      )
    )

    expect(rows.map((row) => row.sku)).toEqual(['OUT', 'WATCH', 'OK', 'NONE'])
  })

  it('returns nothing for a run saved before diagnostics existed', () => {
    expect(buildForecastOverview({ details: null, results: [] })).toEqual([])
  })
})

describe('forecast overview period and counts', () => {
  it('records the forecast period so cover can be drawn against it', () => {
    const rows = buildForecastOverview(
      run(
        [
          product({ productId: 'p1', availableQuantity: 25 }),
          product({ productId: 'p2', basis: 'PolicyFallback' }),
        ],
        results('p1', Array(14).fill(10))
      )
    )

    expect(rows.map((row) => row.periodDays)).toEqual([14, null])
  })

  it('counts every risk level, including levels nobody is at', () => {
    const rows = buildForecastOverview(
      run(
        [
          product({ productId: 'out', availableQuantity: 5 }),
          product({ productId: 'ok1', availableQuantity: 500 }),
          product({ productId: 'ok2', availableQuantity: 500 }),
        ],
        ['out', 'ok1', 'ok2'].flatMap((id) => results(id, Array(14).fill(10)))
      )
    )

    expect(countForecastRisks(rows)).toEqual({ stockout: 1, watch: 0, ok: 2, unknown: 0 })
  })
})

describe('forecast overview filter', () => {
  const rows = buildForecastOverview(
    run(
      [
        product({ productId: 'out', sku: 'PEN-01', productName: 'Bút bi', availableQuantity: 5 }),
        product({ productId: 'ok', sku: 'INK-02', productName: 'Mực in', availableQuantity: 500 }),
      ],
      ['out', 'ok'].flatMap((id) => results(id, Array(14).fill(10)))
    )
  )

  it('matches SKU or product name without caring about case', () => {
    expect(filterForecastOverview(rows, 'pen', 'all').map((row) => row.sku)).toEqual(['PEN-01'])
    expect(filterForecastOverview(rows, ' mực ', 'all').map((row) => row.sku)).toEqual(['INK-02'])
  })

  it('narrows to one risk level', () => {
    expect(filterForecastOverview(rows, '', 'ok').map((row) => row.sku)).toEqual(['INK-02'])
    expect(filterForecastOverview(rows, '', 'all')).toHaveLength(2)
  })
})

describe('forecast labels', () => {
  it('names the models in Vietnamese and keeps unknown ones readable', () => {
    expect(forecastModelLabel('holt-winters-weekly')).toBe('Holt-Winters theo tuần')
    expect(forecastModelLabel('croston-sba')).toBe('Croston (bán ngắt quãng)')
    expect(forecastModelLabel('lightgbm-global')).toBe('LightGBM (học máy)')
    expect(forecastModelLabel('LinearRegression / posted Issue / Asia/Ho_Chi_Minh')).toBe(
      'Hồi quy tuyến tính'
    )
    expect(forecastModelLabel('something-new')).toBe('something-new')
  })

  it('names run statuses in Vietnamese', () => {
    expect(forecastRunStatusLabel('Completed')).toBe('Hoàn tất')
    expect(forecastRunStatusLabel('Failed')).toBe('Thất bại')
  })
})

describe('forecast overview export', () => {
  it('writes one quoted line per product under a header', () => {
    const rows = buildForecastOverview(
      run(
        [product({ productName: 'Bút "bi", xanh', availableQuantity: 25 })],
        results('p1', Array(14).fill(10))
      )
    )

    const [header, line] = forecastOverviewCsv(rows).split('\r\n')

    expect(header).toBe(
      'SKU,Mặt hàng,ĐVT,Mô hình,Nhu cầu cả kỳ,Trung bình/ngày,Tồn khả dụng,Số ngày đủ hàng,Ngày dự kiến hết hàng,WAPE (%),Mức rủi ro'
    )
    expect(line).toBe(
      'SKU-1,"Bút ""bi"", xanh",cái,Trung bình theo thứ,140,10,25,2,2026-10-14,12.5,Sắp hết'
    )
  })
})

describe('forecast accuracy availability', () => {
  it('has no ended day on the day the forecast starts', () => {
    expect(hasEndedForecastDays('2026-10-21', '2026-10-21')).toBe(false)
    expect(hasEndedForecastDays('2026-10-22', '2026-10-21')).toBe(false)
    expect(hasEndedForecastDays('2026-10-21', '2026-10-22')).toBe(true)
  })

  it('can be compared from the day after the forecast starts, across month and year ends', () => {
    expect(forecastEvaluationStartDate('2026-10-21')).toBe('2026-10-22')
    expect(forecastEvaluationStartDate('2026-10-31')).toBe('2026-11-01')
    expect(forecastEvaluationStartDate('2026-12-31')).toBe('2027-01-01')
  })
})
