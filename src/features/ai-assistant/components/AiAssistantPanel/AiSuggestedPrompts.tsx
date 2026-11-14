import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getSuggestedPrompts } from '../../utils/ai-suggested-prompts'
import { AiAssistantMascot } from './AiAssistantMascot'

interface AiSuggestedPromptsProps {
  readonly onSelect: (prompt: string) => void
}

export function AiSuggestedPrompts({ onSelect }: AiSuggestedPromptsProps) {
  const suggestedPrompts = getSuggestedPrompts(usePathname())
  return (
    <div className="flex flex-col items-center gap-3 px-2 py-6 text-center">
      <AiAssistantMascot size="lg" />
      <div>
        <p className="text-sm font-semibold">Xin chào, mình là Kovia.</p>
        <p className="text-muted-foreground text-xs">
          Mình chỉ đọc dữ liệu trong phạm vi quyền của tài khoản bạn. Mọi thay đổi đều cần bạn xác
          nhận.
        </p>
      </div>
      <ul className="flex w-full flex-col gap-2" aria-label="Câu hỏi gợi ý">
        {suggestedPrompts.map((prompt) => (
          <li key={prompt}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-auto w-full justify-start py-2 text-left whitespace-normal"
              onClick={() => onSelect(prompt)}
            >
              {prompt}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
