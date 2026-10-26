'use client'

import { ExcelExportButton } from '@/components/operations/ExcelExportButton'
import { useListExport } from '@/features/list-export/hooks/use-list-export'

import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCodeSuggestion } from '@/hooks/use-code-suggestion'
import { toast } from 'sonner'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { logger } from '@/lib/logger'
import {
  SupplierCreateDialog,
  SupplierDeactivateDialog,
  SupplierDirectory,
  SupplierEditDialog,
  SupplierReactivateDialog,
} from '../components/SuppliersPage'
import {
  useCreateSupplierMutation,
  useDeactivateSupplierMutation,
  useNextSupplierCodeQuery,
  useReactivateSupplierMutation,
  useSuppliersQuery,
  useUpdateSupplierMutation,
} from '../hooks/use-suppliers'
import {
  emptySupplierFormValues,
  saveSupplierSchema,
  type SaveSupplierFormValues,
} from '../schemas/supplier.schema'
import type { SaveSupplierRequest, Supplier, SupplierStatus } from '../types/supplier.types'
import { getApiErrorMessage } from '../utils/supplier-error'

function toSaveRequest(values: SaveSupplierFormValues): SaveSupplierRequest {
  return {
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
  }
}

export default function SuppliersPage() {
  const [searchText, setSearchText] = useState('')
  const [status, setStatus] = useState<SupplierStatus | ''>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const codeInstanceId = useId()
  const [codeSession, setCodeSession] = useState(0)
  const codeSessionKey = `${codeInstanceId}:${codeSession}`
  const createForm = useForm<SaveSupplierFormValues>({
    resolver: zodResolver(saveSupplierSchema),
    defaultValues: emptySupplierFormValues,
  })
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null)
  const [supplierToDeactivate, setSupplierToDeactivate] = useState<Supplier | null>(null)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)
  const [supplierToReactivate, setSupplierToReactivate] = useState<Supplier | null>(null)
  const [reactivateError, setReactivateError] = useState<string | null>(null)

  const debouncedSearchText = useDebouncedValue(searchText, 350)
  const meQuery = useMeQuery()
  const permissions = meQuery.data?.permissions ?? []

  const exportFilters = {
    pageNumber: page,
    pageSize,
    ...(debouncedSearchText ? { searchTerm: debouncedSearchText } : {}),
    ...(status ? { status } : {}),
  }
  const query = useSuppliersQuery(exportFilters)
  const nextCodeQuery = useNextSupplierCodeQuery(isCreateOpen, codeSessionKey)
  const codeSuggestion = useCodeSuggestion({
    active: isCreateOpen,
    sessionKey: codeSessionKey,
    suggestedCode: nextCodeQuery.data?.data,
    isFetching: nextCodeQuery.isFetching,
    isError: nextCodeQuery.isError,
    getCurrentCode: () => createForm.getValues('supplierCode'),
    applyCode: (code) =>
      createForm.setValue('supplierCode', code, {
        shouldValidate: createForm.formState.isSubmitted,
      }),
  })

  const createMutation = useCreateSupplierMutation()
  const updateMutation = useUpdateSupplierMutation()
  const deactivateMutation = useDeactivateSupplierMutation()
  const reactivateMutation = useReactivateSupplierMutation()

  async function handleCreate(values: SaveSupplierFormValues): Promise<boolean> {
    try {
      await createMutation.mutateAsync(toSaveRequest(values))
      toast.success('Đã thêm nhà cung cấp mới.')
      setIsCreateOpen(false)
      createForm.reset(emptySupplierFormValues)
      return true
    } catch (error) {
      logger.error(error)
      toast.error(getApiErrorMessage(error, 'Không thể thêm nhà cung cấp. Vui lòng thử lại.'))
      return false
    }
  }

  async function handleUpdate(values: SaveSupplierFormValues): Promise<boolean> {
    if (!supplierToEdit) return false

    try {
      await updateMutation.mutateAsync({
        supplierId: supplierToEdit.id,
        request: toSaveRequest(values),
      })
      toast.success('Đã cập nhật nhà cung cấp.')
      setSupplierToEdit(null)
      return true
    } catch (error) {
      logger.error(error)
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật nhà cung cấp. Vui lòng thử lại.'))
      return false
    }
  }

  async function handleDeactivate() {
    if (!supplierToDeactivate) return

    try {
      await deactivateMutation.mutateAsync(supplierToDeactivate.id)
      toast.success(`Đã ngừng hợp tác với ${supplierToDeactivate.supplierName}.`)
      setSupplierToDeactivate(null)
      setDeactivateError(null)
    } catch (error) {
      logger.error(error)
      setDeactivateError(getApiErrorMessage(error, 'Không thể ngừng hợp tác. Vui lòng thử lại.'))
    }
  }

  async function handleReactivate() {
    if (!supplierToReactivate) return

    try {
      await reactivateMutation.mutateAsync(supplierToReactivate.id)
      toast.success(`Đã khôi phục hợp tác với ${supplierToReactivate.supplierName}.`)
      setSupplierToReactivate(null)
      setReactivateError(null)
    } catch (error) {
      logger.error(error)
      setReactivateError(
        getApiErrorMessage(error, 'Không thể khôi phục hợp tác. Vui lòng thử lại.')
      )
    }
  }

  const listExport = useListExport({
    dataset: 'suppliers',
    filters: exportFilters,
    permissions: meQuery.data?.permissions ?? [],
    viewPermission: P.SUPPLIERS_VIEW,
    totalCount: query.data?.totalCount ?? 0,
    isFetching: query.isFetching,
    isError: query.isError,
    blocked: searchText !== debouncedSearchText,
  })
  return (
    <>
      <SupplierDirectory
        exportAction={
          listExport.canExport ? <ExcelExportButton {...listExport.buttonProps} /> : undefined
        }
        items={query.data?.items ?? []}
        totalCount={query.data?.totalCount ?? 0}
        page={page}
        pageSize={pageSize}
        searchText={searchText}
        status={status}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        isError={query.isError}
        canCreate={permissions.includes(P.SUPPLIERS_CREATE)}
        canUpdate={permissions.includes(P.SUPPLIERS_UPDATE)}
        canDeactivate={permissions.includes(P.SUPPLIERS_DEACTIVATE)}
        canReactivate={permissions.includes(P.SUPPLIERS_REACTIVATE)}
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
          createForm.reset(emptySupplierFormValues)
          codeSuggestion.resetSession()
          setCodeSession((value) => value + 1)
          setIsCreateOpen(true)
        }}
        onEdit={setSupplierToEdit}
        onDeactivate={(supplier) => {
          setDeactivateError(null)
          setSupplierToDeactivate(supplier)
        }}
        onReactivate={(supplier) => {
          setReactivateError(null)
          setSupplierToReactivate(supplier)
        }}
        onRetry={() => void query.refetch()}
      />

      <SupplierCreateDialog
        open={isCreateOpen}
        isPending={createMutation.isPending}
        form={createForm}
        codeSuggestionStatus={
          nextCodeQuery.isFetching ? 'loading' : nextCodeQuery.isError ? 'error' : 'ready'
        }
        onCodeChange={codeSuggestion.markEdited}
        onOpenChange={(open) => {
          if (createMutation.isPending) return
          setIsCreateOpen(open)
          if (!open) createForm.reset(emptySupplierFormValues)
        }}
        onSubmit={handleCreate}
      />

      <SupplierEditDialog
        open={supplierToEdit !== null}
        supplier={supplierToEdit}
        isPending={updateMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setSupplierToEdit(null)
        }}
        onSubmit={handleUpdate}
      />

      <SupplierDeactivateDialog
        supplierName={supplierToDeactivate?.supplierName ?? ''}
        open={supplierToDeactivate !== null}
        isPending={deactivateMutation.isPending}
        errorMessage={deactivateError}
        onOpenChange={(open) => {
          if (!open) {
            setSupplierToDeactivate(null)
            setDeactivateError(null)
          }
        }}
        onConfirm={() => void handleDeactivate()}
      />

      <SupplierReactivateDialog
        supplierName={supplierToReactivate?.supplierName ?? ''}
        open={supplierToReactivate !== null}
        isPending={reactivateMutation.isPending}
        errorMessage={reactivateError}
        onOpenChange={(open) => {
          if (!open) {
            setSupplierToReactivate(null)
            setReactivateError(null)
          }
        }}
        onConfirm={() => void handleReactivate()}
      />
    </>
  )
}
