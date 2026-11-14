import type { AiStreamFailureKind, AiStreamStep } from '../types/ai-assistant.types'
import { upsertAiStreamStep, type AiThinkingSummary } from './ai-thinking'

/**
 * One streamed chat turn, tied to the conversation it was sent from. Idle is `null`: a completed
 * turn leaves the stream and lives in the react-query messages cache like any saved message.
 */
export interface AiChatStream {
  /** The conversation the question was sent from (`null` for a new chat). */
  readonly conversationId: string | null
  readonly message: string
  /** `error`: the stream ended without `message_complete` (BE error, timeout, network drop). */
  readonly phase: 'sending' | 'streaming' | 'error' | 'stopped'
  /** BE id of the request (`message_start`), for support/logs. */
  readonly requestId: string | null
  /** Real processing steps (`step` events), in arrival order. */
  readonly steps: readonly AiStreamStep[]
  /** Answer text received so far (`text_delta` events); kept after an error or stop. */
  readonly text: string
  readonly errorMessage: string | null
  /** Set with phase `error`: network loss and timeouts read differently from a server error. */
  readonly errorKind: AiStreamFailureKind | null
  /** Client clock (ms) at send and at the end of the turn: the time the user actually waited. */
  readonly startedAt: number
  readonly endedAt: number | null
}

export type AiChatStreamAction =
  | {
      readonly type: 'start'
      readonly conversationId: string | null
      readonly message: string
      readonly at: number
    }
  | { readonly type: 'message_start'; readonly requestId: string | null }
  | { readonly type: 'step'; readonly step: AiStreamStep }
  | { readonly type: 'delta'; readonly text: string }
  | { readonly type: 'reset' }
  | { readonly type: 'complete' }
  | {
      readonly type: 'error'
      readonly message: string
      readonly kind: AiStreamFailureKind
      readonly at: number
    }
  | { readonly type: 'stop'; readonly at: number }

export function isAiChatStreamRunning(stream: AiChatStream | null): boolean {
  return stream?.phase === 'sending' || stream?.phase === 'streaming'
}

export function aiChatStreamReducer(
  stream: AiChatStream | null,
  action: AiChatStreamAction
): AiChatStream | null {
  if (action.type === 'start') {
    // One turn at a time: a second send while one runs is a double click, not a new question.
    if (isAiChatStreamRunning(stream)) return stream
    return {
      conversationId: action.conversationId,
      message: action.message,
      phase: 'sending',
      requestId: null,
      steps: [],
      text: '',
      errorMessage: null,
      errorKind: null,
      startedAt: action.at,
      endedAt: null,
    }
  }
  // A stopped or failed turn is final: late events of that request change nothing.
  if (!stream || !isAiChatStreamRunning(stream)) return stream

  switch (action.type) {
    case 'message_start':
      return { ...stream, requestId: action.requestId }
    case 'step':
      return { ...stream, steps: upsertAiStreamStep(stream.steps, action.step) }
    case 'delta':
      return { ...stream, phase: 'streaming', text: stream.text + action.text }
    case 'reset':
      // Only this turn's streamed text: the conversation and the steps stay.
      return { ...stream, text: '' }
    case 'complete':
      return null
    case 'error':
      return {
        ...stream,
        phase: 'error',
        errorMessage: action.message,
        errorKind: action.kind,
        endedAt: action.at,
      }
    case 'stop':
      return { ...stream, phase: 'stopped', endedAt: action.at }
  }
}

/** The stream to show in the open conversation; it stays with the conversation it was sent from. */
export function selectAiChatStreamFor(
  stream: AiChatStream | null,
  conversationId: string | null
): AiChatStream | null {
  return stream?.conversationId === conversationId ? stream : null
}

const OUTCOME_BY_PHASE = {
  sending: 'running',
  streaming: 'running',
  error: 'failed',
  stopped: 'stopped',
} as const

/** The thinking state of a turn; `now` measures a running or just-completed turn. */
export function toAiThinkingSummary(stream: AiChatStream, now: number): AiThinkingSummary {
  return {
    steps: stream.steps,
    outcome: OUTCOME_BY_PHASE[stream.phase],
    elapsedMs: (stream.endedAt ?? now) - stream.startedAt,
  }
}
