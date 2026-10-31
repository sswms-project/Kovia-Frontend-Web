import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { ReactNode } from 'react'
import { useSupplierReturnCode } from './use-supplier-return-code'
import type { CreateSupplierReturnFormValues } from '../schemas/supplier-return.schema'

const mocks = vi.hoisted(() => ({ next: vi.fn() }))
vi.mock('../services/supplier-return.service', () => ({
  supplierReturnService: { getNextCode: mocks.next },
}))

function setup(active = true, saved = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderHook(
    () => {
      const form = useForm<CreateSupplierReturnFormValues>({
        defaultValues: { supplierReturnCode: saved },
      })
      return { form, code: useSupplierReturnCode(form, active) }
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    }
  )
}

beforeEach(() => vi.clearAllMocks())

it('does not overwrite a manually cleared code when a late suggestion arrives', async () => {
  let finish!: (value: { data: string }) => void
  mocks.next.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  const { result } = setup()
  act(() => {
    result.current.form.setValue('supplierReturnCode', '')
    result.current.code.onChange()
  })
  await act(async () => finish({ data: 'THNCC000001' }))
  await waitFor(() => expect(result.current.code.status).toBe('ready'))
  expect(result.current.form.getValues('supplierReturnCode')).toBe('')
})

it('starts a new suggestion session after resetting the form', async () => {
  mocks.next
    .mockResolvedValueOnce({ data: 'THNCC000001' })
    .mockResolvedValueOnce({ data: 'THNCC000002' })
  const { result } = setup()
  await waitFor(() =>
    expect(result.current.form.getValues('supplierReturnCode')).toBe('THNCC000001')
  )
  act(() => {
    result.current.code.onChange()
    result.current.form.reset({ supplierReturnCode: '' })
    result.current.code.reset()
  })
  await waitFor(() =>
    expect(result.current.form.getValues('supplierReturnCode')).toBe('THNCC000002')
  )
})

it('preserves an existing code without requesting a suggestion during editing', () => {
  const { result } = setup(false, 'SRT-OLD')
  expect(result.current.form.getValues('supplierReturnCode')).toBe('SRT-OLD')
  expect(mocks.next).not.toHaveBeenCalled()
})

it('keeps manual entry available if suggestion lookup fails', async () => {
  mocks.next.mockRejectedValue(new Error('offline'))
  const { result } = setup()
  await waitFor(() => expect(result.current.code.status).toBe('error'))
  act(() => {
    result.current.form.setValue('supplierReturnCode', 'MY-001')
    result.current.code.onChange()
  })
  expect(result.current.form.getValues('supplierReturnCode')).toBe('MY-001')
})
