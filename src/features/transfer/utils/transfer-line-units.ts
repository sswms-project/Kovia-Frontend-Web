import type {
  ProductResponse,
  ProductUnitConversion,
  UnitResponse,
} from '@/features/product/types/product.types'
import type { TransferAvailability, TransferLineUnits } from '../types/transfer.types'

const DEFAULT_PRECISION = 3

/**
 * Đơn vị chọn được của một sản phẩm: đơn vị chính cộng các đơn vị quy đổi đang dùng.
 * Lấy từ danh mục sản phẩm nên hiện ngay khi chọn sản phẩm; tồn theo từng đơn vị chỉ có
 * khi đã chọn kho xuất (lấy từ API tồn khả dụng).
 */
export function buildTransferLineUnits(
  product: ProductResponse,
  conversions: readonly ProductUnitConversion[],
  units: readonly UnitResponse[],
  availability?: TransferAvailability
): TransferLineUnits {
  const availableByUnit = new Map(
    (availability?.units ?? []).map((unit) => [unit.unitId, unit.availableQuantity])
  )
  const baseUnit = units.find((unit) => unit.id === product.unitId)
  const baseOption: TransferLineUnits['units'][number] = {
    unitId: product.unitId,
    unitName: baseUnit?.unitName ?? product.unitName,
    conversionFactor: 1,
    quantityPrecision: baseUnit?.quantityPrecision ?? DEFAULT_PRECISION,
    isBase: true,
    availableQuantity: availableByUnit.get(product.unitId),
  }
  const options = [baseOption]
  for (const conversion of conversions) {
    if (conversion.status !== 'Active' || conversion.conversionFactor <= 0) continue
    if (conversion.unitId === product.unitId) continue
    options.push({
      unitId: conversion.unitId,
      unitName: conversion.unitName,
      conversionFactor: conversion.conversionFactor,
      quantityPrecision: conversion.quantityPrecision,
      isBase: false,
      availableQuantity: availableByUnit.get(conversion.unitId),
    })
  }
  return {
    productId: product.id,
    baseUnitId: product.unitId,
    baseUnitName: baseOption.unitName,
    units: options,
  }
}

/** Nhãn dễ hiểu: "Thùng (1 Thùng = 24 Chai)" hoặc "Chai (đơn vị chính)". */
export function transferUnitLabel(
  unit: TransferLineUnits['units'][number],
  baseUnitName: string,
  formatQuantity: (value: number) => string
) {
  return unit.isBase
    ? `${unit.unitName} (đơn vị chính)`
    : `${unit.unitName} (1 ${unit.unitName} = ${formatQuantity(unit.conversionFactor)} ${baseUnitName})`
}

/** Số lượng nhập vượt tồn khả dụng của kho xuất (chỉ biết khi đã chọn kho). */
export function exceedsAvailability(
  quantity: number,
  unitId: string,
  info: TransferLineUnits | undefined
) {
  if (!info || !Number.isFinite(quantity)) return false
  const unit = info.units.find((candidate) => candidate.unitId === (unitId || info.baseUnitId))
  return unit?.availableQuantity !== undefined && quantity > unit.availableQuantity
}
