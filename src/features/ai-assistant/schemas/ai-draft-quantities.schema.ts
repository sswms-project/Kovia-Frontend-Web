import { z } from 'zod'

// Mirrors UpdateAiActionDraftQuantitiesCommandValidator.
export const AI_DRAFT_MAX_LINES = 50
export const AI_DRAFT_MAX_QUANTITY = 1_000_000_000

// Compared with a tolerance because 1.15 * 100 is 114.99999999999999 in binary floating point.
const hasAtMostTwoDecimals = (quantity: number) =>
  Math.abs(quantity * 100 - Math.round(quantity * 100)) < 1e-6

/** Ngày hôm nay theo giờ máy người dùng, dạng yyyy-MM-dd (cùng định dạng với ô nhập ngày). */
export function getTodayInputValue(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export const aiDraftQuantitiesSchema = z.object({
  // Mirrors the BE rule: an inbound request must carry an expected date that is not in the past.
  expectedDate: z
    .string()
    .min(1, 'Vui lòng chọn ngày dự kiến hàng về.')
    .refine((value) => value >= getTodayInputValue(), 'Ngày dự kiến hàng về không được ở quá khứ.'),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z
          .number({ error: 'Hãy nhập số lượng.' })
          .gt(0, 'Số lượng phải lớn hơn 0.')
          .max(AI_DRAFT_MAX_QUANTITY, 'Số lượng quá lớn.')
          .refine(hasAtMostTwoDecimals, 'Số lượng chỉ hỗ trợ tối đa hai chữ số thập phân.'),
      })
    )
    .min(1, 'Cần ít nhất một dòng hàng để chỉnh số lượng.')
    .max(AI_DRAFT_MAX_LINES, `Tối đa ${AI_DRAFT_MAX_LINES} dòng hàng.`),
})

export type AiDraftQuantitiesForm = z.infer<typeof aiDraftQuantitiesSchema>
