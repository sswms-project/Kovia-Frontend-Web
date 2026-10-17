'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useStockRecipientsQuery } from '@/features/stock-recipient/hooks/use-stock-recipients'
import { useProductOptionsQuery } from '@/features/inbound-request/hooks/use-inbound-requests'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { DamageCaseDirectory } from '../components/DamageCasesPage'
import {
  useAddDamageCaseEvidenceMutation,
  useDamageCasesQuery,
  useDecideDamageCaseDispositionMutation,
  useUploadInventoryEvidenceMutation,
} from '../hooks/use-inventory'
import type { DamageCase, DamageCaseStatus, DamageDisposition } from '../types/inventory.types'

export default function DamageCasesPage() {
  const meQuery = useMeQuery()
  const [page, setPage] = useState(1)
  const [warehouseId, setWarehouseId] = useState('')
  const [productId, setProductId] = useState('')
  const [status, setStatus] = useState<DamageCaseStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const casesQuery = useDamageCasesQuery({
    pageNumber: page,
    pageSize: 20,
    ...(warehouseId ? { warehouseId } : {}),
    ...(productId ? { productId } : {}),
    ...(status ? { status } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo: `${dateTo}T23:59:59.999Z` } : {}),
  })
  const decisionMutation = useDecideDamageCaseDispositionMutation()
  const uploadMutation = useUploadInventoryEvidenceMutation()
  const evidenceMutation = useAddDamageCaseEvidenceMutation()
  const recipientsQuery = useStockRecipientsQuery({ pageNumber: 1, pageSize: 100 })
  const warehousesQuery = useWarehousesQuery({
    top: 100,
    skip: 0,
    needTotalCount: true,
    isActive: true,
  })
  const productsQuery = useProductOptionsQuery({ pageNumber: 1, pageSize: 100, status: 'Active' })
  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data?.items ?? []).map((item) => ({
        value: item.id,
        label: `${item.warehouseCode} · ${item.warehouseName}`,
      })),
    [warehousesQuery.data?.items]
  )
  const productOptions = useMemo(
    () =>
      (productsQuery.data?.items ?? []).map((item) => ({
        value: item.id,
        label: `${item.sku} · ${item.productName}`,
      })),
    [productsQuery.data?.items]
  )
  async function decide(
    item: DamageCase,
    disposition: DamageDisposition,
    quantity: number | undefined,
    note: string,
    stockRecipientId?: string
  ) {
    if (!item.version) {
      toast.error('Hồ sơ chưa có phiên bản. Vui lòng tải lại.')
      return
    }
    try {
      await decisionMutation.mutateAsync({
        damageCaseId: item.id,
        disposition,
        note: note.trim(),
        commandId: crypto.randomUUID(),
        expectedCaseVersion: item.version,
        ...(quantity ? { quantity } : {}),
        ...(stockRecipientId ? { stockRecipientId } : {}),
      })
      toast.success('Đã ghi nhận phương án xử lý hàng hỏng.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xử lý hồ sơ hàng hỏng.')
      throw error
    }
  }
  async function addEvidence(item: DamageCase, file: File, confirmedQuantity?: number) {
    if (!item.version) {
      toast.error('Hồ sơ chưa có phiên bản. Vui lòng tải lại.')
      return
    }
    try {
      const upload = await uploadMutation.mutateAsync({ warehouseId: item.warehouseId, file })
      await evidenceMutation.mutateAsync({
        damageCaseId: item.id,
        evidenceIds: [upload.data.id],
        expectedCaseVersion: item.version,
        ...(confirmedQuantity ? { confirmedQuantity } : {}),
        ...(confirmedQuantity && item.availableStockVersion
          ? { expectedStockVersion: item.availableStockVersion }
          : {}),
      })
      toast.success('Đã bổ sung bằng chứng và gửi lại hồ sơ để xem xét.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể bổ sung bằng chứng.')
      throw error
    }
  }
  return (
    <DamageCaseDirectory
      permissions={meQuery.data?.permissions ?? []}
      currentUserId={meQuery.data?.id ?? null}
      items={casesQuery.data?.items ?? []}
      page={casesQuery.data?.pageNumber ?? page}
      pageSize={casesQuery.data?.pageSize ?? 20}
      totalCount={casesQuery.data?.totalCount ?? 0}
      warehouseId={warehouseId}
      productId={productId}
      statusFilter={status}
      warehouseOptions={warehouseOptions}
      productOptions={productOptions}
      dateFrom={dateFrom}
      dateTo={dateTo}
      onDateFromChange={(value) => {
        setDateFrom(value)
        setPage(1)
      }}
      onDateToChange={(value) => {
        setDateTo(value)
        setPage(1)
      }}
      onPageChange={setPage}
      onWarehouseChange={(value) => {
        setWarehouseId(value)
        setPage(1)
      }}
      onProductChange={(value) => {
        setProductId(value)
        setPage(1)
      }}
      onStatusChange={(value) => {
        setStatus(value)
        setPage(1)
      }}
      isLoading={casesQuery.isLoading}
      isFetching={casesQuery.isFetching}
      isError={casesQuery.isError}
      isPending={
        decisionMutation.isPending || uploadMutation.isPending || evidenceMutation.isPending
      }
      recipientOptions={(recipientsQuery.data?.items ?? []).map((item) => ({
        value: item.id,
        label: `${item.recipientCode} · ${item.recipientName}`,
      }))}
      areRecipientsLoading={recipientsQuery.isLoading}
      canDecide={meQuery.data?.permissions.includes(P.STOCK_ADJUSTMENTS_APPROVE) ?? false}
      onRetry={() => void casesQuery.refetch()}
      onDecide={decide}
      onAddEvidence={addEvidence}
    />
  )
}
