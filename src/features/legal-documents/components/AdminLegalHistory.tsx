'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { useLegalAcceptances, useLegalAudit } from '../hooks/use-legal-documents'
import { legalDate } from './LegalDocumentReader'

const auditLabels: Readonly<Record<string, string>> = {
  CreateLegalDraft: 'Tạo bản nháp',
  UpdateLegalDraft: 'Cập nhật bản nháp',
  DeleteLegalDraft: 'Xóa bản nháp',
  PublishLegalDocument: 'Công bố',
}

export function AdminLegalHistory({
  id,
  canReadAcceptances,
}: {
  readonly id: string
  readonly canReadAcceptances: boolean
}) {
  const [auditPage, setAuditPage] = useState(1)
  const [acceptancePage, setAcceptancePage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 250)
  const audit = useLegalAudit(id, auditPage, true)
  const acceptances = useLegalAcceptances(id, acceptancePage, debouncedSearch, canReadAcceptances)
  return (
    <>
      <section className="bg-card flex flex-col gap-3 border p-4">
        <h2 className="font-semibold">Nhật ký phiên bản</h2>
        {audit.isError ? (
          <OperationalErrorState
            title="Không tải được nhật ký"
            onRetry={() => void audit.refetch()}
          />
        ) : !audit.data ? (
          <OperationalLoadingState rows={2} />
        ) : audit.data.items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Chưa có thao tác.</p>
        ) : (
          <ul className="divide-y">
            {audit.data.items.map((item, index) => (
              <li key={index} className="py-2 text-sm">
                <strong>{auditLabels[item.action] ?? item.action}</strong> · {item.actorName ?? '—'}{' '}
                · {legalDate(item.at)}
                {item.reason && (
                  <p className="text-muted-foreground whitespace-pre-line">{item.reason}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        <OperationalPagination
          page={auditPage}
          pageSize={10}
          totalCount={audit.data?.totalCount ?? 0}
          onPageChange={setAuditPage}
        />
      </section>
      {canReadAcceptances && (
        <section className="bg-card flex flex-col gap-3 border p-4">
          <h2 className="font-semibold">Xác nhận của doanh nghiệp</h2>
          <Input
            className="max-w-sm"
            aria-label="Tìm doanh nghiệp hoặc người xác nhận"
            placeholder="Tìm doanh nghiệp hoặc người xác nhận…"
            maxLength={200}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setAcceptancePage(1)
            }}
          />
          {acceptances.isError ? (
            <OperationalErrorState
              title="Không tải được danh sách xác nhận"
              onRetry={() => void acceptances.refetch()}
            />
          ) : !acceptances.data ? (
            <OperationalLoadingState rows={2} />
          ) : acceptances.data.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">Chưa có doanh nghiệp xác nhận bản này.</p>
          ) : (
            <ul className="divide-y">
              {acceptances.data.items.map((item, index) => (
                <li key={index} className="py-2 text-sm">
                  <strong>{item.tenantName}</strong> · {item.actorName} ·{' '}
                  {legalDate(item.acceptedAt)}
                </li>
              ))}
            </ul>
          )}
          <OperationalPagination
            page={acceptancePage}
            pageSize={10}
            totalCount={acceptances.data?.totalCount ?? 0}
            onPageChange={setAcceptancePage}
          />
        </section>
      )}
    </>
  )
}
