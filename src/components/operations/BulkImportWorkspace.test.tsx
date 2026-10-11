import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BULK_IMPORT_ACTIVITY_LABELS,
  BulkImportWorkspace,
  BulkImportSummary,
  BulkImportSupplementaryToggle,
} from './BulkImportWorkspace'

afterEach(cleanup)

describe('shared catalog import presentation', () => {
  it.each([0, 1, 2, 3])('keeps bottom breathing room inside the scroll area at step %s', (step) => {
    const view = render(
      <BulkImportWorkspace header={<h1>Nhập dữ liệu</h1>} step={step} activity="idle">
        <button type="button">Thao tác cuối trang</button>
      </BulkImportWorkspace>
    )
    expect(view.container.firstChild).toHaveClass('overflow-y-auto', 'pb-3', 'sm:pb-4', 'lg:pb-5')
    expect(view.container.firstChild).toContainElement(
      screen.getByRole('button', { name: 'Thao tác cuối trang' })
    )
  })

  it.each(['reading', 'checking', 'importing', 'template'] as const)(
    'announces %s without replacing existing content',
    (activity) => {
      const view = render(
        <BulkImportWorkspace header={<h1>Nhập dữ liệu</h1>} step={2} activity="idle">
          <input aria-label="Dữ liệu hiện tại" defaultValue="Đã chọn" />
        </BulkImportWorkspace>
      )
      const input = screen.getByLabelText('Dữ liệu hiện tại')
      view.rerender(
        <BulkImportWorkspace header={<h1>Nhập dữ liệu</h1>} step={2} activity={activity}>
          <input aria-label="Dữ liệu hiện tại" defaultValue="Đã chọn" />
        </BulkImportWorkspace>
      )
      expect(screen.getByRole('status')).toHaveTextContent(BULK_IMPORT_ACTIVITY_LABELS[activity])
      expect(screen.getByLabelText('Dữ liệu hiện tại')).toBe(input)
      expect(input).toHaveValue('Đã chọn')
      expect(
        screen
          .getByRole('list', { name: 'Các bước nhập dữ liệu' })
          .querySelector('[aria-current="step"]')
      ).toHaveTextContent('3. Kiểm tra')
      expect(view.container.firstChild).toHaveAttribute('aria-busy', 'true')
      expect(view.container.firstChild).toHaveAttribute('data-slot', 'bulk-import-workspace')
    }
  )

  it('keeps summaries compact and the disclosure keyboard-accessible', () => {
    const toggle = vi.fn()
    render(
      <>
        <BulkImportSummary total={11} valid={3} />
        <BulkImportSupplementaryToggle
          expanded={false}
          controls="preview-table"
          errorCount={2}
          onToggle={toggle}
        />
      </>
    )
    expect(screen.getByText('8')).toBeInTheDocument()
    const summary = screen.getByRole('region', { name: 'Tổng quan bản xem trước' })
    const cards = summary.querySelectorAll('[data-slot="card"]')
    expect(cards).toHaveLength(3)
    cards.forEach((card) => expect(card).toHaveClass('border', 'border-border', 'ring-0'))
    const button = screen.getByRole('button', { name: 'Mở rộng thông tin bổ sung · 2 lỗi' })
    expect(button).toHaveAttribute('aria-controls', 'preview-table')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(button)
    expect(toggle).toHaveBeenCalledTimes(1)
  })
})
