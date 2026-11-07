'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { APP_ROUTES } from '@/routes/app-routes'
import { useAuthStore } from '@/stores/auth.store'
import { LegalDocumentReader, legalDate } from '../components/LegalDocumentReader'
import { useLegalMutation, useMyLegalTerms } from '../hooks/use-legal-documents'
import { legalDocumentsService as service } from '../services/legal-documents.service'

export default function MyLegalTermsPage() {
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  const [page, setPage] = useState(1)
  const [checkedVersion, setCheckedVersion] = useState<string | null>(null)
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null)
  const query = useMyLegalTerms(actorId, page, Boolean(actorId))
  const confirm = useLegalMutation(service.accept, 'Đã ghi nhận xác nhận điều khoản.')
  const current = query.data?.current
  const needsConfirmation = query.data?.needsConfirmation === true

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-3">
      <h1 className="text-xl font-semibold">Lịch sử xác nhận điều khoản</h1>
      <Link className="text-primary text-sm underline" href={APP_ROUTES.legalDocuments}>
        Điều khoản và chính sách Kovia
      </Link>
      {query.isError ? (
        <OperationalErrorState
          title="Không tải được lịch sử xác nhận"
          onRetry={() => void query.refetch()}
        />
      ) : !query.data ? (
        <OperationalLoadingState rows={3} />
      ) : (
        <>
          {current && (
            <section className="bg-card flex flex-col gap-3 border p-4">
              <h2 className="font-semibold">
                {needsConfirmation ? 'Điều khoản sử dụng có bản mới' : 'Điều khoản đang hiệu lực'}
              </h2>
              <LegalDocumentReader document={current} />
              <p className="text-muted-foreground text-sm">Phiên bản {current.version}</p>
              {needsConfirmation &&
                (dismissedVersion === current.id ? (
                  <Button
                    variant="outline"
                    className="self-start"
                    onClick={() => setDismissedVersion(null)}
                  >
                    Xem và xác nhận
                  </Button>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-line">{current.summary}</p>
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
                ))}
            </section>
          )}
          <section className="bg-card flex flex-col gap-3 border p-4">
            <h2 className="font-semibold">Các phiên bản đã xác nhận</h2>
            {query.data.history.items.length ? (
              <ul className="divide-y">
                {query.data.history.items.map((row, index) => (
                  <li key={index} className="py-2 text-sm">
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
              <p className="text-muted-foreground text-sm">Chưa có bản ghi xác nhận.</p>
            )}
            <OperationalPagination
              page={page}
              pageSize={10}
              totalCount={query.data.history.totalCount}
              onPageChange={setPage}
            />
          </section>
        </>
      )}
    </div>
  )
}
