import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { HubConnection } from '@microsoft/signalr'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotificationHubContext } from '@/features/platform-services/providers/notification-hub-context'
import { queryKeys } from '@/lib/query-keys'
import { useTransferRealtime } from './use-transfer-realtime'
import { TRANSFER_MUTATION_KEY } from './use-transfers'
import { getTransferClientId } from '../utils/transfer-client'

type Handler = (payload: unknown) => void

function createFakeConnection() {
  const handlers = new Map<string, Handler>()
  const invoke = vi.fn().mockResolvedValue(undefined)
  const connection = {
    on: vi.fn((event: string, handler: Handler) => handlers.set(event, handler)),
    off: vi.fn((event: string) => handlers.delete(event)),
    invoke,
  }
  return {
    connection: connection as unknown as HubConnection,
    invoke,
    off: connection.off,
    emit: (payload: unknown) => handlers.get('TransferChanged')?.(payload),
  }
}

function setup(connection: HubConnection | null, session = 1) {
  const client = new QueryClient()
  client.setQueryData(queryKeys.transfers.detail('t1'), { id: 't1' })
  client.setQueryData(queryKeys.transfers.list({ pageNumber: 1, pageSize: 10 }), { items: [] })
  client.setQueryData(queryKeys.inventory.all, [])
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <NotificationHubContext value={{ connection, session }}>{children}</NotificationHubContext>
    </QueryClientProvider>
  )
  return { client, wrapper }
}

const event = {
  transferId: 't1',
  shipmentId: null,
  changeType: 'picking',
  occurredAt: '2026-10-08T01:00:00Z',
}

afterEach(() => vi.restoreAllMocks())

