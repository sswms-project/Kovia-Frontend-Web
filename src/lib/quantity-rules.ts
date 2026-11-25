import { z } from 'zod'
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'

// Cột số lượng ở BE là decimal(18,2): tối đa 2 chữ số thập phân cho tới khi chốt độ chính xác theo đơn vị.
export const QUANTITY_MAX_DECIMALS = 2
// ponytail: 9999999999999999.99 (giới hạn decimal(18,2)) làm tròn thành 1e16 trong double, nên chặn `< 1e16`.
export const QUANTITY_LIMIT = 1e16

const PLAIN_DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/

export type QuantityRule = {
  /** `quantityPrecision` của đơn vị; thiếu thì dùng mức trần 2. */
  precision?: number | null
  unitName?: string | null
  /** Số lượng đếm/ngưỡng được phép bằng 0. */
  allowZero?: boolean
}

export function quantityDecimals(precision?: number | null): number {
  if (
    precision === null ||
    precision === undefined ||
    !Number.isInteger(precision) ||
    precision < 0
  ) {
    return QUANTITY_MAX_DECIMALS
  }
  return Math.min(precision, QUANTITY_MAX_DECIMALS)
}

/** Bước nhảy cho `<input type="number">` khớp số chữ số thập phân cho phép. */
export function quantityStep(precision?: number | null): number {
  return 10 ** -quantityDecimals(precision)
}

function countDecimals(value: number): number {
  for (let places = 0; places <= 20; places++) {
    if (Number(value.toFixed(places)) === value) return places
  }
  return 21
}

/** Trả về thông báo lỗi tiếng Việt, hoặc `null` khi hợp lệ. Không làm tròn hay biến đổi giá trị. */
export function quantityIssue(value: unknown, rule: QuantityRule = {}): string | null {
  let quantity: number
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return 'Vui lòng nhập số lượng.'
    if (!PLAIN_DECIMAL_PATTERN.test(trimmed)) return 'Số lượng không hợp lệ.'
    quantity = Number(trimmed)
  } else if (typeof value === 'number' && !Number.isNaN(value)) {
    // Ô trống với `valueAsNumber` cho ra NaN.
    quantity = value
  } else {
    return 'Vui lòng nhập số lượng.'
  }
  if (!Number.isFinite(quantity)) return 'Số lượng không hợp lệ.'
  if (rule.allowZero ? quantity < 0 : quantity <= 0) {
    return rule.allowZero ? 'Số lượng không được âm.' : 'Số lượng phải lớn hơn 0.'
  }
  if (quantity >= QUANTITY_LIMIT) return 'Số lượng quá lớn.'
  const decimals = quantityDecimals(rule.precision)
  if (countDecimals(quantity) > decimals) {
    if (decimals === 0) {
      return rule.unitName
        ? `Đơn vị ${rule.unitName} chỉ nhận số nguyên.`
        : 'Số lượng phải là số nguyên.'
    }
    return `Tối đa ${decimals} chữ số thập phân.`
  }
  return null
}

/**
 * Đọc dấu phẩy theo cách viết của người Việt: dấu `.`/`,` cuối cùng là dấu thập phân, các dấu trước đó
 * là phân nhóm. Kết quả dùng dấu chấm. Ví dụ "1,5" → "1.5", "1.234,5" → "1234.5", "," → ".".
 */
export function commaDecimalToDot(text: string): string {
  const last = Math.max(text.lastIndexOf('.'), text.lastIndexOf(','))
  if (last < 0) return text
  return `${text.slice(0, last).replace(/[.,\s]/g, '')}.${text.slice(last + 1)}`
}

/** Số đã kiểm tra, hoặc `null` khi không hợp lệ (dùng cho ô nhập dạng chuỗi tính lại mỗi phím). */
export function parseQuantity(value: string, rule: QuantityRule = {}): number | null {
  return quantityIssue(value, rule) === null ? Number(value.trim()) : null
}

/** Thêm lỗi số lượng vào `path` trong `superRefine` khi đơn vị chỉ biết ở mức object/dòng. */
export function refineQuantity(
  context: z.RefinementCtx,
  value: unknown,
  rule: QuantityRule,
  path: PropertyKey[]
): void {
  const message = quantityIssue(value, rule)
  if (message) context.addIssue({ code: 'custom', path, message })
}

/** Trường số lượng với đơn vị cố định (hoặc trần 2 chữ số khi chưa biết đơn vị). */
export function quantitySchema(rule: QuantityRule = {}) {
  return z
    .number({ error: 'Vui lòng nhập số lượng.' })
    .superRefine((value, context) => refineQuantity(context, value, rule, []))
}

/**
 * Sau khi đổi sản phẩm/đơn vị, chạy lại kiểm tra ô số lượng đã nhập (schema đọc ĐVT hiện tại).
 * Ô chưa nhập thì bỏ qua để không báo lỗi sớm.
 */
export function revalidateEnteredQuantity<T extends FieldValues>(
  form: Pick<UseFormReturn<T>, 'getValues' | 'trigger'>,
  name: Path<T>
): void {
  const value: unknown = form.getValues(name)
  if (typeof value === 'number' ? !Number.isNaN(value) : value !== undefined && value !== '') {
    void form.trigger(name)
  }
}
