import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useTransferDestinationPreview } from './use-transfer-destination-preview'
import { EMPTY_TRANSFER_LINE, emptyTransferForm } from '../utils/transfer-form'
import type { TransferRequestFormValues } from '../schemas/transfer-request.schema'
import type {
  TransferDestinationPreviewRequest,
  TransferDestinationSuggestion,
} from '../schemas/transfer-destination-preview.schema'

const mocks = vi.hoisted(() => ({
  preview:
    vi.fn<
      (
        request: TransferDestinationPreviewRequest,
        signal?: AbortSignal
      ) => Promise<{ data: TransferDestinationSuggestion[] }>
    >(),
}))
vi.mock('../services/transfer.service', () => ({
  transferService: { previewDestinations: mocks.preview },
}))
const warehouse = '11111111-1111-4111-8111-111111111111'
const otherWarehouse = '22222222-2222-4222-8222-222222222222'
const product = '33333333-3333-4333-8333-333333333333'
const slot = '44444444-4444-4444-8444-444444444444'
const otherSlot = '55555555-5555-4555-8555-555555555555'
const clients: QueryClient[] = []

beforeEach(() => {
  mocks.preview.mockReset()
  mocks.preview.mockImplementation(async (request: TransferDestinationPreviewRequest) => ({
    data: request.items.map((item) => ({
      key: item.key,
      slotId: slot,
      path: 'Khu K01 - Hàng khô / Kệ A04',
      reason: 'Theo quy tắc kho',
    })),
  }))
})
afterEach(() => {
  cleanup()
  clients.forEach((client) => client.clear())
  clients.length = 0
})

function setup(
  initialProps = { enabled: true, blocked: false },
  initialLines: TransferRequestFormValues['lines'] = [
    { ...EMPTY_TRANSFER_LINE, productId: product, quantity: 5 },
  ]
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  clients.push(client)
  return renderHook(
    ({ enabled, blocked }: { enabled: boolean; blocked: boolean }) => {
      const form = useForm<TransferRequestFormValues>({
        defaultValues: {
          ...emptyTransferForm(),
          destinationWarehouseId: warehouse,
          lines: initialLines,
        },
      })
      const fields = useFieldArray({ control: form.control, name: 'lines' })
      const lines = useWatch({ control: form.control, name: 'lines' })
      const warehouseId = useWatch({ control: form.control, name: 'destinationWarehouseId' })
      const preview = useTransferDestinationPreview({
        form,
        fields: fields.fields,
        lines,
        warehouseId,
        enabled,
        blocked,
      })
      return { form, fields, preview }
    },
    {
      initialProps,
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    }
  )
}

it('fills a blank destination, retains its full label outside the dropdown page, and preserves quantity', async () => {
  const { result } = setup()
  await waitFor(() => expect(result.current.form.getValues('lines.0.destinationSlotId')).toBe(slot))
  expect(result.current.preview.options[slot]?.label).toContain('Hàng khô')
  expect(result.current.form.getValues('lines.0.quantity')).toBe(5)
  expect(result.current.preview.note(0)).toContain('Chưa giữ chỗ')
  expect(mocks.preview).toHaveBeenCalledTimes(1)
})

it('does not overwrite a manual choice made while the request is pending', async () => {
  let finish: (value: { data: TransferDestinationSuggestion[] }) => void = () => undefined
  mocks.preview.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const { result } = setup()
  await waitFor(() => expect(mocks.preview).toHaveBeenCalledTimes(1))
  const key = mocks.preview.mock.calls[0]?.[0].items[0]?.key
  if (!key) throw new Error('Preview did not receive a row')
  act(() => {
    result.current.preview.markManual(0)
    result.current.form.setValue('lines.0.destinationSlotId', otherSlot)
    finish({ data: [{ key, slotId: slot, path: 'Gợi ý cũ', reason: '' }] })
  })
  await waitFor(() =>
    expect(result.current.form.getValues('lines.0.destinationSlotId')).toBe(otherSlot)
  )
  expect(result.current.preview.options[slot]).toBeUndefined()
})

it('preserves an explicit clear even when a previous successful result is cached', async () => {
  const { result } = setup()
  await waitFor(() => expect(result.current.form.getValues('lines.0.destinationSlotId')).toBe(slot))
  act(() => {
    result.current.preview.markManual(0)
    result.current.form.setValue('lines.0.destinationSlotId', '')
  })
  await act(() => new Promise((resolve) => setTimeout(resolve, 500)))
  expect(result.current.form.getValues('lines.0.destinationSlotId')).toBe('')
  expect(mocks.preview).toHaveBeenCalledTimes(1)
})

it('rechecks an automatically filled location when quantity changes and leaves blank when it no longer fits', async () => {
  const { result } = setup()
  await waitFor(() => expect(result.current.form.getValues('lines.0.destinationSlotId')).toBe(slot))
  mocks.preview.mockImplementation(async (request: TransferDestinationPreviewRequest) => ({
    data: request.items.map((item) => ({
      key: item.key,
      slotId: null,
      path: null,
      reason: 'Chưa có một vị trí đủ chứa cả dòng.',
    })),
  }))
  act(() => result.current.form.setValue('lines.0.quantity', 100))
  await waitFor(() => expect(result.current.preview.note(0)).toContain('đủ chứa'))
  expect(result.current.form.getValues('lines.0.destinationSlotId')).toBe('')
})

