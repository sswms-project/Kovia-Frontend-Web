'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { APP_ROUTES } from '@/routes/app-routes'
import { LegalDocumentContent } from '../components/LegalDocumentContent'
import { legalDate } from '../components/LegalDocumentReader'
import { useLegalDetail } from '../hooks/use-legal-documents'

export default function LegalPublicPage({ id }: { readonly id: string }) {
  const query = useLegalDetail(id, false)
  const detail = query.data
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6 sm:p-8">
      <Button asChild variant="outline" className="self-start">
        <Link href={APP_ROUTES.legalDocuments}>
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Điều khoản và chính sách
        </Link>
      </Button>
      {query.isError ? (
        <OperationalErrorState
          title="Không tải được văn bản"
          onRetry={() => void query.refetch()}
        />
      ) : detail ? (
        <article className="bg-card flex min-w-0 flex-col gap-4 rounded-xl border p-4 sm:p-6">
          <h1 className="text-xl font-semibold wrap-anywhere">{detail.document.title}</h1>
          <p className="text-muted-foreground text-sm">
            Phiên bản {detail.document.version}
            {detail.document.publishedAt
              ? ` · Hiệu lực từ ${legalDate(detail.document.publishedAt)}`
              : ''}
          </p>
          {detail.document.status === 'Superseded' && (
            <p className="text-muted-foreground text-sm">Phiên bản này đã được thay thế.</p>
          )}
          <LegalDocumentContent content={detail.content} />
        </article>
      ) : (
        <OperationalLoadingState rows={4} />
      )}
    </main>
  )
}
