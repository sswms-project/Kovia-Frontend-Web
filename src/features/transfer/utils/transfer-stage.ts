import { TRANSFER_STAGES, type TransferStage, type TransferStatus } from '../types/transfer.types'

export const DEFAULT_TRANSFER_STAGE: TransferStage = 'request'

export function parseTransferStage(value: string | null | undefined): TransferStage {
  return TRANSFER_STAGES.find((stage) => stage === value) ?? DEFAULT_TRANSFER_STAGE
}

export interface TransferStatusOption {
  readonly value: TransferStatus | ''
  readonly label: string
}

/**
 * Ô lọc trạng thái theo tab. Tab Yêu cầu mặc định ẩn phiếu đã hủy (chọn "Đã hủy" để xem); tab Chờ xử lý chênh lệch
 * đã được giới hạn theo chênh lệch nên không cần lọc trạng thái.
 */
export function transferStatusOptions(stage: TransferStage): readonly TransferStatusOption[] {
  if (stage === 'discrepancy') return []
  if (stage === 'transfer') {
    return [
      { value: '', label: 'Mọi trạng thái' },
      { value: 'InProgress', label: 'Đang thực hiện' },
      { value: 'AwaitingResolution', label: 'Chờ xử lý chênh lệch' },
      { value: 'Completed', label: 'Hoàn tất' },
    ]
  }
  return [
    { value: '', label: 'Mọi trạng thái (không gồm đã hủy)' },
    { value: 'Draft', label: 'Nháp' },
    { value: 'InProgress', label: 'Đang thực hiện' },
    { value: 'AwaitingResolution', label: 'Chờ xử lý chênh lệch' },
    { value: 'Completed', label: 'Hoàn tất' },
    { value: 'Cancelled', label: 'Đã hủy' },
  ]
}
