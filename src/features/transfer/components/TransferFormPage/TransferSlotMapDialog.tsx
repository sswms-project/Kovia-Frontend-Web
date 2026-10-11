'use client'

import { MapPin } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { DesignerToolbox } from '@/features/warehouse/components/WarehouseDesigner'
import { useWarehouseLayoutSceneQuery } from '@/features/warehouse/hooks/use-warehouse-layout-scene'
import type { WarehouseLayoutSelection } from '@/features/warehouse/types/warehouse-layout-scene.types'
import { mapWarehouseLayoutScene } from '@/features/warehouse/utils/layout-scene-mapper'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import {
  describeSlotPick,
  type TransferPickableLocation,
  type TransferSlotPick,
} from '../../utils/transfer-slot-pick'

const WarehouseCanvas = dynamic(
  () =>
    import('@/features/warehouse/components/WarehouseDesigner/WarehouseCanvas').then(
      (module) => module.WarehouseCanvas
    ),
  { ssr: false, loading: () => <Skeleton className="h-full min-h-[24rem] w-full" /> }
)

interface TransferSlotMapDialogProps {
  readonly open: boolean
  readonly title: string
  readonly description: string
  readonly warehouseId: string
  /** Chỉ cho chọn các ô này (vị trí đi: ô có tồn của sản phẩm); bỏ trống thì kiểm theo trạng thái ô (vị trí đến). */
  readonly allowedLocations?: readonly TransferPickableLocation[]
  readonly onOpenChange: (open: boolean) => void
  readonly onConfirm: (pick: { slotId: string; label: string }) => void
}

/** Chọn một ô bằng cách bấm trên sơ đồ kho hoặc trong cây Khu / Kệ / Ô, rồi bấm Chọn để điền vào dòng hàng. */
export function TransferSlotMapDialog({ open, onOpenChange, ...rest }: TransferSlotMapDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        className="flex h-[88vh] max-h-[52rem] flex-col gap-0 p-0 sm:max-w-6xl"
      >
        {open ? <TransferSlotMapBody onClose={() => onOpenChange(false)} {...rest} /> : null}
      </DialogContent>
    </Dialog>
  )
}

type TransferSlotMapBodyProps = Omit<TransferSlotMapDialogProps, 'open' | 'onOpenChange'> & {
  readonly onClose: () => void
}

// Chỉ gắn khi hộp thoại mở: mỗi lần mở là một phiên chọn mới, và chỉ lúc đó mới tải sơ đồ kho.
function TransferSlotMapBody({
  title,
  description,
  warehouseId,
  allowedLocations,
  onClose,
  onConfirm,
}: TransferSlotMapBodyProps) {
  const sceneQuery = useWarehouseLayoutSceneQuery(warehouseId)
  const scene = useMemo(
    () => (sceneQuery.data ? mapWarehouseLayoutScene(sceneQuery.data).editorScene : null),
    [sceneQuery.data]
  )
  const [selection, setSelection] = useState<WarehouseLayoutSelection | null>(null)
  const pick: TransferSlotPick | null =
    scene && selection?.kind === 'slot'
      ? describeSlotPick(scene, selection.id, allowedLocations)
      : null

  return (
    <>
      <DialogHeader className="shrink-0 border-b px-5 py-3 pr-12">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {sceneQuery.isError ? (
          <p role="alert" className="text-destructive p-5 text-sm">
            {getApiErrorMessage(sceneQuery.error, 'Không tải được sơ đồ kho. Hãy thử lại sau.')}
          </p>
        ) : !scene ? (
          <Skeleton className="m-5 h-64 flex-1" />
        ) : (
          <>
            <div className="flex max-h-60 min-h-0 shrink-0 flex-col overflow-hidden border-b md:max-h-none md:w-72 md:border-r md:border-b-0">
              <div className="min-h-0 flex-1 overflow-auto">
                <DesignerToolbox
                  scene={scene}
                  selection={selection}
                  canConfigure={false}
                  mode="viewer"
                  onCreateZone={() => undefined}
                  onCreateRack={() => undefined}
                  onCreateDecoration={() => undefined}
                  onSelect={setSelection}
                />
              </div>
              {allowedLocations ? (
                <AllowedLocationList
                  locations={allowedLocations}
                  selectedSlotId={selection?.kind === 'slot' ? selection.id : null}
                  onSelect={(slotId) => setSelection({ kind: 'slot', id: slotId })}
                />
              ) : null}
            </div>
            <div className="relative min-h-[18rem] min-w-0 flex-1">
              <WarehouseCanvas
                scene={scene}
                selection={selection}
                mode="viewer"
                canConfigure={false}
                isGridVisible
                onSelect={setSelection}
                onGeometryChange={() => undefined}
                onZoomChange={() => undefined}
                onPaletteDrop={() => undefined}
              />
            </div>
          </>
        )}
      </div>
      <DialogFooter className="shrink-0 items-center gap-3 border-t px-5 py-3 sm:justify-between">
        <SelectionSummary pick={pick} hasSelection={Boolean(selection)} />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="lg" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={!pick?.isValid}
            onClick={() => {
              if (!pick?.isValid) return
              onConfirm({ slotId: pick.slotId, label: pick.label })
              onClose()
            }}
          >
            Chọn
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}

function SelectionSummary({
  pick,
  hasSelection,
}: {
  readonly pick: TransferSlotPick | null
  readonly hasSelection: boolean
}) {
  if (!pick) {
    return (
      <p className="text-muted-foreground text-sm">
        {hasSelection
          ? 'Chọn một ô trong kệ ở danh sách bên trái.'
          : 'Bấm vào kệ trên sơ đồ hoặc chọn ô trong danh sách.'}
      </p>
    )
  }
  return (
    <div aria-live="polite" className="min-w-0 text-sm">
      <p className="truncate">
        Đã chọn: <strong>{pick.label}</strong>
      </p>
      {pick.problem ? <p className="text-destructive text-xs">{pick.problem}</p> : null}
    </div>
  )
}

function AllowedLocationList({
  locations,
  selectedSlotId,
  onSelect,
}: {
  readonly locations: readonly TransferPickableLocation[]
  readonly selectedSlotId: string | null
  readonly onSelect: (slotId: string) => void
}) {
  return (
    <section aria-label="Vị trí có tồn" className="max-h-44 shrink-0 overflow-auto border-t p-2">
      <h3 className="text-muted-foreground px-1 pb-1 text-xs font-medium">Vị trí có tồn</h3>
      {locations.length === 0 ? (
        <p className="text-muted-foreground px-1 text-xs">Sản phẩm không còn tồn ở ô nào.</p>
      ) : (
        <ul className="grid gap-1">
          {locations.map((location) => (
            <li key={location.slotId}>
              <button
                type="button"
                className={cn(
                  'hover:bg-accent flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs',
                  selectedSlotId === location.slotId && 'bg-accent font-medium'
                )}
                onClick={() => onSelect(location.slotId)}
              >
                <MapPin aria-hidden="true" className="size-3 shrink-0" />
                <span className="min-w-0 break-words">{location.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
