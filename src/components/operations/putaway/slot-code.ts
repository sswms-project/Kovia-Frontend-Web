export type SlotCodeResolution =
  | { readonly status: 'confirmed'; readonly slotId: string; readonly code: string }
  | { readonly status: 'error'; readonly message: string }

/** Mã vạch chưa có trong danh sách được BE đối chiếu lại với ô đã chọn. Không tự xác nhận tồn kho. */
export function resolveSlotCode(
  rawCode: string,
  slots: readonly { readonly id: string; readonly code: string }[],
  selectedSlotId: string
): SlotCodeResolution {
  const code = rawCode.trim()
  if (!code) return { status: 'error', message: 'Vui lòng quét hoặc nhập mã vị trí.' }
  const matched = slots.find((slot) => slot.code.toLowerCase() === code.toLowerCase())
  if (matched && selectedSlotId && matched.id !== selectedSlotId)
    return {
      status: 'error',
      message: `Mã ${matched.code} không phải vị trí đang chọn. Kiểm tra lại nơi bạn đang đứng.`,
    }
  if (matched) return { status: 'confirmed', slotId: matched.id, code }
  if (selectedSlotId) return { status: 'confirmed', slotId: selectedSlotId, code }
  return { status: 'error', message: 'Không tìm thấy vị trí có mã này trong kho.' }
}
