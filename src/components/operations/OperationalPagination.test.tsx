import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OperationalPagination } from './OperationalPagination'

afterEach(cleanup)

describe('OperationalPagination optional center content', () => {
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
    expect(screen.getByText('11–20')).toBeInTheDocument()
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
})
