import { useId, type BaseSyntheticEvent, type KeyboardEvent } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  AI_CHAT_MESSAGE_MAX_LENGTH,
  type AiChatMessageForm,
} from '../../schemas/ai-chat-message.schema'

interface AiChatComposerProps {
  readonly form: UseFormReturn<AiChatMessageForm>
  readonly isSending: boolean
  readonly onSubmit: (event?: BaseSyntheticEvent) => Promise<void>
}

export function AiChatComposer({ form, isSending, onSubmit }: AiChatComposerProps) {
  const error = form.formState.errors.message
  const messageId = useId()
  const errorId = `${messageId}-error`
  const hintId = `${messageId}-hint`

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter adds a line; never send while a Vietnamese IME is composing.
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    if (!isSending) void onSubmit()
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="bg-card shrink-0 border-t p-3">
      <div className="flex items-end gap-2">
        <Textarea
          {...form.register('message')}
          aria-label="Câu hỏi cho trợ lý AI"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hintId}
          placeholder="Hỏi về tồn kho, vận hành kho, dự báo…"
          rows={1}
          maxLength={AI_CHAT_MESSAGE_MAX_LENGTH}
          readOnly={isSending}
          onKeyDown={handleKeyDown}
          className="max-h-40 min-h-10 resize-none text-sm md:text-sm"
        />
        <Button type="submit" size="icon" disabled={isSending} aria-label="Gửi câu hỏi">
          <SendHorizontal aria-hidden="true" />
        </Button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-destructive mt-1 text-xs">
          {error.message}
        </p>
      ) : (
        <p id={hintId} className="text-muted-foreground mt-1 text-[11px]">
          AI có thể nhầm lẫn. Mọi thao tác thay đổi dữ liệu đều cần bạn xác nhận.
        </p>
      )}
    </form>
  )
}
