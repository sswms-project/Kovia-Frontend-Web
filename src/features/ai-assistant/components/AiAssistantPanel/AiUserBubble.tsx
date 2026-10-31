import { cn } from '@/lib/utils'

export const MESSAGE_ENTRANCE =
  'animate-in fade-in-0 slide-in-from-bottom-1 animation-duration-250 motion-reduce:animate-none'

interface AiUserBubbleProps {
  readonly content: string
  /** Chỉ bong bóng vừa gửi mới chạy hiệu ứng; bản đã lưu thay thế nó thì đứng yên để không nháy. */
  readonly animateEntrance?: boolean
}

export function AiUserBubble({ content, animateEntrance = false }: AiUserBubbleProps) {
  return (
    <div className={cn('flex justify-end', animateEntrance && MESSAGE_ENTRANCE)}>
      <p className="bg-primary text-primary-foreground max-w-[85%] rounded-lg rounded-br-sm px-3 py-2 text-sm break-words whitespace-pre-wrap">
        {content}
      </p>
    </div>
  )
}
