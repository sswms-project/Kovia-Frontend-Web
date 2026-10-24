export type SlotCodeResolution =
  | { readonly status: 'confirmed'; readonly slotId: string; readonly code: string }
  | { readonly status: 'error'; readonly message: string }

export interface ScannableSlot {
  readonly id: string
  readonly code: string
  readonly scanCodes?: readonly string[]
}

export function findSlotsByCode(code: string, slots: readonly ScannableSlot[]) {
  if (code.toUpperCase() === '__SYSTEM_DEFAULT__') return []
  const normalized = code.toLowerCase()
  return slots.filter((slot) =>
    [slot.code, ...(slot.scanCodes ?? [])].some(
      (candidate) => candidate.toLowerCase() === normalized
    )
  )
}

/** Mã vạch chưa có trong danh sách được BE đối chiếu lại với ô đã chọn. Không tự xác nhận tồn kho. */
export function resolveSlotCode(
  rawCode: string,
  slots: readonly ScannableSlot[],
  selectedSlotId: string
): SlotCodeResolution {
  const code = rawCode.trim()
  if (!code) return { status: 'error', message: 'Vui lòng quét hoặc nhập mã vị trí.' }
  if (code.toUpperCase() === '__SYSTEM_DEFAULT__')
    return { status: 'error', message: 'Đây là mã nội bộ. Vui lòng quét nhãn vị trí thực tế.' }
  const candidates = findSlotsByCode(code, slots)
  if (candidates.length > 1)
    return {
      status: 'error',
      message: 'Mã trùng ở nhiều vị trí. Vui lòng quét QR hoặc nhãn đầy đủ khu/kệ/vị trí.',
    }
  const matched = candidates[0]
  if (matched && selectedSlotId && matched.id !== selectedSlotId)
    return {
      status: 'error',
      message: `Mã ${matched.code} không phải vị trí đang chọn. Kiểm tra lại nơi bạn đang đứng.`,
    }
  if (matched) return { status: 'confirmed', slotId: matched.id, code }
  if (selectedSlotId) return { status: 'confirmed', slotId: selectedSlotId, code }
  return { status: 'error', message: 'Không tìm thấy vị trí có mã này trong kho.' }
}
