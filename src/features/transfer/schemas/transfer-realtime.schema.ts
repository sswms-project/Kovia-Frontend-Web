import { z } from 'zod'

export const TRANSFER_CHANGED_EVENT = 'TransferChanged'

/** Tín hiệu tối thiểu từ BE: chỉ định danh, màn hình tự tải lại dữ liệu qua API. */
export const transferChangedEventSchema = z.object({
  transferId: z.string(),
  shipmentId: z.string().nullish(),
  changeType: z.string(),
  occurredAt: z.string(),
  originClientId: z.string().nullish(),
})

export type TransferChangedEvent = z.infer<typeof transferChangedEventSchema>
