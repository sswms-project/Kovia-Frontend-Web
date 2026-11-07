'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { APP_ROUTES } from '@/routes/app-routes'
import { legalDate } from '../components/LegalDocumentReader'
import { LegalRegistrationActivation } from '../components/LegalRegistrationActivation'
import { useLegalDirectory, useLegalMutation } from '../hooks/use-legal-documents'
import { legalDocumentsService as service } from '../services/legal-documents.service'
import { legalKindLabels, type LegalKind, type LegalStatus } from '../types/legal-documents.types'

const statusLabels = {
  Draft: 'Bản nháp',
  Current: 'Đang hiệu lực',
  Superseded: 'Đã thay thế',
} as const

export default function AdminLegalDocumentsPage() {
  const [kind, setKind] = useState<LegalKind>('Terms')
  const [status, setStatus] = useState<LegalStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const router = useRouter()
  const permissions = useMeQuery().data?.permissions ?? []
  const query = useLegalDirectory({
    kind,
    status: status === 'all' ? undefined : status,
    search,
    skip: (page - 1) * pageSize,
    top: pageSize,
  })
  const create = useLegalMutation(() => service.create(kind), 'Đã tạo bản nháp.')
  const directory = query.data

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Điều khoản và chính sách</h1>
        {permissions.includes(P.ADMIN_LEGAL_EDIT) &&
          directory &&
          (directory.draft ? (
            <Button asChild>
              <Link href={APP_ROUTES.admin.legalDocument(directory.draft.id)}>
                Tiếp tục bản nháp
              </Link>
            </Button>
          ) : (
            <Button
              disabled={create.isPending}
              onClick={() =>
                create.mutate(undefined, {
                  onSuccess: (id) => router.push(APP_ROUTES.admin.legalDocument(id)),
                  onError: () => void query.refetch(),
                })
              }
            >
              Tạo bản nháp
            </Button>
          ))}
      </div>
      {permissions.includes(P.ADMIN_LEGAL_PUBLISH) && <LegalRegistrationActivation />}
      <Tabs
        value={kind}
        onValueChange={(value) => {
          setKind(value === 'Privacy' ? 'Privacy' : 'Terms')
          setStatus('all')
          setPage(1)
        }}
      >
        <TabsList className="h-auto max-w-full flex-wrap">
          <TabsTrigger value="Terms">{legalKindLabels.Terms}</TabsTrigger>
          <TabsTrigger value="Privacy">{legalKindLabels.Privacy}</TabsTrigger>
        </TabsList>
      </Tabs>
      {directory && (
        <p className="text-muted-foreground text-sm">
          {directory.current ? (
            <Link
              className="text-primary underline"
              href={APP_ROUTES.admin.legalDocument(directory.current.id)}
            >
              Bản đang hiệu lực · Phiên bản {directory.current.version}
            </Link>
          ) : (
            'Chưa có bản công bố'
          )}
        </p>
      )}
      <OperationalListPanel aria-label="Danh sách phiên bản văn bản">
        <div className="flex flex-wrap gap-2 border-b p-3">
          <Input
            className="max-w-sm"
            aria-label="Tìm theo tiêu đề hoặc phiên bản"
            placeholder="Tìm theo tiêu đề, phiên bản…"
            maxLength={200}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
          <Select
            value={status}
            onValueChange={(value) => {
              if (
                value === 'Draft' ||
                value === 'Current' ||
                value === 'Superseded' ||
                value === 'all'
              )
                setStatus(value)
              setPage(1)
            }}
          >
            <SelectTrigger aria-label="Trạng thái">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="Draft">Bản nháp</SelectItem>
              <SelectItem value="Current">Đang hiệu lực</SelectItem>
              <SelectItem value="Superseded">Đã thay thế</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {query.isError ? (
          <OperationalErrorState
            title="Không tải được danh sách"
            onRetry={() => void query.refetch()}
          />
        ) : !directory ? (
          <OperationalLoadingState />
        ) : directory.versions.items.length === 0 ? (
          <OperationalEmptyState
            title="Không có phiên bản phù hợp"
            description="Đổi bộ lọc hoặc tạo bản nháp để bắt đầu."
          />
        ) : (
          <>
            <div className="md:hidden" data-slot="operational-list-body">
              {directory.versions.items.map((row) => (
                <article key={row.id} className="flex flex-col gap-2 border-b p-3">
                  <Link
                    className="text-primary font-medium underline-offset-4 hover:underline"
                    href={APP_ROUTES.admin.legalDocument(row.id)}
                  >
                    {row.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={row.status === 'Current' ? 'default' : 'outline'}>
                      {statusLabels[row.status]}
                    </Badge>
                    {row.version && <span className="text-sm">Phiên bản {row.version}</span>}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Cập nhật {legalDate(row.updatedAt)}
                  </p>
                </article>
              ))}
            </div>
            <div className="hidden min-h-0 flex-1 md:block" data-slot="operational-list-body">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tiêu đề / Phiên bản</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Hiệu lực từ</TableHead>
                    <TableHead>Cập nhật gần nhất</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {directory.versions.items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-normal">
                        <Link
                          className="text-primary font-medium hover:underline"
                          href={APP_ROUTES.admin.legalDocument(row.id)}
                        >
                          {row.title}
                        </Link>
                        {row.version && (
                          <p className="text-muted-foreground text-xs">Phiên bản {row.version}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.status === 'Current' ? 'default' : 'outline'}>
                          {statusLabels[row.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.publishedAt ? legalDate(row.publishedAt) : '—'}</TableCell>
                      <TableCell>
                        {legalDate(row.updatedAt)}
                        {row.updatedBy && (
                          <p className="text-muted-foreground text-xs">{row.updatedBy}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link
                          className="text-primary underline"
                          href={APP_ROUTES.admin.legalDocument(row.id)}
                        >
                          Mở
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
        <OperationalPagination
          page={page}
          pageSize={pageSize}
          totalCount={directory?.versions.totalCount ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      </OperationalListPanel>
    </div>
  )
}
