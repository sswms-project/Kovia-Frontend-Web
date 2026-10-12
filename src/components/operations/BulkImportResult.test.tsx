import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BulkImportResult } from './BulkImportResult'

afterEach(cleanup)

describe('import result layout', () => {
  it('bounds columns and wraps complete long labels and results without truncation', async () => {
    const label = `QA261008-09JC9-G03 · ${'T'.repeat(256)} QA261008-09JC9`
    const result = `Bỏ qua: Tên nhóm bắt buộc, tối đa 255 ký tự. ${'X'.repeat(300)}`
    const onExport = vi.fn()
    render(
      <BulkImportResult
        entityLabel="nhóm vật tư hàng hóa"
        listHref="/categories"
        listLabel="Về danh sách"
        resultFileName="ket-qua.csv"
        items={[
          { rowNumber: 4, label, result, isImported: false },
          { rowNumber: 5, label: 'Nhóm hợp lệ', result: 'Đã nhập', isImported: true },
        ]}
        onRestart={vi.fn()}
        onExport={onExport}
      />
    )
    const table = screen.getByRole('table', { name: 'Kết quả nhập nhóm vật tư hàng hóa' })
    expect(table).toHaveClass('table-fixed')
    expect(within(table).getByRole('columnheader', { name: 'Kết quả' })).toHaveClass('w-2/5')
    expect(within(table).getByRole('cell', { name: label })).toHaveClass(
      'wrap-anywhere',
      'whitespace-normal'
    )
    expect(within(table).getByRole('cell', { name: result })).toHaveClass('wrap-anywhere')
    expect(within(table).getByText(result)).toHaveClass('h-auto', 'max-w-full', 'whitespace-normal')
    expect(within(table).getByText('Đã nhập')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Xuất kết quả CSV' }))
    expect(onExport).toHaveBeenCalledOnce()
  })

  it('preserves custom result content instead of rendering the default table', () => {
    render(
      <BulkImportResult
        entityLabel="sản phẩm"
        listHref="/products"
        listLabel="Về danh sách"
        resultFileName="ket-qua.csv"
        items={[]}
        onRestart={vi.fn()}
      >
        <p>Bảng hàng hóa riêng</p>
      </BulkImportResult>
    )
    expect(screen.getByText('Bảng hàng hóa riêng')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
