export type LegalKind = 'Terms' | 'Privacy'
export type LegalStatus = 'Draft' | 'Current' | 'Superseded'

export interface LegalSummary {
  id: string
  kind: LegalKind
  status: LegalStatus
  version: number | null
  revision: string
  title: string
  summary: string
  publishedAt: string | null
  updatedAt: string
  updatedBy: string | null
}

export interface LegalDetail {
  document: LegalSummary
  content: string
}

export interface LegalPage<T> {
  items: T[]
  totalCount: number
}

export interface LegalDirectory {
  versions: LegalPage<LegalSummary>
  current: LegalSummary | null
  draft: LegalSummary | null
}

export interface LegalRegistration {
  requireVersion: boolean
  terms: LegalSummary | null
  privacy: LegalSummary | null
}

export interface LegalAcceptance {
  documentId: string
  version: number
  tenantName: string
  actorName: string
  acceptedAt: string
}

export interface LegalAudit {
  action: string
  actorName: string | null
  at: string
  reason: string | null
}

export interface MyLegalTerms {
  current: LegalSummary | null
  needsConfirmation: boolean
  history: LegalPage<LegalAcceptance>
}

export const legalKindLabels = {
  Terms: 'Điều khoản sử dụng',
  Privacy: 'Chính sách bảo vệ dữ liệu cá nhân',
} as const
