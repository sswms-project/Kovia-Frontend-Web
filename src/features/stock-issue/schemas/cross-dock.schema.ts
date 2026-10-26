import { z } from 'zod'
import { dotNetGuidSchema } from '@/lib/dotnet-guid.schema'

const id = dotNetGuidSchema('Mã dữ liệu không hợp lệ.')
export const crossDockAuthorizationSchema = z.object({
  assignedStaffId: id,
  hours: z.enum(['4', '8', '24']),
  selfApprovalAcknowledged: z.boolean(),
})
export type CrossDockAuthorizationValues = z.infer<typeof crossDockAuthorizationSchema>
export const authorizeCrossDockCommandSchema = z.object({
  expectedVersion: z.string().min(1).max(100),
  commandId: id,
  assignedStaffId: id,
  validUntil: z.iso.datetime({ offset: true }),
  selfApprovalAcknowledged: z.boolean(),
})
export type AuthorizeCrossDockCommand = z.infer<typeof authorizeCrossDockCommandSchema>
export const crossDockPlanSchema = z.object({
  stockIssueRequestId: id,
  documentVersion: z.string().nullable(),
  canAllocateWholeRequest: z.boolean(),
  decision: z.string(),
  automationEnabled: z.boolean(),
  allocations: z.array(
    z.object({
      itemId: id,
      productId: id,
      inventoryStockId: id,
      slotId: id,
      lotId: id.nullable(),
      lotNumber: z.string().nullable(),
      expiryDate: z.string().nullable(),
      quantity: z.number().finite().positive(),
      directFromReceiving: z.boolean(),
      reason: z.string(),
      sku: z.string(),
      productName: z.string(),
      sourcePath: z.string().transform((path) =>
        path
          .split('/')
          .map((part) => part.trim())
          .filter((part) => part.toUpperCase() !== '__SYSTEM_DEFAULT__')
          .join(' / ')
      ),
    })
  ),
})
export const crossDockDemandSchema = z.object({
  id,
  stockIssueRequestId: id,
  assignedStaffId: id,
  authorizedBy: id,
  authorizedAt: z.string(),
  validUntil: z.string(),
  completedAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  lastAttemptAt: z.string().nullable(),
  decision: z.string(),
  version: z.string().nullable(),
})
export const crossDockPickersSchema = z.array(z.object({ id, fullName: z.string() }))
export const crossDockSummarySchema = z.object({
  warehouseId: id,
  from: z.string(),
  to: z.string(),
  measurementBasis: z.string(),
  products: z.array(
    z.object({
      productId: id,
      sku: z.string(),
      productName: z.string(),
      baseUnitName: z.string(),
      allocatedDirectQuantity: z.number().finite().nonnegative(),
      confirmedDirectPickedQuantity: z.number().finite().nonnegative(),
      confirmedDirectDispatchedQuantity: z.number().finite().nonnegative(),
    })
  ),
})
export const pickingDestinationSchema = z.object({
  stockIssueRequestId: id,
  warehouseId: id,
  version: z.string().nullable(),
  inventoryStockId: id,
  slotId: id,
  slotCode: z.string().min(1),
  path: z.string(),
})
