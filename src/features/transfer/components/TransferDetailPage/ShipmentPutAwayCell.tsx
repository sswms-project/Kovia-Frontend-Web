import { Map as MapIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LookupCombobox } from '@/features/inbound-request/components/InboundRequestFormPage/LookupCombobox'
import type { LookupOption } from '@/features/inbound-request/types/inbound-request.types'

interface ShipmentPutAwayCellProps {
  readonly label: string
  /** Vị trí đã lưu của dòng; để trống nếu chưa chọn. */
  readonly saved?: LookupOption
  readonly options: readonly LookupOption[]
  readonly isLoading: boolean
  readonly isPending: boolean
  readonly onSearchChange: (value: string) => void
  readonly onOpenMap: () => void
  /** Lưu ngay khi chọn hoặc bỏ chọn; `undefined` là bỏ vị trí. */
  readonly onSave: (slot: LookupOption | undefined) => void
}

/** Ô chọn vị trí cất ngay trong bảng đợt xuất, cùng kiểu chọn với cột "Vị trí đến" lúc tạo yêu cầu. */
export function ShipmentPutAwayCell({
  label,
  saved,
  options,
  isLoading,
  isPending,
  onSearchChange,
  onOpenMap,
  onSave,
}: ShipmentPutAwayCellProps) {
  return (
    <div className="flex min-w-56 items-center gap-1">
      <div className="min-w-0 flex-1">
        <LookupCombobox
          value={saved?.value ?? ''}
          options={options}
          selectedOption={saved}
          placeholder="Chọn vị trí cất (có thể để trống)"
          emptyMessage="Kho nhập chưa có vị trí phù hợp."
          ariaLabel={`Vị trí cất ${label}`}
          isLoading={isLoading}
          isInvalid={false}
          disabled={isPending}
          footerAction={{
            label: 'Chọn trong sơ đồ kho',
            icon: <MapIcon aria-hidden="true" />,
            onClick: onOpenMap,
          }}
          onSearchChange={onSearchChange}
          onChange={(value, option) =>
            onSave(value ? (option ?? { value, label: value }) : undefined)
          }
        />
      </div>
      {saved && !isPending ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Bỏ vị trí cất ${label}`}
          onClick={() => onSave(undefined)}
        >
          <X aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  )
}
