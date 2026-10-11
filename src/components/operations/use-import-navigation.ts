import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { toast } from 'sonner'
import { useTopLoader } from 'nextjs-toploader'

export function useImportNavigation(dirty: boolean, busy: boolean) {
  const router = useRouter()
  const progress = useTopLoader()
  const startProgress = useEffectEvent(() => progress.start())
  const finishProgress = useEffectEvent(() => progress.done())
  const [discardOpen, setDiscardOpen] = useState(false)
  const pendingAction = useRef<(() => void) | null>(null)
  function requestDiscard(action: () => void) {
    if (busy || pendingAction.current) return
    if (!dirty) {
      action()
      return
    }
    pendingAction.current = action
    setDiscardOpen(true)
  }
  function cancelDiscard() {
    pendingAction.current = null
    setDiscardOpen(false)
  }
  function confirmDiscard() {
    if (busy) {
      toast.info('Vui lòng đợi thao tác nhập tệp hoàn tất.')
      cancelDiscard()
      return
    }
    const action = pendingAction.current
    cancelDiscard()
    action?.()
  }
  const requestNavigation = useEffectEvent(requestDiscard)
  useEffect(() => {
    if (!dirty) return
    const originalUrl = window.location.href
    const originalState: unknown = window.history.state
    const navigation = window.navigation
    let nativeTraversal = false
    let approvedKey: string | null = null
    let approvedUnload = false
    const leave = (destination: string) => {
      const url = new URL(destination)
      if (url.origin === window.location.origin) {
        startProgress()
        router.push(`${url.pathname}${url.search}${url.hash}` as Route)
      } else {
        approvedUnload = true
        window.location.assign(destination)
      }
    }
    const traverse = (event: NavigateEvent) => {
      if (
        !navigation ||
        event.defaultPrevented ||
        event.navigationType !== 'traverse' ||
        !event.cancelable ||
        !event.destination.sameDocument ||
        event.destination.url === originalUrl
      )
        return
      if (approvedKey === event.destination.key) {
        approvedKey = null
        nativeTraversal = true
        return
      }
      // Cancel before the URL changes; replay the same history entry only after consent.
      event.preventDefault()
      const key = event.destination.key
      requestNavigation(() => {
        approvedKey = key
        startProgress()
        void navigation.traverseTo(key).finished?.catch(() => {
          finishProgress()
          approvedKey = null
          nativeTraversal = false
          toast.error('Không thể rời trang. Vui lòng thử lại.')
        })
      })
    }
    const unload = (event: BeforeUnloadEvent) => {
      // Closing/reloading the tab still needs the browser's native data-loss guard.
      if (approvedUnload) return
      event.preventDefault()
      event.returnValue = ''
    }
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      )
        return
      const anchor = event.target.closest('a[href]')
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        (anchor.target && anchor.target !== '_self') ||
        anchor.download ||
        anchor.href === window.location.href
      )
        return
      const destination = new URL(anchor.href)
      // Telephone/email links do not leave the import workspace.
      if (!['http:', 'https:'].includes(destination.protocol)) return
      if (
        destination.origin === window.location.origin &&
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      )
        return
      event.preventDefault()
      event.stopPropagation()
      requestNavigation(() => leave(destination.href))
    }
    const back = (event: PopStateEvent) => {
      if (nativeTraversal) {
        nativeTraversal = false
        return
      }
      const destination = window.location.href
      if (destination === originalUrl) return
      event.stopImmediatePropagation()
      // Restore this workspace before Next handles popstate. Leave only after consent.
      window.history.pushState(originalState, '', originalUrl)
      requestNavigation(() => leave(destination))
    }
    window.addEventListener('beforeunload', unload)
    navigation?.addEventListener('navigate', traverse)
    window.addEventListener('popstate', back, true)
    document.addEventListener('click', click, true)
    return () => {
      window.removeEventListener('beforeunload', unload)
      navigation?.removeEventListener('navigate', traverse)
      window.removeEventListener('popstate', back, true)
      document.removeEventListener('click', click, true)
    }
  }, [dirty, router])
  return { discardOpen, requestDiscard, cancelDiscard, confirmDiscard }
}
