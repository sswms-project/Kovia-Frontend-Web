import { axiosClient, postStream } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiErrorResponse, ApiResponse } from '@/types/api'
import type {
  AiActionDraft,
  AiActionExecution,
  AiChatResponse,
  AiChatStreamEvent,
  AiConversation,
  AiConversationMessages,
  AiStreamFailure,
  CompleteAiActionRequest,
  SendAiChatMessageRequest,
} from '../types/ai-assistant.types'

import { createAiSseParser, isFreshAiStreamSeq } from '../utils/ai-sse-parser'
import { toAiStreamStep } from '../utils/ai-thinking'

const SERVER_FAILED_MESSAGE = 'Trợ lý AI chưa trả lời được. Vui lòng thử lại.'

/** No byte for this long, not even a `ping` (sent every 15 s while the model works): the connection is dead. */
export const AI_STREAM_IDLE_TIMEOUT_MS = 45_000

const STREAM_FAILURES = {
  disconnected: { statusCode: 0, message: 'Mất kết nối mạng khi Kovia đang trả lời.' },
  timeout: { statusCode: 504, message: 'Kovia không phản hồi quá lâu nên đã ngắt kết nối.' },
  interrupted: {
    statusCode: 502,
    message: 'Kết nối bị ngắt giữa chừng, câu trả lời chưa hoàn tất.',
  },
} as const

function streamFailure(kind: keyof typeof STREAM_FAILURES): AiStreamFailure {
  return { ...STREAM_FAILURES[kind], kind }
}

function toStreamError(code: unknown, message: unknown): AiStreamFailure {
  return {
    kind: 'server',
    // Same 429 as `POST ai/chat`, so rate limits are reported as a warning, not a failure.
    statusCode: code === 'AI_RATE_LIMITED' ? 429 : 502,
    message: typeof message === 'string' && message ? message : SERVER_FAILED_MESSAGE,
  }
}

async function readErrorResponse(response: Response): Promise<AiStreamFailure> {
  const body = (await response.json().catch(() => null)) as Partial<ApiErrorResponse> | null
  return {
    kind: 'server',
    statusCode: body?.statusCode ?? response.status,
    message: body?.message || SERVER_FAILED_MESSAGE,
  }
}

/**
 * Sends a chat message over SSE. Progress goes to `onEvent`; resolves with the saved turn from
 * `message_complete`. Aborting `signal` (Stop) cancels the request and the BE saves nothing; that
 * rejection is left to the caller, which knows it stopped. Every other failure is an `AiStreamFailure`.
 */
async function streamMessage(
  request: SendAiChatMessageRequest,
  signal: AbortSignal,
  onEvent: (event: AiChatStreamEvent) => void
): Promise<AiChatResponse> {
  // A silent connection is aborted by this watchdog, re-armed by every chunk (pings included).
  const idle = new AbortController()
  let idleTimer = setTimeout(() => idle.abort(), AI_STREAM_IDLE_TIMEOUT_MS)
  const touch = () => {
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => idle.abort(), AI_STREAM_IDLE_TIMEOUT_MS)
  }
  const fail = (error: unknown): never => {
    if (signal.aborted) throw error
    if (idle.signal.aborted) throw streamFailure('timeout')
    // fetch and stream reads reject with a TypeError when the network goes away.
    throw error instanceof TypeError ? streamFailure('disconnected') : error
  }

  try {
    const response = await postStream(
      API_ENDPOINTS.aiAssistant.chatStream,
      request,
      AbortSignal.any([signal, idle.signal])
    ).catch(fail)
    if (!response.ok || !response.body) throw await readErrorResponse(response)
    return await readStream(response.body, touch, onEvent).catch(fail)
  } finally {
    clearTimeout(idleTimer)
  }
}

async function readStream(
  body: ReadableStream<Uint8Array<ArrayBuffer>>,
  touch: () => void,
  onEvent: (event: AiChatStreamEvent) => void
): Promise<AiChatResponse> {
  const parse = createAiSseParser()
  const reader = body.pipeThrough(new TextDecoderStream()).getReader()
  let lastSeq = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    touch()
    for (const { event, data } of parse(value)) {
      const payload = JSON.parse(data) as Record<string, unknown>
      if (!isFreshAiStreamSeq(lastSeq, payload.seq)) continue
      if (typeof payload.seq === 'number') lastSeq = payload.seq
      switch (event) {
        case 'message_start':
          onEvent({
            type: 'message_start',
            conversationId: (payload.conversationId as string | null) ?? null,
            requestId: typeof payload.requestId === 'string' ? payload.requestId : null,
          })
          break
        case 'step': {
          const step = toAiStreamStep(payload)
          if (step) onEvent({ type: 'step', step })
          break
        }
        case 'text_delta':
          onEvent({ type: 'text_delta', text: String(payload.text ?? '') })
          break
        case 'reset':
          // The answer was revised after some text was shown: drop that text, the final one follows.
          onEvent({ type: 'reset' })
          break
        // `ping` only keeps the connection alive; `touch()` above already re-armed the watchdog.
        case 'message_complete':
          void reader.cancel()
          return payload as unknown as AiChatResponse
        case 'error':
          void reader.cancel()
          throw toStreamError(payload.code, payload.message)
      }
    }
  }
  // Closed without `message_complete` or `error`: the BE may or may not have saved the turn.
  throw streamFailure('interrupted')
}

export const aiAssistantService = {
  streamMessage,
  getConversations: () =>
    axiosClient
      .get<ApiResponse<AiConversation[]>>(API_ENDPOINTS.aiAssistant.conversations)
      .then((response) => response.data.data),
  getMessages: (conversationId: string) =>
    axiosClient
      .get<ApiResponse<AiConversationMessages>>(API_ENDPOINTS.aiAssistant.messages(conversationId))
      .then((response) => response.data.data),
  confirmAction: (draftId: string) =>
    axiosClient
      .post<ApiResponse<AiActionExecution>>(API_ENDPOINTS.aiAssistant.confirmAction(draftId))
      .then((response) => response.data.data),
  getAction: <TPayload>(draftId: string) =>
    axiosClient
      .get<ApiResponse<AiActionDraft<TPayload>>>(API_ENDPOINTS.aiAssistant.getAction(draftId))
      .then((response) => response.data.data),
  completeAction: (draftId: string, request: CompleteAiActionRequest) =>
    axiosClient
      .post<
        ApiResponse<AiActionExecution>
      >(API_ENDPOINTS.aiAssistant.completeAction(draftId), request)
      .then((response) => response.data.data),
  cancelAction: (draftId: string) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.aiAssistant.cancelAction(draftId))
      .then((response) => response.data.data),
}
