export interface TransferLocationCapacity {
  readonly occupied: number
  readonly capacity: number
  readonly unitName: string
}

export function describeTransferLocationCapacity(summary?: TransferLocationCapacity | null) {
  if (
    !summary ||
    !Number.isFinite(summary.occupied) ||
    !Number.isFinite(summary.capacity) ||
    summary.capacity <= 0 ||
    !summary.unitName.trim()
  )
    return 'Chưa xác định sức chứa'
  const format = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 6 })
  return `Đang chứa ${format(summary.occupied)} / ${format(summary.capacity)} ${summary.unitName}`
}
