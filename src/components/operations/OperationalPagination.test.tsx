import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OperationalPagination } from './OperationalPagination'

afterEach(cleanup)
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
})

describe('OperationalPagination optional center content', () => {
  it('opts into a smaller footer without changing navigation or page-size selection', async () => {
    const user = userEvent.setup()
    const changePage = vi.fn()
    const changeSize = vi.fn()
    const view = render(
      <OperationalPagination
        density="compact"
        page={2}
        pageSize={10}
        totalCount={50}
        onPageChange={changePage}
        onPageSizeChange={changeSize}
        centerContent={<span>Thông tin</span>}
      />
    )
    const footer = view.container.querySelector('footer')
    expect(footer).toHaveClass('min-h-10', 'py-1')
    expect(footer?.children[1]).not.toHaveClass('min-w-48')
    expect(screen.getByRole('combobox', { name: 'Số dòng mỗi trang' })).toHaveClass('w-16')
    for (const name of ['Trang đầu', 'Trang trước', 'Trang sau', 'Trang cuối'])
      await user.click(screen.getByRole('button', { name }))
    expect(changePage.mock.calls).toEqual([[1], [1], [3], [5]])
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Số dòng mỗi trang' }), { key: 'Enter' })
    await user.click(screen.getByRole('option', { name: /^20$/ }))
    expect(changeSize).toHaveBeenCalledWith(20)
  })
  it('keeps the original two-region footer when no center content is supplied', async () => {
    const changePage = vi.fn()
    const { container } = render(
      <OperationalPagination page={1} pageSize={10} totalCount={25} onPageChange={changePage} />
    )
    expect(container.querySelector('footer')?.children).toHaveLength(2)
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(changePage).toHaveBeenCalledWith(2)
  })

  it('inserts only the supplied center content between the total and page controls', () => {
    const { container } = render(
      <OperationalPagination
        page={2}
        pageSize={10}
        totalCount={25}
        onPageChange={vi.fn()}
        centerContent={<span>Cập nhật: 11:36</span>}
      />
    )
    const footer = container.querySelector('footer')
    expect(footer?.children).toHaveLength(3)
    expect(footer?.children[0]).toHaveTextContent('Tổng số: 25')
    expect(footer?.children[1]).toHaveClass('text-center', 'flex-1')
    expect(footer?.children[1]).toHaveTextContent('Cập nhật: 11:36')
    expect(footer?.children[2]).toContainElement(screen.getByRole('button', { name: 'Trang sau' }))
    expect(screen.queryByText('11–20')).not.toBeInTheDocument()
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('preserves pending navigation and page-size controls with center content', () => {
    render(
      <OperationalPagination
        page={2}
        pageSize={10}
        totalCount={25}
        isPending
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        centerContent="Cập nhật"
      />
    )
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Số dòng mỗi trang' })).toBeDisabled()
  })

  it.each([
    { page: 1, totalCount: 7, range: '1–7', pageLabel: '1 / 1' },
    { page: 2, totalCount: 25, range: '11–20', pageLabel: '2 / 3' },
    { page: 1, totalCount: 0, range: '0–0', pageLabel: '1 / 1' },
  ])('omits the row range for total=$totalCount while retaining the controls', (values) => {
    render(
      <OperationalPagination
        page={values.page}
        pageSize={10}
        totalCount={values.totalCount}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    )
    expect(screen.queryByText(values.range)).not.toBeInTheDocument()
    expect(screen.getByText(String(values.totalCount))).toBeInTheDocument()
    expect(screen.getByText(values.pageLabel)).toBeInTheDocument()
    expect(screen.getByText('Số dòng/trang')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Số dòng mỗi trang' })).toBeEnabled()
  })

  it('retains first, previous, next and last page callbacks without a row range', async () => {
    const user = userEvent.setup()
    const changePage = vi.fn()
    render(
      <OperationalPagination page={2} pageSize={10} totalCount={25} onPageChange={changePage} />
    )
    for (const name of ['Trang đầu', 'Trang trước', 'Trang sau', 'Trang cuối']) {
      await user.click(screen.getByRole('button', { name }))
    }
    expect(changePage.mock.calls).toEqual([[1], [1], [3], [3]])
  })
})
