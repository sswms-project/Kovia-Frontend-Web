import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { StockAdjustmentVoucherLinesTable } from './StockAdjustmentVoucherLinesTable'

it('uses the shared white data surface and scrolling table panel', () => {
  render(
    <StockAdjustmentVoucherLinesTable
      lines={[]}
      canExclude={false}
      excludedLineIds={[]}
      onToggleExclude={vi.fn()}
    />
  )
  const panel = screen.getByRole('region', { name: 'Dòng hàng phiếu điều chỉnh tồn' })
  expect(panel).toHaveAttribute('data-slot', 'operational-list-panel')
  expect(panel).toHaveClass('bg-card')
  expect(panel).toContainElement(screen.getByRole('table'))
  expect(screen.getByRole('columnheader', { name: 'Số kiểm đếm' })).toBeInTheDocument()
})
