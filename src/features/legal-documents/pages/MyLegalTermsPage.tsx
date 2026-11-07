'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { USER_ROLES } from '@/config/roles'
import { APP_ROUTES } from '@/routes/app-routes'
import { useAuthStore } from '@/stores/auth.store'
import { LegalDocumentReader, legalDate } from '../components/LegalDocumentReader'
import {
  useLegalMutation,
  useLegalRegistration,
  useMyLegalTerms,
} from '../hooks/use-legal-documents'
import { legalDocumentsService as service } from '../services/legal-documents.service'
import { legalKindLabels } from '../types/legal-documents.types'

export default function MyLegalTermsPage({
  historyRequested,
}: {
  readonly historyRequested: boolean
}) {
  const user = useAuthStore((state) => state.user)
  const isOwner = user?.role === USER_ROLES.TenantOwner
  const showHistory = isOwner && historyRequested
  const [page, setPage] = useState(1)
  const [checkedVersion, setCheckedVersion] = useState<string | null>(null)
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null)
  const documents = useLegalRegistration()
  const published = documents.data
  const query = useMyLegalTerms(user?.id ?? '', showHistory ? page : 1, isOwner)
  const confirm = useLegalMutation(service.accept, 'Đã ghi nhận xác nhận điều khoản.')
  const current = query.data?.current
  const needsConfirmation = query.data?.needsConfirmation === true

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 pb-3">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b pb-4">
        <h1 className="text-xl font-semibold">Điều khoản và Chính sách</h1>
        {isOwner && (
          <Button asChild variant="outline">
            <Link href={showHistory ? APP_ROUTES.myLegalTerms : APP_ROUTES.myLegalTermsHistory}>
              {showHistory ? 'Xem văn bản' : 'Lịch sử xác nhận'}
            </Link>
          </Button>
        )}
      </header>
      {!showHistory && (
        <>
          {documents.isError ? (
            <OperationalErrorState
              title="Không tải được văn bản"
              onRetry={() => void documents.refetch()}
            />
          ) : !published ? (
            <OperationalLoadingState rows={2} />
          ) : (
            <div className="grid shrink-0 gap-3 sm:grid-cols-2">
              {(['Terms', 'Privacy'] as const).map((kind) => {
                const document = kind === 'Terms' ? published.terms : published.privacy
                return (
                  <section
                    key={kind}
                    className="bg-card flex min-w-0 flex-col items-start gap-2 rounded-xl border p-4"
                  >
                    <h2 className="font-semibold">{legalKindLabels[kind]}</h2>
                    {document ? (
                      <>
                        <p className="text-muted-foreground text-sm">
                          Phiên bản {document.version}
                          {document.publishedAt
                            ? ` · Hiệu lực từ ${legalDate(document.publishedAt)}`
                            : ''}
                        </p>
                        <LegalDocumentReader
                          document={document}
                          triggerLabel={`Đọc ${legalKindLabels[kind].toLowerCase()}`}
                        />
                      </>
                    ) : (
                      <p className="text-muted-foreground text-sm">Chưa có bản công bố.</p>
                    )}
                  </section>
                )
              })}
            </div>
          )}
          {isOwner && query.isError && (
            <OperationalErrorState
              title="Không tải được trạng thái xác nhận điều khoản"
              onRetry={() => void query.refetch()}
            />
          )}
          {isOwner && current && needsConfirmation && (
            <section className="bg-card flex min-w-0 shrink-0 flex-col gap-3 rounded-xl border p-4">
              <h2 className="font-semibold">Điều khoản sử dụng có bản mới</h2>
              <LegalDocumentReader document={current} />
              <p className="text-muted-foreground text-sm">Phiên bản {current.version}</p>
              {dismissedVersion === current.id ? (
                <Button
                  variant="outline"
                  className="self-start"
                  onClick={() => setDismissedVersion(null)}
                >
                  Xem và xác nhận
                </Button>
              ) : (
                <>
                  <p className="text-sm wrap-anywhere whitespace-pre-line">{current.summary}</p>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checkedVersion === current.id}
                      onCheckedChange={(checked) =>
                        setCheckedVersion(checked === true ? current.id : null)
                      }
                    />
                    Tôi đồng ý với Điều khoản sử dụng phiên bản {current.version}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={checkedVersion !== current.id || confirm.isPending}
                      onClick={() =>
                        confirm.mutate(current.id, {
                          onSettled: () => {
                            setCheckedVersion(null)
                            void query.refetch()
                          },
                        })
                      }
                    >
                      Xác nhận điều khoản
                    </Button>
                    <Button
                      variant="outline"
                      disabled={confirm.isPending}
                      onClick={() => {
                        setCheckedVersion(null)
                        setDismissedVersion(current.id)
                      }}
                    >
                      Để sau
                    </Button>
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
      {showHistory &&
        (query.isError ? (
          <OperationalErrorState
            title="Không tải được lịch sử xác nhận"
            onRetry={() => void query.refetch()}
          />
        ) : !query.data ? (
          <OperationalLoadingState rows={3} />
        ) : (
          <OperationalListPanel aria-labelledby="legal-acceptance-history-title">
            <h2
              id="legal-acceptance-history-title"
              className="shrink-0 border-b px-4 py-3 font-semibold"
            >
              Các phiên bản đã xác nhận
            </h2>
            <div data-slot="operational-list-body" className="flex flex-col">
              {query.data.history.items.length ? (
                <ul className="divide-y">
                  {query.data.history.items.map((row, index) => (
                    <li key={index} className="px-4 py-3 text-sm wrap-anywhere">
                      <Link
                        className="text-primary font-medium underline"
                        href={APP_ROUTES.legalDocument(row.documentId)}
                      >
                        Phiên bản {row.version}
                      </Link>
                      <p className="text-muted-foreground">
                        {row.actorName} · {legalDate(row.acceptedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <OperationalEmptyState
                  title="Chưa có bản ghi xác nhận"
                  description="Các phiên bản đã xác nhận sẽ xuất hiện tại đây."
                />
              )}
            </div>
            <OperationalPagination
              page={page}
              pageSize={10}
              totalCount={query.data.history.totalCount}
              onPageChange={setPage}
            />
          </OperationalListPanel>
        ))}
    </div>
  )
}
