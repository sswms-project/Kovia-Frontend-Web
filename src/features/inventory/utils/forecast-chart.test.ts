import { describe, expect, it } from 'vitest'
import type { ForecastRunResult } from '../types/inventory.types'
import { buildDemandChartData } from './forecast-chart'

function result(overrides: Partial<ForecastRunResult>): ForecastRunResult {
  return {
    id: 'r1',
    productId: 'p1',
    sku: 'SKU-1',
    productName: 'Bút bi',
    forecastDate: '2026-10-12',
    forecastQuantity: 10,
    lowerQuantity: 7,
    upperQuantity: 14,
    actualQuantity: null,
    accuracyPercent: null,
    ...overrides,
  }
}

describe('demand chart data', () => {
  it('keeps history and forecast as separate series without an invented joining point', () => {
    const data = buildDemandChartData([{ date: '2026-10-11', quantity: 9 }], [result({})])

    expect(data).toEqual([
      { date: '2026-10-11', actual: 9, forecast: null, range: null },
      { date: '2026-10-12', actual: null, forecast: 10, range: [7, 14] },
    ])
  })

  it('shows the reconciled actual next to its forecast', () => {
    const [point] = buildDemandChartData([], [result({ actualQuantity: 12 })])

    expect(point).toMatchObject({ actual: 12, forecast: 10 })
  })

  it('draws no range for runs saved before the model returned one', () => {
    const [stored] = buildDemandChartData(
      [],
      [result({ lowerQuantity: null, upperQuantity: null })]
    )
    // A backend that predates the range leaves the fields out altogether.
    const [omitted] = buildDemandChartData(
      [],
      [result({ lowerQuantity: undefined, upperQuantity: undefined })]
    )

    expect(stored).toMatchObject({ range: null })
    expect(omitted).toMatchObject({ range: null })
  })
})
