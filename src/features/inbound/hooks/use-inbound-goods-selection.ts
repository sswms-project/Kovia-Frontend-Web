'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useLocalStorage } from '@/hooks/use-local-storage'

/** Selection is scoped to the exact list context, never to placeholder rows from another page. */
export function useInboundGoodsSelection(
  tab: string,
  context: string,
  ids: readonly string[],
  ready: boolean
) {
  const [selection, setSelection] = useState({ context, id: '' })
  const [expanded, setExpanded] = useLocalStorage(`inbound-goods-detail:${tab}:v1`, false)
  const anchorId = useId()
  const pendingScroll = useRef(false)
  const id =
    selection.context === context && ready && ids.includes(selection.id) ? selection.id : ''

  // Adjust before children render so removed rows cannot reappear selected on a later refresh.
  if (selection.id && (selection.context !== context || (ready && !ids.includes(selection.id))))
    setSelection({ context, id: '' })

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
      // The selected panel may already be open; explicit clicks still reveal its header.
      if (id === nextId && expanded && pendingScroll.current) {
        pendingScroll.current = false
        document.getElementById(anchorId)?.scrollIntoView({ block: 'start' })
      }
    }
  }
  return { id, expanded, setExpanded, select, anchorId }
}
