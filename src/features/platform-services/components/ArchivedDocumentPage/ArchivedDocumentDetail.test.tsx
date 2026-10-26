import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ArchivedDocument } from '../../types/archived-document.types'
import { ArchivedDocumentDetail } from './ArchivedDocumentDetail'

const document: ArchivedDocument = {
  documentType: 'InboundRequest',
  id: 'deleted-document',
  code: 'NK001',
  warehouseId: 'warehouse',
  warehouseName: 'Kho A',
  createdAt: '2026-10-26T01:00:00Z',
  deletedAt: '2026-10-26T02:00:00Z',
  createdByName: 'Người lập',
  fields: [{ label: 'Nguồn hàng', value: 'Nhà cung cấp A' }],
  history: [],
  items: [
    {
      productId: 'product',
      sku: 'SKU001',
      productName: 'Sản phẩm A',
      quantity: 20,
      unitName: 'Cái',
      enteredQuantity: 2,
      enteredUnitName: 'Hộp',
      location: 'Khu K01 / Kệ A04',
      lotNumber: null,
      quality: 'Good',
    },
  ],
}

describe('ArchivedDocumentDetail', () => {
  it('shows retained contents and location on mobile/desktop without mutation controls', () => {
    render(<ArchivedDocumentDetail document={document} />)
    expect(screen.getByText('Đã xóa nháp · Chỉ xem')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Quay lại nhật ký hoạt động' })).toHaveAttribute(
      'href',
      '/audit-logs'
    )
    expect(screen.getByText('Nhà cung cấp A')).toBeInTheDocument()
    expect(screen.getAllByText(/Khu K01 \/ Kệ A04/)).toHaveLength(2)
    expect(screen.getByText(/danh mục hiện tại/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Lưu|Gửi duyệt|Khôi phục|Xóa|Hủy phiếu/ })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