describe('useTransferRealtime', () => {
  it('does nothing before the hub is connected', () => {
    const { wrapper } = setup(null)
    const hook = renderHook(() => useTransferRealtime({ transferId: 't1' }), { wrapper })
    expect(hook.result.current.lastChange).toBeNull()
  })

  it('joins the transfer and warehouse groups once connected and leaves on unmount', () => {
    const fake = createFakeConnection()
    const { wrapper } = setup(fake.connection)
    const hook = renderHook(
      () => useTransferRealtime({ transferId: 't1', warehouseIds: ['w2', 'w1', 'w1'] }),
      { wrapper }
    )
    expect(fake.invoke).toHaveBeenCalledWith('JoinTransfer', 't1')
    expect(fake.invoke).toHaveBeenCalledWith('JoinTransferWarehouse', 'w1')
    expect(fake.invoke).toHaveBeenCalledWith('JoinTransferWarehouse', 'w2')
    expect(
      fake.invoke.mock.calls.filter(([method]) => method === 'JoinTransferWarehouse')
    ).toHaveLength(2)
    hook.unmount()
    expect(fake.invoke).toHaveBeenCalledWith('LeaveTransfer', 't1')
    expect(fake.invoke).toHaveBeenCalledWith('LeaveTransferWarehouse', 'w1')
    expect(fake.off).toHaveBeenCalledWith('TransferChanged', expect.any(Function))
  })

  it('reloads transfer, inventory and task data from the API when a change arrives', () => {
    const fake = createFakeConnection()
    const { client, wrapper } = setup(fake.connection)
    const hook = renderHook(() => useTransferRealtime({ transferId: 't1' }), { wrapper })
    act(() => fake.emit(event))
    expect(hook.result.current.lastChange?.changeType).toBe('picking')
    expect(client.getQueryState(queryKeys.transfers.detail('t1'))?.isInvalidated).toBe(true)
    expect(
      client.getQueryState(queryKeys.transfers.list({ pageNumber: 1, pageSize: 10 }))?.isInvalidated
    ).toBe(true)
    expect(client.getQueryState(queryKeys.inventory.all)?.isInvalidated).toBe(true)
  })

  it('ignores signals about other transfers and malformed payloads', () => {
    const fake = createFakeConnection()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { client, wrapper } = setup(fake.connection)
    renderHook(() => useTransferRealtime({ transferId: 't1' }), { wrapper })
    act(() => fake.emit({ ...event, transferId: 'other' }))
    act(() => fake.emit({ nonsense: true }))
    expect(client.getQueryState(queryKeys.transfers.detail('t1'))?.isInvalidated).toBe(false)
  })

  it('only flags the change while the user is typing and never reloads on its own', () => {
    const fake = createFakeConnection()
    const { client, wrapper } = setup(fake.connection)
    const hook = renderHook(() => useTransferRealtime({ transferId: 't1', autoRefresh: false }), {
      wrapper,
    })
    act(() => fake.emit(event))
    expect(hook.result.current.hasPendingChange).toBe(true)
    expect(client.getQueryState(queryKeys.transfers.detail('t1'))?.isInvalidated).toBe(false)

    act(() => hook.result.current.dismiss())
    expect(hook.result.current.hasPendingChange).toBe(false)
  })

  it('treats the echo of its own transfer write as not a change by someone else', async () => {
    const fake = createFakeConnection()
    const { client, wrapper } = setup(fake.connection)
    const hook = renderHook(() => useTransferRealtime({ transferId: 't1', autoRefresh: false }), {
      wrapper,
    })
    await act(() =>
      client
        .getMutationCache()
        .build(client, { mutationKey: TRANSFER_MUTATION_KEY, mutationFn: async () => 'ok' })
        .execute(undefined)
    )
    act(() => fake.emit({ ...event, originClientId: getTransferClientId() }))
    expect(hook.result.current.hasPendingChange).toBe(false)
    act(() => fake.emit({ ...event, originClientId: 'another-tab' }))
    expect(hook.result.current.hasPendingChange).toBe(true)
  })

  it('does not hide a change from someone else because an unrelated mutation just ran', async () => {
    const fake = createFakeConnection()
    const { client, wrapper } = setup(fake.connection)
    const hook = renderHook(() => useTransferRealtime({ transferId: 't1', autoRefresh: false }), {
      wrapper,
    })
    await act(() =>
      client
        .getMutationCache()
        .build(client, { mutationKey: ['notifications', 'read'], mutationFn: async () => 'ok' })
        .execute(undefined)
    )
    act(() => fake.emit(event))
    expect(hook.result.current.hasPendingChange).toBe(true)
  })

  it('does not hide a concurrent change while a local write is still pending or fails', async () => {
    const fake = createFakeConnection()
    const { client, wrapper } = setup(fake.connection)
    renderHook(() => useTransferRealtime({ transferId: 't1' }), { wrapper })
    let reject: ((error: Error) => void) | undefined
    const mutation = client.getMutationCache().build(client, {
      mutationKey: TRANSFER_MUTATION_KEY,
      retry: false,
      mutationFn: () =>
        new Promise((_, fail) => {
          reject = fail
        }),
    })
    let write: Promise<unknown> = Promise.resolve()
    await act(async () => {
      write = mutation.execute(undefined).catch(() => undefined)
      await Promise.resolve()
    })
    act(() => fake.emit(event))
    expect(client.getQueryState(queryKeys.transfers.detail('t1'))?.isInvalidated).toBe(true)
    await act(async () => {
      reject?.(new Error('Rejected'))
      await write
    })
    expect(client.getQueryState(queryKeys.transfers.detail('t1'))?.isInvalidated).toBe(true)
  })

  it.each([{ mutationKey: ['transfer-slot-lookup'] }, { mutationKey: TRANSFER_MUTATION_KEY }])(
    'keeps foreign signals before and after a successful %j',
    async ({ mutationKey }) => {
      const fake = createFakeConnection()
      const { client, wrapper } = setup(fake.connection)
      const hook = renderHook(() => useTransferRealtime({ transferId: 't1', autoRefresh: false }), {
        wrapper,
      })
      let finish!: () => void
      const mutation = client.getMutationCache().build(client, {
        mutationKey,
        mutationFn: () =>
          new Promise<void>((resolve) => {
            finish = resolve
          }),
      })
      let request!: Promise<unknown>
      await act(async () => {
        request = mutation.execute(undefined)
        await Promise.resolve()
      })
      act(() => fake.emit(event))
      expect(hook.result.current.hasPendingChange).toBe(true)
      await act(async () => {
        finish()
        await request
      })
      expect(hook.result.current.hasPendingChange).toBe(true)
      act(() => hook.result.current.dismiss())
      act(() => fake.emit(event))
      expect(hook.result.current.hasPendingChange).toBe(true)
      expect(client.getQueryState(queryKeys.transfers.detail('t1'))?.isInvalidated).toBe(false)
    }
  )

  it('clears the pending flag after an explicit reload', async () => {
    const fake = createFakeConnection()
    const { client, wrapper } = setup(fake.connection)
    const hook = renderHook(() => useTransferRealtime({ transferId: 't1', autoRefresh: false }), {
      wrapper,
    })
    act(() => fake.emit(event))
    await act(async () => {
      await hook.result.current.refresh()
    })
    expect(hook.result.current.hasPendingChange).toBe(false)
    expect(client.getQueryState(queryKeys.transfers.detail('t1'))?.isInvalidated).toBe(true)
  })

  it('reloads after the connection is re-established because signals may have been missed', () => {
    const fake = createFakeConnection()
    const client = new QueryClient()
    client.setQueryData(queryKeys.transfers.detail('t1'), { id: 't1' })
    let hub = { connection: fake.connection as HubConnection | null, session: 1 }
    const hook = renderHook(() => useTransferRealtime({ transferId: 't1' }), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
          <NotificationHubContext value={hub}>{children}</NotificationHubContext>
        </QueryClientProvider>
      ),
    })
    expect(client.getQueryState(queryKeys.transfers.detail('t1'))?.isInvalidated).toBe(false)
    hub = { connection: fake.connection, session: 2 }
    hook.rerender()
    expect(client.getQueryState(queryKeys.transfers.detail('t1'))?.isInvalidated).toBe(true)
    expect(fake.invoke.mock.calls.filter(([method]) => method === 'JoinTransfer')).toHaveLength(2)
  })

  it('only flags a missed change after reconnecting when the user is typing', () => {
    const fake = createFakeConnection()
    const client = new QueryClient()
    client.setQueryData(queryKeys.transfers.detail('t1'), { id: 't1' })
    let hub = { connection: fake.connection as HubConnection | null, session: 1 }
    const hook = renderHook(() => useTransferRealtime({ transferId: 't1', autoRefresh: false }), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
          <NotificationHubContext value={hub}>{children}</NotificationHubContext>
        </QueryClientProvider>
      ),
    })
    hub = { connection: fake.connection, session: 2 }
    hook.rerender()
    expect(hook.result.current.hasPendingChange).toBe(true)
    expect(client.getQueryState(queryKeys.transfers.detail('t1'))?.isInvalidated).toBe(false)
  })
})
