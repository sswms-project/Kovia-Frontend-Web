'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ImportState } from './ImportState'
import { ReviewStep } from './ReviewStep'
import type { InboundDocumentImportDialogProps } from './types'
import { UploadStep } from './UploadStep'

export function InboundDocumentImportDialog({
  task,
  file,
  importData,
  draftReceiptId,
  form,
  isStarting,
  isLoadingImport,
  isSavingReview,
  isCreatingDraft,
  onFileChange,
  onAnalyze,
  onSaveReview,
  onCreateDraft,
  onManualFallback,
  onOpenChange,
}: InboundDocumentImportDialogProps) {
  const fileError = form.formState.errors.root?.message ?? null
  const hasStarted = isStarting || isLoadingImport || Boolean(importData)
  const canReview =
    !draftReceiptId &&
    importData?.review &&
    ['NeedsReview', 'ReadyForDraft'].includes(importData.status)

  return (
    <Dialog open={Boolean(task)} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[92dvh] flex-col overflow-hidden overscroll-contain sm:max-w-6xl',
          canReview && 'lg:max-w-[min(96vw,1600px)]'
        )}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Nhập hàng từ chứng từ</DialogTitle>
          <DialogDescription>
            {task
              ? `${task.inboundRequestCode} · ${task.supplierName} · ${task.warehouseName}`
              : 'Phân tích chứng từ nhà cung cấp.'}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto pr-1">
          {!hasStarted ? (
            <UploadStep
              file={file}
              fileError={fileError}
              isStarting={isStarting}
              onFileChange={onFileChange}
              onAnalyze={onAnalyze}
            />
          ) : canReview && task && importData ? (
            <ReviewStep
              task={task}
              importData={importData}
              form={form}
              isSavingReview={isSavingReview}
              isCreatingDraft={isCreatingDraft}
              onSaveReview={onSaveReview}
              onCreateDraft={onCreateDraft}
            />
          ) : (
            <ImportState
              importData={importData}
              draftReceiptId={draftReceiptId}
              isLoading={isStarting || isLoadingImport}
              onManualFallback={onManualFallback}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
