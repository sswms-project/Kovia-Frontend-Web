'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAiAssistantPanelStore } from '@/stores/ai-assistant-panel.store'
import {
  useAiConversationMessagesQuery,
  useAiConversationsQuery,
} from '../../hooks/use-ai-assistant'
import { useAiChatStream } from '../../hooks/use-ai-chat-stream'
import {
  useCancelAiActionMutation,
  useConfirmAiActionMutation,
} from '../../hooks/use-ai-draft-actions'
import { useAiPanelLayout } from '../../hooks/use-ai-panel-layout'
import { aiChatMessageSchema, type AiChatMessageForm } from '../../schemas/ai-chat-message.schema'
import type { AiDraftProcessing } from '../../types/ai-assistant.types'
import { AiHistoryView } from '../AiHistoryView'
import { AiChatComposer } from './AiChatComposer'
import { AiChatThread } from './AiChatThread'
import { AiPanelHeader } from './AiPanelHeader'

interface AiAssistantPanelProps {
  readonly onNavigate: () => void
}

/**
 * Orchestrator for the assistant sub-domain: owns the chat queries/mutations and passes data
 * and callbacks down to display-only components. The streamed turn lives in a store and its
 * workflow outside React, so it survives closing the panel or switching conversation.
 */
export function AiAssistantPanel({ onNavigate }: AiAssistantPanelProps) {
  const isOpen = useAiAssistantPanelStore((state) => state.isOpen)
  const mode = useAiAssistantPanelStore((state) => state.mode)
  const view = useAiAssistantPanelStore((state) => state.view)
  const conversationId = useAiAssistantPanelStore((state) => state.conversationId)
  const setOpen = useAiAssistantPanelStore((state) => state.setOpen)
  const setMode = useAiAssistantPanelStore((state) => state.setMode)
  const setView = useAiAssistantPanelStore((state) => state.setView)
  const setConversationId = useAiAssistantPanelStore((state) => state.setConversationId)
  const layout = useAiPanelLayout()
  const conversationsQuery = useAiConversationsQuery()
  const messagesQuery = useAiConversationMessagesQuery(conversationId)
  const chatStream = useAiChatStream(conversationId)
  const confirmMutation = useConfirmAiActionMutation()
  const cancelMutation = useCancelAiActionMutation()
  const form = useForm<AiChatMessageForm>({
    resolver: zodResolver(aiChatMessageSchema),
    defaultValues: { message: '' },
  })
  const { setFocus } = form

  const showHistoryOnly = !layout.isSplit && view === 'history'

  // Reopening the panel puts the cursor back in the composer.
  useEffect(() => {
    if (isOpen) setFocus('message')
  }, [isOpen, setFocus])

  // Stable references keep the memoized message rows from re-rendering on unrelated updates.
  const draftList = messagesQuery.data?.drafts
  const drafts = useMemo(
    () => new Map((draftList ?? []).map((draft) => [draft.draftId, draft])),
    [draftList]
  )
  // One draft action runs at a time; confirm outranks cancel.
  const confirmingDraftId = confirmMutation.isPending ? confirmMutation.variables?.draftId : null
  const cancellingDraftId = cancelMutation.isPending ? cancelMutation.variables?.draftId : null
  const processing = useMemo<AiDraftProcessing | null>(() => {
    if (confirmingDraftId) return { draftId: confirmingDraftId, action: 'confirm' }
    if (cancellingDraftId) return { draftId: cancellingDraftId, action: 'cancel' }
    return null
  }, [confirmingDraftId, cancellingDraftId])
  const { mutate: confirmAction } = confirmMutation
  const { mutate: cancelAction } = cancelMutation
  const handleConfirmAction = useCallback(
    (draftId: string) => confirmAction({ draftId, conversationId }),
    [confirmAction, conversationId]
  )
  const handleCancelAction = useCallback(
    (draftId: string) => cancelAction({ draftId, conversationId }),
    [cancelAction, conversationId]
  )
  const sendMessage = (message: string) => {
    // The store refuses a second turn while one runs, so double clicks never send twice.
    if (chatStream.send(message)) form.reset({ message: '' })
  }

  const startNewConversation = () => setConversationId(null)

  const chat = (
    // Named container: answers adapt to the panel's real width (floating, docked, resized,
    // expanded, full screen), never to the viewport.
    <div className="@container/ai-panel flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <AiChatThread
        conversationId={conversationId}
        messages={messagesQuery.data?.messages ?? []}
        streamPhase={chatStream.streamPhase}
        thinkingByMessageId={chatStream.summaries}
        isSending={chatStream.isRunning}
        isLoading={Boolean(conversationId) && messagesQuery.isLoading}
        isError={Boolean(conversationId) && messagesQuery.isError}
        onRetry={() => void messagesQuery.refetch()}
        onSend={sendMessage}
        drafts={drafts}
        processing={processing}
        onConfirmAction={handleConfirmAction}
        onCancelAction={handleCancelAction}
        onNavigate={onNavigate}
      />
      <AiChatComposer
        form={form}
        isSending={chatStream.isRunning}
        onSubmit={form.handleSubmit(({ message }) => sendMessage(message))}
        onStop={chatStream.stop}
      />
    </div>
  )

  const history = (
    <AiHistoryView
      conversations={conversationsQuery.data ?? []}
      isLoading={conversationsQuery.isLoading}
      isError={conversationsQuery.isError}
      activeConversationId={conversationId}
      onSelect={setConversationId}
      onNewConversation={startNewConversation}
      onRetry={() => void conversationsQuery.refetch()}
      onBack={layout.isSplit ? undefined : () => setView('chat')}
    />
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AiPanelHeader
        mode={mode}
        showHistoryButton={!layout.isSplit}
        isHistoryOpen={view === 'history'}
        canExpand={layout.placement !== 'fullscreen'}
        canStartNew={conversationId !== null || showHistoryOnly}
        onNewConversation={startNewConversation}
        onToggleHistory={() => setView(view === 'history' ? 'chat' : 'history')}
        onToggleMode={() => setMode(mode === 'expanded' ? 'docked' : 'expanded')}
        onClose={() => setOpen(false)}
      />
      {layout.isSplit ? (
        <div className="flex min-h-0 flex-1">
          <div className="w-72 shrink-0 border-r">{history}</div>
          {chat}
        </div>
      ) : (
        // Keyed so each switch replays a short fade.
        <div
          key={showHistoryOnly ? 'history' : 'chat'}
          className="animate-in fade-in-0 animation-duration-150 min-h-0 flex-1 motion-reduce:animate-none"
        >
          {showHistoryOnly ? history : chat}
        </div>
      )}
    </div>
  )
}
