import { useEffect, useRef, useState } from 'react'
import { useAiChatStreamStore } from '@/stores/ai-chat-stream.store'
import {
  balanceInlineMarkdown,
  holdIncompleteMarkdown,
  snapRevealToUnit,
} from '../utils/ai-markdown-stream'
import { prefersReducedMotion } from './use-ai-thread-scroll'

/** Whatever is waiting is shown within this at the least, so small deltas ride along with the stream. */
const MIN_CLEAR_MS = 120
/**
 * A large backlog (a verified block that arrived in one piece) is spread over at most this long, so
 * it forms on screen instead of popping in. Presentation only: nothing is delayed on the network, and
 * the saved message replaces the preview as soon as the reveal has caught up.
 */
const MAX_CLEAR_MS = 900
/**
 * Reduced motion removes movement (slides, fades, the pulsing caret), not the progressive appearance
 * of text itself, which is content. Its window is shorter, so the reveal stays gentle and brief.
 */
const MAX_CLEAR_MS_REDUCED_MOTION = 600
/** Time given per waiting character: 1000 characters take 600 ms, capped by MAX_CLEAR_MS. */
const CLEAR_MS_PER_CHAR = 0.6
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * Progressively reveals streamed markdown. Each time text arrives the backlog gets a bounded
 * schedule (small ones at once, a big burst over at most MAX_CLEAR_MS), paragraph text flows in, and
 * list items and table rows appear one whole unit at a time. Reduced motion keeps the same reveal over
 * a shorter window (MAX_CLEAR_MS_REDUCED_MOTION); only the movement around it is removed. How much is shown is reported to the stream store so the hand-off to the saved message
 * can wait for it.
 */
export function useAiStreamReveal(text: string): string {
  const stableText = holdIncompleteMarkdown(text)
  const [isReducedMotion] = useState(prefersReducedMotion)
  const [revealedLength, setRevealedLength] = useState(0)
  const revealedRef = useRef(0)

  useEffect(() => {
    const { reportReveal } = useAiChatStreamStore.getState()
    const backlog = stableText.length - revealedRef.current
    if (backlog <= 0) return
    const maxClearMs = isReducedMotion ? MAX_CLEAR_MS_REDUCED_MOTION : MAX_CLEAR_MS
    const charsPerMs = backlog / clamp(backlog * CLEAR_MS_PER_CHAR, MIN_CLEAR_MS, maxClearMs)

    let frame = 0
    let lastTime: number | null = null
    // Characters earned so far. A table row or list item appears whole and is paid for by its own
    // length (the budget may go negative), so units show up spaced out instead of all in one frame.
    let budget = 0
    const tick = (now: number) => {
      if (stableText.length - revealedRef.current <= 0) return
      const elapsed = lastTime === null ? 16 : now - lastTime
      lastTime = now
      budget += charsPerMs * elapsed
      const earned = Math.floor(budget)
      if (earned >= 1) {
        const next = snapRevealToUnit(stableText, revealedRef.current + earned)
        budget -= next - revealedRef.current
        revealedRef.current = next
        setRevealedLength(next)
        reportReveal(next)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [stableText, isReducedMotion])

  return balanceInlineMarkdown(stableText.slice(0, revealedLength))
}
