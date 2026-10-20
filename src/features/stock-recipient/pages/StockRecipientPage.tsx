'use client'

import { ExcelExportButton } from '@/components/operations/ExcelExportButton'
import { useListExport } from '@/features/list-export/hooks/use-list-export'

import { useId, useState } from 'react'
import { useCodeSuggestion } from '@/hooks/use-code-suggestion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { StatusChangeDialog } from '@/components/operations/StatusChangeDialog'
import { P } from '@/config/permissionCodes'
import { getApiErrorMessage } from '@/lib/api-error'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import {
  StockRecipientDirectory,
  StockRecipientFormDialog,
} from '../components/StockRecipientsPage'
import {
  useCreateStockRecipientMutation,
  useChangeStockRecipientStatusMutation,
  useNextStockRecipientCodeQuery,
  useStockRecipientsQuery,
  useUpdateStockRecipientMutation,
} from '../hooks/use-stock-recipients'
import {
  emptyStockRecipientFormValues,
  stockRecipientSchema,
  toStockRecipientRequest,
  type StockRecipientFormValues,
} from '../schemas/stock-recipient.schema'
import type { StockRecipient } from '../types/stock-recipient.types'

export default function StockRecipientPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchText, setSearchText] = useState('')
  const [status, setStatus] = useState<'Active' | 'Inactive' | ''>('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const codeInstanceId = useId()
  const [codeSession, setCodeSession] = useState(0)
  const codeSessionKey = `${codeInstanceId}:${codeSession}`
  const [editingRecipient, setEditingRecipient] = useState<StockRecipient | null>(null)
  const [statusTarget, setStatusTarget] = useState<StockRecipient | null>(null)
  const debouncedSearchText = useDebouncedValue(searchText, 350)
  const meQuery = useMeQuery()
  const exportFilters = {
    pageNumber: page,
    pageSize,
    ...(debouncedSearchText.trim() ? { searchTerm: debouncedSearchText.trim() } : {}),
    ...(status ? { status } : {}),
  }
  const stockRecipientsQuery = useStockRecipientsQuery(exportFilters)
  const createMutation = useCreateStockRecipientMutation()
  const updateMutation = useUpdateStockRecipientMutation()
  const statusMutation = useChangeStockRecipientStatusMutation()
  const form = useForm<StockRecipientFormValues>({
    resolver: zodResolver(stockRecipientSchema),
    defaultValues: emptyStockRecipientFormValues,
  })
  const nextCodeQuery = useNextStockRecipientCodeQuery(isCreateOpen, codeSessionKey)
  const isFormOpen = isCreateOpen || Boolean(editingRecipient)

  const codeSuggestion = useCodeSuggestion({
    active: isCreateOpen,
    sessionKey: codeSessionKey,
    suggestedCode: nextCodeQuery.data?.data,
    isFetching: nextCodeQuery.isFetching,
    isError: nextCodeQuery.isError,
    getCurrentCode: () => form.getValues('recipientCode'),
    applyCode: (code) =>
      form.setValue('recipientCode', code, { shouldValidate: form.formState.isSubmitted }),
  })

  async function handleSave(values: StockRecipientFormValues, keepOpen = false) {
    const request = toStockRecipientRequest(values)
    try {
      if (editingRecipient) {
        await updateMutation.mutateAsync({ stockRecipientId: editingRecipient.id, request })
        toast.success('Đã cập nhật khách hàng.')
      } else {
        await createMutation.mutateAsync(request)
        toast.success('Đã thêm khách hàng.')
      }
      if (keepOpen && !editingRecipient) {
        form.reset(emptyStockRecipientFormValues)
        codeSuggestion.resetSession()
        setCodeSession((value) => value + 1)
        return
      }
      setIsCreateOpen(false)
      setEditingRecipient(null)
      form.reset()
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          editingRecipient ? 'Không thể cập nhật khách hàng.' : 'Không thể thêm khách hàng.'
        )
      )
    }
  }

  async function handleStatusChange() {
    if (!statusTarget) return
    const status = statusTarget.status === 'Active' ? 'Inactive' : 'Active'
    try {
      await statusMutation.mutateAsync({ stockRecipientId: statusTarget.id, status })
      toast.success(
        status === 'Active'
          ? 'Đã tiếp tục hợp tác với khách hàng.'
          : 'Đã ngừng hợp tác với khách hàng.'
      )
      setStatusTarget(null)
    } catch {
      toast.error('Không thể thay đổi trạng thái khách hàng. Vui lòng thử lại.')
    }
  }

  const listExport = useListExport({
    dataset: 'customers',
    filters: exportFilters,
    permissions: meQuery.data?.permissions ?? [],
    viewPermission: P.STOCK_RECIPIENTS_VIEW,
    totalCount: stockRecipientsQuery.data?.totalCount ?? 0,
    isFetching: stockRecipientsQuery.isFetching,
    isError: stockRecipientsQuery.isError,
    blocked: searchText !== debouncedSearchText,
  })
  return (
    <>
      <StockRecipientDirectory
        exportAction={
          listExport.canExport ? <ExcelExportButton {...listExport.buttonProps} /> : undefined
        }
        items={stockRecipientsQuery.data?.items ?? []}
        totalCount={stockRecipientsQuery.data?.totalCount ?? 0}
        page={page}
        pageSize={pageSize}
        searchText={searchText}
        status={status}
        canCreate={(meQuery.data?.permissions ?? []).includes(P.STOCK_RECIPIENTS_CREATE)}
        canUpdate={(meQuery.data?.permissions ?? []).includes(P.STOCK_RECIPIENTS_UPDATE)}
        canManageStatus={(meQuery.data?.permissions ?? []).includes(
          P.STOCK_RECIPIENTS_MANAGE_STATUS
        )}
        isLoading={stockRecipientsQuery.isLoading}
        isFetching={stockRecipientsQuery.isFetching}
        isError={stockRecipientsQuery.isError}
        onSearchChange={(value) => {
          setSearchText(value)
          setPage(1)
        }}
        onStatusChange={(value) => {
          setStatus(value)
          setPage(1)
        }}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value)
          setPage(1)
        }}
        onCreate={() => {
          setEditingRecipient(null)
          form.reset(emptyStockRecipientFormValues)
          codeSuggestion.resetSession()
          setCodeSession((value) => value + 1)
          setIsCreateOpen(true)
        }}
        onEdit={(stockRecipient) => {
          setIsCreateOpen(false)
          setEditingRecipient(stockRecipient)
          form.reset({
            recipientCode: stockRecipient.recipientCode,
            recipientName: stockRecipient.recipientName,
            recipientType: stockRecipient.recipientType,
            taxCode: stockRecipient.taxCode ?? '',
            phone: stockRecipient.phone,
            email: stockRecipient.email ?? '',
            address: stockRecipient.address,
            shippingAddress: stockRecipient.shippingAddress ?? '',
            contactSalutation: stockRecipient.contactSalutation ?? '',
            contactName: stockRecipient.contactName ?? '',
            contactMobile: stockRecipient.contactMobile ?? '',
            contactChannel: stockRecipient.contactChannel ?? '',
            contactChannelName: stockRecipient.contactChannelName ?? '',
          })
        }}
        onChangeStatus={setStatusTarget}
        onRetry={() => void stockRecipientsQuery.refetch()}
      />
      <StockRecipientFormDialog
        open={isFormOpen}
        title={editingRecipient ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng'}
        description={
          editingRecipient
            ? 'Cập nhật thông tin liên hệ của khách hàng.'
            : 'Thông tin khách hàng được dùng trong các yêu cầu xuất kho.'
        }
        form={form}
        isPending={createMutation.isPending || updateMutation.isPending}
        isCreate={isCreateOpen}
        codeSuggestionStatus={
          nextCodeQuery.isFetching ? 'loading' : nextCodeQuery.isError ? 'error' : 'ready'
        }
        onCodeChange={codeSuggestion.markEdited}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false)
            setEditingRecipient(null)
            form.reset()
          }
        }}
        onSubmit={(values) => void handleSave(values)}
        onSubmitAndAdd={(values) => void handleSave(values, true)}
      />
      <StatusChangeDialog
        open={Boolean(statusTarget)}
        subject={`khách hàng “${statusTarget?.recipientName ?? ''}”`}
        nextStatus={statusTarget?.status === 'Active' ? 'Inactive' : 'Active'}
        inactiveActionLabel="Ngừng hợp tác"
        activeActionLabel="Tiếp tục hợp tác"
        isPending={statusMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null)
        }}
        onConfirm={() => void handleStatusChange()}
      />
    </>
  )
}
