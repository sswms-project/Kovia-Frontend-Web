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
