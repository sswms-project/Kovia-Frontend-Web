// Receipt flow v2 records stock at receive; put-away only moves accepted goods to storage.
// Legacy flows (v1 and older) still increase destination stock when put-away is confirmed.
export function putAwayStockNote(receiptFlowVersion: number | null | undefined) {
  return receiptFlowVersion === 2
    ? 'Hàng đã được ghi nhận vào tồn khi nhận; cất chỉ chuyển hàng đạt sang vị trí lưu trữ, không tăng tồn lần nữa.'
    : 'Theo luồng cũ, tồn kho nhận sẽ tăng khi xác nhận cất.'
}
