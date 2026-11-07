import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query-keys'
import { logger } from '@/lib/logger'
import {
  legalDocumentsService as service,
  type LegalListParams,
} from '../services/legal-documents.service'

const key = queryKeys.legalDocuments

export function useLegalRegistration() {
  return useQuery({
    queryKey: [...key, 'registration'],
    queryFn: ({ signal }) => service.registration(signal),
  })
}

export function useLegalDetail(id: string, admin: boolean, enabled = true) {
  return useQuery({
    queryKey: [...key, 'detail', admin, id],
    enabled,
    refetchOnWindowFocus: !admin,
    refetchOnReconnect: !admin,
    queryFn: ({ signal }) => service.detail(id, admin, signal),
  })
}

export function useLegalDirectory(params: LegalListParams) {
  return useQuery({
    queryKey: [...key, 'directory', params],
    queryFn: ({ signal }) => service.list(params, signal),
  })
}

export function useMyLegalTerms(actorId: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: [...key, 'my', actorId, page],
    enabled,
    queryFn: ({ signal }) => service.myTerms((page - 1) * 10, signal),
  })
}

export function useLegalAudit(id: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: [...key, 'audit', id, page],
    enabled,
    queryFn: ({ signal }) => service.audit(id, (page - 1) * 10, signal),
  })
}

export function useLegalAcceptances(id: string, page: number, search: string, enabled: boolean) {
  return useQuery({
    queryKey: [...key, 'acceptances', id, page, search],
    enabled,
    queryFn: ({ signal }) => service.acceptances(id, (page - 1) * 10, search, signal),
  })
}

export function useLegalMutation<TVariables, TResult>(
  action: (variables: TVariables) => Promise<TResult>,
  success: string
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      toast.success(success)
      void client.invalidateQueries({ queryKey: key })
    },
    onError: (error) => {
      logger.error(error)
      toast.error(error.message || 'Không thể thực hiện thao tác. Vui lòng thử lại.')
    },
  })
}
