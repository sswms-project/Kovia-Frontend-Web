import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { logger } from '@/lib/logger'
import { getApiErrorMessage } from '@/lib/api-error'
import { inboundService } from '../services/inbound.service'
import {
  useApproveGoodsReceiptMutation,
  usePutawayMutation,
  useSavePutawayPlanMutation,
  useAssignReceivingTaskMutation,
  useCreateGoodsReceiptMutation,
} from './use-inbound'
import { queryKeys } from '@/lib/query-keys'

describe('putaway capacity rejection', () => {
  afterEach(() => vi.restoreAllMocks())
  it('acknowledges the committed write before waiting for fresh receipt data', async () => {
    vi.spyOn(inboundService, 'putaway').mockResolvedValue({
      isSuccess: true,
      statusCode: 200,
      message: '',
      data: null,
    })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const key = queryKeys.goodsReceipts.detail('receipt')
    client.setQueryData(key, { warehouseId: 'warehouse' })
    let finish!: () => void
    const refreshed = new Promise<unknown>((resolve) => {
      finish = () => resolve({ warehouseId: 'warehouse', version: 'v2' })
    })
    const { QueryObserver } = await import('@tanstack/react-query')
    const observer = new QueryObserver(client, {
      queryKey: key,
      queryFn: () => refreshed,
      staleTime: Infinity,
    })
    const unsubscribe = observer.subscribe(() => undefined)
    const committed = vi.fn()
    const hook = renderHook(() => usePutawayMutation(committed), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    let completed = false
    let pending!: Promise<unknown>
    act(() => {
      pending = hook.result.current
        .mutateAsync({
          receiptId: 'receipt',
          request: { lines: [], expectedVersion: 'v1', commandId: 'command' },
        })
        .then(() => {
          completed = true
        })
    })
    await waitFor(() => expect(committed).toHaveBeenCalledExactlyOnceWith('receipt'))
    expect(completed).toBe(false)
    await act(async () => {
      finish()
      await pending
    })
    expect(completed).toBe(true)
    unsubscribe()
    client.clear()
  })
  it.each([true, false])(
    'invalidates capacity caches after success (cached receipt: %s)',
    async (hasReceipt) => {
      vi.spyOn(inboundService, 'putaway').mockResolvedValueOnce({
        isSuccess: true,
        statusCode: 200,
        message: '',
        data: null,
      })
      const client = new QueryClient({
        defaultOptions: { queries: { staleTime: Infinity }, mutations: { retry: false } },
      })
      const warehouseId = 'warehouse-a'
      const keys = [
        queryKeys.warehouses.layout(warehouseId),
        queryKeys.warehouses.layoutScene(warehouseId),
        queryKeys.warehouses.locationsAll(warehouseId),
      ]
      for (const key of keys) client.setQueryData(key, [])
      client.setQueryData(queryKeys.warehouses.layout('warehouse-b'), [])
      if (hasReceipt)
        client.setQueryData(queryKeys.goodsReceipts.detail('receipt'), { warehouseId })
      const hook = renderHook(() => usePutawayMutation(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
      })
      await act(async () => {
        await hook.result.current.mutateAsync({
          receiptId: 'receipt',
          request: { lines: [], expectedVersion: 'AQ==', commandId: 'command' },
        })
      })
      for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true)
      expect(client.getQueryState(queryKeys.warehouses.layout('warehouse-b'))?.isInvalidated).toBe(
        !hasReceipt
      )
      client.clear()
    }
  )
  it.each([
    'Vị trí A01 không còn đủ sức chứa.',
    'Sản phẩm chưa có quy đổi đang hoạt động sang đơn vị sức chứa.',
  ])('returns the BE message to the form and logs a warning: %s', async (message) => {
    const error = { statusCode: 409, message }
    vi.spyOn(inboundService, 'putaway').mockRejectedValueOnce(error)
    const warning = vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
    const consoleError = vi.spyOn(logger, 'error').mockImplementation(() => undefined)
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const hook = renderHook(() => usePutawayMutation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await act(async () => {
      await expect(
        hook.result.current.mutateAsync({
          receiptId: 'receipt',
          request: { lines: [], expectedVersion: 'AQ==', commandId: 'command' },
        })
      ).rejects.toEqual(error)
    })
    expect(warning).toHaveBeenCalledWith(`[409] ${message}`)
    expect(consoleError).not.toHaveBeenCalled()
    await waitFor(() => expect(getApiErrorMessage(hook.result.current.error)).toBe(message))
    vi.restoreAllMocks()
  })
})

describe('inbound mutation refresh boundary', () => {
  it.each([false, true])(
    'defers the create refresh only when requested (%s)',
    async (deferRefresh) => {
      vi.spyOn(inboundService, 'createReceipt').mockResolvedValueOnce({
        version: 'AQ==',
        isSuccess: true,
        statusCode: 200,
        message: '',
        data: 'receipt',
      })
      const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      const tasks = queryKeys.goodsReceipts.receivingTasks({ pageNumber: 1, pageSize: 10 })
      client.setQueryData(tasks, {})
      const hook = renderHook(() => useCreateGoodsReceiptMutation(deferRefresh), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
      })
      await act(async () => {
        await hook.result.current.mutateAsync({
          inboundRequestId: 'request',
          expectedInboundVersion: 'AQ==',
          receiptCode: 'PN000010',
          lines: [],
        })
      })
      expect(client.getQueryState(tasks)?.isInvalidated).toBe(!deferRefresh)
      if (deferRefresh) {
        await act(async () => {
          await hook.result.current.refresh()
        })
        expect(client.getQueryState(tasks)?.isInvalidated).toBe(true)
      }
      client.clear()
    }
  )

  it.each([409, 500])('keeps assignment errors actionable in the log (%s)', async (statusCode) => {
    const error = { statusCode, message: 'Không thể phân công công việc.' }
    vi.spyOn(inboundService, 'assignReceivingTask').mockRejectedValueOnce(error)
    const warning = vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
    const failure = vi.spyOn(logger, 'error').mockImplementation(() => undefined)
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const hook = renderHook(() => useAssignReceivingTaskMutation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await act(async () => {
      await expect(
        hook.result.current.mutateAsync({
          inboundRequestId: 'request-a',
          request: {
            staffId: 'staff-a',
            expectedStaffId: null,
            reason: null,
            priority: 'Normal',
            dueAt: null,
          },
        })
      ).rejects.toEqual(error)
    })
    expect(statusCode === 409 ? warning : failure).toHaveBeenCalledWith(
      `[${statusCode}] ${error.message}`
    )
    expect(statusCode === 409 ? failure : warning).not.toHaveBeenCalled()
    await waitFor(() => expect(hook.result.current.error).toEqual(error))
    client.clear()
  })

  it('refreshes only the assigned inbound detail and its actions as well as task lists', async () => {
    vi.spyOn(inboundService, 'assignReceivingTask').mockResolvedValue({
      isSuccess: true,
      statusCode: 200,
      message: '',
      data: null,
    })
    const client = new QueryClient()
    const detail = queryKeys.inboundRequests.detail('request-a')
    const actions = queryKeys.inboundRequests.allowedActions('request-a')
    client.setQueryData(detail, { receivingAssignedTo: null })
    client.setQueryData(actions, { allowedActions: ['AssignReceivingTask'] })
    client.setQueryData(queryKeys.inboundRequests.detail('request-b'), {})
    const hook = renderHook(() => useAssignReceivingTaskMutation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await act(async () => {
      await hook.result.current.mutateAsync({
        inboundRequestId: 'request-a',
        request: {
          staffId: 'staff-a',
          expectedStaffId: null,
          reason: null,
          priority: 'Normal',
          dueAt: null,
        },
      })
    })
    expect(client.getQueryState(detail)?.isInvalidated).toBe(true)
    expect(client.getQueryState(actions)?.isInvalidated).toBe(true)
    expect(client.getQueryState(queryKeys.inboundRequests.detail('request-b'))?.isInvalidated).toBe(
      false
    )
    client.clear()
  })
  afterEach(() => vi.restoreAllMocks())

  it('keeps a committed write successful when the critical refresh fails', async () => {
    const write = vi.spyOn(inboundService, 'approveReceipt').mockResolvedValue({
      isSuccess: true,
      statusCode: 200,
      message: '',
      data: null,
    })
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const key = queryKeys.goodsReceipts.detail('receipt')
    client.setQueryData(key, { status: 'PendingApproval', version: 'AQ==' })
    const { QueryObserver } = await import('@tanstack/react-query')
    const observer = new QueryObserver(client, {
      queryKey: key,
      staleTime: Infinity,
      queryFn: async () => {
        throw new Error('refresh unavailable')
      },
    })
    const stop = observer.subscribe(() => undefined)
    const hook = renderHook(() => useApproveGoodsReceiptMutation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await act(async () => {
      await hook.result.current.mutateAsync({
        receiptId: 'receipt',
        expectedVersion: 'AQ==',
        selfApprovalAcknowledged: false,
      })
    })
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
    expect(write).toHaveBeenCalledTimes(1)
    expect(client.getQueryState(key)?.status).toBe('error')
    expect(client.getQueryState(key)?.isInvalidated).toBe(true)
    expect(logger.warn).toHaveBeenCalled()
    stop()
    client.clear()
  })

  it('does not wait for a warehouse layout refresh after putaway commits', async () => {
    vi.spyOn(inboundService, 'putaway').mockResolvedValue({
      isSuccess: true,
      statusCode: 200,
      message: '',
      data: null,
    })
    const client = new QueryClient()
    client.setQueryData(queryKeys.goodsReceipts.detail('receipt'), { warehouseId: 'warehouse-a' })
    const key = queryKeys.warehouses.layout('warehouse-a')
    client.setQueryData(key, [])
    let finish!: () => void
    const pending = new Promise<unknown>((resolve) => {
      finish = () => resolve([])
    })
    const { QueryObserver } = await import('@tanstack/react-query')
    const observer = new QueryObserver<unknown>(client, {
      queryKey: key,
      staleTime: Infinity,
      queryFn: () => pending,
    })
    const stop = observer.subscribe(() => undefined)
    const hook = renderHook(() => usePutawayMutation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await act(async () => {
      await hook.result.current.mutateAsync({
        receiptId: 'receipt',
        request: { lines: [], expectedVersion: 'AQ==', commandId: 'command' },
      })
    })
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
    expect(client.getQueryState(key)?.fetchStatus).toBe('fetching')
    await act(async () => {
      finish()
      await pending
    })
    stop()
    client.clear()
  })

  it('waits for the receipt and actions, not slow lookup/list reloads', async () => {
    vi.spyOn(inboundService, 'approveReceipt').mockResolvedValue({
      isSuccess: true,
      statusCode: 200,
      message: '',
      data: null,
    })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    let finishDetail!: () => void
    let finishActions!: () => void
    let finishList!: () => void
    const detail = new Promise<unknown>((resolve) => {
      finishDetail = () => resolve({ status: 'Approved', version: 'Ag==' })
    })
    const actions = new Promise<unknown>((resolve) => {
      finishActions = () => resolve({ allowedActions: ['PlanPutAway'] })
    })
    const list = new Promise<unknown>((resolve) => {
      finishList = () => resolve([])
    })
    const keys = [
      queryKeys.goodsReceipts.detail('receipt'),
      queryKeys.goodsReceipts.allowedActions('receipt'),
      queryKeys.goodsReceipts.list({ pageNumber: 1, pageSize: 20 }),
      queryKeys.goodsReceipts.nextCode,
      queryKeys.goodsReceipts.assignableStaff('warehouse'),
    ]
    const queryFns = [
      vi.fn(() => detail),
      vi.fn(() => actions),
      vi.fn(() => list),
      vi.fn(async () => 'code'),
      vi.fn(async () => []),
    ]
    keys.forEach((queryKey, index) =>
      client.setQueryData(queryKey, index === 0 ? { status: 'PendingApproval' } : [])
    )
    const { QueryObserver } = await import('@tanstack/react-query')
    const observers = keys.map(
      (queryKey, index) =>
        new QueryObserver<unknown>(client, {
          queryKey,
          queryFn: queryFns[index],
          staleTime: Infinity,
        })
    )
    const unsubscribe = observers.map((observer) => observer.subscribe(() => undefined))
    const hook = renderHook(() => useApproveGoodsReceiptMutation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    let finished = false
    let mutation!: Promise<unknown>
    await act(async () => {
      mutation = hook.result.current
        .mutateAsync({
          receiptId: 'receipt',
          expectedVersion: 'AQ==',
          selfApprovalAcknowledged: false,
        })
        .then(() => {
          finished = true
        })
    })
    await waitFor(() => expect(queryFns[0]).toHaveBeenCalledTimes(1))
    expect(finished).toBe(false)
    await act(async () => {
      finishDetail()
      finishActions()
    })
    await waitFor(() => expect(finished).toBe(true))
    expect(client.getQueryData(keys[0]!)).toEqual({ status: 'Approved', version: 'Ag==' })
    expect(client.getQueryData(keys[1]!)).toEqual({ allowedActions: ['PlanPutAway'] })
    expect(queryFns[0]).toHaveBeenCalledTimes(1)
    expect(queryFns[1]).toHaveBeenCalledTimes(1)
    expect(queryFns[2]).toHaveBeenCalledTimes(1)
    expect(queryFns[3]).not.toHaveBeenCalled()
    expect(queryFns[4]).not.toHaveBeenCalled()
    await act(async () => {
      finishList()
      await mutation
    })
    unsubscribe.forEach((stop) => stop())
    client.clear()
  })

  it('does not invalidate inventory for a plan-only write and refreshes task lists', async () => {
    vi.spyOn(inboundService, 'savePutawayPlan').mockResolvedValue({
      isSuccess: true,
      statusCode: 200,
      message: '',
      data: null,
    })
    const client = new QueryClient()
    client.setQueryData(queryKeys.inventory.all, [])
    client.setQueryData(['my-warehouse-tasks'], [])
    const hook = renderHook(() => useSavePutawayPlanMutation(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await act(async () => {
      await hook.result.current.mutateAsync({
        receiptId: 'receipt',
        request: { expectedVersion: 'AQ==', items: [] },
      })
    })
    expect(client.getQueryState(queryKeys.inventory.all)?.isInvalidated).toBe(false)
    expect(client.getQueryState(['my-warehouse-tasks'])?.isInvalidated).toBe(true)
    client.clear()
  })
})
