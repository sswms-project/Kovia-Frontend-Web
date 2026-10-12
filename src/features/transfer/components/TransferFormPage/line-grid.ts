/**
 * Lưới cột của dòng hàng. Thêm một cột cho mỗi vị trí người xem được thấy: "Vị trí đi" (chủ, người kho xuất)
 * và "Vị trí đến" (chủ, người kho nhập).
 */
export function lineGridColumns(showSourceSlot: boolean, showDestinationSlot: boolean) {
  const slots = (showSourceSlot ? 1 : 0) + (showDestinationSlot ? 1 : 0)
  if (slots === 0)
    return 'lg:grid-cols-[28px_minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_32px]'
  if (slots === 1)
    return 'lg:grid-cols-[28px_minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1.6fr)_32px]'
  return 'lg:grid-cols-[28px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_32px]'
}
