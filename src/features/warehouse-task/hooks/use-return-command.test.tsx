import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useReturnCommand } from './use-return-command'

it('freezes and replays the exact request after timeout, ignoring changed values and versions', async () => {
  const hook = renderHook(() =>
    useReturnCommand<{ quantity: number; commandId: string; version: string }>()
  )
  const original = { quantity: 2, commandId: 'original', version: 'old' }
  const send = vi
    .fn()
    .mockRejectedValueOnce({ statusCode: 500 })
    .mockRejectedValueOnce({ statusCode: 409 })
    .mockResolvedValue(undefined)
  await act(async () => {
    await expect(hook.result.current.run(() => original, send)).rejects.toEqual({ statusCode: 500 })
  })
  expect(hook.result.current.isLocked).toBe(true)
  const buildChanged = vi.fn(() => ({ quantity: 3, commandId: 'new', version: 'fresh' }))
  await act(async () => {
    await expect(hook.result.current.run(buildChanged, send)).rejects.toEqual({ statusCode: 409 })
  })
  expect(hook.result.current.isUncertain).toBe(true)
  await act(async () => {
    await hook.result.current.run(buildChanged, send)
  })
  expect(buildChanged).not.toHaveBeenCalled()
  expect(send.mock.calls.map((call) => call[0])).toEqual([original, original, original])
  expect(hook.result.current.isLocked).toBe(false)
})

it('does not freeze an initial definitive validation rejection or a local preflight error', async () => {
  const hook = renderHook(() => useReturnCommand<{ quantity: number }>())
  await act(async () => {
    await expect(
      hook.result.current.run(
        () => ({ quantity: 2 }),
        async () => {
          throw { statusCode: 400 }
        }
      )
    ).rejects.toEqual({ statusCode: 400 })
  })
  expect(hook.result.current.isLocked).toBe(false)
  await expect(
    hook.result.current.run(() => {
      throw new Error('stale form')
    }, vi.fn())
  ).rejects.toThrow('stale form')
  expect(hook.result.current.isLocked).toBe(false)
})
