import {
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  Magnet,
  Scan,
  SquareDashedMousePointer,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { RackOperation } from '../../utils/layout-rack-operations'

interface DesignerRackToolsProps {
  readonly count: number
  readonly referenceCode?: string
  readonly multiSelect: boolean
  readonly snapObjects: boolean
  readonly disabled: boolean
  readonly canArrange: (operation: RackOperation) => boolean
  readonly onToggleMulti: () => void
  readonly onToggleSnap: () => void
  readonly onArrange: (operation: RackOperation) => void
  readonly onFit: () => void
  readonly onClear: () => void
}
const alignments = [
  ['left', 'Căn trái', AlignHorizontalJustifyStart],
  ['center-x', 'Căn giữa ngang', AlignHorizontalJustifyCenter],
  ['right', 'Căn phải', AlignHorizontalJustifyEnd],
  ['top', 'Căn trên', AlignVerticalJustifyStart],
  ['center-y', 'Căn giữa dọc', AlignVerticalJustifyCenter],
  ['bottom', 'Căn dưới', AlignVerticalJustifyEnd],
] as const

export function DesignerRackTools({
  count,
  referenceCode,
  multiSelect,
  snapObjects,
  disabled,
  canArrange,
  onToggleMulti,
  onToggleSnap,
  onArrange,
  onFit,
  onClear,
}: DesignerRackToolsProps) {
  return (
    <div
      className="flex min-w-0 flex-wrap items-center gap-1"
      role="group"
      aria-label="Công cụ chọn và căn kệ"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button
              size="sm"
              variant={multiSelect ? 'secondary' : 'ghost'}
              aria-pressed={multiSelect}
              disabled={disabled}
              onClick={onToggleMulti}
            >
              <SquareDashedMousePointer data-icon="inline-start" aria-hidden="true" />
              Chọn nhiều kệ
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Shift + click để thêm hoặc bỏ kệ. Bật chế độ rồi kéo nền để khoanh chọn.
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button
              size="sm"
              variant={snapObjects ? 'secondary' : 'ghost'}
              aria-pressed={snapObjects}
              disabled={disabled}
              onClick={onToggleSnap}
            >
              <Magnet data-icon="inline-start" aria-hidden="true" />
              Hít đối tượng
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Hít mép và tâm kệ khi kéo, độc lập với Hiện lưới.</TooltipContent>
      </Tooltip>
      {count > 0 ? (
        <>
          <span className="text-muted-foreground max-w-full px-2 text-xs break-words" role="status">
            Đã chọn {count} kệ{referenceCode ? ` · Chuẩn: ${referenceCode}` : ''}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={disabled || count < 2}>
                <AlignHorizontalJustifyCenter data-icon="inline-start" aria-hidden="true" />
                Căn chỉnh
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={4}>
              <DropdownMenuGroup>
                {alignments.map(([operation, label, Icon]) => (
                  <DropdownMenuItem
                    key={operation}
                    disabled={!canArrange(operation)}
                    onSelect={() => onArrange(operation)}
                  >
                    <Icon aria-hidden="true" />
                    {label}
                    {!canArrange(operation) ? ' · Vượt biên kho' : ''}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={disabled || count < 3}>
                Giãn đều
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={4}>
              <DropdownMenuGroup>
                <DropdownMenuItem
                  disabled={!canArrange('distribute-x')}
                  onSelect={() => onArrange('distribute-x')}
                >
                  <AlignHorizontalSpaceAround aria-hidden="true" />
                  Theo chiều ngang{!canArrange('distribute-x') ? ' · Không đủ khoảng trống' : ''}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!canArrange('distribute-y')}
                  onSelect={() => onArrange('distribute-y')}
                >
                  <AlignVerticalSpaceAround aria-hidden="true" />
                  Theo chiều dọc{!canArrange('distribute-y') ? ' · Không đủ khoảng trống' : ''}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Vừa vùng chọn"
                  disabled={disabled}
                  onClick={onFit}
                >
                  <Scan aria-hidden="true" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Vừa vùng chọn</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Bỏ chọn các kệ"
                  disabled={disabled}
                  onClick={onClear}
                >
                  <X aria-hidden="true" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Bỏ chọn các kệ</TooltipContent>
          </Tooltip>
        </>
      ) : null}
    </div>
  )
}
