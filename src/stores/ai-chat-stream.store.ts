import { create } from 'zustand'
import {
  aiChatStreamReducer,
  isAiChatStreamRunning,
  toAiThinkingSummary,
  type AiChatStream,
  type AiChatStreamAction,
} from '@/features/ai-assistant/utils/ai-chat-stream-state'
import { holdIncompleteMarkdown } from '@/features/ai-assistant/utils/ai-markdown-stream'
import type { AiThinkingSummary } from '@/features/ai-assistant/utils/ai-thinking'

type AiChatStreamEventAction = Exclude<AiChatStreamAction, { type: 'start' | 'complete' | 'stop' }>

interface AiChatStreamState {
  stream: AiChatStream | null
  /** Aborts the running request; also identifies it so a superseded request's late events are ignored. */
  controller: AbortController | null
  /**
   * Thinking rows of turns finished in this session, by saved assistant message id. Session-only UI
   * state: after a reload, history messages simply show no thinking row.
   */
  summaries: Readonly<Record<string, AiThinkingSummary>>
  /**
   * How much of the streamed text the open row has shown versus how much it may show (the part that
   * renders the same once the rest arrives). The reveal paces itself; the hand-off to the saved
   * message waits until the two meet, so text received is never cut off on screen.
   */
  revealedLength: number
  revealTarget: number
  /** The answer is complete and saved; the row is only finishing its reveal, so Stop no longer applies. */
  finishing: boolean
  reportReveal: (length: number) => void
  beginFinish: (controller: AbortController) => void
  /** Starts a turn; returns null (and changes nothing) while another turn is still running. */
  start: (conversationId: string | null, message: string) => AbortController | null
  /** Applies an event of the request owning `controller`; events of an older request are dropped. */
  dispatch: (controller: AbortController, action: AiChatStreamEventAction) => void
  /** Ends the turn as saved and keeps its thinking summary on the saved assistant message. */
  complete: (controller: AbortController, assistantMessageId: string) => void
  stop: () => void
}

/** Thinking summaries kept per session; the oldest go first (their rows then show no thinking line). */
const MAX_SUMMARIES = 50

/** The time the user actually waited, measured on the client (not the BE's step durations). */
export const aiStreamClock = () => performance.now()

// Outside React so the turn survives closing the panel, switching conversation or opening history.
export const useAiChatStreamStore = create<AiChatStreamState>()((set, get) => ({
  stream: null,
  controller: null,
  summaries: {},
  revealedLength: 0,
  revealTarget: 0,
  finishing: false,
  reportReveal: (length) =>
    set((state) => (length > state.revealedLength ? { revealedLength: length } : state)),
  beginFinish: (controller) => {
    if (get().controller === controller) set({ finishing: true })
  },
  start: (conversationId, message) => {
    if (isAiChatStreamRunning(get().stream)) return null
    const controller = new AbortController()
    set({
      controller,
      revealedLength: 0,
      revealTarget: 0,
      finishing: false,
      stream: aiChatStreamReducer(null, {
        type: 'start',
        conversationId,
        message,
        at: aiStreamClock(),
      }),
    })
    return controller
  },
  dispatch: (controller, action) => {
    if (get().controller !== controller) return
    set((state) => {
      const stream = aiChatStreamReducer(state.stream, action)
      if (action.type === 'reset') return { stream, revealedLength: 0, revealTarget: 0 }
      if (action.type !== 'delta' || !stream) return { stream }
      return { stream, revealTarget: holdIncompleteMarkdown(stream.text).length }
    })
  },
  complete: (controller, assistantMessageId) => {
    const { controller: current, stream, summaries } = get()
    if (current !== controller || !isAiChatStreamRunning(stream) || !stream) return
    const summary = { ...toAiThinkingSummary(stream, aiStreamClock()), outcome: 'done' as const }
    set({
      stream: aiChatStreamReducer(stream, { type: 'complete' }),
      // Ids are GUIDs (never integer-like keys), so entries keep their insertion order.
      summaries: Object.fromEntries(
        Object.entries({ ...summaries, [assistantMessageId]: summary }).slice(-MAX_SUMMARIES)
      ),
      finishing: false,
    })
  },
  stop: () => {
    const { controller, finishing } = get()
    // The answer is already complete and saved; stopping now would only mislabel it as unsaved.
    if (finishing) return
    controller?.abort()
    set((state) => ({
      stream: aiChatStreamReducer(state.stream, { type: 'stop', at: aiStreamClock() }),
    }))
  },
}))

type AiChatStreamStoreState = ReturnType<typeof useAiChatStreamStore.getState>

/**
 * Resolves once the open row has shown all the streamed text it may show, or after `maxMs` at the
 * latest. It resolves at once when nothing is being revealed on screen (the tab is hidden, or the
 * request was superseded), so a hand-off never waits on an animation nobody can see.
 */
export function waitForAiRevealDrain(controller: AbortController, maxMs: number): Promise<void> {
  const isDone = (state: AiChatStreamStoreState) =>
    state.controller !== controller || state.revealedLength >= state.revealTarget
  return new Promise((resolve) => {
    if (
      (typeof document !== 'undefined' && document.hidden) ||
      isDone(useAiChatStreamStore.getState())
    ) {
      resolve()
      return
    }
    let timer = 0
    let unsubscribe = () => {}
    const finish = () => {
      window.clearTimeout(timer)
      unsubscribe()
      resolve()
    }
    unsubscribe = useAiChatStreamStore.subscribe((state) => {
      if (isDone(state)) finish()
    })
    timer = window.setTimeout(finish, maxMs)
  })
}
