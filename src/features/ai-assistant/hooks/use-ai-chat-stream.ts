import { notifyManager, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { formatApiError, getApiErrorMessage, isApiErrorResponse } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import { useAiAssistantPanelStore } from '@/stores/ai-assistant-panel.store'
import { aiStreamClock, useAiChatStreamStore } from '@/stores/ai-chat-stream.store'
import { aiAssistantService } from '../services/ai-assistant.service'
import type { AiConversationMessages, SendAiChatMessageRequest } from '../types/ai-assistant.types'
import { isAiChatStreamRunning, selectAiChatStreamFor } from '../utils/ai-chat-stream-state'
import { appendAiChatTurn } from '../utils/ai-conversation-cache'
import {
  findSavedAiAnswerId,
  isAiStreamFailure,
  recentAiConversationIds,
} from '../utils/ai-stream-recovery'

const SEND_FAILED_MESSAGE = 'Trợ lý AI chưa trả lời được. Vui lòng thử lại.'

function reportSendError(error: unknown) {
  const message = isApiErrorResponse(error) ? getApiErrorMessage(error) : SEND_FAILED_MESSAGE
  const isRateLimited = isApiErrorResponse(error) && error.statusCode === 429
  if (isRateLimited) logger.warn(formatApiError(error))
  else logger.error(isApiErrorResponse(error) ? formatApiError(error) : error)
  // The open panel shows the failure inline (with retry) on the turn itself; a toast is only
  // needed when the user closed the panel while the answer was coming.
  if (!useAiAssistantPanelStore.getState().isOpen) {
    if (isRateLimited) toast.warning(message)
    else toast.error(message)
  }
  return message
}

/**
 * Runs one turn outside React's lifecycle: closing the panel unmounts the caller, but the answer
 * must still be cached, the open conversation followed and errors reported. Route changes do not
 * touch it either: the panel lives in the private layout.
 */
async function runAiChatTurn(
  queryClient: QueryClient,
  request: SendAiChatMessageRequest,
  controller: AbortController
) {
  const { dispatch, complete } = useAiChatStreamStore.getState()
  // Deltas can arrive many times per frame; render them at most once per animation frame.
  let pendingText = ''
  let frame = 0
  const flush = () => {
    cancelAnimationFrame(frame)
    frame = 0
    if (!pendingText) return
    dispatch(controller, { type: 'delta', text: pendingText })
    pendingText = ''
  }

  // What a recovery after a broken stream needs: when the question left, and the messages known before it.
  const sentAt = Date.now()
  const knownMessageIds = new Set(
    (request.conversationId
      ? queryClient.getQueryData<AiConversationMessages>(
          queryKeys.aiAssistant.messages(request.conversationId)
        )?.messages
      : []
    )?.map((message) => message.id)
  )

  try {
    const response = await aiAssistantService.streamMessage(request, controller.signal, (event) => {
      if (event.type === 'text_delta') {
        pendingText += event.text
        frame ||= requestAnimationFrame(flush)
        return
      }
      if (event.type === 'reset') {
        // Text not yet rendered belongs to the withdrawn version too.
        cancelAnimationFrame(frame)
        frame = 0
        pendingText = ''
        dispatch(controller, { type: 'reset' })
        return
      }
      // Keep arrival order: text received before a step is applied before it.
      flush()
      if (event.type === 'step') dispatch(controller, { type: 'step', step: event.step })
      if (event.type === 'message_start') {
        dispatch(controller, { type: 'message_start', requestId: event.requestId })
      }
    })
    cancelAnimationFrame(frame)
    // One notification batch: the saved message appears in the same render the streamed one
    // leaves, so the answer never blinks out for a frame.
    notifyManager.batch(() => {
      // The saved reply replaces the streamed text (it is the verified, official version).
      queryClient.setQueryData<AiConversationMessages>(
        queryKeys.aiAssistant.messages(response.conversationId),
        (current) => appendAiChatTurn(current, response)
      )
      notifyManager.schedule(() => {
        // Follow the reply only if the user is still where they asked; if they switched
        // conversation meanwhile, the answer is cached and shown when they return.
        const panel = useAiAssistantPanelStore.getState()
        if (panel.conversationId === request.conversationId) {
          panel.setConversationId(response.conversationId)
        }
        complete(controller, response.assistantMessage.id)
      })
    })
    void queryClient.invalidateQueries({ queryKey: queryKeys.aiAssistant.conversations })
  } catch (error) {
    flush()
    // Stopped by the user: already shown as stopped, and the BE saved nothing.
    if (controller.signal.aborted) return
    const kind = isAiStreamFailure(error) ? error.kind : 'server'
    // The connection broke, but the BE may have saved the answer before it did: show that instead of an
    // error. Nothing is ever sent again on the user's behalf.
    if (kind !== 'server') {
      const saved = await findSavedTurn(queryClient, request, knownMessageIds, sentAt).catch(
        () => null
      )
      if (controller.signal.aborted) return
      if (saved) {
        notifyManager.batch(() => {
          queryClient.setQueryData(
            queryKeys.aiAssistant.messages(saved.conversation.conversationId),
            saved.conversation
          )
          notifyManager.schedule(() => {
            const panel = useAiAssistantPanelStore.getState()
            if (panel.conversationId === request.conversationId) {
              panel.setConversationId(saved.conversation.conversationId)
            }
            complete(controller, saved.answerId)
          })
        })
        void queryClient.invalidateQueries({ queryKey: queryKeys.aiAssistant.conversations })
        return
      }
    }
    dispatch(controller, {
      type: 'error',
      message: reportSendError(error),
      kind,
      at: aiStreamClock(),
    })
  }
}

/** The answer saved for this turn, looked up in its conversation (or the conversations it may have created). */
async function findSavedTurn(
  queryClient: QueryClient,
  request: SendAiChatMessageRequest,
  knownMessageIds: ReadonlySet<string>,
  sentAt: number
): Promise<{ conversation: AiConversationMessages; answerId: string } | null> {
  const candidates = request.conversationId
    ? [request.conversationId]
    : recentAiConversationIds(await aiAssistantService.getConversations(), sentAt)
  for (const conversationId of candidates) {
    const conversation = await aiAssistantService.getMessages(conversationId)
    const answerId = findSavedAiAnswerId(conversation, request.message, knownMessageIds, sentAt)
    if (answerId) return { conversation, answerId }
  }
  return null
}

/** Streaming chat for the open conversation: send, stop, and the phase of the turn sent here. */
export function useAiChatStream(conversationId: string | null) {
  const queryClient = useQueryClient()
  const pathname = usePathname()
  // Only the phase (not the text): the panel and thread must not re-render per streamed token.
  const streamPhase = useAiChatStreamStore(
    (state) => selectAiChatStreamFor(state.stream, conversationId)?.phase ?? null
  )
  const isRunning = useAiChatStreamStore((state) => isAiChatStreamRunning(state.stream))
  const summaries = useAiChatStreamStore((state) => state.summaries)
  const stop = useAiChatStreamStore((state) => state.stop)

  /** Returns false when a turn is already running (double click, Enter spam). */
  const send = (message: string): boolean => {
    const controller = useAiChatStreamStore.getState().start(conversationId, message)
    if (!controller) return false
    void runAiChatTurn(queryClient, { conversationId, message, pagePath: pathname }, controller)
    return true
  }

  return { streamPhase, isRunning, summaries, send, stop }
}

/** The turn in flight for one conversation; only the streaming row subscribes to its text. */
export function useAiChatStreamTurn(conversationId: string | null) {
  return useAiChatStreamStore((state) => selectAiChatStreamFor(state.stream, conversationId))
}
