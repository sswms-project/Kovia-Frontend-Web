import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
import type { UseQueryResult } from '@tanstack/react-query'
import { P } from '@/config/permissionCodes'
import type { LowStockAlert } from '../../types/low-stock-alert.types'
import { LowStockAlertDetail } from './LowStockAlertDetail'
afterEach(cleanup)
const item: LowStockAlert = {
  id: 'a',
  productId: 'p',
  sku: 'SP01',
  productName: 'Pin AA',
  productStatus: 'Active',
  warehouseId: 'w',
  warehouseCode: 'DN',
  warehouseName: 'Đà Nẵng',
  warehouseStatus: 'Active',
  currentQuantity: 10,
  minThreshold: 20,
  unitName: 'Cái',
  quantityPrecision: 0,
  status: 'Resolved',
  createdAt: '2026-11-26T00:00:00Z',
  acknowledgedAt: null,
  resolvedAt: null,
  acknowledgedByName: null,
  resolvedByName: null,
}
const query = (data: LowStockAlert) =>
  ({ data, isPending: false, isError: false }) as UseQueryResult<LowStockAlert, Error>
describe('alert detail', () => {
  it('keeps recorded numbers and builds exact warehouse/product links', () => {
    render(
      <LowStockAlertDetail
        id="a"
        query={query(item)}
        permissions={[P.INVENTORY_VIEW, P.INVENTORY_FORECAST_VIEW]}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('Đã kết thúc')).toBeInTheDocument()
    expect(screen.getByText('10 Cái')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Đi tới dự báo & bổ sung' })).toHaveAttribute(
      'href',
      '/reports/forecast?warehouseId=w&productId=p'
    )
    expect(screen.getByRole('link', { name: 'Xem tồn kho' })).toHaveAttribute(
      'href',
      '/inventory?warehouseId=w&productId=p'
    )
  })
  it('explains inactive records and disables unsupported navigation', () => {
    render(
      <LowStockAlertDetail
        id="a"
        query={query({ ...item, productStatus: 'Inactive', status: 'Open' })}
        permissions={[P.INVENTORY_VIEW, P.INVENTORY_FORECAST_VIEW]}
        onClose={() => {}}
      />
    )
    expect(screen.getByText('Sản phẩm ngừng hoạt động')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đi tới dự báo & bổ sung' })).toBeDisabled()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
  it('does not advertise forecast access with inventory permission alone', () => {
    render(
      <LowStockAlertDetail
        id="a"
        query={query(item)}
        permissions={[P.INVENTORY_VIEW]}
        onClose={() => {}}
      />
    )
    expect(screen.queryByText('Đi tới dự báo & bổ sung')).not.toBeInTheDocument()
  })
})

it('hides cached navigation actions when detail refresh fails', () => {
  const failed = {
    ...query(item),
    isError: true,
    error: { statusCode: 403, message: 'Không có quyền' },
  } as unknown as UseQueryResult<LowStockAlert, Error>
  render(
    <LowStockAlertDetail
      id="a"
      query={failed}
      permissions={[P.INVENTORY_VIEW, P.INVENTORY_FORECAST_VIEW]}
      onClose={() => {}}
    />
  )
  expect(screen.queryByRole('link', { name: 'Xem tồn kho' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Đi tới dự báo & bổ sung' })).not.toBeInTheDocument()
})
