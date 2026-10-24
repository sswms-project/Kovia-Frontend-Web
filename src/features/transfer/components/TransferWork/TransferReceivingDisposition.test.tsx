import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { expect, it } from 'vitest'
import type { TransferCountFormValues } from '../../schemas/transfer-receipt.schema'
import { TransferReceivingDisposition } from './TransferReceivingDisposition'

function Harness({ disabled = false }: { disabled?: boolean }) {
  const form = useForm<TransferCountFormValues>({
    defaultValues: { keepAtReceiving: false, entries: [] },
  })
  return <TransferReceivingDisposition form={form} slots={[]} disabled={disabled} />
}

it('offers a square checkbox with a full label target and preserves keyboard and disabled behavior', async () => {
  const user = userEvent.setup()
  const view = render(<Harness />)
  const checkbox = screen.getByRole('checkbox', { name: 'Giữ hàng đạt tại khu nhận' })
  expect(checkbox).toHaveClass('size-5', 'shrink-0')
  expect(checkbox).toHaveAccessibleDescription(/FEFO/)
  await user.click(screen.getByText('Giữ hàng đạt tại khu nhận'))
  expect(checkbox).toBeChecked()
  checkbox.focus()
  await user.keyboard(' ')
  expect(checkbox).not.toBeChecked()
  view.rerender(<Harness disabled />)
  expect(checkbox).toBeDisabled()
  await user.click(screen.getByText('Giữ hàng đạt tại khu nhận'))
  expect(checkbox).not.toBeChecked()
})
