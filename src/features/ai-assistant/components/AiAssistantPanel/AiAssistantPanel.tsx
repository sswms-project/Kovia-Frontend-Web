'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  useAiConversationMessagesQuery,
  useAiConversationsQuery,
  useCancelAiActionMutation,
  useConfirmAiActionMutation,
  useSendAiChatMessageMutation,
  useUpdateAiDraftQuantitiesMutation,
} from '../../hooks/use-ai-assistant'
import {
  aiDraftQuantitiesSchema,
  aiStockIssueDraftQuantitiesSchema,
  type AiDraftQuantitiesForm,
} from '../../schemas/ai-draft-quantities.schema'
import { AI_ACTIONS } from '../../types/ai-assistant.types'
import { aiChatMessageSchema, type AiChatMessageForm } from '../../schemas/ai-chat-message.schema'
import { AiChatComposer } from './AiChatComposer'
import { AiChatThread } from './AiChatThread'
import { AiConversationMenu } from './AiConversationMenu'
import type { AiDraftQuantityEdit } from './AiDraftQuantityEditor'

interface AiAssistantPanelProps {
  readonly conversationId: string | null
  readonly onConversationChange: (conversationId: string | null) => void
  readonly onNavigate: () => void
}

/**
 * Orchestrator for the assistant sub-domain: owns the chat queries/mutations and passes data
 * and callbacks down to display-only components.
 */
export function AiAssistantPanel({
  conversationId,
  onConversationChange,
  onNavigate,
}: AiAssistantPanelProps) {
  const conversationsQuery = useAiConversationsQuery()
  const messagesQuery = useAiConversationMessagesQuery(conversationId)
  const sendMutation = useSendAiChatMessageMutation()
  const confirmMutation = useConfirmAiActionMutation()
  const cancelMutation = useCancelAiActionMutation()
  const quantitiesMutation = useUpdateAiDraftQuantitiesMutation()
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  // Bản nháp nhập kho cần ngày dự kiến, phiếu xuất kho thì không; chọn luật theo bản nháp đang sửa.
  const editingAction = useRef<string | null>(null)
  const quantitiesForm = useForm<AiDraftQuantitiesForm>({
    resolver: (values, context, options) =>
      zodResolver(
        editingAction.current === AI_ACTIONS.createStockIssueRequest
          ? aiStockIssueDraftQuantitiesSchema
          : aiDraftQuantitiesSchema
      )(values, context, options),
    defaultValues: { expectedDate: '', lines: [] },
  })
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const form = useForm<AiChatMessageForm>({
    resolver: zodResolver(aiChatMessageSchema),
    defaultValues: { message: '' },
  })

  const drafts = new Map((messagesQuery.data?.drafts ?? []).map((draft) => [draft.draftId, draft]))
  const processingDraftId =
    (confirmMutation.isPending ? confirmMutation.variables?.draftId : undefined) ??
    (cancelMutation.isPending ? cancelMutation.variables?.draftId : undefined) ??
    (quantitiesMutation.isPending ? quantitiesMutation.variables?.draftId : undefined) ??
    null

  const sendMessage = (message: string) => {
    if (sendMutation.isPending) return
    setPendingMessage(message)
    form.reset({ message: '' })
    sendMutation.mutate(
      { conversationId, message },
      {
        onSuccess: (response) => onConversationChange(response.conversationId),
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'Trợ lý AI chưa trả lời được. Vui lòng thử lại.'))
          form.setValue('message', message)
        },
        onSettled: () => setPendingMessage(null),
      }
    )
  }

  const handleConfirm = (draftId: string) =>
    confirmMutation.mutate(
      { draftId, conversationId },
      {
        onSuccess: () => toast.success('Đã thực hiện thao tác.'),
        onError: (error) => toast.error(getApiErrorMessage(error)),
      }
    )

  const handleCancel = (draftId: string) =>
    cancelMutation.mutate(
      { draftId, conversationId },
      {
        onSuccess: () => toast.success('Đã hủy bản nháp.'),
        onError: (error) => toast.error(getApiErrorMessage(error)),
      }
    )

  const quantityEdit: AiDraftQuantityEdit = {
    editingDraftId,
    form: quantitiesForm,
    isSaving: quantitiesMutation.isPending,
    onStart: (draftId, values, action) => {
      editingAction.current = action ?? null
      quantitiesForm.reset(values)
      setEditingDraftId(draftId)
    },
    onCancel: () => setEditingDraftId(null),
    onSubmit: quantitiesForm.handleSubmit(({ lines, expectedDate }) => {
      if (!editingDraftId) return
      quantitiesMutation.mutate(
        { draftId: editingDraftId, conversationId, lines, expectedDate: expectedDate || undefined },
        {
          onSuccess: () => {
            toast.success('Đã cập nhật bản nháp.')
            setEditingDraftId(null)
          },
          onError: (error) => toast.error(getApiErrorMessage(error)),
        }
      )
    }),
  }

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
          onSelect={onConversationChange}
          onNewConversation={() => onConversationChange(null)}
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
        processingDraftId={processingDraftId}
        onConfirmAction={handleConfirm}
        onCancelAction={handleCancel}
        onNavigate={onNavigate}
        quantityEdit={quantityEdit}
      />

      <AiChatComposer
        form={form}
        isSending={sendMutation.isPending}
        onSubmit={form.handleSubmit(({ message }) => sendMessage(message))}
      />
    </div>
  )
}
