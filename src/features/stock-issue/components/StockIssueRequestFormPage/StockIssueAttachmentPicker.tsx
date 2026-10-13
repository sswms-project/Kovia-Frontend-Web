'use client'

import { Paperclip, X } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'

export const STOCK_ISSUE_MAX_ATTACHMENTS = 5
export const STOCK_ISSUE_MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
export const STOCK_ISSUE_ATTACHMENT_EXTENSIONS = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'txt',
]

interface StockIssueAttachmentPickerProps {
  readonly files: readonly File[]
  readonly isPending: boolean
  readonly onAdd: (files: FileList) => void
  readonly onRemove: (index: number) => void
}

/** Tệp chờ tải lên cùng phiếu mới; phiếu đã lưu quản lý tệp ở trang chi tiết. */
export function StockIssueAttachmentPicker({
  files,
  isPending,
  onAdd,
  onRemove,
}: StockIssueAttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending || files.length >= STOCK_ISSUE_MAX_ATTACHMENTS}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip aria-hidden="true" />
          Đính kèm tệp
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={STOCK_ISSUE_ATTACHMENT_EXTENSIONS.map((extension) => `.${extension}`).join(',')}
        className="sr-only"
        aria-label="Chọn tệp đính kèm"
        onChange={(event) => {
          if (event.target.files) onAdd(event.target.files)
          event.target.value = ''
        }}
      />
      <p className="text-muted-foreground text-xs">
        Tối đa {STOCK_ISSUE_MAX_ATTACHMENTS} tệp, mỗi tệp không quá 5 MB (PDF, ảnh, Word, Excel,
        CSV, TXT).
      </p>
      {files.length > 0 ? (
        <ul className="divide-y border text-sm">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-2 px-2 py-1"
            >
              <span className="min-w-0 truncate">
                {file.name}{' '}
                <span className="text-muted-foreground text-xs tabular-nums">
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Bỏ tệp ${file.name}`}
                disabled={isPending}
                onClick={() => onRemove(index)}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
