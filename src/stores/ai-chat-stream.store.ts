import { create } from 'zustand'
import {
  aiChatStreamReducer,
  isAiChatStreamRunning,
  toAiThinkingSummary,
  type AiChatStream,
  type AiChatStreamAction,
} from '@/features/ai-assistant/utils/ai-chat-stream-state'
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
  /** Starts a turn; returns null (and changes nothing) while another turn is still running. */
  start: (conversationId: string | null, message: string) => AbortController | null
  /** Applies an event of the request owning `controller`; events of an older request are dropped. */
  dispatch: (controller: AbortController, action: AiChatStreamEventAction) => void
  /** Ends the turn as saved and keeps its thinking summary on the saved assistant message. */
  complete: (controller: AbortController, assistantMessageId: string) => void
  stop: () => void
}

/** The time the user actually waited, measured on the client (not the BE's step durations). */
export const aiStreamClock = () => performance.now()

// Outside React so the turn survives closing the panel, switching conversation or opening history.
export const useAiChatStreamStore = create<AiChatStreamState>()((set, get) => ({
  stream: null,
  controller: null,
  summaries: {},
  start: (conversationId, message) => {
    if (isAiChatStreamRunning(get().stream)) return null
    const controller = new AbortController()
    set({
      controller,
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
    set((state) => ({ stream: aiChatStreamReducer(state.stream, action) }))
  },
  complete: (controller, assistantMessageId) => {
    const { controller: current, stream, summaries } = get()
    if (current !== controller || !isAiChatStreamRunning(stream) || !stream) return
    const summary = { ...toAiThinkingSummary(stream, aiStreamClock()), outcome: 'done' as const }
    set({
      stream: aiChatStreamReducer(stream, { type: 'complete' }),
      summaries: { ...summaries, [assistantMessageId]: summary },
    })
  },
  stop: () => {
    const { controller } = get()
    controller?.abort()
    set((state) => ({
      stream: aiChatStreamReducer(state.stream, { type: 'stop', at: aiStreamClock() }),
    }))
  },
}))
