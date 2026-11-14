interface AiUserBubbleProps {
  readonly content: string
  /** Chỉ bong bóng vừa gửi mới chạy hiệu ứng; bản đã lưu thay thế nó thì đứng yên để không nháy. */
  readonly animateEntrance?: boolean
}

export function AiUserBubble({ content, animateEntrance = false }: AiUserBubbleProps) {
  return (
    <div className="flex justify-end" data-ai-motion={animateEntrance ? 'message' : undefined}>
      <p className="bg-primary text-primary-foreground max-w-[85%] rounded-lg rounded-br-sm px-3 py-2 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
        {content}
      </p>
    </div>
  )
}
