export type TransferDetailTab = 'execution' | 'goods' | 'history'
export function parseTransferDetailTab(value: string | null): TransferDetailTab | null {
  if (value === 'goods' || value === 'history') return value
  // Liên kết từ thông báo/công việc cũ vẫn mở toàn bộ luồng trong tab Thực hiện.
  return value &&
    ['shipments', 'execution', 'pick', 'receive', 'putaway', 'feedback', 'discrepancies'].includes(
      value
    )
    ? 'execution'
    : null
}
