import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StaffDirectoryPaginationProps {
  readonly page: number
  readonly pageSize: number
  readonly totalCount: number
  readonly disabled?: boolean
  readonly onPageChange: (page: number) => void
}

export function StaffDirectoryPagination({
  page,
  pageSize,
  totalCount,
  disabled = false,
  onPageChange,
}: StaffDirectoryPaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-t px-3 sm:px-4">
      <p className="text-muted-foreground text-xs">Tổng số: {totalCount}</p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled || page <= 1}
          aria-label="Trang trước"
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <span className="min-w-16 text-center text-xs tabular-nums">
          {page}/{pageCount}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled || page >= pageCount}
          aria-label="Trang sau"
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
