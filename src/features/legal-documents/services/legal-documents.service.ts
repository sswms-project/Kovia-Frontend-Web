import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type { LegalDraftValues } from '../schemas/legal-draft.schema'
import type {
  LegalAcceptance,
  LegalAudit,
  LegalDetail,
  LegalDirectory,
  LegalKind,
  LegalPage,
  LegalRegistration,
  LegalStatus,
  MyLegalTerms,
} from '../types/legal-documents.types'

const routes = API_ENDPOINTS.legalDocuments

export interface LegalListParams {
  kind: LegalKind
  status?: LegalStatus
  search: string
  skip: number
  top: number
}

export const legalDocumentsService = {
  activateRegistration: (input: { termsVersionId: string; privacyVersionId: string }) =>
    axiosClient.post(routes.activateRegistration, input),
  registration: (signal: AbortSignal) =>
    axiosClient
      .get<ApiResponse<LegalRegistration>>(routes.public, { signal })
      .then((r) => r.data.data),
  detail: (id: string, admin: boolean, signal: AbortSignal) =>
    axiosClient
      .get<ApiResponse<LegalDetail>>(routes.detail(id, admin), { signal })
      .then((r) => r.data.data),
  list: (params: LegalListParams, signal: AbortSignal) =>
    axiosClient
      .get<ApiResponse<LegalDirectory>>(routes.admin, { params, signal })
      .then((r) => r.data.data),
  create: (kind: LegalKind, sourceId?: string) =>
    axiosClient
      .post<ApiResponse<string>>(routes.drafts, { kind, sourceId })
      .then((r) => r.data.data),
  update: (kind: LegalKind, id: string, revision: string, values: LegalDraftValues) =>
    axiosClient.put(routes.drafts, { ...values, kind, id, revision }),
  delete: (kind: LegalKind, id: string, revision: string) =>
    axiosClient.delete(routes.draft(id), { params: { kind, revision } }),
  publish: (
    kind: LegalKind,
    id: string,
    revision: string,
    currentId: string | null,
    requiresConfirmation: boolean
  ) => axiosClient.post(routes.publish, { kind, id, revision, currentId, requiresConfirmation }),
  myTerms: (skip: number, signal: AbortSignal) =>
    axiosClient
      .get<ApiResponse<MyLegalTerms>>(routes.myTerms, { params: { skip, top: 10 }, signal })
      .then((r) => r.data.data),
  accept: (versionId: string) => axiosClient.post(routes.myTerms, { versionId }),
  acceptances: (id: string, skip: number, search: string, signal: AbortSignal) =>
    axiosClient
      .get<
        ApiResponse<LegalPage<LegalAcceptance>>
      >(routes.acceptances(id), { params: { skip, top: 10, search }, signal })
      .then((r) => r.data.data),
  audit: (id: string, skip: number, signal: AbortSignal) =>
    axiosClient
      .get<
        ApiResponse<LegalPage<LegalAudit>>
      >(routes.audit(id), { params: { skip, top: 10 }, signal })
      .then((r) => r.data.data),
}
