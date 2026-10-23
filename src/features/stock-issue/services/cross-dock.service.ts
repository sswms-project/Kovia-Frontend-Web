import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import {
  crossDockDemandSchema,
  crossDockPickersSchema,
  crossDockPlanSchema,
  crossDockSummarySchema,
  pickingDestinationSchema,
  type AuthorizeCrossDockCommand,
} from '../schemas/cross-dock.schema'

const path = API_ENDPOINTS.stockIssueRequests.detail
export const crossDockService = {
  plan: (id: string, signal?: AbortSignal) =>
    axiosClient
      .get<ApiResponse<unknown>>(`${path(id)}/allocation-plan`, { signal })
      .then((response) => crossDockPlanSchema.parse(response.data.data)),
  demand: (id: string, signal?: AbortSignal) =>
    axiosClient
      .get<ApiResponse<unknown>>(`${path(id)}/cross-dock`, { signal })
      .then((response) => crossDockDemandSchema.nullable().parse(response.data.data ?? null)),
  pickers: (id: string, signal?: AbortSignal) =>
    axiosClient
      .get<ApiResponse<unknown>>(`${path(id)}/cross-dock/pickers`, { signal })
      .then((response) => crossDockPickersSchema.parse(response.data.data)),
  summary: (warehouseId: string, from: string, to: string, signal?: AbortSignal) =>
    axiosClient
      .get<
        ApiResponse<unknown>
      >(`/warehouses/${warehouseId}/cross-dock-summary`, { params: { from, to }, signal })
      .then((response) => crossDockSummarySchema.parse(response.data.data)),
  authorize: (id: string, command: AuthorizeCrossDockCommand) =>
    axiosClient
      .post<ApiResponse<string>>(`${path(id)}/cross-dock`, command)
      .then((response) => response.data),
  revoke: (id: string, demandId: string, expectedVersion: string) =>
    axiosClient
      .post<ApiResponse<unknown>>(`${path(id)}/cross-dock/${demandId}/revoke`, { expectedVersion })
      .then((response) => response.data),
  destination: (id: string, inventoryStockId: string) =>
    axiosClient
      .get<
        ApiResponse<unknown>
      >(`${path(id)}/picking-destination`, { params: { inventoryStockId } })
      .then((response) => pickingDestinationSchema.parse(response.data.data)),
}
