'use client'

import { FileSpreadsheet, LoaderCircle, Upload } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { BULK_IMPORT_FILE_EXTENSIONS, BULK_IMPORT_MAX_FILE_MB } from './bulk-import'

interface BulkImportFilePickerProps {
  readonly entityLabel: string
  readonly maxRows: number
  readonly pending: boolean
  readonly error: string | null
  readonly onFileChange: (file: File) => void
}

export function BulkImportFilePicker({
  entityLabel,
  maxRows,
  pending,
  error,
  onFileChange,
}: BulkImportFilePickerProps) {
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)
  const message = dropError ?? error
  return (
    <Card
      className={cn('min-w-0 border-dashed', dragging && !pending && 'border-primary bg-muted')}
      onDragEnter={(event) => {
        event.preventDefault()
        if (!event.dataTransfer.types.includes('Files') || pending) return
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = pending ? 'none' : 'copy'
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (!dragDepth.current) setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        dragDepth.current = 0
        setDragging(false)
        if (pending) return
        if (event.dataTransfer.files.length !== 1) {
          setDropError('Chỉ chọn một tệp mỗi lần nhập.')
          return
        }
        setDropError(null)
        onFileChange(event.dataTransfer.files[0]!)
      }}
    >
      <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 p-6 text-center">
        <FileSpreadsheet className="text-primary size-10" aria-hidden="true" />
        <h2 className="font-semibold">Chọn tệp {entityLabel}</h2>
        <p id={`${inputId}-help`} className="text-muted-foreground text-sm">
          Kéo tệp vào đây hoặc chọn từ máy. XLSX hoặc CSV, tối đa {maxRows} dòng và{' '}
          {BULK_IMPORT_MAX_FILE_MB} MB. Không hỗ trợ XLS.
        </p>
        <Button
          type="button"
          disabled={pending}
          aria-controls={inputId}
          aria-describedby={`${inputId}-help${message ? ` ${inputId}-error` : ''}`}
          onClick={() => input.current?.click()}
        >
          {pending ? (
            <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Upload aria-hidden="true" />
          )}
          {pending ? 'Đang tải và đọc tệp…' : 'Tải tệp lên'}
        </Button>
        <Input
          id={inputId}
          ref={input}
          tabIndex={-1}
          type="file"
          className="sr-only"
          aria-label={`Tệp ${entityLabel}`}
          aria-describedby={`${inputId}-help${message ? ` ${inputId}-error` : ''}`}
          aria-invalid={Boolean(message)}
          accept={BULK_IMPORT_FILE_EXTENSIONS.join(',')}
          disabled={pending}
          onChange={(event) => {
            if (pending) return
            const file = event.target.files?.[0]
            event.target.value = ''
            setDropError(null)
            if (file) onFileChange(file)
          }}
        />
        {message ? (
          <p id={`${inputId}-error`} role="alert" className="text-destructive text-sm">
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
