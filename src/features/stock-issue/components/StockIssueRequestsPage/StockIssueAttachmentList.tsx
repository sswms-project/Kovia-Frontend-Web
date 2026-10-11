'use client'

import { Download, Paperclip, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  useDeleteStockIssueAttachmentMutation,
  useUploadStockIssueAttachmentMutation,
} from '../../hooks/use-stock-issue-requests'
import { stockIssueService } from '../../services/stock-issue.service'
import type { StockIssueAttachment } from '../../types/stock-issue.types'

const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.txt'

interface StockIssueAttachmentListProps {
  readonly stockIssueRequestId: string
  readonly attachments: readonly StockIssueAttachment[]
  readonly canEdit: boolean
}

export function StockIssueAttachmentList({
  stockIssueRequestId,
  attachments,
  canEdit,
}: StockIssueAttachmentListProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadStockIssueAttachmentMutation(stockIssueRequestId)
  const remove = useDeleteStockIssueAttachmentMutation(stockIssueRequestId)

  async function onFileChange(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error('Tệp vượt quá 5 MB.')
      return
    }
    try {
      await upload.mutateAsync(file)
      toast.success('Đã đính kèm tệp.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể tải tệp lên.'))
    }
  }

  async function onDownload(attachment: StockIssueAttachment) {
    try {
      await stockIssueService.downloadAttachment(stockIssueRequestId, attachment)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể tải tệp.'))
    }
  }

  async function onDelete(attachment: StockIssueAttachment) {
    try {
      await remove.mutateAsync(attachment.id)
      toast.success('Đã xóa tệp đính kèm.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể xóa tệp.'))
    }
  }

  return (
    <div className="space-y-2">
      {attachments.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có tệp đính kèm.</p>
      ) : (
        <ul className="divide-y border text-sm">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center justify-between gap-2 px-2 py-1">
              <span className="truncate">
                {attachment.fileName}{' '}
                <span className="text-muted-foreground text-xs">
                  ({Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB)
                </span>
              </span>
              <span className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Tải ${attachment.fileName}`}
                  onClick={() => void onDownload(attachment)}
                >
                  <Download />
                </Button>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Xóa ${attachment.fileName}`}
                    disabled={remove.isPending}
                    onClick={() => void onDelete(attachment)}
                  >
                    <Trash2 />
                  </Button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      {canEdit && attachments.length < MAX_ATTACHMENTS ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip />
            {upload.isPending ? 'Đang tải lên…' : 'Đính kèm tệp'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            aria-label="Chọn tệp đính kèm"
            onChange={(event) => void onFileChange(event.target.files?.[0])}
          />
        </>
      ) : null}
    </div>
  )
}
