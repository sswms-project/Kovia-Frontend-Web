import { Sparkles } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getSuggestedPrompts } from '../../utils/ai-suggested-prompts'

interface AiSuggestedPromptsProps {
  readonly onSelect: (prompt: string) => void
}

export function AiSuggestedPrompts({ onSelect }: AiSuggestedPromptsProps) {
  const suggestedPrompts = getSuggestedPrompts(usePathname())
  return (
    <div className="flex flex-col items-center gap-3 px-2 py-6 text-center">
      <span className="bg-tertiary/10 text-tertiary flex size-10 items-center justify-center rounded-full">
        <Sparkles className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-semibold">Xin chào! Mình có thể giúp gì cho bạn?</p>
        <p className="text-muted-foreground text-xs">
          Hỏi về tồn kho, vận hành kho, dự báo hoặc nhờ mình chỉ đường tới đúng màn hình.
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