it('does not apply a stale result after switching warehouse', async () => {
  let finish: (value: { data: TransferDestinationSuggestion[] }) => void = () => undefined
  mocks.preview.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const { result } = setup()
  await waitFor(() => expect(mocks.preview).toHaveBeenCalledTimes(1))
  const key = mocks.preview.mock.calls[0]?.[0].items[0]?.key
  if (!key) throw new Error('Preview did not receive a row')
  mocks.preview.mockResolvedValue({ data: [] })
  act(() => {
    result.current.form.setValue('destinationWarehouseId', otherWarehouse)
    finish({ data: [{ key, slotId: slot, path: 'Kho cũ', reason: '' }] })
  })
  await waitFor(() => expect(mocks.preview).toHaveBeenCalledTimes(2))
  expect(result.current.form.getValues('lines.0.destinationSlotId')).toBe('')
  expect(result.current.preview.options[slot]).toBeUndefined()
})

it('does not start a preview without capability or while saving', async () => {
  setup({ enabled: false, blocked: true })
  await act(() => new Promise((resolve) => setTimeout(resolve, 500)))
  expect(mocks.preview).not.toHaveBeenCalled()
})

it('keeps the manual dropdown usable and explains a suggestion failure', async () => {
  mocks.preview.mockRejectedValue(new Error('Unavailable'))
  const { result } = setup()
  await waitFor(() => expect(result.current.preview.note(0)).toContain('vẫn có thể chọn'))
  act(() => {
    result.current.preview.markManual(0)
    result.current.form.setValue('lines.0.destinationSlotId', otherSlot)
  })
  expect(result.current.form.getValues('lines.0.destinationSlotId')).toBe(otherSlot)
})

it('does not apply a pending suggestion while the user is confirming or saving', async () => {
  let finish: (value: { data: TransferDestinationSuggestion[] }) => void = () => undefined
  mocks.preview.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const { result, rerender } = setup()
  await waitFor(() => expect(mocks.preview).toHaveBeenCalledTimes(1))
  const key = mocks.preview.mock.calls[0]?.[0].items[0]?.key
  if (!key) throw new Error('Preview did not receive a row')
  rerender({ enabled: true, blocked: true })
  act(() => finish({ data: [{ key, slotId: slot, path: 'Vị trí gợi ý', reason: '' }] }))
  await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
  expect(result.current.form.getValues('lines.0.destinationSlotId')).toBe('')
})

it('does not apply a deleted row result to the row that replaces its index', async () => {
  let finish: (value: { data: TransferDestinationSuggestion[] }) => void = () => undefined
  mocks.preview.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const { result } = setup()
  await waitFor(() => expect(mocks.preview).toHaveBeenCalledTimes(1))
  const key = mocks.preview.mock.calls[0]?.[0].items[0]?.key
  if (!key) throw new Error('Preview did not receive a row')
  mocks.preview.mockResolvedValue({ data: [] })
  act(() => {
    result.current.fields.append({ ...EMPTY_TRANSFER_LINE, productId: otherWarehouse, quantity: 1 })
    result.current.fields.remove(0)
    finish({ data: [{ key, slotId: slot, path: 'Dòng đã xóa', reason: '' }] })
  })
  await waitFor(() => expect(mocks.preview).toHaveBeenCalledTimes(2))
  expect(result.current.form.getValues('lines.0.productId')).toBe(otherWarehouse)
  expect(result.current.form.getValues('lines.0.destinationSlotId')).toBe('')
})

it('does not erase a user-selected location when quantity changes', async () => {
  const { result } = setup()
  await waitFor(() => expect(result.current.form.getValues('lines.0.destinationSlotId')).toBe(slot))
  act(() => {
    result.current.preview.markManual(0)
    result.current.form.setValue('lines.0.destinationSlotId', otherSlot)
    result.current.form.setValue('lines.0.quantity', 100)
  })
  await act(() => new Promise((resolve) => setTimeout(resolve, 500)))
  expect(result.current.form.getValues('lines.0.destinationSlotId')).toBe(otherSlot)
})

it('rechecks other automatic rows when a manual choice changes their shared capacity', async () => {
  const { result } = setup({ enabled: true, blocked: false }, [
    { ...EMPTY_TRANSFER_LINE, productId: product, quantity: 5 },
    { ...EMPTY_TRANSFER_LINE, productId: otherWarehouse, quantity: 5 },
  ])
  await waitFor(() =>
    expect(
      result.current.form.getValues('lines').every((line) => line.destinationSlotId === slot)
    ).toBe(true)
  )
  mocks.preview.mockImplementation(async (request: TransferDestinationPreviewRequest) => ({
    data: request.items.map((item) => ({
      key: item.key,
      slotId: null,
      path: null,
      reason: 'Cần chọn lại vị trí sau khi tính chung sức chứa.',
    })),
  }))
  act(() => {
    result.current.preview.markManual(0)
    result.current.form.setValue('lines.0.destinationSlotId', otherSlot)
  })
  await waitFor(() => expect(result.current.preview.note(1)).toContain('tính chung'))
  expect(result.current.form.getValues('lines.0.destinationSlotId')).toBe(otherSlot)
  expect(result.current.form.getValues('lines.1.destinationSlotId')).toBe('')
})
