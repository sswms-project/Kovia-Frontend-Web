'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { P } from '@/config/permissionCodes'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { logger } from '@/lib/logger'
import { SupplierDetail, SupplierInboundHistory } from '../components/SupplierDetailPage'
import { useInboundRequestsQuery } from '@/features/inbound-request/hooks/use-inbound-requests'
import { OrderType } from '@/types/api'
import {
  SupplierDeactivateDialog,
  SupplierEditDialog,
  SupplierReactivateDialog,
} from '../components/SuppliersPage'
import {
  useDeactivateSupplierMutation,
  useReactivateSupplierMutation,
  useSupplierQuery,
  useUpdateSupplierMutation,
} from '../hooks/use-suppliers'
import type { SaveSupplierFormValues } from '../schemas/supplier.schema'
import { getApiErrorMessage } from '../utils/supplier-error'

interface SupplierDetailPageProps {
  readonly supplierId: string
}

export default function SupplierDetailPage({ supplierId }: SupplierDetailPageProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)
  const [isReactivateOpen, setIsReactivateOpen] = useState(false)
  const [reactivateError, setReactivateError] = useState<string | null>(null)

  const meQuery = useMeQuery()
  const permissions = meQuery.data?.permissions ?? []
  const detailQuery = useSupplierQuery(supplierId)
  const [historyPaging, setHistoryPaging] = useState({ supplierId, page: 1, pageSize: 10 })
  const historyPage = historyPaging.supplierId === supplierId ? historyPaging.page : 1
  if (historyPaging.supplierId !== supplierId)
    setHistoryPaging({ ...historyPaging, supplierId, page: 1 })
  const canViewHistory =
    permissions.includes(P.INBOUND_REQUESTS_VIEW) &&
    !meQuery.isError &&
    !detailQuery.isError &&
    detailQuery.data?.id === supplierId
  const historyQuery = useInboundRequestsQuery(
    {
      supplierId,
      pageNumber: historyPage,
      pageSize: historyPaging.pageSize,
      sortDirection: OrderType.Descending,
    },
    canViewHistory
  )
  const historyReady = canViewHistory && !historyQuery.isError && !historyQuery.isPlaceholderData
  const updateMutation = useUpdateSupplierMutation()
  const deactivateMutation = useDeactivateSupplierMutation()
  const reactivateMutation = useReactivateSupplierMutation()

  async function handleUpdate(values: SaveSupplierFormValues): Promise<boolean> {
    try {
      await updateMutation.mutateAsync({
        supplierId,
        request: {
          supplierCode: values.supplierCode,
          supplierName: values.supplierName,
          taxCode: values.taxCode || null,
          phone: values.phone,
          email: values.email || null,
          address: values.address || null,
          contactSalutation: values.contactSalutation || null,
          contactName: values.contactName || null,
          contactEmail: values.contactEmail || null,
          contactMobile: values.contactMobile || null,
          contactChannel: values.contactChannel || null,
          contactChannelName: values.contactChannelName || null,
        },
      })
      toast.success('Đã cập nhật nhà cung cấp.')
      setIsEditOpen(false)
      return true
    } catch (error) {
      logger.error(error)
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật nhà cung cấp. Vui lòng thử lại.'))
      return false
    }
  }

  async function handleDeactivate() {
    try {
      await deactivateMutation.mutateAsync(supplierId)
      toast.success('Đã ngừng hợp tác với nhà cung cấp.')
      setIsDeactivateOpen(false)
      setDeactivateError(null)
    } catch (error) {
      logger.error(error)
      setDeactivateError(getApiErrorMessage(error, 'Không thể ngừng hợp tác. Vui lòng thử lại.'))
    }
  }

  async function handleReactivate() {
    try {
      await reactivateMutation.mutateAsync(supplierId)
      toast.success('Đã khôi phục hợp tác với nhà cung cấp.')
      setIsReactivateOpen(false)
      setReactivateError(null)
    } catch (error) {
      logger.error(error)
      setReactivateError(
        getApiErrorMessage(error, 'Không thể khôi phục hợp tác. Vui lòng thử lại.')
      )
    }
  }

  if (detailQuery.isLoading) {
    return <OperationalLoadingState rows={8} />
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <OperationalErrorState
        title="Không thể tải thông tin nhà cung cấp"
        onRetry={() => void detailQuery.refetch()}
      />
    )
  }

  const supplier = detailQuery.data

  return (
    <>
      <SupplierDetail
        supplier={supplier}
        canUpdate={permissions.includes(P.SUPPLIERS_UPDATE)}
        canDeactivate={permissions.includes(P.SUPPLIERS_DEACTIVATE)}
        canReactivate={permissions.includes(P.SUPPLIERS_REACTIVATE)}
        onEdit={() => setIsEditOpen(true)}
        onDeactivate={() => {
          setDeactivateError(null)
          setIsDeactivateOpen(true)
        }}
        onReactivate={() => {
          setReactivateError(null)
          setIsReactivateOpen(true)
        }}
      >
        {canViewHistory ? (
          <SupplierInboundHistory
            items={historyReady ? (historyQuery.data?.items ?? []) : []}
            totalCount={historyReady ? (historyQuery.data?.totalCount ?? 0) : 0}
            page={historyPage}
            pageSize={historyPaging.pageSize}
            isLoading={historyQuery.isPending || historyQuery.isPlaceholderData}
            isFetching={historyQuery.isFetching}
            isError={historyQuery.isError}
            onRetry={() => {
              if (canViewHistory) void historyQuery.refetch()
            }}
            onPageChange={(page) => setHistoryPaging({ ...historyPaging, supplierId, page })}
            onPageSizeChange={(pageSize) => setHistoryPaging({ supplierId, page: 1, pageSize })}
          />
        ) : null}
      </SupplierDetail>

      <SupplierEditDialog
        open={isEditOpen}
        supplier={supplier}
        isPending={updateMutation.isPending}
        onOpenChange={setIsEditOpen}
        onSubmit={handleUpdate}
      />

      <SupplierDeactivateDialog
        supplierName={supplier.supplierName}
        open={isDeactivateOpen}
        isPending={deactivateMutation.isPending}
        errorMessage={deactivateError}
        onOpenChange={(open) => {
          setIsDeactivateOpen(open)
          if (!open) setDeactivateError(null)
        }}
        onConfirm={() => void handleDeactivate()}
      />

      <SupplierReactivateDialog
        supplierName={supplier.supplierName}
        open={isReactivateOpen}
        isPending={reactivateMutation.isPending}
        errorMessage={reactivateError}
        onOpenChange={(open) => {
          setIsReactivateOpen(open)
          if (!open) setReactivateError(null)
        }}
        onConfirm={() => void handleReactivate()}
      />
    </>
  )
}
