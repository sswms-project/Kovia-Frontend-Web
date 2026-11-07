'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { APP_ROUTES } from '@/routes/app-routes'
import { AdminLegalDraftEditor } from '../components/AdminLegalDraftEditor'
import { AdminLegalHistory } from '../components/AdminLegalHistory'
import { LegalDocumentContent } from '../components/LegalDocumentContent'
import { legalDate } from '../components/LegalDocumentReader'
import { useLegalDetail, useLegalDirectory, useLegalMutation } from '../hooks/use-legal-documents'
import { legalDocumentsService as service } from '../services/legal-documents.service'
import { legalKindLabels, type LegalDetail } from '../types/legal-documents.types'

function AdminDocumentView({
  detail,
  reload,
}: {
  readonly detail: LegalDetail
  readonly reload: () => Promise<LegalDetail | undefined>
}) {
  const { document } = detail
  const router = useRouter()
  const permissions = useMeQuery().data?.permissions ?? []
  const directory = useLegalDirectory({ kind: document.kind, search: '', skip: 0, top: 1 })
  const create = useLegalMutation(
    () => service.create(document.kind, document.id),
    'Đã tạo bản nháp.'
  )
  const canEdit = permissions.includes(P.ADMIN_LEGAL_EDIT)
  return (
    <div className="flex w-full min-w-0 flex-col gap-5 pb-3">
      <header className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="outline" size="icon">
            <Link
              href={APP_ROUTES.admin.legalDocumentsForKind(document.kind)}
              aria-label="Quay lại danh sách"
            >
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold wrap-anywhere">{document.title}</h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              {legalKindLabels[document.kind]} ·{' '}
              {document.version ? `Phiên bản ${document.version}` : 'Bản nháp'}
              {document.publishedAt ? ` · Hiệu lực từ ${legalDate(document.publishedAt)}` : ''}
            </p>
          </div>
        </div>
        {document.version && (
          <div className="flex flex-wrap gap-2 lg:shrink-0">
            <Button asChild variant="outline">
              <Link href={APP_ROUTES.legalDocument(document.id)}>Mở bản công khai</Link>
            </Button>
            {canEdit &&
              directory.data &&
              (directory.data.draft ? (
                <Button asChild>
                  <Link href={APP_ROUTES.admin.legalDocument(directory.data.draft.id)}>
                    Tiếp tục bản nháp
                  </Link>
                </Button>
              ) : (
                <Button
                  disabled={create.isPending}
                  onClick={() =>
                    create.mutate(undefined, {
                      onSuccess: (id) => router.push(APP_ROUTES.admin.legalDocument(id)),
                      onError: () => void directory.refetch(),
                    })
                  }
                >
                  Tạo bản mới từ phiên bản này
                </Button>
              ))}
          </div>
        )}
      </header>
      {document.status === 'Draft' ? (
        <AdminLegalDraftEditor
          detail={detail}
          canEdit={canEdit}
          canPublish={permissions.includes(P.ADMIN_LEGAL_PUBLISH)}
          reload={reload}
          loadCurrent={async () =>
            (await directory.refetch({ throwOnError: true })).data?.current ?? null
          }
        />
      ) : (
        <article className="bg-card border p-4">
          <LegalDocumentContent content={detail.content} />
        </article>
      )}
      <AdminLegalHistory
        id={document.id}
        canReadAcceptances={
          Boolean(document.version) &&
          document.kind === 'Terms' &&
          permissions.includes(P.ADMIN_LEGAL_ACCEPTANCES)
        }
      />
    </div>
  )
}

export default function AdminLegalDocumentPage({ id }: { readonly id: string }) {
  const query = useLegalDetail(id, true)
  if (!query.data)
    return query.isError ? (
      <OperationalErrorState title="Không tải được văn bản" onRetry={() => void query.refetch()} />
    ) : (
      <OperationalLoadingState />
    )
  return (
    <AdminDocumentView
      key={id}
      detail={query.data}
      reload={async () => {
        const result = await query.refetch()
        return result.isSuccess ? result.data : undefined
      }}
    />
  )
}
