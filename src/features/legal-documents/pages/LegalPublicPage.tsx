'use client'

import Link from 'next/link'
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
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:p-8">
      <Link className="text-primary underline" href={APP_ROUTES.legalDocuments}>
        Điều khoản và chính sách
      </Link>
      {query.isError ? (
        <OperationalErrorState
          title="Không tải được văn bản"
          onRetry={() => void query.refetch()}
        />
      ) : detail ? (
        <article className="bg-card mt-4 flex flex-col gap-4 border p-4 sm:p-6">
          <h1 className="text-xl font-semibold">{detail.document.title}</h1>
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
