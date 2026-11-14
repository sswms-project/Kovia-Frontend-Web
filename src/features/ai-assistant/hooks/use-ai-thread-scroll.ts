import { useCallback, useEffect, useRef, useState, type UIEvent } from 'react'

/** Within this distance of the bottom the reader counts as "following" the conversation. */
const FOLLOW_THRESHOLD_PX = 80

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  )
}

interface ThreadScrollOptions {
  /** Switching conversation always starts at the latest message. */
  readonly conversationId: string | null
  /** A question is being sent right now: sending always brings it into view. */
  readonly isSendingTurn: boolean
}

/**
 * Keeps the newest content in view only while the reader is at the bottom. Growth of any kind
 * (a new message, streamed text, a block changing kind, cards) is observed on the content element,
 * so following costs one scroll per layout change instead of one per streamed token; scrolling up
 * stops following and exposes a jump-to-latest affordance instead.
 */
export function useAiThreadScroll({ conversationId, isSendingTurn }: ThreadScrollOptions) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isFollowingRef = useRef(true)
  const [isAwayFromBottom, setIsAwayFromBottom] = useState(false)

  const scrollToBottom = useCallback((smooth: boolean) => {
    const element = scrollRef.current
    if (!element) return
    isFollowingRef.current = true
    setIsAwayFromBottom(false)
    element.scrollTo({
      top: element.scrollHeight,
      behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto',
    })
  }, [])

  const contentRef = useCallback((content: HTMLDivElement | null) => {
    if (!content) return
    const observer = new ResizeObserver(() => {
      const element = scrollRef.current
      if (element && isFollowingRef.current) element.scrollTop = element.scrollHeight
    })
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    scrollToBottom(false)
  }, [conversationId, scrollToBottom])

  useEffect(() => {
    if (isSendingTurn) scrollToBottom(false)
  }, [isSendingTurn, scrollToBottom])

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const { scrollHeight, scrollTop, clientHeight } = event.currentTarget
    const isAway = scrollHeight - scrollTop - clientHeight > FOLLOW_THRESHOLD_PX
    isFollowingRef.current = !isAway
    setIsAwayFromBottom(isAway)
  }

  return {
    scrollRef,
    contentRef,
    isAwayFromBottom,
    handleScroll,
    jumpToLatest: () => scrollToBottom(true),
  }
}
