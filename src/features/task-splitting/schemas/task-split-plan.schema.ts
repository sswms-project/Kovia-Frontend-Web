import { z } from 'zod'
import type { TaskSplitLineView } from '../types/task-splitting.types'
import { formatQuantity, roundQuantity, sumQuantities } from '../utils/task-split-quantity'

/** A cleared `type="number"` input yields "", which is not a quantity (unlike an explicit 0). */
const planQuantitySchema = z
  .string()
  .trim()
  .min(1)
  .transform(Number)
  .pipe(z.number().finite().nonnegative())

/** Parsed quantity of one grid cell, or `null` when the text is not a valid quantity. */
export function parsePlanQuantity(text: string | undefined): number | null {
  const result = planQuantitySchema.safeParse(text ?? '')
  return result.success ? result.data : null
}

const taskSplitPlanFormObject = z.object({
  /** One column per part, in the backend's suggested order. */
  parts: z.array(z.object({ staffId: z.string().min(1) })).min(1),
  /** One row per source line; `quantities[partIndex]` is the raw input text of that cell. */
  rows: z.array(z.object({ sourceLineId: z.string(), quantities: z.array(z.string()) })),
})

export type TaskSplitPlanFormValues = z.infer<typeof taskSplitPlanFormObject>

export const INVALID_PLAN_QUANTITY_MESSAGE = 'Số lượng không hợp lệ'
export const EMPTY_PART_MESSAGE = 'Phần trống'

/**
 * Validates the grid against the lines' current unassigned quantity. Cross-cell issues sit on leaf paths
 * (`rows.n.sourceLineId`, `parts.n.staffId`) so they never overwrite a cell error on the same row or part.
 */
export function buildTaskSplitPlanSchema(lines: readonly TaskSplitLineView[]) {
  const unassigned = new Map(lines.map((line) => [line.sourceLineId, line.unassigned]))

  return taskSplitPlanFormObject.superRefine((values, context) => {
    const columnTotals = values.parts.map(() => 0)
    values.rows.forEach((row, rowIndex) => {
      const quantities = row.quantities.map(parsePlanQuantity)
      quantities.forEach((quantity, partIndex) => {
        if (quantity === null)
          context.addIssue({
            code: 'custom',
            path: ['rows', rowIndex, 'quantities', partIndex],
            message: INVALID_PLAN_QUANTITY_MESSAGE,
          })
        else columnTotals[partIndex] = (columnTotals[partIndex] ?? 0) + quantity
      })
      const overflow = roundQuantity(
        sumQuantities(quantities.map((quantity) => quantity ?? 0)) -
          (unassigned.get(row.sourceLineId) ?? 0)
      )
      if (overflow > 0)
        context.addIssue({
          code: 'custom',
          path: ['rows', rowIndex, 'sourceLineId'],
          message: `Vượt ${formatQuantity(overflow)}`,
        })
    })
    columnTotals.forEach((total, partIndex) => {
      if (roundQuantity(total) <= 0)
        context.addIssue({
          code: 'custom',
          path: ['parts', partIndex, 'staffId'],
          message: EMPTY_PART_MESSAGE,
        })
    })
  })
}
