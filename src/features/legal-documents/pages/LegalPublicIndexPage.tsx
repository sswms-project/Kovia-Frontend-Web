'use client'

import Link from 'next/link'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { APP_ROUTES } from '@/routes/app-routes'
import { legalDate } from '../components/LegalDocumentReader'
import { useLegalRegistration } from '../hooks/use-legal-documents'

export default function LegalPublicIndexPage() {
  const query = useLegalRegistration()
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:p-8">
      <h1 className="mb-4 text-xl font-semibold">Điều khoản và chính sách Kovia</h1>
      {query.isError ? (
        <OperationalErrorState
          title="Không tải được văn bản"
          onRetry={() => void query.refetch()}
        />
      ) : query.data ? (
        <div className="bg-card flex flex-col gap-4 border p-4 sm:p-6">
          {[query.data.terms, query.data.privacy].map((doc, index) =>
            doc ? (
              <div key={doc.id}>
                <Link className="text-primary underline" href={APP_ROUTES.legalDocument(doc.id)}>
                  {doc.title}
                </Link>
                <p className="text-muted-foreground text-sm">
                  Phiên bản {doc.version}
                  {doc.publishedAt ? ` · ${legalDate(doc.publishedAt)}` : ''}
                </p>
              </div>
            ) : (
              <p key={index} className="text-muted-foreground text-sm">
                {index === 0 ? 'Điều khoản sử dụng' : 'Chính sách bảo vệ dữ liệu cá nhân'} chưa được
                công bố.
              </p>
            )
          )}
        </div>
      ) : (
        <OperationalLoadingState rows={2} />
      )}
    </main>
  )
}
