// Float sums drift (3.33 + 3.33 + 3.34 ≠ 10); unit precision stays far below 6 decimals.
const QUANTITY_SCALE = 1e6

export const roundQuantity = (value: number) => Math.round(value * QUANTITY_SCALE) / QUANTITY_SCALE

export const sumQuantities = (values: readonly number[]) =>
  roundQuantity(values.reduce((total, value) => total + value, 0))

/** Empty input means 0; anything that is not a non-negative number is `null` (invalid). */
export function parseQuantity(text: string): number | null {
  if (text.trim() === '') return 0
  const value = Number(text)
  return Number.isFinite(value) && value >= 0 ? value : null
}

export const formatQuantity = (value: number) =>
  value.toLocaleString('vi-VN', { maximumFractionDigits: 4 })

export const formatScore = (value: number) =>
  value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })
