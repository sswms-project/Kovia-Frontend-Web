import type {
  WarehouseLayoutEditorRack,
  WarehouseLayoutEditorZone,
} from '../../../types/warehouse-layout-scene.types'
import { WarehouseLocationDeactivateDialog } from '../../WarehouseDetailPage'

interface WorkspaceDeactivateDialogsProps {
  readonly rackTarget: WarehouseLayoutEditorRack | null
  readonly zoneTarget: WarehouseLayoutEditorZone | null
  readonly isDeactivatingRack: boolean
  readonly isDeactivatingZone: boolean
  readonly errorMessage: string | null
  readonly onCancelRack: () => void
  readonly onCancelZone: () => void
  readonly onConfirmRack: () => void
  readonly onConfirmZone: () => void
}

export function WorkspaceDeactivateDialogs({
  rackTarget,
  zoneTarget,
  isDeactivatingRack,
  isDeactivatingZone,
  errorMessage,
  onCancelRack,
  onCancelZone,
  onConfirmRack,
  onConfirmZone,
}: WorkspaceDeactivateDialogsProps) {
  return (
    <>
      <WarehouseLocationDeactivateDialog
        open={Boolean(rackTarget)}
        locationLabel="kệ hàng"
        locationCode={rackTarget?.rackCode ?? ''}
        isPending={isDeactivatingRack}
        errorMessage={errorMessage}
        onOpenChange={(open) => {
          if (!open) onCancelRack()
        }}
        onConfirm={onConfirmRack}
      />
      <WarehouseLocationDeactivateDialog
        open={Boolean(zoneTarget)}
        locationLabel="khu vực"
        locationCode={zoneTarget?.zoneCode ?? ''}
        isPending={isDeactivatingZone}
        errorMessage={errorMessage}
        onOpenChange={(open) => {
          if (!open) onCancelZone()
        }}
        onConfirm={onConfirmZone}
      />
    </>
  )
}
