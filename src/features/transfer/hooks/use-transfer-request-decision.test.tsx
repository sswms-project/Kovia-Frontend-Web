import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTransferRequestDecision } from './use-transfer-request-decision'
import { buildTransfer } from '../utils/transfer-test-fixtures'

const mock = vi.hoisted(() => ({
  decide: vi.fn(),
  withdraw: vi.fn(),
  get: vi.fn(),
  push: vi.fn(),
  invalidate: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mock.push }) }))
vi.mock('../services/transfer.service', () => ({
  transferService: {
    decideRequest: mock.decide,
    withdrawRequest: mock.withdraw,
    getTransfer: mock.get,
  },
}))
vi.mock('./use-transfers', () => ({
  TRANSFER_MUTATION_KEY: ['transfer-write'],
  invalidateTransferQueries: mock.invalidate,
}))

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const data = buildTransfer({ status: 'PendingSourceAcceptance', version: 'AQ==' })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return {
    data,
    ...renderHook(({ transfer }) => useTransferRequestDecision(transfer), {
      initialProps: { transfer: data },
      wrapper,
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mock.decide.mockResolvedValue({})
  mock.withdraw.mockResolvedValue({})
  mock.invalidate.mockResolvedValue(undefined)
  mock.get.mockResolvedValue({ data: buildTransfer({ status: 'InProgress' }) })
})

describe('Source request decisions', () => {
  it('closes a stale confirmation and requires reopening against the refreshed version', async () => {
    mock.decide.mockRejectedValueOnce({
      statusCode: 409,
      message: 'Phiếu điều chuyển đã thay đổi. Vui lòng tải lại.',
      isSuccess: false,
    })
    const { result, rerender, data } = setup()
    act(() => result.current.open('accept'))
    await act(() => result.current.submit())
    expect(result.current.kind).toBeNull()
    expect(result.current.uncertain).toBe(false)
    expect(mock.invalidate).toHaveBeenCalled()
    rerender({ transfer: { ...data, version: 'Ag==' } })
    await act(() => result.current.submit())
    expect(mock.decide).toHaveBeenCalledTimes(1)
    act(() => result.current.open('accept'))
    await act(() => result.current.submit())
    expect(mock.decide.mock.calls[1]![1].expectedVersion).toBe('Ag==')
  })

  it('does not submit a previous document decision after navigating to another transfer', async () => {
    const { result, rerender, data } = setup()
    act(() => result.current.open('accept'))
    rerender({ transfer: { ...data, id: 'another-transfer' } })
    await act(() => result.current.submit())
    expect(mock.decide).not.toHaveBeenCalled()
    expect(result.current.kind).toBeNull()
  })

  it('uses the version shown when opening and blocks duplicate confirmation synchronously', async () => {
    const { result, rerender, data } = setup()
    act(() => result.current.open('accept'))
    rerender({ transfer: { ...data, version: 'Ag==' } })
    await act(async () => {
      await Promise.all([result.current.submit(), result.current.submit()])
    })
    expect(mock.decide).toHaveBeenCalledTimes(1)
    expect(mock.decide).toHaveBeenCalledWith(data.id, {
      accept: true,
      reason: null,
      expectedVersion: 'AQ==',
      commandId: expect.any(String),
    })
    expect(result.current.kind).toBeNull()
  })

  it('keeps reason and blocks different decisions after a lost response, using only GET to verify', async () => {
    mock.decide.mockRejectedValueOnce(new Error('Network Error'))
    const { result } = setup()
    act(() => result.current.open('reject'))
    await act(() => result.current.submit('Kho cần hàng'))
    expect(result.current.uncertain).toBe(true)
    act(() => {
      result.current.close()
      result.current.open('accept')
    })
    await act(() => result.current.submit())
    expect(mock.decide).toHaveBeenCalledTimes(1)
    expect(result.current.kind).toBe('reject')
    mock.get.mockResolvedValueOnce({ data: buildTransfer({ status: 'PendingSourceAcceptance' }) })
    await act(() => result.current.verify())
    expect(result.current.uncertain).toBe(true)
    mock.get.mockRejectedValueOnce(new Error('Network Error'))
    await act(() => result.current.verify())
    expect(result.current.uncertain).toBe(true)
    await act(() => result.current.verify())
    expect(result.current.uncertain).toBe(false)
    expect(mock.decide).toHaveBeenCalledTimes(1)
  })

  it('rejects an empty rejection reason before sending', async () => {
    const { result } = setup()
    act(() => result.current.open('reject'))
    await act(() => result.current.submit('   '))
    expect(mock.decide).not.toHaveBeenCalled()
    expect(result.current.kind).toBe('reject')
    expect(result.current.uncertain).toBe(false)
    expect(result.current.form.getFieldState('reason').error).toBeDefined()
  })

  it('withdraws to a private draft and navigates to editing only after success', async () => {
    const { result, data } = setup()
    act(() => result.current.open('withdraw'))
    await act(() => result.current.submit())
    expect(mock.withdraw).toHaveBeenCalledWith(data.id, {
      expectedVersion: 'AQ==',
      commandId: expect.any(String),
    })
    expect(mock.push).toHaveBeenCalledWith(`/transfers/${data.id}/edit`)
    expect(mock.decide).not.toHaveBeenCalled()
  })
})
