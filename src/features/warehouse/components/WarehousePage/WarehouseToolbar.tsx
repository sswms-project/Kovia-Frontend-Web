import type { ReactNode } from 'react'
import { RefreshCw, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'

interface WarehouseToolbarProps {
  readonly searchText: string
  readonly isFetching: boolean
  readonly onSearchChange: (value: string) => void
  readonly exportAction?: ReactNode
  readonly onRefresh: () => void
}

export function WarehouseToolbar({
  searchText,
  isFetching,
  onSearchChange,
  onRefresh,
  exportAction,
}: WarehouseToolbarProps) {
  return (
    <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <InputGroup className="h-10 w-full sm:h-8 sm:max-w-sm">
        <InputGroupInput
          value={searchText}
          aria-label="Tìm theo mã hoặc tên kho"
          placeholder="Tìm mã hoặc tên kho"
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        {searchText && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              aria-label="Xóa nội dung tìm kiếm"
              onClick={() => onSearchChange('')}
            >
              <X aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <p className="text-muted-foreground text-xs" aria-live="polite">
          {isFetching ? 'Đang cập nhật' : ''}
        </p>
        {exportAction}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={isFetching}
              aria-label="Làm mới danh sách kho"
              onClick={onRefresh}
            >
              <RefreshCw className={isFetching ? 'animate-spin' : undefined} aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={4}>Làm mới danh sách kho</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
