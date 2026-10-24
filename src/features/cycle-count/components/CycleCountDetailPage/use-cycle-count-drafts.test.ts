import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { parseCountQuantity } from '../../schemas/cycle-count.schema'
import { getCycleCountDraftKey, useCycleCountDrafts } from './use-cycle-count-drafts'

describe('useCycleCountDrafts', () => {
  afterEach(() => localStorage.clear())

  it('restores typed counts after the page reloads', () => {
    const key = getCycleCountDraftKey('count-1', 0, 'staff-1')
    const first = renderHook(() => useCycleCountDrafts(key))
    act(() => first.result.current.setDrafts((current) => ({ ...current, 'item-1': '12' })))
    first.unmount()

    const reloaded = renderHook(() => useCycleCountDrafts(key))

    expect(reloaded.result.current.drafts).toEqual({ 'item-1': '12' })
  })

  it('does not reuse drafts from a previous recount round', () => {
    const roundZero = getCycleCountDraftKey('count-1', 0, 'staff-1')
    const { result, rerender } = renderHook(({ key }) => useCycleCountDrafts(key), {
      initialProps: { key: roundZero },
    })
    act(() => result.current.setDrafts({ 'item-1': '5' }))

    rerender({ key: getCycleCountDraftKey('count-1', 1, 'staff-1') })

    expect(result.current.drafts).toEqual({})
  })

  it('clears stored drafts once they are discarded after saving', () => {
    const key = getCycleCountDraftKey('count-1', 0, 'staff-1')
    const { result } = renderHook(() => useCycleCountDrafts(key))
    act(() => result.current.setNoteDrafts({ 'item-1': 'Thiếu thùng' }))
    expect(localStorage.getItem(key)).not.toBeNull()

    act(() => result.current.discardDrafts())

    expect(localStorage.getItem(key)).toBeNull()
  })

  it('keeps drafts in memory only when the count is not open for recording', () => {
    const { result } = renderHook(() => useCycleCountDrafts(null))
    act(() => result.current.setDrafts({ 'item-1': '3' }))

    expect(result.current.drafts).toEqual({ 'item-1': '3' })
    expect(localStorage.length).toBe(0)
  })
})

describe('parseCountQuantity', () => {
  it('accepts the same values as the count schema', () => {
    expect(parseCountQuantity(' 12.5 ')).toBe(12.5)
    expect(parseCountQuantity('0')).toBe(0)
    expect(parseCountQuantity('')).toBeNull()
    expect(parseCountQuantity('-1')).toBeNull()
    expect(parseCountQuantity('1.234')).toBeNull()
  })
})
