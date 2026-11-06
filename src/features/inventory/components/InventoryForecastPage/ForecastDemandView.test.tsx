import type { ReactNode } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { DemandForecastDiagnostics } from '../../types/inventory.types'
import { ForecastDemandView } from './ForecastDemandView'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ComposedChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Area: () => null,
  CartesianGrid: () => null,
  Legend: () => null,
  Line: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}))

afterEach(cleanup)

const product: DemandForecastDiagnostics = {
  productId: 'p1',
  sku: 'SKU00001',
  productName: 'Kèm A3',
  unitName: 'Cái',
  basis: 'Forecast',
  method: 'naive-average',
  historyFrom: '2026-10-04',
  historyTo: '2026-11-04',
  observationDays: 32,
  stockoutDays: 0,
  warning: null,
  holdoutMae: 1.539,
  baselineMae: 1.539,
  holdoutWape: 17.3,
  history: [],
  candidates: [{ modelName: 'naive-average', mae: 1.539 }],
}

function show(item = product) {
  return render(
    <TooltipProvider delayDuration={0}>
      <ForecastDemandView
        run={{ details: { products: [item], draftCreationNotice: null }, results: [] }}
        productId="p1"
        onProductChange={vi.fn()}
      />
    </TooltipProvider>
  )
}

describe('forecast explanations', () => {
  it('keeps values and units while offering hover, click and keyboard help', async () => {
    const user = userEvent.setup()
    show()
    expect(screen.getAllByText('1,539 Cái')).toHaveLength(2)
    expect(screen.getByText('17,3 %')).toBeInTheDocument()
    expect(screen.getByText('Sai lệch trung bình/ngày')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'So sánh cách dự báo' })).toBeInTheDocument()
    const help = screen.getByRole('button', { name: 'Giải thích sai lệch trung bình/ngày' })
    await user.hover(help)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('MAE: mức chênh lệch tuyệt đối')
    await user.click(help)
    expect(
      await screen.findByRole('dialog', { name: 'Giải thích sai lệch trung bình/ngày' })
    ).toHaveTextContent('Cùng đơn vị với mặt hàng')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(help).toHaveFocus()
  })

  it('does not turn an unavailable percentage into zero', () => {
    show({ ...product, holdoutWape: null })
    expect(screen.getByText('Chưa tính được')).toBeInTheDocument()
    expect(screen.queryByText('0 %')).not.toBeInTheDocument()
  })
})
