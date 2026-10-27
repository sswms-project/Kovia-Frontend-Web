import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useInboundGoodsSelection } from './use-inbound-goods-selection'

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
it('selects without opening, explicitly opens, and resets selection across filter contexts', () => {
  const { result, rerender } = renderHook(
    ({ context, ids, ready }) => useInboundGoodsSelection('receipt', context, ids, ready),
    { initialProps: { context: 'page1', ids: ['a', 'b'], ready: true } }
  )
  act(() => result.current.select('a'))
  expect(result.current.id).toBe('a')
  expect(result.current.expanded).toBe(false)
  act(() => result.current.select('b', true))
  expect(result.current.id).toBe('b')
  expect(result.current.expanded).toBe(true)
  rerender({ context: 'page2', ids: ['a', 'b'], ready: false })
  expect(result.current.id).toBe('')
  rerender({ context: 'page1', ids: ['a', 'b'], ready: true })
  expect(result.current.id).toBe('')
})
it('never selects placeholder data or resurrects a removed row after refetch', () => {
  const { result, rerender } = renderHook(
    ({ ids, ready }) => useInboundGoodsSelection('putaway', 'same', ids, ready),
    { initialProps: { ids: ['a'], ready: true } }
  )
  act(() => result.current.select('a'))
  rerender({ ids: ['a'], ready: false })
  expect(result.current.id).toBe('')
  act(() => result.current.select('a', true))
  expect(result.current.expanded).toBe(false)
  rerender({ ids: [], ready: true })
  rerender({ ids: ['a'], ready: true })
  expect(result.current.id).toBe('')
})
it('only scrolls for an explicit mobile open, not when data/ids refresh', () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('767px'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
  const scrollIntoView = vi.fn()
  const { result, rerender } = renderHook(
    ({ ids }) => useInboundGoodsSelection('receiving', 'same', ids, true),
    { initialProps: { ids: ['a'] } }
  )
  const anchor = document.createElement('header')
  anchor.id = result.current.anchorId
  anchor.scrollIntoView = scrollIntoView
  document.body.append(anchor)
  act(() => result.current.select('a', true))
  expect(scrollIntoView).toHaveBeenCalledTimes(1)
  rerender({ ids: ['a', 'b'] })
  expect(scrollIntoView).toHaveBeenCalledTimes(1)
  anchor.remove()
})
