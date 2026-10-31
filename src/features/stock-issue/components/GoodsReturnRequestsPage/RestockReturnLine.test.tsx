import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { expect, it, vi } from 'vitest'
import { RestockReturnLine } from './RestockReturnLine'
import {
  restockReturnSchema,
  type RestockReturnFormValues,
} from '../../schemas/restock-return.schema'
import type {
  GoodsReturnRequestItem,
  GoodsReturnSlotSuggestion,
} from '../../types/stock-issue.types'

vi.mock('@/components/operations/scanning', () => ({
  CameraScanControl: ({
    onCode,
    disabled,
  }: {
    onCode: (code: string) => boolean
    disabled: boolean
  }) => (
    <button disabled={disabled} type="button" onClick={() => onCode('KOVIA:LOC:RACK:original')}>
      Camera test
    </button>
  ),
}))
const original: GoodsReturnSlotSuggestion = {
  slotId: 'a',
  slotCode: '__SYSTEM_DEFAULT__',
  path: 'Khu K01 / Kệ A04',
  scanCodes: ['A04', 'KOVIA:LOC:RACK:original'],
  availableQuantity: 20,
  suggestedQuantity: 2,
  isOriginalSlot: true,
  reason: '',
  warnings: [],
}
const other = {
  ...original,
  slotId: 'b',
  path: 'Khu K02 / Kệ A05',
  scanCodes: ['A05'],
  isOriginalSlot: false,
}
const line = {
  id: 'line',
  productName: 'Kèm A3',
  sku: 'SKU00001',
  quantity: 2,
  unitName: 'Cái',
  condition: 'Good',
  restockSlotId: 'a',
} as GoodsReturnRequestItem
let form: ReturnType<typeof useForm<RestockReturnFormValues>>
function Harness() {
  const currentForm = useForm<RestockReturnFormValues>({
    resolver: zodResolver(restockReturnSchema),
    defaultValues: {
      items: [{ returnItemId: 'line', condition: 'Good', restockSlotId: 'a', scannedSlotCode: '' }],
    },
  })
  useEffect(() => {
    form = currentForm
  }, [currentForm])
  return (
    <RestockReturnLine
      line={line}
      index={0}
      form={currentForm}
      disabled={false}
      options={[
        { condition: 'Good', options: [original, other] },
        { condition: 'Damaged', options: [other] },
      ]}
    />
  )
}

it('rejects wrong/manual sentinel codes, confirms a rack label, and clears proof when slot/condition changes', async () => {
  render(<Harness />)
  const input = screen.getByLabelText('Hoặc nhập mã vị trí')
  fireEvent.change(input, { target: { value: '__SYSTEM_DEFAULT__' } })
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận mã' }))
  expect(form.getValues('items.0.scannedSlotCode')).toBe('')
  expect(screen.getByRole('alert').textContent).toContain('Mã chưa khớp')
  fireEvent.click(screen.getByRole('button', { name: 'Camera test' }))
  expect(form.getValues('items.0.scannedSlotCode')).toBe('KOVIA:LOC:RACK:original')
  expect(screen.getByText('Đã xác nhận vị trí cất')).toBeTruthy()
  const user = userEvent.setup()
  const location = screen.getByRole('combobox', { name: 'Vị trí cất hàng' })
  await user.click(location)
  await user.clear(location)
  await user.type(location, 'A05')
  expect(screen.queryByRole('option', { name: 'Khu K01 / Kệ A04' })).toBeNull()
  await user.click(screen.getByRole('option', { name: 'Khu K02 / Kệ A05' }))
  expect(form.getValues('items.0.scannedSlotCode')).toBe('')
  fireEvent.change(screen.getByLabelText('Hoặc nhập mã vị trí'), { target: { value: 'a05' } })
  fireEvent.keyDown(screen.getByLabelText('Hoặc nhập mã vị trí'), { key: 'Enter' })
  expect(form.getValues('items.0.scannedSlotCode')).toBe('a05')
  fireEvent.change(screen.getByLabelText('Tình trạng thực nhận'), { target: { value: 'Damaged' } })
  expect(form.getValues('items.0.scannedSlotCode')).toBe('')
  expect(form.getValues('items.0.restockSlotId')).toBe('b')
  await act(async () => {})
})

it('does not require a location scan for Scrap, but requires confirmation for stock-bearing lines', () => {
  const id = '11111111-1111-4111-8111-111111111111'
  expect(
    restockReturnSchema.safeParse({
      items: [{ returnItemId: id, condition: 'Scrap', restockSlotId: null }],
    }).success
  ).toBe(true)
  expect(
    restockReturnSchema.safeParse({
      items: [{ returnItemId: id, condition: 'Good', restockSlotId: id }],
    }).success
  ).toBe(false)
})
