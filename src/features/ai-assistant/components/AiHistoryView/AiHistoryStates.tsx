import { MessageSquarePlus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const SKELETON_ROWS = 6

export function AiHistorySkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3 px-2.5 py-1">
      <span className="sr-only">Đang tải lịch sử…</span>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className="flex flex-col gap-1.5" aria-hidden="true">
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-2.5 w-1/4" />
        </div>
      ))}
    </div>
  )
}

export function AiHistoryError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm">
      <p>Không tải được lịch sử trò chuyện.</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        Thử lại
      </Button>
    </div>
  )
}

interface AiHistoryEmptyProps {
  readonly onNewConversation: () => void
}

export function AiHistoryEmpty({ onNewConversation }: AiHistoryEmptyProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <p className="text-sm font-medium">Chưa có cuộc trò chuyện nào</p>
      <p className="text-muted-foreground text-xs">Các cuộc trò chuyện của bạn sẽ hiện ở đây.</p>
      <Button type="button" variant="outline" size="sm" onClick={onNewConversation}>
        <MessageSquarePlus aria-hidden="true" />
        Bắt đầu cuộc trò chuyện
      </Button>
    </div>
  )
}

export function AiHistorySearchEmpty({ query }: { readonly query: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-8 text-center" role="status">
      <p className="text-sm font-medium break-words">Không tìm thấy “{query.trim()}”</p>
      <p className="text-muted-foreground text-xs">
        Chỉ tìm trong tiêu đề các cuộc trò chuyện đã tải, không tìm trong nội dung tin nhắn.
      </p>
    </div>
  )
}
