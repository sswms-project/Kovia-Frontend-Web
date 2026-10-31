import type { UseFormReturn } from 'react-hook-form'
import type { InboundDocumentReviewFormValues } from '../../../schemas/inbound-document-import.schema'
import type { InboundDocumentImport, ReceivingTask } from '../../../types/inbound.types'

export interface InboundDocumentImportDialogProps {
  readonly task: ReceivingTask | null
  readonly file: File | null
  readonly importData: InboundDocumentImport | null
  readonly draftReceiptId: string | null
  readonly form: UseFormReturn<InboundDocumentReviewFormValues>
  readonly isStarting: boolean
  readonly isLoadingImport: boolean
  readonly isSavingReview: boolean
  readonly isCreatingDraft: boolean
  readonly onFileChange: (file: File | null) => void
  readonly onAnalyze: () => void
  readonly onSaveReview: () => void
  readonly onCreateDraft: () => void
  readonly onManualFallback: () => void
  readonly onCancelImport: () => void
  readonly onOpenChange: (open: boolean) => void
}
