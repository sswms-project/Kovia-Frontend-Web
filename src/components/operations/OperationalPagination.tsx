import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface OperationalPaginationProps {
  readonly page: number
  readonly pageSize: number
  readonly totalCount: number
  readonly isPending?: boolean
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange?: (pageSize: number) => void
  readonly pageSizeOptions?: readonly number[]
  readonly centerContent?: ReactNode
  readonly density?: 'default' | 'compact'
}

export function OperationalPagination({
  page,
  pageSize,
  totalCount,
  isPending = false,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 30, 50],
  centerContent,
  density = 'default',
}: OperationalPaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <footer
      className={cn(
        'flex shrink-0 flex-wrap items-center justify-between border-t',
        density === 'compact' ? 'min-h-10 gap-2 px-3 py-1' : 'min-h-12 gap-3 px-3 py-2 sm:px-4'
      )}
    >
      <p className="text-[13px] tabular-nums">
        Tổng số: <span className="font-medium">{totalCount}</span>
      </p>
      {centerContent != null ? (
        <div
          className={cn(
            'text-muted-foreground text-center text-xs',
            density === 'compact' ? 'shrink-0' : 'min-w-48 flex-1'
          )}
        >
          {centerContent}
        </div>
      ) : null}
      <div
        className={cn(
          'flex items-center justify-end',
          density === 'compact' ? 'ml-auto gap-1' : 'flex-wrap gap-2'
        )}
      >
        {onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-[13px]">Số dòng/trang</span>
            <Select
              value={String(pageSize)}
              disabled={isPending}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger
                className={cn('h-8', density === 'compact' ? 'w-16' : 'w-20')}
                aria-label="Số dòng mỗi trang"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Trang đầu"
          className={cn(density === 'compact' && 'max-sm:hidden')}
          disabled={page <= 1 || isPending}
          onClick={() => onPageChange(1)}
        >
          <ChevronFirst aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Trang trước"
          disabled={page <= 1 || isPending}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <span className="min-w-14 text-center text-xs tabular-nums">
          {page} / {pageCount}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Trang sau"
          disabled={page >= pageCount || isPending}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Trang cuối"
          className={cn(density === 'compact' && 'max-sm:hidden')}
          disabled={page >= pageCount || isPending}
          onClick={() => onPageChange(pageCount)}
        >
          <ChevronLast aria-hidden="true" />
        </Button>
      </div>
    </footer>
  )
}
