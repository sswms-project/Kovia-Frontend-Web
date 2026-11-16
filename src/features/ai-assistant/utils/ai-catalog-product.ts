import type { ProductOption } from '@/features/inbound-request/types/inbound-request.types'
import type { ProductUnitConversion } from '@/features/product/types/product.types'
import type { AiFormProductSnapshot } from '../schemas/ai-form-card.schema'

/**
 * A product of the plain catalog search (inbound) as a form row product. The base unit comes first;
 * `conversions` are its other units. Availability is 0 and never shown: nothing leaves the warehouse.
 */
export function toAiCatalogProduct(
  option: ProductOption,
  basePrecision: number,
  conversions: readonly ProductUnitConversion[]
): AiFormProductSnapshot {
  return {
    id: option.id,
    sku: option.sku,
    name: option.productName,
    baseUnitId: option.unitId,
    baseUnitName: option.unitName,
    availableQuantity: 0,
    units: [
      {
        unitId: option.unitId,
        unitName: option.unitName,
        conversionFactor: 1,
        quantityPrecision: basePrecision,
      },
      ...conversions
        .filter(
          (conversion) => conversion.status === 'Active' && conversion.unitId !== option.unitId
        )
        .map((conversion) => ({
          unitId: conversion.unitId,
          unitName: conversion.unitName,
          conversionFactor: conversion.conversionFactor,
          quantityPrecision: conversion.quantityPrecision,
        })),
    ],
  }
}
