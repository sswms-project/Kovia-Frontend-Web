import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type { UpdateOrganizationRequest } from '../schemas/organization.schema'
import type {
  OrganizationResponse,
  TaskAssignmentScoringResponse,
  UpdateTaskAssignmentScoringRequest,
} from '../types/organization.types'

export const organizationService = {
  getOrganization: () =>
    axiosClient
      .get<ApiResponse<OrganizationResponse>>(API_ENDPOINTS.organization.me)
      .then((response) => response.data),

  updateOrganization: (body: UpdateOrganizationRequest) =>
    axiosClient
      .put<ApiResponse<OrganizationResponse>>(API_ENDPOINTS.organization.me, body)
      .then((response) => response.data),

  getTaskAssignmentScoring: () =>
    axiosClient
      .get<
        ApiResponse<TaskAssignmentScoringResponse>
      >(API_ENDPOINTS.organization.taskAssignmentScoring)
      .then((response) => response.data),

  updateTaskAssignmentScoring: (body: UpdateTaskAssignmentScoringRequest) =>
    axiosClient
      .put<ApiResponse<unknown>>(API_ENDPOINTS.organization.taskAssignmentScoring, body)
      .then((response) => response.data),

  resetTaskAssignmentScoring: (version: number) =>
    axiosClient
      .delete<ApiResponse<unknown>>(API_ENDPOINTS.organization.taskAssignmentScoring, {
        params: { version },
      })
      .then((response) => response.data),
}
