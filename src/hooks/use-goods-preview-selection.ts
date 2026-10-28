'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useLocalStorage } from '@/hooks/use-local-storage'

/** Selection belongs to the current list context, never to placeholder rows. */
export function useGoodsPreviewSelection(
  storageKey: string,
  context: string,
  ids: readonly string[],
  ready: boolean
) {
  const [selection, setSelection] = useState({ context, id: '' })
  const [storedExpanded, storeExpanded] = useLocalStorage(storageKey, false)
  const [sessionExpanded, setSessionExpanded] = useState<boolean | null>(null)
  const expanded = sessionExpanded ?? storedExpanded === true
  const anchorId = useId()
  const pendingScroll = useRef(false)
  const id =
    selection.context === context && ready && ids.includes(selection.id) ? selection.id : ''

  if (selection.id && (selection.context !== context || (ready && !ids.includes(selection.id))))
    setSelection({ context, id: '' })

  function setExpanded(value: boolean) {
    // Storage may be unavailable in private browsing; the panel must still work.
    setSessionExpanded(value)
    try {
      storeExpanded(value)
    } catch {
      // The current session retains the preference without storing document data.
    }
  }

  useEffect(() => {
    if (!expanded || !id || !pendingScroll.current) return
    pendingScroll.current = false
    document.getElementById(anchorId)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'start',
    })
  }, [expanded, id, anchorId])

  function select(nextId: string, open = false) {
    if (!ready || !ids.includes(nextId)) return
    setSelection({ context, id: nextId })
    if (open) {
      pendingScroll.current = window.matchMedia('(max-width: 767px)').matches
      setExpanded(true)
      if (id === nextId && expanded && pendingScroll.current) {
        pendingScroll.current = false
        document.getElementById(anchorId)?.scrollIntoView({ block: 'start' })
      }
    }
  }
  return { id, expanded, setExpanded, select, anchorId }
}
