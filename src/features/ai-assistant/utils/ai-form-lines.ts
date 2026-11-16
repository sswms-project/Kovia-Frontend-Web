import type { StockIssueProductOption } from '@/features/stock-issue/types/stock-issue.types'
import {
  isStockIssueQuantityWithinPrecision,
  stockIssueBaseQuantity,
} from '@/features/stock-issue/utils/stock-issue-format'
import type { AiDraftLine } from '../schemas/ai-draft-line.schema'
import type { AiFormLine, AiFormProductSnapshot } from '../schemas/ai-form-card.schema'
import type { AiFormSubmitLine } from '../types/ai-form.types'

export interface AiFormLineErrors {
  readonly product?: string
  readonly quantity?: string
  /** Only a server answer names the unit (the form always offers one of the product's own). */
  readonly unit?: string
}

export function createAiFormLine(sequence: number): AiFormLine {
  return { key: `line-${sequence}`, product: null, quantity: '', unitId: '' }
}

/** Highest number used in the keys of restored lines, so new keys never repeat. */
export function getAiFormLineSequence(lines: readonly AiFormLine[]): number {
  return lines.reduce((highest, line) => Math.max(highest, Number(line.key.slice(5)) || 0), 0)
}

export function toAiFormProduct(option: StockIssueProductOption): AiFormProductSnapshot {
  return {
    id: option.id,
    sku: option.sku,
    name: option.productName,
    baseUnitId: option.unitId,
    baseUnitName: option.unitName,
    availableQuantity: option.availableQuantity,
    units:
      option.units.length > 0
        ? option.units.map(({ unitId, unitName, conversionFactor, quantityPrecision }) => ({
            unitId,
            unitName,
            conversionFactor,
            quantityPrecision,
          }))
        : [
            {
              unitId: option.unitId,
              unitName: option.unitName,
              conversionFactor: 1,
              quantityPrecision: 0,
            },
          ],
  }
}

/**
 * A line of the editor DTO (or of a `collect_input` prefill) as a form row. The full product snapshot
 * (units, base unit, availability) comes with it, so the row needs no lookup, even when its product
 * has no stock left to be searched.
 */
export function toAiFormLine(line: AiDraftLine, index: number): AiFormLine {
  const units =
    line.units.length > 0
      ? line.units.map((unit) => ({
          unitId: unit.unitId,
          unitName: unit.name,
          conversionFactor: unit.factor,
          quantityPrecision: unit.quantityPrecision,
        }))
      : [
          {
            unitId: line.baseUnitId,
            unitName: line.baseUnitName,
            conversionFactor: 1,
            quantityPrecision: 0,
          },
        ]
  return {
    key: `line-${index + 1}`,
    product: {
      id: line.productId,
      sku: line.sku,
      name: line.productName,
      baseUnitId: line.baseUnitId,
      baseUnitName: line.baseUnitName,
      availableQuantity: line.availableBaseQuantity,
      units,
    },
    quantity: String(line.quantity),
    unitId: line.unitId,
  }
}

export function getAiFormLineUnit(line: AiFormLine) {
  const unitId = line.unitId || line.product?.baseUnitId
  return line.product?.units.find((unit) => unit.unitId === unitId)
}

export function parseAiFormQuantity(text: string): number {
  return text.trim() === '' ? Number.NaN : Number(text)
}

/** Quantity of the line in the product's base unit. */
export function getAiFormLineBaseQuantity(line: AiFormLine): number {
  return stockIssueBaseQuantity(
    parseAiFormQuantity(line.quantity),
    getAiFormLineUnit(line)?.conversionFactor ?? 1
  )
}

export function exceedsAiFormLineAvailable(line: AiFormLine): boolean {
  return (
    Boolean(line.product) &&
    getAiFormLineBaseQuantity(line) > (line.product?.availableQuantity ?? 0)
  )
}

export function validateAiFormLine(line: AiFormLine): AiFormLineErrors {
  if (!line.product) return { product: 'Chọn sản phẩm.' }
  const quantity = parseAiFormQuantity(line.quantity)
  if (Number.isNaN(quantity)) return { quantity: 'Nhập số lượng.' }
  if (quantity <= 0) return { quantity: 'Số lượng phải lớn hơn 0.' }
  const unit = getAiFormLineUnit(line)
  if (unit && !isStockIssueQuantityWithinPrecision(quantity, unit.quantityPrecision)) {
    return {
      quantity:
        unit.quantityPrecision === 0
          ? `Đơn vị ${unit.unitName} chỉ nhận số nguyên.`
          : `Đơn vị ${unit.unitName} chỉ nhận tối đa ${unit.quantityPrecision} chữ số thập phân.`,
    }
  }
  return {}
}

export function toAiFormSubmitLines(lines: readonly AiFormLine[]): AiFormSubmitLine[] {
  return lines.flatMap((line) =>
    line.product
      ? [
          {
            productId: line.product.id,
            quantity: parseAiFormQuantity(line.quantity),
            unitId: line.unitId || line.product.baseUnitId,
          },
        ]
      : []
  )
}
