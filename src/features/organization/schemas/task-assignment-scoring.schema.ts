import { z } from 'zod'

// Giới hạn khớp UpdateTaskAssignmentScoringCommandValidator ở Backend.
export const SCORING_LIMITS = {
  base: { min: 0, max: 50 },
  points: { min: 0, max: 20 },
  urgentMultiplier: { min: 1, max: 5 },
} as const

function toOptionalNumber(value: unknown): unknown {
  if (value === '' || value === null || value === undefined) return undefined
  return Number(value)
}

function hasAtMostTwoDecimalPlaces(value: number): boolean {
  return Math.abs(Math.round(value * 100) - value * 100) < 1e-9
}

function weightSchema(label: string, limits: { readonly min: number; readonly max: number }) {
  return z
    .preprocess(
      toOptionalNumber,
      z.number({
        error: (issue) =>
          issue.input === undefined ? `${label} là bắt buộc.` : `${label} phải là số.`,
      })
    )
    .pipe(
      z
        .number()
        .min(limits.min, `${label} phải từ ${limits.min} đến ${limits.max}.`)
        .max(limits.max, `${label} phải từ ${limits.min} đến ${limits.max}.`)
        .refine(hasAtMostTwoDecimalPlaces, `${label} chỉ được tối đa 2 chữ số thập phân.`)
    )
}

export const taskAssignmentScoringFormSchema = z.object({
  receivingBase: weightSchema('Điểm nền nhận hàng', SCORING_LIMITS.base),
  putAwayBase: weightSchema('Điểm nền cất hàng', SCORING_LIMITS.base),
  warehouseTaskBase: weightSchema('Điểm nền công việc kho', SCORING_LIMITS.base),
  cycleCountBase: weightSchema('Điểm nền kiểm kê', SCORING_LIMITS.base),
  pointsPerLine: weightSchema('Điểm mỗi dòng hàng', SCORING_LIMITS.points),
  pointsPerQuantityLog: weightSchema('Hệ số theo số lượng', SCORING_LIMITS.points),
  urgentMultiplier: weightSchema('Hệ số việc gấp', SCORING_LIMITS.urgentMultiplier),
})

export type TaskAssignmentScoringFormInput = z.input<typeof taskAssignmentScoringFormSchema>
export type TaskAssignmentScoringFormValues = z.output<typeof taskAssignmentScoringFormSchema>
