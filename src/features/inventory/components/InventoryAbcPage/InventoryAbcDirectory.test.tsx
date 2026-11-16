import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { InventoryAbcItem } from '../../types/inventory.types'
import { InventoryAbcDirectory } from './InventoryAbcDirectory'

it('keeps analysis outside list filters and describes the complete group A scope', () => {
  const onRun = vi.fn()
  const product: InventoryAbcItem = {
    warehouseId: 'warehouse',
    productId: 'product-a',
    sku: 'A001',
    productName: 'Mặt hàng A',
    totalQuantity: 10,
    metricValue: 10,
    cumulativePercentage: 50,
    class: 'A',
    calculationBasis: 'Lịch sử xuất',
    analysisFrom: '2026-10-01',
    analysisTo: '2026-10-31',
    analysisId: 'analysis',
    datasetFingerprint: null,
    metric: 'Quantity',
    aThreshold: 80,
    bThreshold: 95,
    appliedCycleCountId: null,
    version: null,
  }
  const noop = () => {}
  render(
    <InventoryAbcDirectory
      permissions={[]}
      search="B001"
      group="B"
      items={[product, { ...product, sku: 'A002', productId: 'product-a2' }]}
      matchingItems={[]}
      warehouseId="warehouse"
      warehouseOptions={[{ value: 'warehouse', label: 'Đà Nẵng' }]}
      page={1}
      pageSize={20}
      isLoading={false}
      isFetching={false}
      isError={false}
      areWarehousesLoading={false}
      areWarehousesError={false}
      onSearchChange={noop}
      onGroupChange={noop}
      onWarehouseChange={noop}
      onPageChange={noop}
      onPageSizeChange={noop}
      onRetryWarehouses={noop}
      onRetry={noop}
      historicalPeriodDays={90}
      metric="Quantity"
      aThreshold={80.5}
      bThreshold={95}
      isRunning={false}
      canRun
      canCreateCycleCount
      analysisId="analysis"
      datasetFingerprint="fingerprint"
      appliedCycleCountId={null}
      assignedTo="staff"
      scheduledDate="2026-11-16T10:00"
      staffOptions={[{ value: 'staff', label: 'Nhân viên kho' }]}
      isApplying={false}
      onHistoricalPeriodDaysChange={noop}
      onMetricChange={noop}
      onAThresholdChange={noop}
      onBThresholdChange={noop}
      onRun={onRun}
      onAssignedToChange={noop}
      onScheduledDateChange={noop}
      onApply={noop}
    />
  )

  expect(screen.getByRole('button', { name: 'Tạo kiểm kê nhóm A' })).toHaveAccessibleDescription(
    /có 2 mặt hàng nhóm A.*toàn bộ nhóm A/
  )
  fireEvent.click(screen.getByRole('button', { name: 'Phân tích ABC' }))
  const parameters = screen.getByRole('dialog', { name: 'Phân tích ABC' })
  expect(within(parameters).getByLabelText('Ngưỡng nhóm A (%)')).toHaveValue(80.5)
  fireEvent.click(within(parameters).getByRole('button', { name: 'Chạy phân tích' }))
  expect(onRun).toHaveBeenCalledOnce()
})
