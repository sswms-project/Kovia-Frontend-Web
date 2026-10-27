import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useGoodsPreviewSelection } from './use-goods-preview-selection'

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false }))
  )
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('keeps tab preferences separate, never persists a document ID, and tolerates storage denial', () => {
  const { result } = renderHook(() => ({
    customer: useGoodsPreviewSelection('customer', 'page1', ['a'], true),
    supplier: useGoodsPreviewSelection('supplier', 'page1', ['a'], true),
  }))
  act(() => result.current.customer.select('a', true))
  expect(result.current.customer.expanded).toBe(true)
  expect(result.current.supplier.expanded).toBe(false)
  expect(localStorage.getItem('customer')).toBe('true')
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Denied')
  })
  act(() => result.current.supplier.select('a', true))
  expect(result.current.supplier.expanded).toBe(true)
  act(() => result.current.supplier.setExpanded(false))
  expect(result.current.supplier.expanded).toBe(false)
})

it('masks failed/placeholder rows and clears removed or filtered selection without reopening', () => {
  const { result, rerender } = renderHook(
    ({ context, ready, ids }) => useGoodsPreviewSelection('customer', context, ids, ready),
    { initialProps: { context: 'page1', ready: true, ids: ['a', 'b'] } }
  )
  act(() => result.current.select('a'))
  expect(result.current.expanded).toBe(false)
  rerender({ context: 'page1', ready: false, ids: ['a', 'b'] })
  expect(result.current.id).toBe('')
  act(() => result.current.select('b', true))
  expect(result.current.expanded).toBe(false)
  rerender({ context: 'page1', ready: true, ids: ['a', 'b'] })
  expect(result.current.id).toBe('a')
  rerender({ context: 'page1', ready: true, ids: ['b'] })
  rerender({ context: 'page1', ready: true, ids: ['a', 'b'] })
  expect(result.current.id).toBe('')
  act(() => result.current.select('b'))
  rerender({ context: 'filtered', ready: false, ids: ['a', 'b'] })
  rerender({ context: 'page1', ready: true, ids: ['a', 'b'] })
  expect(result.current.id).toBe('')
})
