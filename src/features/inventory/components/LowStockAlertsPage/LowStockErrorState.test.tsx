import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LowStockErrorState } from './LowStockErrorState'
afterEach(cleanup)
describe('low stock error actions', () => {
  it('offers login with a safe return URL for an ended session, never retry', () => {
    window.history.replaceState(
      null,
      '',
      '/inventory/low-stock-alerts?warehouseId=test&alertId=record'
    )
    const retry = vi.fn()
    render(
      <LowStockErrorState
        title="Không thể tải"
        error={{ statusCode: 401, message: 'Hết phiên' }}
        onRetry={retry}
      />
    )
    expect(screen.getByRole('link', { name: 'Đăng nhập lại' })).toHaveAttribute(
      'href',
      '/auth/login?returnUrl=%2Finventory%2Flow-stock-alerts%3FwarehouseId%3Dtest%26alertId%3Drecord'
    )
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument()
    expect(retry).not.toHaveBeenCalled()
  })
  it.each([403, 404])('does not offer a retry loop for status %s', (statusCode) => {
    render(
      <LowStockErrorState
        title="Không thể tải"
        error={{ statusCode, message: 'Không có quyền hoặc dữ liệu không tồn tại' }}
        onRetry={vi.fn()}
      />
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
  it('offers retry for transient server failures', () => {
    const retry = vi.fn()
    render(
      <LowStockErrorState
        title="Không thể tải"
        error={{ statusCode: 500, message: 'Lỗi máy chủ' }}
        onRetry={retry}
      />
    )
    screen.getByRole('button', { name: 'Thử lại' }).click()
    expect(retry).toHaveBeenCalledOnce()
  })
})
