import { act, renderHook } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransferRequestFormValues } from '../schemas/transfer-request.schema'
import { emptyTransferForm } from '../utils/transfer-form'
import { useTransferFormActions } from './use-transfer-form-actions'
import { buildTransfer } from '../utils/transfer-test-fixtures'

const mock = vi.hoisted(() => ({
  save: vi.fn(),
  submit: vi.fn(),
  update: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  read: vi.fn(),
}))
vi.mock('../services/transfer.service', () => ({ transferService: { getTransfer: mock.read } }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mock.push, replace: mock.replace }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('./use-transfers', () => ({
  useSaveTransferDraftMutation: () => ({ mutateAsync: mock.save, isPending: false }),
  useSubmitTransferDraftMutation: () => ({ mutateAsync: mock.submit, isPending: false }),
  useUpdateTransferMutation: () => ({ mutateAsync: mock.update, isPending: false }),
}))

function setup() {
  return renderHook(() => {
    const form = useForm<TransferRequestFormValues>({ defaultValues: emptyTransferForm() })
    return useTransferFormActions({
      mode: 'create',
      detail: undefined,
      form,
      refetchDetail: vi.fn().mockResolvedValue({}),
      dismissRealtime: vi.fn(),
    })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mock.save.mockResolvedValue({ data: 'draft-id' })
  mock.submit.mockResolvedValue({})
  mock.read.mockResolvedValue({ data: buildTransfer() })
})

describe('Transfer creation lifecycle', () => {
  it('blocks all resends after an unknown create result, without losing entered values', async () => {
    mock.save.mockRejectedValueOnce(new Error('Network Error'))
    const { result } = setup()
    await act(() => result.current.submitRequest(emptyTransferForm()))
    expect(result.current.unknownResult).toBe(true)
    await act(() =>
      Promise.all([
        result.current.submitRequest(emptyTransferForm()),
        result.current.saveDraft(emptyTransferForm()),
      ])
    )
    expect(mock.save).toHaveBeenCalledTimes(1)
    expect(mock.submit).not.toHaveBeenCalled()
    expect(result.current.unknownTransferId).toBeNull()
  })

  it('checks a saved draft after a lost submit response without replaying save or submit', async () => {
    mock.submit.mockRejectedValueOnce(new Error('Network Error'))
    const { result } = setup()
    await act(() => result.current.submitRequest(emptyTransferForm()))
    expect(result.current.unknownTransferId).toBe('draft-id')
    await act(() => result.current.submitRequest(emptyTransferForm()))
    await act(() => result.current.checkResult())
    expect(mock.read).toHaveBeenCalledWith('draft-id')
    expect(mock.save).toHaveBeenCalledTimes(1)
    expect(mock.submit).toHaveBeenCalledTimes(1)
    expect(mock.push).toHaveBeenCalledWith('/transfers/draft-id')
  })

  it('keeps the unknown-result block if the explicit status read fails', async () => {
    mock.submit.mockRejectedValueOnce(new Error('Network Error'))
    mock.read.mockRejectedValueOnce(new Error('Network Error'))
    const { result } = setup()
    await act(() => result.current.submitRequest(emptyTransferForm()))
    await act(() => result.current.checkResult())
    expect(result.current.unknownResult).toBe(true)
    expect(result.current.isChecking).toBe(false)
    expect(mock.push).not.toHaveBeenCalled()
  })

  it('does not overwrite edits added programmatically while saving a draft', async () => {
    let finish!: (value: { data: string }) => void
    mock.save.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const hook = renderHook(() => {
      const form = useForm<TransferRequestFormValues>({ defaultValues: emptyTransferForm() })
      return {
        form,
        actions: useTransferFormActions({
          mode: 'create',
          detail: undefined,
          form,
          refetchDetail: async () => ({}),
          dismissRealtime: vi.fn(),
        }),
      }
    })
    let pending!: Promise<void>
    await act(async () => {
      pending = hook.result.current.actions.saveDraft(hook.result.current.form.getValues())
      await Promise.resolve()
    })
    act(() => hook.result.current.form.setValue('note', 'Ghi chú thêm', { shouldDirty: true }))
    await act(async () => {
      finish({ data: 'draft-id' })
      await pending
    })
    expect(hook.result.current.form.getValues('note')).toBe('Ghi chú thêm')
    expect(mock.replace).not.toHaveBeenCalled()
  })
  it('locks the complete save-and-submit sequence before React renders pending state', async () => {
    const { result } = setup()
    await act(() =>
      Promise.all([
        result.current.submitRequest(emptyTransferForm()),
        result.current.submitRequest(emptyTransferForm()),
        result.current.saveDraft(emptyTransferForm()),
      ])
    )
    expect(mock.save).toHaveBeenCalledTimes(1)
    expect(mock.submit).toHaveBeenCalledTimes(1)
    expect(mock.push).toHaveBeenCalledTimes(1)
    expect(result.current.isSaving).toBe(false)
  })

  it('keeps the saved draft for retry when submission fails, without creating another draft', async () => {
    mock.submit.mockRejectedValueOnce({ statusCode: 409, message: 'Tồn đã thay đổi' })
    const { result } = setup()
    await act(() => result.current.submitRequest(emptyTransferForm()))
    expect(mock.push).not.toHaveBeenCalled()
    expect(result.current.isSaving).toBe(false)
    await act(() => result.current.submitRequest(emptyTransferForm()))
    expect(mock.save.mock.calls[1]?.[0].transferId).toBe('draft-id')
    expect(mock.submit).toHaveBeenCalledTimes(2)
    expect(mock.push).toHaveBeenCalledTimes(1)
  })
})
