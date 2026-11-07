'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { APP_ROUTES } from '@/routes/app-routes'
import { useState } from 'react'
import { useLegalDetail } from '../hooks/use-legal-documents'
import type { LegalSummary } from '../types/legal-documents.types'
import { LegalDocumentContent } from './LegalDocumentContent'

export const legalDate = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))

export function LegalDocumentReader({
  document,
  triggerLabel,
}: {
  readonly document: LegalSummary
  readonly triggerLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const query = useLegalDetail(document.id, false, open)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="text-primary font-semibold underline underline-offset-2">
          {triggerLabel ?? document.title}
        </button>
      </DialogTrigger>
      <DialogContent className="flex h-dvh max-h-dvh max-w-full flex-col sm:h-auto sm:max-h-[85dvh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{document.title}</DialogTitle>
          <DialogDescription>
            Phiên bản {document.version}
            {document.publishedAt ? ` · Hiệu lực từ ${legalDate(document.publishedAt)}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-1">
          {query.isError ? (
            <OperationalErrorState
              title="Không tải được văn bản"
              onRetry={() => void query.refetch()}
            />
          ) : query.data ? (
            <LegalDocumentContent content={query.data.content} />
          ) : (
            <OperationalLoadingState rows={4} />
          )}
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <Link
            className="text-primary underline"
            href={APP_ROUTES.legalDocument(document.id)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Mở trang công khai
          </Link>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Quay lại
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
