import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DemandForecastDiagnostics, ForecastRun } from '../../types/inventory.types'
import { ForecastDemandView } from './ForecastDemandView'

afterEach(cleanup)

const product: DemandForecastDiagnostics = {
  productId: 'p1',
  sku: 'PEN-01',
  productName: 'Bút bi',
  unitName: 'cái',
  basis: 'Forecast',
  method: 'holt-winters-weekly',
  historyFrom: '2026-09-01',
  historyTo: '2026-10-11',
  observationDays: 41,
  stockoutDays: 0,
  warning: null,
  holdoutMae: 1.2,
  baselineMae: 3.4,
  holdoutWape: 12.5,
  history: [],
  availableQuantity: 25,
  candidates: [
    { modelName: 'naive-average', mae: 3.4 },
    { modelName: 'holt-winters-weekly', mae: 1.2 },
  ],
}

function runOf(item: DemandForecastDiagnostics): Pick<ForecastRun, 'details' | 'results'> {
  return { results: [], details: { draftCreationNotice: null, products: [item] } }
}

describe('demand view', () => {
  it('names the chosen model and lists every candidate with its backtest error', () => {
    render(<ForecastDemandView run={runOf(product)} productId="p1" onProductChange={vi.fn()} />)

    expect(screen.getByText('Mô hình: Holt-Winters theo tuần')).toBeInTheDocument()
    const candidates = within(screen.getByRole('table', { name: 'So sánh mô hình' }))
    expect(candidates.getByRole('row', { name: /Trung bình.*3,4/ })).toBeInTheDocument()
    expect(
      candidates.getByRole('row', { name: /Holt-Winters theo tuần.*1,2.*Đã chọn/ })
    ).toBeInTheDocument()
  })

  it('omits the comparison for runs saved before candidates were recorded', () => {
    const legacy = runOf({
      ...product,
      candidates: null,
      method: 'LinearRegression / posted Issue / Asia/Ho_Chi_Minh',
    })

    render(<ForecastDemandView run={legacy} productId="p1" onProductChange={vi.fn()} />)

    expect(screen.getByText('Mô hình: Hồi quy tuyến tính')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'So sánh mô hình' })).not.toBeInTheDocument()
  })
})
