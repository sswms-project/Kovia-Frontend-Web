import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useProductImportNavigation } from './use-product-import-navigation'

const router = vi.hoisted(() => ({ push: vi.fn() }))
const progress = vi.hoisted(() => ({ start: vi.fn(), done: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('nextjs-toploader', () => ({ useTopLoader: () => progress }))

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
  window.history.replaceState(null, '', '/')
  vi.restoreAllMocks()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

function traversal(navigation: EventTarget, cancelable = true) {
  const event = new Event('navigate', { cancelable })
  Object.defineProperties(event, {
    navigationType: { value: 'traverse' },
    destination: {
      value: { sameDocument: true, url: `${window.location.origin}/products`, key: 'previous' },
    },
  })
  act(() => navigation.dispatchEvent(event))
  return event
}

function nativeNavigation() {
  const navigation = Object.assign(new EventTarget(), {
    traverseTo: vi.fn(() => {
      expect(traversal(navigation).defaultPrevented).toBe(false)
      window.dispatchEvent(new PopStateEvent('popstate'))
      return { finished: Promise.resolve() }
    }),
  })
  vi.stubGlobal('navigation', navigation)
  return navigation
}

function clickLink(href = '/products', options: MouseEventInit = {}) {
  const anchor = document.createElement('a')
  anchor.href = href
  document.body.append(anchor)
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...options })
  act(() => anchor.dispatchEvent(event))
  return event
}

describe('import navigation confirmation', () => {
  it('finishes progress when an approved native traversal fails', async () => {
    const navigation = nativeNavigation()
    navigation.traverseTo.mockImplementationOnce(() => ({
      finished: Promise.reject(new Error('Navigation failed')),
    }))
    const hook = renderHook(() => useProductImportNavigation(true, false))
    traversal(navigation)
    expect(progress.start).not.toHaveBeenCalled()
    await act(async () => hook.result.current.confirmDiscard())
    expect(progress.start).toHaveBeenCalledTimes(1)
    expect(progress.done).toHaveBeenCalledTimes(1)
  })

  it('opens the app dialog before history changes; cancellation preserves the entry', () => {
    const navigation = nativeNavigation()
    const confirm = vi.spyOn(window, 'confirm')
    const history = vi.spyOn(window.history, 'pushState')
    const hook = renderHook(() => useProductImportNavigation(true, false))
    expect(traversal(navigation).defaultPrevented).toBe(true)
    expect(hook.result.current.discardOpen).toBe(true)
    act(() => hook.result.current.cancelDiscard())
    expect(hook.result.current.discardOpen).toBe(false)
    expect(navigation.traverseTo).not.toHaveBeenCalled()
    expect(history).not.toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()
    expect(progress.start).not.toHaveBeenCalled()
    hook.unmount()
    expect(traversal(navigation).defaultPrevented).toBe(false)
  })

  it('replays the original history key only after consent, without a second dialog', () => {
    const navigation = nativeNavigation()
    const history = vi.spyOn(window.history, 'pushState')
    const hook = renderHook(() => useProductImportNavigation(true, false))
    traversal(navigation)
    expect(navigation.traverseTo).not.toHaveBeenCalled()
    act(() => hook.result.current.confirmDiscard())
    expect(navigation.traverseTo).toHaveBeenCalledExactlyOnceWith('previous')
    expect(hook.result.current.discardOpen).toBe(false)
    expect(history).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
    expect(progress.start).toHaveBeenCalledTimes(1)
  })

  it('blocks busy navigation and rechecks the current busy state before discarding', () => {
    const navigation = nativeNavigation()
    const hook = renderHook(({ busy }) => useProductImportNavigation(true, busy), {
      initialProps: { busy: true },
    })
    expect(traversal(navigation).defaultPrevented).toBe(true)
    expect(hook.result.current.discardOpen).toBe(false)
    hook.rerender({ busy: false })
    traversal(navigation)
    expect(hook.result.current.discardOpen).toBe(true)
    hook.rerender({ busy: true })
    act(() => hook.result.current.confirmDiscard())
    expect(navigation.traverseTo).not.toHaveBeenCalled()
    expect(hook.result.current.discardOpen).toBe(false)
  })

  it('defers a link until consent, preserves only the first pending intent and executes once', () => {
    const hook = renderHook(() => useProductImportNavigation(true, false))
    expect(clickLink('/products?search=beer').defaultPrevented).toBe(true)
    clickLink('/suppliers')
    expect(router.push).not.toHaveBeenCalled()
    act(() => hook.result.current.confirmDiscard())
    act(() => hook.result.current.confirmDiscard())
    expect(router.push).toHaveBeenCalledExactlyOnceWith('/products?search=beer')
    expect(progress.start).toHaveBeenCalledTimes(1)
  })

  it('keeps native close/reload protection while an app confirmation is open or canceled', () => {
    const hook = renderHook(() => useProductImportNavigation(true, false))
    clickLink()
    const unload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unload)
    expect(unload.defaultPrevented).toBe(true)
    act(() => hook.result.current.cancelDiscard())
    const retry = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(retry)
    expect(retry.defaultPrevented).toBe(true)
    expect(router.push).not.toHaveBeenCalled()
  })

  it('uses the same confirmation for canceling a session and clean workspaces need none', () => {
    const action = vi.fn()
    const hook = renderHook(({ dirty }) => useProductImportNavigation(dirty, false), {
      initialProps: { dirty: true },
    })
    act(() => hook.result.current.requestDiscard(action))
    act(() => hook.result.current.cancelDiscard())
    expect(action).not.toHaveBeenCalled()
    act(() => hook.result.current.requestDiscard(action))
    act(() => hook.result.current.confirmDiscard())
    expect(action).toHaveBeenCalledTimes(1)
    hook.rerender({ dirty: false })
    act(() => hook.result.current.requestDiscard(action))
    expect(action).toHaveBeenCalledTimes(2)
    expect(hook.result.current.discardOpen).toBe(false)
  })

  it('ignores clean workspaces and non-cancelable traversals', () => {
    const navigation = nativeNavigation()
    const hook = renderHook(({ dirty }) => useProductImportNavigation(dirty, false), {
      initialProps: { dirty: false },
    })
    expect(traversal(navigation).defaultPrevented).toBe(false)
    hook.rerender({ dirty: true })
    expect(traversal(navigation, false).defaultPrevented).toBe(false)
    expect(hook.result.current.discardOpen).toBe(false)
  })

  it('does not intercept modified clicks or same-page anchors', () => {
    const hook = renderHook(() => useProductImportNavigation(true, false))
    expect(clickLink('/products', { ctrlKey: true }).defaultPrevented).toBe(false)
    expect(clickLink('/#details').defaultPrevented).toBe(false)
    expect(clickLink('mailto:support@example.com').defaultPrevented).toBe(false)
    expect(hook.result.current.discardOpen).toBe(false)
  })

  it('restores the workspace on legacy popstate and waits for consent', () => {
    vi.stubGlobal('navigation', undefined)
    window.history.replaceState({ import: true }, '', '/products/import')
    const hook = renderHook(() => useProductImportNavigation(true, false))
    window.history.replaceState(null, '', '/products')
    act(() => window.dispatchEvent(new PopStateEvent('popstate')))
    expect(window.location.pathname).toBe('/products/import')
    expect(router.push).not.toHaveBeenCalled()
    act(() => hook.result.current.confirmDiscard())
    expect(router.push).toHaveBeenCalledExactlyOnceWith('/products')
  })
})
