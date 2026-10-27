import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'
import {
  useCancelTaskSplitMutation,
  useCreateTaskSplitMutation,
  useTaskPartMutations,
  useTaskSplitSuggestionQuery,
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
  getSuggestion: vi.fn(),
}))
vi.mock('../services/task-splitting.service', () => ({ taskSplittingService: api }))

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

const SOURCE_ID = 'source-1'
const SOURCE_DETAIL_KEY = ['inbound-requests', 'detail', SOURCE_ID] as const

function setup() {
  // Mirrors the app client: queries stay fresh for five minutes unless a hook opts out.
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 5 * 60 * 1000 },
      mutations: { retry: false },
    },
  })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  const invalidatedKeys = () => invalidate.mock.calls.map(([filters]) => filters?.queryKey)
  return { wrapper, invalidatedKeys }
}

describe('split mutations', () => {
  it('reuses the command id when the same split is retried so the backend replays it', async () => {
    api.create
      .mockRejectedValueOnce({ statusCode: 500, message: 'Network Error' })
      .mockResolvedValue(['part-1'])
    const { wrapper, invalidatedKeys } = setup()
    const view = renderHook(
      () => useCreateTaskSplitMutation('Receiving', SOURCE_ID, [SOURCE_DETAIL_KEY]),
      { wrapper }
    )
    const request = { expectedVersion: 'v1', parts: [] }

    await act(async () => {
      await expect(view.result.current.mutateAsync(request)).rejects.toBeDefined()
    })
    await act(() => view.result.current.mutateAsync({ ...request }))
    await act(() => view.result.current.mutateAsync({ ...request }))
    await act(() => view.result.current.mutateAsync({ expectedVersion: 'v2', parts: [] }))

    const commandIds = api.create.mock.calls.map((call) => call[2].commandId)
    expect(api.create.mock.calls[0]?.slice(0, 2)).toEqual(['Receiving', SOURCE_ID])
    expect(api.create.mock.calls[0]?.[2]).toMatchObject(request)
    expect(commandIds[0]).toEqual(expect.any(String))
    expect(commandIds[1]).toBe(commandIds[0])
    // After a success the same payload is a new intent, not a retry.
    expect(commandIds[2]).not.toBe(commandIds[1])
    expect(commandIds[3]).not.toBe(commandIds[2])
    expect(invalidatedKeys()).toEqual(
      expect.arrayContaining([
        queryKeys.taskSplits.state('Receiving', SOURCE_ID),
        SOURCE_DETAIL_KEY,
      ])
    )
  })

  it('cancels a split, reusing the command id on retry, and refreshes split state and source', async () => {
    api.cancel
      .mockRejectedValueOnce({ statusCode: 500, message: 'Network Error' })
      .mockResolvedValue({})
    const { wrapper, invalidatedKeys } = setup()
    const view = renderHook(
      () => useCancelTaskSplitMutation('CycleCount', SOURCE_ID, [SOURCE_DETAIL_KEY]),
      { wrapper }
    )

    await act(async () => {
      await expect(
        view.result.current.mutateAsync({ expectedVersion: 'v1', reason: 'Sai' })
      ).rejects.toBeDefined()
    })
    await act(() => view.result.current.mutateAsync({ expectedVersion: 'v1', reason: 'Sai' }))

    const [first, second] = api.cancel.mock.calls.map((call) => call[2].commandId)
    expect(second).toBe(first)
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

  it.each([409, 404])(
    'refreshes split state after a %i so the screen shows the current split',
    async (statusCode) => {
      api.create.mockRejectedValue({ statusCode, message: 'Dữ liệu đã thay đổi' })
      const { wrapper, invalidatedKeys } = setup()
      const view = renderHook(() => useCreateTaskSplitMutation('PutAway', SOURCE_ID), {
        wrapper,
      })

      await act(async () => {
        await expect(
          view.result.current.mutateAsync({ expectedVersion: 'v1', parts: [] })
        ).rejects.toMatchObject({ statusCode })
      })

      expect(invalidatedKeys()).toEqual([queryKeys.taskSplits.state('PutAway', SOURCE_ID)])
    }
  )

  it('does not refresh split state for other failures', async () => {
    api.create.mockRejectedValue({ statusCode: 400, message: 'Sai số lượng' })
    const { wrapper, invalidatedKeys } = setup()
    const view = renderHook(() => useCreateTaskSplitMutation('PutAway', SOURCE_ID), { wrapper })

    await act(async () => {
      await expect(
        view.result.current.mutateAsync({ expectedVersion: 'v1', parts: [] })
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    expect(invalidatedKeys()).toEqual([])
  })

  it('split state key is a prefix of every suggestion key so one invalidation clears both', () => {
    const state = queryKeys.taskSplits.state('Receiving', SOURCE_ID)
    const suggestion = queryKeys.taskSplits.suggestion('Receiving', SOURCE_ID, ['staff-1'])
    expect(suggestion.slice(0, state.length)).toEqual(state)
  })
})

describe('suggestion query', () => {
  it('shares one cache entry for the same staff in any order, and for no staff vs empty', () => {
    const suggestion = queryKeys.taskSplits.suggestion
    expect(suggestion('Receiving', SOURCE_ID, ['b', 'a'])).toEqual(
      suggestion('Receiving', SOURCE_ID, ['a', 'b'])
    )
    expect(suggestion('Receiving', SOURCE_ID, [])).toEqual(suggestion('Receiving', SOURCE_ID, null))
  })

  it('refetches on every mount because staff load changes between visits', async () => {
    api.getSuggestion.mockResolvedValue({})
    const { wrapper } = setup()
    const render = () =>
      renderHook(() => useTaskSplitSuggestionQuery('Receiving', SOURCE_ID, null, true), {
        wrapper,
      })

    const first = render()
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
    first.unmount()
    const second = render()
    await waitFor(() => expect(api.getSuggestion).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(second.result.current.isFetching).toBe(false))
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
  it('refreshes split settings and suggestions (which embed limits) after saving', async () => {
    api.updateSettings.mockResolvedValue({})
    const { wrapper, invalidatedKeys } = setup()
    const view = renderHook(() => useUpdateTaskSplitSettingsMutation(), { wrapper })

    await act(() => view.result.current.mutateAsync({ items: [] }))

    expect(api.updateSettings).toHaveBeenCalledWith({ items: [] })
    expect(invalidatedKeys()).toEqual(
      expect.arrayContaining([queryKeys.taskSplitSettings, queryKeys.taskSplits.all])
    )
  })
})
