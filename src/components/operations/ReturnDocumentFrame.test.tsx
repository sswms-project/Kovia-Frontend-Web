import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { ReturnDocumentFrame } from './ReturnDocumentFrame'
import { Button } from '@/components/ui/button'

afterEach(cleanup)
const content = {
  title: 'Khách trả hàng',
  code: 'KTH000001',
  subtitle: 'Khách hàng · Đà Nẵng',
  listHref: '/tasks',
  isLoading: false,
  isError: false,
  onRetry: () => {},
  info: <p>Thông tin phụ</p>,
  children: <p>Dòng hàng cần xử lý</p>,
  actions: <Button>Nhận & cất hàng</Button>,
}

it('staff task keeps secondary information collapsed and places the action in its footer', () => {
  render(<ReturnDocumentFrame {...content} taskView />)
  expect(screen.queryByText('Thông tin phụ')).toBeNull()
  expect(
    screen
      .getByRole('contentinfo')
      .contains(screen.getByRole('button', { name: 'Nhận & cất hàng' }))
  ).toBe(true)
  expect(
    screen.getByRole('link', { name: 'Quay lại công việc của tôi' }).getAttribute('href')
  ).toBe('/tasks')
})

it('management detail retains expanded information and its header action', () => {
  render(<ReturnDocumentFrame {...content} />)
  expect(screen.getByText('Thông tin phụ')).toBeTruthy()
  expect(screen.queryByRole('contentinfo')).toBeNull()
  expect(
    screen.getByRole('banner').contains(screen.getByRole('button', { name: 'Nhận & cất hàng' }))
  ).toBe(true)
})
