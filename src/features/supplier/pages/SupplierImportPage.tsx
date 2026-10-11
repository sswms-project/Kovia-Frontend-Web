'use client'

import { toast } from 'sonner'
import { BulkImportPendingBody } from '@/components/operations/BulkImportWorkspace'
import {
  BulkImportPage,
  type BulkImportColumn,
  type BulkImportCommitOutcome,
  type BulkImportInspectOutcome,
  type BulkImportPreviewOutcome,
} from '@/components/operations/BulkImportPage'
import type { SpreadsheetImportOptions } from '@/components/operations/spreadsheet-import.types'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { logger } from '@/lib/logger'
import { isApiErrorResponse } from '@/lib/api-error'
import { APP_ROUTES } from '@/routes/app-routes'
import {
  useImportSuppliersMutation,
  usePreviewSupplierImportMutation,
  useInspectSupplierImportMutation,
  useSupplierImportTemplateMutation,
} from '../hooks/use-suppliers'
import type { SupplierImportPreviewRow } from '../types/supplier.types'
import { getApiErrorMessage } from '../utils/supplier-error'
import { SUPPLIER_IMPORT_MAX_ROWS, toImportItem } from '../utils/supplier-import'

const previewColumns: readonly BulkImportColumn<SupplierImportPreviewRow>[] = [
  {
    key: 'supplierCode',
    header: 'Mã NCC',
    headClassName: 'w-32',
    cellClassName: 'max-w-48 min-w-32 font-mono wrap-anywhere whitespace-normal',
    render: (row) => row.supplierCode ?? 'Tự cấp',
  },
  {
    key: 'supplierName',
    header: 'Tên nhà cung cấp',
    cellClassName: 'max-w-64 min-w-48 wrap-anywhere whitespace-normal',
    render: (row) => row.supplierName,
  },
  {
    key: 'phone',
    header: 'Điện thoại',
    headClassName: 'w-32',
    cellClassName: 'max-w-40 min-w-32 wrap-anywhere whitespace-normal tabular-nums',
    render: (row) => row.phone ?? '—',
  },
  ...(
    [
      ['email', 'Email NCC'],
      ['taxCode', 'Mã số thuế'],
      ['address', 'Địa chỉ'],
      ['contactSalutation', 'Xưng hô'],
      ['contactName', 'Người liên hệ'],
      ['contactEmail', 'Email người liên hệ'],
      ['contactMobile', 'Điện thoại người liên hệ'],
      ['contactChannel', 'Kênh liên hệ'],
      ['contactChannelName', 'Tên kênh liên hệ'],
    ] as const
  ).map(([key, header]) => ({
    key,
    header,
    isSupplementary: key !== 'email',
    cellClassName: 'max-w-64 min-w-40 wrap-anywhere whitespace-normal',
    render: (row: SupplierImportPreviewRow) => row[key] || '—',
  })),
]

function getRowLabel(row: SupplierImportPreviewRow) {
  return row.supplierCode ? `${row.supplierCode} · ${row.supplierName}` : row.supplierName
}

function getRowSearchText(row: SupplierImportPreviewRow) {
  return [
    row.supplierCode,
    row.supplierName,
    row.taxCode,
    row.phone,
    row.email,
    row.address,
    row.contactSalutation,
    row.contactName,
    row.contactEmail,
    row.contactMobile,
    row.contactChannel,
    row.contactChannelName,
    ...row.errors,
  ]
    .filter(Boolean)
    .join(' ')
}

export default function SupplierImportPage() {
  const me = useMeQuery()
  const permissions = me.data?.permissions ?? []
  const importMutation = useImportSuppliersMutation()
  const previewMutation = usePreviewSupplierImportMutation()
  const inspectMutation = useInspectSupplierImportMutation()
  const templateMutation = useSupplierImportTemplateMutation()

  async function handlePreview(
    file: File,
    options: SpreadsheetImportOptions
  ): Promise<BulkImportPreviewOutcome<SupplierImportPreviewRow>> {
    try {
      const response = await previewMutation.mutateAsync({ file, options })
      return { isSucceeded: true, rows: response.data.rows }
    } catch (error) {
      logger.error(error)
      return {
        isSucceeded: false,
        message: getApiErrorMessage(error, 'Không thể đọc tệp nhập. Vui lòng thử lại.'),
      }
    }
  }

  async function handleInspect(
    file: File,
    csvDelimiter: string
  ): Promise<BulkImportInspectOutcome> {
    try {
      const response = await inspectMutation.mutateAsync({ file, csvDelimiter })
      return { isSucceeded: true, inspection: response.data }
    } catch (error) {
      return {
        isSucceeded: false,
        message: getApiErrorMessage(error, 'Không thể đọc cấu trúc tệp. Vui lòng thử lại.'),
      }
    }
  }

  async function handleDownloadTemplate() {
    try {
      await templateMutation.mutateAsync()
    } catch (error) {
      logger.error(error)
      toast.error(getApiErrorMessage(error, 'Không thể tải tệp mẫu. Vui lòng thử lại.'))
    }
  }

  async function handleImport(
    rows: readonly SupplierImportPreviewRow[]
  ): Promise<BulkImportCommitOutcome> {
    try {
      await importMutation.mutateAsync({ items: rows.map(toImportItem) })
      toast.success(`Đã nhập ${rows.length} nhà cung cấp.`)
      return { isSucceeded: true }
    } catch (error) {
      logger.error(error)
      const message = getApiErrorMessage(error, 'Không thể nhập nhà cung cấp. Vui lòng thử lại.')
      toast.error(message)
      return {
        isSucceeded: false,
        message,
        requiresReconciliation: !isApiErrorResponse(error) || error.statusCode >= 500,
      }
    }
  }

  if (me.isPending) return <BulkImportPendingBody />

  if (!permissions.includes(P.SUPPLIERS_CREATE)) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        Bạn không có quyền nhập nhà cung cấp từ tệp.
      </p>
    )
  }

  return (
    <BulkImportPage
      key={`${me.data?.tenantId}:${me.data?.id}`}
      eyebrow="Nguồn nhập kho"
      title="Nhập danh sách nhà cung cấp"
      entityLabel="nhà cung cấp"
      maxRows={SUPPLIER_IMPORT_MAX_ROWS}
      backHref={APP_ROUTES.suppliers}
      backLabel="Quay lại danh sách nhà cung cấp"
      listLabel="Xem danh sách nhà cung cấp"
      resultFileName="kovia-ket-qua-nhap-nha-cung-cap.csv"
      columns={previewColumns}
      getRowLabel={getRowLabel}
      getRowSearchText={getRowSearchText}
      isPreviewing={previewMutation.isPending || inspectMutation.isPending}
      isImporting={importMutation.isPending}
      isDownloadingTemplate={templateMutation.isPending}
      onDownloadTemplate={handleDownloadTemplate}
      onPreview={handlePreview}
      onInspect={handleInspect}
      onImport={handleImport}
    />
  )
}
