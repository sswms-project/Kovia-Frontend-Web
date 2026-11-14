import { useEffect, useRef, useState } from 'react'
import {
  balanceInlineMarkdown,
  holdIncompleteMarkdown,
  snapRevealToBlock,
} from '../utils/ai-markdown-stream'
import { prefersReducedMotion } from './use-ai-thread-scroll'

/**
 * Backlog time constant: each frame reveals backlog × elapsed / this, so a burst is caught up in
 * about three times this (well under 0.5s) and a slow trickle shows as it arrives.
 */
const CATCH_UP_MS = 140
/** Floor so the tail of a backlog does not crawl. */
const MIN_CHARS_PER_FRAME = 2

/**
 * Progressively reveals streamed markdown: paragraph text flows in at a speed proportional to
 * the backlog (never an artificial delay), while tables, lists and code blocks appear whole.
 * Reduced motion shows the text exactly as it arrives.
 */
export function useAiStreamReveal(text: string): string {
  const stableText = holdIncompleteMarkdown(text)
  const [isReducedMotion] = useState(prefersReducedMotion)
  const [revealedLength, setRevealedLength] = useState(0)
  const revealedRef = useRef(0)

  useEffect(() => {
    if (isReducedMotion) return
    let frame = 0
    let lastTime: number | null = null
    const tick = (now: number) => {
      const backlog = stableText.length - revealedRef.current
      if (backlog <= 0) return
      const elapsed = lastTime === null ? 16 : now - lastTime
      lastTime = now
      const step = Math.max(MIN_CHARS_PER_FRAME, Math.ceil((backlog * elapsed) / CATCH_UP_MS))
      revealedRef.current = snapRevealToBlock(stableText, revealedRef.current + step)
      setRevealedLength(revealedRef.current)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [stableText, isReducedMotion])

  return balanceInlineMarkdown(isReducedMotion ? stableText : stableText.slice(0, revealedLength))
}
