import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from './alert-dialog'

afterEach(cleanup)

it('preserves modal focus and Radix state animations with reduced-motion support', async () => {
  render(
    <AlertDialog>
      <AlertDialogTrigger>Mở xác nhận</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Xác nhận thao tác</AlertDialogTitle>
        <AlertDialogDescription>Kiểm tra trước khi tiếp tục.</AlertDialogDescription>
        <AlertDialogCancel>Hủy</AlertDialogCancel>
        <AlertDialogAction>Đồng ý</AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>
  )
  await userEvent.click(screen.getByRole('button', { name: 'Mở xác nhận' }))
  const dialog = screen.getByRole('alertdialog')
  expect(dialog).toHaveAttribute('data-state', 'open')
  expect(dialog).toHaveClass(
    'data-[state=open]:animate-in',
    'animation-duration-250',
    'motion-reduce:animate-none'
  )
  expect(document.querySelector('[data-slot="alert-dialog-overlay"]')).toHaveClass(
    'motion-reduce:animate-none'
  )
  await waitFor(() => expect(screen.getByRole('button', { name: 'Hủy' })).toHaveFocus())
  await userEvent.click(screen.getByRole('button', { name: 'Hủy' }))
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  expect(screen.getByRole('button', { name: 'Mở xác nhận' })).toHaveFocus()
})
