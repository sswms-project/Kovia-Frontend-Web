import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { BulkImportFieldCell, BulkImportRowResult } from './BulkImportFeedback'

describe('shared import feedback', () => {
  it('shows a single error immediately without a redundant disclosure or zero counters', () => {
    render(<BulkImportRowResult errors={['Email không hợp lệ.']} />)
    expect(screen.getByText('Không hợp lệ')).toBeVisible()
    expect(screen.getByText('Email không hợp lệ.')).toBeVisible()
    expect(screen.queryByText(/Xem chi tiết|0 cảnh báo|0 lưu ý/)).not.toBeInTheDocument()
  })

  it('deduplicates messages and reveals remaining errors and warnings with a focusable summary', async () => {
    render(
      <BulkImportRowResult
        errors={['Thiếu tên.', 'Thiếu tên.', 'Email không hợp lệ.']}
        warnings={['Kiểm tra lại mã.', 'Kiểm tra lại mã.']}
      />
    )
    expect(screen.getAllByText('Thiếu tên.')).toHaveLength(1)
    const summary = screen.getByText('Xem chi tiết (2 thông báo khác)')
    summary.focus()
    expect(summary).toHaveFocus()
    await userEvent.click(summary)
    expect(screen.getByText('Email không hợp lệ.')).toBeVisible()
    expect(screen.getByText('Kiểm tra lại mã.')).toBeVisible()
  })

  it('always shows errors that no cell can show, and folds the rest', async () => {
    render(
      <BulkImportRowResult
        errors={['Thiếu tên.', 'Quy đổi sai hệ số.', 'Thiếu mã quy đổi.']}
        pinned={['Quy đổi sai hệ số.', 'Thiếu mã quy đổi.']}
      />
    )
    expect(screen.getByText('Quy đổi sai hệ số.')).toBeVisible()
    expect(screen.getByText('Thiếu mã quy đổi.')).toBeVisible()
    expect(screen.getByText('Xem chi tiết (1 thông báo khác)')).toBeVisible()
    expect(screen.getByText('Thiếu tên.')).not.toBeVisible()
  })

  it('follows the row verdict when the row is invalid without any listed error', () => {
    render(<BulkImportRowResult errors={[]} valid={false} />)
    expect(screen.getByText('Không hợp lệ')).toBeVisible()
    expect(screen.queryByText('Hợp lệ')).not.toBeInTheDocument()
  })

  it('keeps valid rows selectable when they only have a warning or a planned catalog', () => {
    render(
      <BulkImportRowResult errors={[]} warnings={['Kiểm tra mã.']}>
        <span>Sẽ tạo danh mục</span>
      </BulkImportRowResult>
    )
    expect(screen.getByText('Hợp lệ')).toBeVisible()
    expect(screen.getByText('Sẽ tạo danh mục')).toBeVisible()
    expect(screen.getByText('Kiểm tra mã.')).toBeVisible()
  })

  it('wraps field values and highlights inline errors without making data editable', () => {
    render(
      <table>
        <tbody>
          <tr>
            <BulkImportFieldCell errors={['Tên quá dài.', 'Tên quá dài.']}>
              {'T'.repeat(300)}
            </BulkImportFieldCell>
          </tr>
        </tbody>
      </table>
    )
    expect(screen.getByRole('cell')).toHaveClass('bg-destructive/5', 'wrap-anywhere')
    expect(screen.getAllByText('Tên quá dài.')).toHaveLength(1)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
