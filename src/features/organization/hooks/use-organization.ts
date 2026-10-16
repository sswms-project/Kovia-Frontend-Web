import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse, ApiResponse } from '@/types/api'
import type { UpdateOrganizationRequest } from '../schemas/organization.schema'
import { organizationService } from '../services/organization.service'
import type {
  OrganizationResponse,
  TaskAssignmentScoringResponse,
  UpdateTaskAssignmentScoringRequest,
} from '../types/organization.types'

export function useOrganizationQuery() {
  return useQuery<OrganizationResponse, ApiErrorResponse>({
    queryKey: queryKeys.organization.me,
    queryFn: () => organizationService.getOrganization().then((response) => response.data),
  })
}

export function useUpdateOrganizationMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    ApiResponse<OrganizationResponse>,
    ApiErrorResponse,
    UpdateOrganizationRequest
  >({
    mutationFn: organizationService.updateOrganization,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.organization.me })
    },
    onError: (error) => logger.error(error),
  })
}

export function useTaskAssignmentScoringQuery() {
  return useQuery<TaskAssignmentScoringResponse, ApiErrorResponse>({
    queryKey: queryKeys.organization.taskAssignmentScoring,
    queryFn: () => organizationService.getTaskAssignmentScoring().then((response) => response.data),
  })
}

export function useUpdateTaskAssignmentScoringMutation() {
  const queryClient = useQueryClient()

  return useMutation<ApiResponse<unknown>, ApiErrorResponse, UpdateTaskAssignmentScoringRequest>({
    mutationFn: organizationService.updateTaskAssignmentScoring,
    // Chờ tải lại để form nhận phiên bản mới trước khi cho lưu tiếp.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.organization.taskAssignmentScoring }),
    onError: (error) => logger.error(error),
  })
}

export function useResetTaskAssignmentScoringMutation() {
  const queryClient = useQueryClient()

  return useMutation<ApiResponse<unknown>, ApiErrorResponse, number>({
    mutationFn: organizationService.resetTaskAssignmentScoring,
    // Chờ tải lại để form nhận phiên bản mới trước khi cho lưu tiếp.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.organization.taskAssignmentScoring }),
    onError: (error) => logger.error(error),
  })
}
