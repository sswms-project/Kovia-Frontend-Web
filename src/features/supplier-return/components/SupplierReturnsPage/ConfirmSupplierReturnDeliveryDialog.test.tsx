import { zodResolver } from '@hookform/resolvers/zod'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import {
  confirmSupplierReturnDeliverySchema,
  type ConfirmSupplierReturnDeliveryFormValues,
} from '../../schemas/supplier-return.schema'
import { buildSupplierReturn } from './fixtures'
import { ConfirmSupplierReturnDeliveryDialog } from './ConfirmSupplierReturnDeliveryDialog'

const item = buildSupplierReturn({ status: 'Approved' })

function Harness({
  onSubmit,
}: {
  readonly onSubmit: (values: ConfirmSupplierReturnDeliveryFormValues) => void
}) {
  const form = useForm<ConfirmSupplierReturnDeliveryFormValues>({
    resolver: zodResolver(confirmSupplierReturnDeliverySchema),
    defaultValues: {
      items: item.items.map((line) => ({
        itemId: line.id,
        approvedQuantity: line.quantity,
        deliveredQuantity: line.quantity,
      })),
    },
  })
  return (
    <ConfirmSupplierReturnDeliveryDialog
      item={item}
      form={form}
      isPending={false}
      onOpenChange={vi.fn()}
      onSubmit={onSubmit}
    />
  )
}

async function setQuantity(index: number, value: string) {
  const user = userEvent.setup()
  const input = screen.getAllByLabelText(/Số lượng giao/)[index] as HTMLElement
  await user.clear(input)
  await user.type(input, value)
}

const submitButton = () => screen.getByRole('button', { name: /Xác nhận đã giao/ })

describe('ConfirmSupplierReturnDeliveryDialog', () => {
  it('defaults delivered quantity to the approved quantity and submits', async () => {
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)
    expect(screen.getAllByLabelText(/Số lượng giao/)[0]).toHaveValue(10)
    await userEvent.setup().click(submitButton())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  })

  it('blocks a delivered quantity above the approved quantity', async () => {
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)
    await setQuantity(0, '11')
    await userEvent.setup().click(submitButton())
    expect(await screen.findByText(/không được vượt quá số lượng đã duyệt/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('blocks a delivery where every quantity is zero', async () => {
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)
    await setQuantity(0, '0')
    await setQuantity(1, '0')
    await userEvent.setup().click(submitButton())
    expect(await screen.findByText(/Tổng số lượng giao phải lớn hơn 0/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
