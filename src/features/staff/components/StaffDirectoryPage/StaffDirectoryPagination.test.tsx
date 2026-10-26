import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { StaffDirectoryPagination } from './StaffDirectoryPagination'

afterEach(cleanup)

it('omits the row range while retaining total, page navigation and disabled state', async () => {
  const user = userEvent.setup()
  const changePage = vi.fn()
  const props = { page: 2, pageSize: 20, totalCount: 41, onPageChange: changePage }
  const view = render(<StaffDirectoryPagination {...props} />)
  expect(screen.getByText('Tổng số: 41')).toBeInTheDocument()
  expect(screen.getByText('2/3')).toBeInTheDocument()
  expect(screen.queryByText(/21-40/)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Trang trước' }))
  await user.click(screen.getByRole('button', { name: 'Trang sau' }))
  expect(changePage.mock.calls).toEqual([[1], [3]])

  view.rerender(<StaffDirectoryPagination {...props} disabled />)
  expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled()
})
