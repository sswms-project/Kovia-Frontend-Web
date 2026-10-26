import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

export function WarehouseDesignerLoadError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <Empty className="min-h-80 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlert className="text-destructive" aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Không thể tải trình thiết kế</EmptyTitle>
        <EmptyDescription>
          Dữ liệu scene chưa sẵn sàng hoặc bạn không còn quyền truy cập kho này.
        </EmptyDescription>
      </EmptyHeader>
      <Button type="button" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" aria-hidden="true" />
        Thử lại
      </Button>
    </Empty>
  )
}
