import { z } from 'zod'

export const stockAlertKindSchema = z.enum([
  'below-minimum',
  'above-maximum',
  'expiring',
  'expired',
])
export type StockAlertKind = z.infer<typeof stockAlertKindSchema>

const stockAlertRowSchema = z.object({
  warehouseId: z.guid(),
  warehouseName: z.string(),
  productId: z.guid(),
  sku: z.string(),
  productName: z.string(),
  unit: z.string(),
})
const stockAlertPageSchema = z.object({
  generatedAt: z.iso.datetime({ offset: true }),
  appliedWarehouseIds: z.array(z.guid()),
  totalCount: z.number().int().nonnegative(),
  pageNumber: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(50),
})
export const stockThresholdAlertsSchema = stockAlertPageSchema.extend({
  kind: z.enum(['below-minimum', 'above-maximum']),
  configuredPolicyCount: z.number().int().nonnegative(),
  items: z.array(
    stockAlertRowSchema.extend({
      availableQuantity: z.number(),
      thresholdQuantity: z.number(),
      difference: z.number(),
    })
  ),
})
export const stockExpiryAlertsSchema = stockAlertPageSchema.extend({
  kind: z.enum(['expiring', 'expired']),
  evaluationDate: z.iso.date(),
  timeBasis: z.literal('UTC'),
  expiringDays: z.number().int().min(1).max(365).nullable(),
  items: z.array(
    stockAlertRowSchema.extend({
      lotId: z.guid(),
      lotNumber: z.string(),
      expiryDate: z.iso.date(),
      onHandQuantity: z.number(),
      daysToExpiry: z.number().int(),
    })
  ),
})
export type StockThresholdAlerts = z.infer<typeof stockThresholdAlertsSchema>
export type StockAlerts =
  | z.infer<typeof stockThresholdAlertsSchema>
  | z.infer<typeof stockExpiryAlertsSchema>
export type StockAlertRow = StockAlerts['items'][number]

export const stockExpiryDistributionSchema = z.object({
  generatedAt: z.iso.datetime({ offset: true }),
  appliedWarehouseIds: z.array(z.guid()),
  evaluationDate: z.iso.date(),
  timeBasis: z.literal('UTC'),
  expiringDays: z.number().int().min(1).max(365),
  days: z.array(
    z.object({
      daysToExpiry: z.number().int().nonnegative(),
      lotCount: z.number().int().positive(),
    })
  ),
  totalCount: z.number().int().nonnegative(),
})
export type StockExpiryDistribution = z.infer<typeof stockExpiryDistributionSchema>

export const expiryDaysSchema = z.object({
  days: z
    .number({ error: 'Nhập số ngày hợp lệ.' })
    .int('Số ngày phải là số nguyên.')
    .min(1, 'Số ngày phải từ 1 đến 365.')
    .max(365, 'Số ngày phải từ 1 đến 365.'),
})
export type ExpiryDaysValues = z.infer<typeof expiryDaysSchema>

export interface StockAlertParams {
  readonly kind: StockAlertKind
  readonly warehouseId?: string
  readonly expiringDays?: number
  readonly pageNumber: number
  readonly pageSize: number
  readonly search?: string
}
