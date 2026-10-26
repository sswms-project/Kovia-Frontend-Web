'use client'

import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { useArchivedDocumentQuery } from '../hooks/use-platform-services'
import { ARCHIVED_DOCUMENT_LABELS } from '../types/archived-document.types'
import { ArchivedDocumentDetail } from '../components/ArchivedDocumentPage'

export default function ArchivedDocumentPage({
  documentType,
  documentId,
}: {
  readonly documentType: string
  readonly documentId: string
}) {
  const me = useMeQuery()
  const knownType = Object.hasOwn(ARCHIVED_DOCUMENT_LABELS, documentType)
  const canView = (me.data?.permissions ?? []).includes(P.AUDIT_LOGS_VIEW)
  const query = useArchivedDocumentQuery(
    documentType,
    documentId,
    me.isSuccess && canView && knownType
  )
  if (me.isLoading || query.isLoading) return <OperationalLoadingState />
  if (!knownType || (me.isSuccess && !canView))
    return (
      <OperationalErrorState
        title="Loại phiếu không được hỗ trợ hoặc bạn chưa có quyền tra cứu"
        onRetry={() => {
          void me.refetch()
        }}
      />
    )
  if (me.isError || query.isError || !query.data)
    return (
      <OperationalErrorState
        title="Không thể tải phiếu đã xóa trong phạm vi được phép"
        onRetry={() => {
          void me.refetch()
          if (me.isSuccess && canView && knownType) void query.refetch()
        }}
      />
    )
  return <ArchivedDocumentDetail document={query.data} />
}
