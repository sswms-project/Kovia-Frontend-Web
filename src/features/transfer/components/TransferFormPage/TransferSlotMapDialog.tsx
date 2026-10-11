'use client'

import { X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { WarehouseLayoutViewerWorkspace } from '@/features/warehouse/components/WarehouseDesigner'
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

const CLOSE_DELAY_MS = 180

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

/**
 * Chọn một ô ngay trên màn xem sơ đồ kho đầy đủ (cây vị trí, sơ đồ, hàng hóa tại vị trí) rồi bấm Chọn để điền
 * vào dòng hàng. Mở kín trang và trượt xuống khi đóng như màn xem sơ đồ kho.
 */
export function TransferSlotMapDialog({ open, onOpenChange, ...rest }: TransferSlotMapDialogProps) {
  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <TransferSlotMapBody onClose={() => onOpenChange(false)} {...rest} />,
    document.body
  )
}

type TransferSlotMapBodyProps = Omit<TransferSlotMapDialogProps, 'open' | 'onOpenChange'> & {
  readonly onClose: () => void
}

// Chỉ gắn khi mở: mỗi lần mở là một phiên chọn mới, và chỉ lúc đó mới tải sơ đồ kho.
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
  const [isClosing, setIsClosing] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  // Trượt xuống như màn xem sơ đồ kho rồi mới gỡ; người dùng chọn giảm chuyển động thì đóng ngay.
  const requestClose = useCallback(() => {
    if (closeTimerRef.current) return
    setIsClosing(true)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    closeTimerRef.current = setTimeout(
      () => onCloseRef.current(),
      reduceMotion ? 0 : CLOSE_DELAY_MS
    )
  }, [])
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [requestClose])

  function pickOf(selection: WarehouseLayoutSelection | null): TransferSlotPick | null {
    return scene && selection?.kind === 'slot'
      ? describeSlotPick(scene, selection.id, allowedLocations)
      : null
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={title}>
      {scene ? (
        <WarehouseLayoutViewerWorkspace
          warehouseId={warehouseId}
          warehouseName=""
          title={title}
          scene={scene}
          canConfigure={false}
          isClosing={isClosing}
          onClose={requestClose}
          picker={{
            description,
            quickPicksTitle: 'Vị trí có tồn',
            quickPicks: allowedLocations?.map((location) => ({
              slotId: location.slotId,
              label: location.label,
            })),
            evaluate: (selection) => {
              const pick = pickOf(selection)
              return {
                summary: <SelectionSummary pick={pick} hasSelection={Boolean(selection)} />,
                canConfirm: Boolean(pick?.isValid),
              }
            },
            onConfirm: (selection) => {
              const pick = pickOf(selection)
              if (!pick?.isValid) return
              onConfirm({ slotId: pick.slotId, label: pick.label })
              requestClose()
            },
          }}
        />
      ) : (
        <LoadingOrError
          title={title}
          isClosing={isClosing}
          errorMessage={
            sceneQuery.isError
              ? getApiErrorMessage(sceneQuery.error, 'Không tải được sơ đồ kho. Hãy thử lại sau.')
              : null
          }
          onClose={requestClose}
        />
      )}
    </div>
  )
}

function LoadingOrError({
  title,
  isClosing,
  errorMessage,
  onClose,
}: {
  readonly title: string
  readonly isClosing: boolean
  readonly errorMessage: string | null
  readonly onClose: () => void
}) {
  return (
    <section
      className={cn(
        'bg-background fixed inset-0 z-40 flex min-h-0 flex-col overflow-hidden transition-transform duration-200 ease-in motion-reduce:duration-0',
        isClosing ? 'pointer-events-none translate-y-full' : 'translate-y-0'
      )}
    >
      <header className="flex min-h-16 shrink-0 items-center gap-3 border-b px-5 py-2">
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold">{title}</h1>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Đóng sơ đồ"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </Button>
      </header>
      {errorMessage ? (
        <p role="alert" className="text-destructive p-5 text-sm">
          {errorMessage}
        </p>
      ) : (
        <Skeleton className="m-5 flex-1" />
      )}
    </section>
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
      <p className="text-muted-foreground">
        {hasSelection
          ? 'Chọn một ô trong kệ ở danh sách bên trái.'
          : 'Bấm vào kệ trên sơ đồ hoặc chọn ô trong danh sách.'}
      </p>
    )
  }
  return (
    <div aria-live="polite" className="min-w-0">
      <p className="truncate">
        Đã chọn: <strong>{pick.label}</strong>
      </p>
      {pick.problem ? <p className="text-destructive text-xs">{pick.problem}</p> : null}
    </div>
  )
}
