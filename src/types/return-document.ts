export type ReturnDocumentKind = 'goodsReturnRequests' | 'supplierReturns'
export type ReturnDocumentAction = 'Withdraw' | 'Submit' | 'DeleteDraft' | 'Cancel'
export interface ReturnDocumentEvent {
  action: string
  actorName: string | null
  createdAt: string
  reason: string | null
}
export interface ReturnDocumentVersion {
  id: string
  version?: string | null
  allowedActions?: readonly string[] | null
  history?: readonly ReturnDocumentEvent[] | null
}
