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
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { RackOperation } from '../../utils/layout-rack-operations'

interface DesignerRackToolsProps {
  readonly count: number
  readonly referenceCode?: string
  readonly snapObjects: boolean
  readonly disabled: boolean
  readonly canArrange: (operation: RackOperation) => boolean
  readonly onToggleSnap: () => void
  readonly onArrange: (operation: RackOperation) => void
  readonly onFit: () => void
  readonly onClear: () => void
}
const operations = [
  ['left', 'Căn trái', AlignHorizontalJustifyStart],
  ['center-x', 'Căn giữa ngang', AlignHorizontalJustifyCenter],
  ['right', 'Căn phải', AlignHorizontalJustifyEnd],
  ['top', 'Căn trên', AlignVerticalJustifyStart],
  ['center-y', 'Căn giữa dọc', AlignVerticalJustifyCenter],
  ['bottom', 'Căn dưới', AlignVerticalJustifyEnd],
  ['distribute-x', 'Giãn đều ngang', AlignHorizontalSpaceAround],
  ['distribute-y', 'Giãn đều dọc', AlignVerticalSpaceAround],
] as const

export function DesignerRackTools({
  count,
  referenceCode,
  snapObjects,
  disabled,
  canArrange,
  onToggleSnap,
  onArrange,
  onFit,
  onClear,
}: DesignerRackToolsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2" role="group" aria-label="Công cụ chọn và căn kệ">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium" role="status">
            Đã chọn {count} kệ
          </p>
          {referenceCode ? (
            <p className="text-muted-foreground text-xs break-all">
              Kệ chuẩn: <span translate="no">{referenceCode}</span>
            </p>
          ) : null}
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Bỏ chọn các kệ"
          disabled={disabled}
          onClick={onClear}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-1">
        {operations.map(([operation, label, Icon]) => (
          <Button
            key={operation}
            size="sm"
            variant="outline"
            className="h-auto min-h-8 min-w-0 justify-start text-left whitespace-normal"
            disabled={
              disabled ||
              count < (operation.startsWith('distribute') ? 3 : 2) ||
              !canArrange(operation)
            }
            onClick={() => onArrange(operation)}
          >
            <Icon data-icon="inline-start" aria-hidden="true" />
            {label}
          </Button>
        ))}
      </div>
      <Separator />
      <div className="flex flex-wrap items-center gap-1">
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
        <Button size="sm" variant="ghost" disabled={disabled} onClick={onFit}>
          <Scan data-icon="inline-start" aria-hidden="true" />
          Vừa vùng chọn
        </Button>
      </div>
    </div>
  )
}
