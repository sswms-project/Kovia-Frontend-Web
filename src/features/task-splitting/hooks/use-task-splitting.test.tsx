import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'
import {
  useCancelTaskSplitMutation,
  useCreateTaskSplitMutation,
  useTaskPartMutations,
  useUpdateTaskSplitSettingsMutation,
} from './use-task-splitting'

const api = vi.hoisted(() => ({
  create: vi.fn(),
  cancel: vi.fn(),
  updatePart: vi.fn(),
  reassignPart: vi.fn(),
  splitRemainingPart: vi.fn(),
  mergePart: vi.fn(),
  cancelPart: vi.fn(),
  completePart: vi.fn(),
  updateSettings: vi.fn(),
}))
vi.mock('../services/task-splitting.service', () => ({ taskSplittingService: api }))

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

const SOURCE_ID = 'source-1'
const SOURCE_DETAIL_KEY = ['inbound-requests', 'detail', SOURCE_ID] as const

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  const invalidatedKeys = () => invalidate.mock.calls.map(([filters]) => filters?.queryKey)
  return { wrapper, invalidatedKeys }
}

describe('split mutations', () => {
  it('creates a split with a fresh command id and refreshes split state and source', async () => {
    api.create.mockResolvedValue(['part-1'])
    const { wrapper, invalidatedKeys } = setup()
    const view = renderHook(
      () => useCreateTaskSplitMutation('Receiving', SOURCE_ID, [SOURCE_DETAIL_KEY]),
      { wrapper }
    )

    await act(() => view.result.current.mutateAsync({ expectedVersion: 'v1', parts: [] }))
    await act(() => view.result.current.mutateAsync({ expectedVersion: 'v1', parts: [] }))

    const [firstCall, secondCall] = api.create.mock.calls
    expect(firstCall?.slice(0, 2)).toEqual(['Receiving', SOURCE_ID])
    expect(firstCall?.[2]).toMatchObject({ expectedVersion: 'v1', parts: [] })
    expect(firstCall?.[2].commandId).toEqual(expect.any(String))
    expect(secondCall?.[2].commandId).not.toBe(firstCall?.[2].commandId)
    expect(invalidatedKeys()).toEqual(
      expect.arrayContaining([
        queryKeys.taskSplits.state('Receiving', SOURCE_ID),
        SOURCE_DETAIL_KEY,
      ])
    )
  })

  it('cancels a split and refreshes split state and source', async () => {
    api.cancel.mockResolvedValue({})
    const { wrapper, invalidatedKeys } = setup()
    const view = renderHook(
      () => useCancelTaskSplitMutation('CycleCount', SOURCE_ID, [SOURCE_DETAIL_KEY]),
      { wrapper }
    )

    await act(() => view.result.current.mutateAsync({ expectedVersion: 'v1', reason: 'Sai' }))

    expect(api.cancel).toHaveBeenCalledWith(
      'CycleCount',
      SOURCE_ID,
      expect.objectContaining({
        expectedVersion: 'v1',
        reason: 'Sai',
        commandId: expect.any(String),
      })
    )
    expect(invalidatedKeys()).toEqual(
      expect.arrayContaining([
        queryKeys.taskSplits.state('CycleCount', SOURCE_ID),
        SOURCE_DETAIL_KEY,
      ])
    )
  })

  it('refreshes split state after a version conflict so the next attempt uses the new version', async () => {
    api.create.mockRejectedValue({ statusCode: 409, message: 'Dữ liệu đã thay đổi' })
    const { wrapper, invalidatedKeys } = setup()
    const view = renderHook(() => useCreateTaskSplitMutation('PutAway', SOURCE_ID), { wrapper })

    await act(async () => {
      await expect(
        view.result.current.mutateAsync({ expectedVersion: 'v1', parts: [] })
      ).rejects.toMatchObject({ statusCode: 409 })
    })

    expect(invalidatedKeys()).toEqual([queryKeys.taskSplits.state('PutAway', SOURCE_ID)])
  })

  it('split state key is a prefix of every suggestion key so one invalidation clears both', () => {
    const state = queryKeys.taskSplits.state('Receiving', SOURCE_ID)
    const suggestion = queryKeys.taskSplits.suggestion('Receiving', SOURCE_ID, ['staff-1'])
    expect(suggestion.slice(0, state.length)).toEqual(state)
  })
})

describe('part mutations', () => {
  it.each([
    ['update', 'updatePart', { expectedVersion: 'v', staffId: 's', lines: [] }],
    [
      'reassign',
      'reassignPart',
      { expectedVersion: 'v', staffId: 's', expectedStaffId: null, reason: null },
    ],
    ['splitRemaining', 'splitRemainingPart', { expectedVersion: 'v', staffId: 's', lines: [] }],
    ['merge', 'mergePart', { expectedVersion: 'v', intoPartId: 'part-2' }],
    ['cancel', 'cancelPart', { expectedVersion: 'v', reason: 'r' }],
    ['complete', 'completePart', { expectedVersion: 'v', reason: 'r' }],
  ] as const)(
    '%s calls %s for the part and refreshes split state and source',
    async (action, method, request) => {
      api[method].mockResolvedValue({})
      const { wrapper, invalidatedKeys } = setup()
      const view = renderHook(
        () => useTaskPartMutations('TransferPutAway', SOURCE_ID, [SOURCE_DETAIL_KEY]),
        { wrapper }
      )

      const mutation = view.result.current[action] as {
        mutateAsync: (variables: unknown) => Promise<unknown>
      }
      await act(() => mutation.mutateAsync({ partId: 'part-1', ...request }))

      expect(api[method]).toHaveBeenCalledWith('part-1', request)
      expect(invalidatedKeys()).toEqual(
        expect.arrayContaining([
          queryKeys.taskSplits.state('TransferPutAway', SOURCE_ID),
          SOURCE_DETAIL_KEY,
        ])
      )
    }
  )
})

describe('settings mutation', () => {
  it('refreshes split settings after saving', async () => {
    api.updateSettings.mockResolvedValue({})
    const { wrapper, invalidatedKeys } = setup()
    const view = renderHook(() => useUpdateTaskSplitSettingsMutation(), { wrapper })

    await act(() => view.result.current.mutateAsync({ items: [] }))

    expect(api.updateSettings).toHaveBeenCalledWith({ items: [] })
    expect(invalidatedKeys()).toEqual([queryKeys.taskSplitSettings])
  })
})
