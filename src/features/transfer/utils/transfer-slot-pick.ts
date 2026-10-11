import type { WarehouseLayoutEditorScene } from '@/features/warehouse/types/warehouse-layout-scene.types'

export interface TransferPickableLocation {
  readonly slotId: string
  readonly label: string
}

export interface TransferSlotPick {
  readonly slotId: string
  readonly label: string
  readonly isValid: boolean
  /** Vì sao chưa chọn được ô này; chỉ có khi `isValid` là false. */
  readonly problem?: string
}

/**
 * Đánh giá ô người dùng bấm trên sơ đồ kho. Vị trí đi chỉ nhận ô có tồn của sản phẩm (`allowed`); vị trí đến
 * (không truyền `allowed`) loại ô ngừng hoạt động và khu chờ xuất. Máy chủ vẫn kiểm lại khi lưu phiếu.
 */
export function describeSlotPick(
  scene: WarehouseLayoutEditorScene,
  slotId: string,
  allowed?: readonly TransferPickableLocation[]
): TransferSlotPick | null {
  const slot = scene.slots.find((candidate) => candidate.id === slotId)
  if (!slot) return null
  const rack = scene.racks.find((candidate) => candidate.id === slot.rackId)
  const zone = scene.zones.find((candidate) => candidate.id === slot.zoneId)
  const sceneLabel = `Khu ${zone?.zoneCode ?? '—'} / Kệ ${rack?.rackCode ?? '—'} / ${slot.slotCode}`
  return evaluateSlot(slot, sceneLabel, allowed)
}

/**
 * Đánh giá kệ người dùng bấm trên sơ đồ. Kệ quản lý theo kệ nhận hàng vào ô mặc định nên chọn cả kệ là đủ;
 * kệ quản lý theo ô buộc phải chọn một ô cụ thể.
 */
export function describeRackPick(
  scene: WarehouseLayoutEditorScene,
  rackId: string,
  allowed?: readonly TransferPickableLocation[]
): TransferSlotPick | null {
  const rack = scene.racks.find((candidate) => candidate.id === rackId)
  if (!rack) return null
  const zone = scene.zones.find((candidate) => candidate.id === rack.zoneId)
  const label = `Khu ${zone?.zoneCode ?? '—'} / Kệ ${rack.rackCode}`
  if (rack.storageMode !== 'RackLevel' || !rack.defaultSlotId)
    return {
      slotId: rack.id,
      label,
      isValid: false,
      problem: 'Kệ này quản lý theo từng ô. Hãy chọn một ô trong kệ.',
    }
  return evaluateSlot(
    {
      id: rack.defaultSlotId,
      isActive: rack.status === 'Active',
      isOutboundStaging: false,
    },
    label,
    allowed
  )
}

function evaluateSlot(
  slot: { readonly id: string; readonly isActive: boolean; readonly isOutboundStaging?: boolean },
  sceneLabel: string,
  allowed?: readonly TransferPickableLocation[]
): TransferSlotPick {
  if (allowed) {
    const match = allowed.find((location) => location.slotId === slot.id)
    return match
      ? { slotId: slot.id, label: match.label, isValid: true }
      : {
          slotId: slot.id,
          label: sceneLabel,
          isValid: false,
          problem:
            'Ô này không có tồn của sản phẩm. Hãy chọn một ô trong danh sách "Vị trí có tồn".',
        }
  }
  if (!slot.isActive)
    return { slotId: slot.id, label: sceneLabel, isValid: false, problem: 'Ô đang ngừng sử dụng.' }
  if (slot.isOutboundStaging)
    return {
      slotId: slot.id,
      label: sceneLabel,
      isValid: false,
      problem: 'Đây là khu chờ xuất, không dùng làm nơi nhận hàng.',
    }
  return { slotId: slot.id, label: sceneLabel, isValid: true }
}
