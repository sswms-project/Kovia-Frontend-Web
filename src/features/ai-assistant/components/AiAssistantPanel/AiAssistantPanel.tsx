'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sparkles } from 'lucide-react'
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAiAssistantPanelStore } from '@/stores/ai-assistant-panel.store'
import {
  useCancelAiActionMutation,
  useConfirmAiActionMutation,
} from '../../hooks/use-ai-draft-actions'
import {
  useAiConversationMessagesQuery,
  useAiConversationsQuery,
  useSendAiChatMessageMutation,
} from '../../hooks/use-ai-assistant'
import type { AiDraftProcessing } from '../../types/ai-assistant.types'
import { aiChatMessageSchema, type AiChatMessageForm } from '../../schemas/ai-chat-message.schema'
import { AiChatComposer } from './AiChatComposer'
import { AiChatThread } from './AiChatThread'
import { AiConversationMenu } from './AiConversationMenu'

interface AiAssistantPanelProps {
  readonly onNavigate: () => void
}

/**
 * Orchestrator for the assistant sub-domain: owns the chat queries/mutations and passes data
 * and callbacks down to display-only components. Toasts and the open conversation are owned by
 * the mutation hooks, so a result is still reported if the panel is closed while it is pending.
 */
export function AiAssistantPanel({ onNavigate }: AiAssistantPanelProps) {
  const conversationId = useAiAssistantPanelStore((state) => state.conversationId)
  const setConversationId = useAiAssistantPanelStore((state) => state.setConversationId)
  const conversationsQuery = useAiConversationsQuery()
  const messagesQuery = useAiConversationMessagesQuery(conversationId)
  const sendMutation = useSendAiChatMessageMutation()
  const confirmMutation = useConfirmAiActionMutation()
  const cancelMutation = useCancelAiActionMutation()
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const form = useForm<AiChatMessageForm>({
    resolver: zodResolver(aiChatMessageSchema),
    defaultValues: { message: '' },
  })

  const drafts = new Map((messagesQuery.data?.drafts ?? []).map((draft) => [draft.draftId, draft]))
  // One draft action runs at a time; confirm outranks cancel.
  const confirmingDraftId = confirmMutation.isPending ? confirmMutation.variables?.draftId : null
  const cancellingDraftId = cancelMutation.isPending ? cancelMutation.variables?.draftId : null
  const processing: AiDraftProcessing | null = confirmingDraftId
    ? { draftId: confirmingDraftId, action: 'confirm' }
    : cancellingDraftId
      ? { draftId: cancellingDraftId, action: 'cancel' }
      : null

  const sendMessage = (message: string) => {
    if (sendMutation.isPending) return
    setPendingMessage(message)
    form.reset({ message: '' })
    sendMutation.mutate(
      { conversationId, message },
      {
        // Only while the panel is open: put the question back so the user can resend it.
        onError: () => form.setValue('message', message),
        onSettled: () => setPendingMessage(null),
      }
    )
  }

  const handleConfirm = (draftId: string) => confirmMutation.mutate({ draftId, conversationId })

  const handleCancel = (draftId: string) => cancelMutation.mutate({ draftId, conversationId })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SheetHeader className="shrink-0 gap-2 border-b p-4 pr-12">
        <SheetTitle className="flex items-center gap-2">
          <Sparkles className="text-tertiary size-4" aria-hidden="true" />
          Trợ lý AI Kovia
        </SheetTitle>
        <SheetDescription className="text-xs">
          Tra cứu dữ liệu kho trong phạm vi quyền của bạn và tìm nhanh màn hình chức năng.
        </SheetDescription>
        <AiConversationMenu
          conversations={conversationsQuery.data ?? []}
          isLoading={conversationsQuery.isLoading}
          isError={conversationsQuery.isError}
          activeConversationId={conversationId}
          disabled={sendMutation.isPending}
          onSelect={setConversationId}
          onNewConversation={() => setConversationId(null)}
        />
      </SheetHeader>

      <AiChatThread
        messages={messagesQuery.data?.messages ?? []}
        pendingMessage={pendingMessage}
        isLoading={Boolean(conversationId) && messagesQuery.isLoading}
        isError={Boolean(conversationId) && messagesQuery.isError}
        onRetry={() => void messagesQuery.refetch()}
        onSuggestion={sendMessage}
        drafts={drafts}
        processing={processing}
        onConfirmAction={handleConfirm}
        onCancelAction={handleCancel}
        onNavigate={onNavigate}
      />

      <AiChatComposer
        form={form}
        isSending={sendMutation.isPending}
        onSubmit={form.handleSubmit(({ message }) => sendMessage(message))}
      />
    </div>
  )
}
