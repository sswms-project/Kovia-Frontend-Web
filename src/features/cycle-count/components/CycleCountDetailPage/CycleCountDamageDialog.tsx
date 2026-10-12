'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useDamageEvidenceUpload,
  type DamageEvidenceFile,
} from '../../hooks/use-damage-evidence-upload'
import { CycleCountDamageFields } from './CycleCountDamageFields'
import type { CycleCountDamageDraft, CycleCountEvidenceActions } from './types'

interface CycleCountDamageDialogProps {
  readonly open: boolean
  readonly productName: string
  readonly draft: CycleCountDamageDraft
  readonly savedEvidence: readonly DamageEvidenceFile[]
  readonly evidenceActions: CycleCountEvidenceActions
  readonly onChange: (draft: CycleCountDamageDraft) => void
  readonly onOpenChange: (open: boolean) => void
}

export function CycleCountDamageDialog({
  open,
  productName,
  draft,
  savedEvidence,
  evidenceActions,
  onChange,
  onOpenChange,
}: CycleCountDamageDialogProps) {
  const { isUploading, error, upload } = useDamageEvidenceUpload(evidenceActions.onUpload)

  async function addFile(file: File) {
    const uploaded = await upload(file, savedEvidence.length + draft.evidence.length)
    if (uploaded) onChange({ ...draft, evidence: [...draft.evidence, uploaded] })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hàng hỏng: {productName}</DialogTitle>
          <DialogDescription>
            Chụp ảnh và ghi lý do để quản lý xác nhận hàng hỏng khi hoàn tất kiểm kê.
          </DialogDescription>
        </DialogHeader>
        <CycleCountDamageFields
          reason={draft.reason}
          savedEvidence={savedEvidence}
          addedEvidence={draft.evidence}
          isUploading={isUploading}
          error={error}
          disabled={false}
          onReasonChange={(reason) => onChange({ ...draft, reason })}
          onAddFile={(file) => void addFile(file)}
          onRemoveAdded={(id) =>
            onChange({ ...draft, evidence: draft.evidence.filter((file) => file.id !== id) })
          }
          onDownload={evidenceActions.onDownload}
        />
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Xong
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
