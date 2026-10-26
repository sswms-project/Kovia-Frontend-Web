import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useReturnListState } from './use-return-list-state'

const state = vi.hoisted(() => ({ query: '', replace: vi.fn() }))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(state.query),
  useRouter: () => ({ replace: state.replace }),
}))

describe('return list URL state', () => {
  it('preserves filters and pagination in detail and back links while removing legacy modal state', () => {
    state.query = 'page=3&pageSize=20&status=Draft&warehouse=w&id=old&create=1'
    const { result } = renderHook(() =>
      useReturnListState('/supplier-returns', ['Draft', 'Pending'])
    )
    expect(result.current.listHref).toBe(
      '/supplier-returns?page=3&pageSize=20&status=Draft&warehouse=w'
    )
    expect(result.current.detailHref('new')).toBe(
      '/supplier-returns/new?page=3&pageSize=20&status=Draft&warehouse=w'
    )
    act(() => result.current.setStatus('Pending'))
    expect(state.replace).toHaveBeenLastCalledWith(
      '/supplier-returns?pageSize=20&status=Pending&warehouse=w',
      { scroll: false }
    )
  })
  it('rejects malformed pagination and unknown statuses', () => {
    state.query = 'page=-1&pageSize=999&status=unrecognized'
    const { result } = renderHook(() => useReturnListState('/goods-return-requests', ['Draft']))
    expect(result.current.page).toBe(1)
    expect(result.current.pageSize).toBe(10)
    expect(result.current.status).toBe('')
  })
})
