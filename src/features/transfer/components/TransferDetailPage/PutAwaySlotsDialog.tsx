import { Map as MapIcon, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LookupCombobox } from '@/features/inbound-request/components/InboundRequestFormPage/LookupCombobox'
import type { LookupOption } from '@/features/inbound-request/types/inbound-request.types'
import type { PutAwaySlotChoice } from '../../hooks/use-transfer-put-away-actions'
import { TransferSlotMapDialog } from '../TransferFormPage/TransferSlotMapDialog'

export interface PutAwayItemRow {
  readonly id: string
  readonly label: string
  /** Vị trí đã lưu của dòng; để trống nếu chưa chọn. */
  readonly slot?: LookupOption
  /** Dòng đã bắt đầu nhận hàng nên không đổi vị trí cất nữa. */
  readonly locked: boolean
}

interface PutAwaySlotsDialogProps {
  readonly open: boolean
  readonly warehouseId: string
  readonly items: readonly PutAwayItemRow[]
  readonly slotOptions: readonly LookupOption[]
  readonly isLoadingSlots: boolean
  readonly isPending: boolean
  readonly onSlotSearchChange: (value: string) => void
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (slots: readonly PutAwaySlotChoice[]) => void
}

/**
 * Quản lý kho nhập chọn ô cất hàng cho từng dòng; nhân viên nhận hàng sẽ thấy "Cất vào" theo lựa chọn này.
 * Khi mở sơ đồ kho, hộp thoại này tạm ẩn (lựa chọn vẫn giữ) vì hộp thoại chặn bấm vào lớp sơ đồ bên ngoài.
 */
export function PutAwaySlotsDialog({ open, onOpenChange, ...rest }: PutAwaySlotsDialogProps) {
  return open ? <PutAwaySlotsSession onClose={() => onOpenChange(false)} {...rest} /> : null
}

type PutAwaySlotsSessionProps = Omit<PutAwaySlotsDialogProps, 'open' | 'onOpenChange'> & {
  readonly onClose: () => void
}

// Chỉ gắn khi mở nên mỗi lần mở là một phiên chọn mới từ dữ liệu đã lưu.
function PutAwaySlotsSession({
  warehouseId,
  items,
  slotOptions,
  isLoadingSlots,
  isPending,
  onSlotSearchChange,
  onClose,
  onSubmit,
}: PutAwaySlotsSessionProps) {
  const [choices, setChoices] = useState<Readonly<Record<string, LookupOption | undefined>>>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.slot]))
  )
  const [mapItemId, setMapItemId] = useState<string | null>(null)

  const changed = items
    .filter((item) => !item.locked && (choices[item.id]?.value ?? '') !== (item.slot?.value ?? ''))
    .map((item) => ({ itemId: item.id, destinationSlotId: choices[item.id]?.value ?? null }))
  const setChoice = (itemId: string, option: LookupOption | undefined) =>
    setChoices((current) => ({ ...current, [itemId]: option }))

  return (
    <>
      <Dialog open={mapItemId === null} onOpenChange={(next) => !next && !isPending && onClose()}>
        <DialogContent size="lg" className="sm:max-w-2xl">
          <div className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Chọn vị trí cất hàng</DialogTitle>
              <DialogDescription>
                Chọn ô cất cho từng mặt hàng. Nhân viên nhận hàng sẽ thấy &quot;Cất vào&quot; theo
                lựa chọn của bạn; không chọn thì họ tự tìm ô phù hợp.
              </DialogDescription>
            </DialogHeader>
            <ul
              className="grid max-h-[55vh] gap-3 overflow-auto pr-1"
              aria-label="Dòng hàng cần chọn vị trí cất"
            >
              {items.map((item) => {
                const choice = choices[item.id]
                return (
                  <li key={item.id} className="grid gap-1.5 border p-3">
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.locked ? (
                      <span className="text-muted-foreground text-xs">
                        Đã bắt đầu nhận hàng, không đổi được vị trí cất.
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div className="min-w-0 flex-1">
                          <LookupCombobox
                            value={choice?.value ?? ''}
                            options={slotOptions}
                            selectedOption={choice}
                            placeholder="Chọn vị trí cất (có thể để trống)"
                            emptyMessage="Kho nhập chưa có vị trí phù hợp."
                            ariaLabel={`Vị trí cất ${item.label}`}
                            isLoading={isLoadingSlots}
                            isInvalid={false}
                            footerAction={{
                              label: 'Chọn trong sơ đồ kho',
                              icon: <MapIcon aria-hidden="true" />,
                              onClick: () => setMapItemId(item.id),
                            }}
                            onSearchChange={onSlotSearchChange}
                            onChange={(value, option) =>
                              setChoice(
                                item.id,
                                value ? (option ?? { value, label: value }) : undefined
                              )
                            }
                          />
                        </div>
                        {choice ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Bỏ vị trí cất ${item.label}`}
                            onClick={() => setChoice(item.id, undefined)}
                          >
                            <X aria-hidden="true" />
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
                Đóng
              </Button>
              <Button
                type="button"
                disabled={isPending || changed.length === 0}
                onClick={() => onSubmit(changed)}
              >
                {isPending ? 'Đang lưu…' : 'Lưu vị trí cất'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      <TransferSlotMapDialog
        open={mapItemId !== null}
        onOpenChange={(next) => !next && setMapItemId(null)}
        title="Chọn vị trí cất hàng trên sơ đồ kho nhập"
        description="Chọn ô sẽ cất hàng khi nhận. Nhân viên vẫn quét mã ô khi cất hàng."
        warehouseId={warehouseId}
        onConfirm={({ slotId, label }) => {
          if (mapItemId) setChoice(mapItemId, { value: slotId, label })
        }}
      />
    </>
  )
}
