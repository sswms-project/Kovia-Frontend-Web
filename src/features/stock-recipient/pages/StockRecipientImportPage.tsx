'use client'

import type { Route } from 'next'
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
import { getApiErrorMessage, isApiErrorResponse } from '@/lib/api-error'
import { APP_ROUTES } from '@/routes/app-routes'
import {
  useImportStockRecipientsMutation,
  usePreviewStockRecipientImportMutation,
  useInspectStockRecipientImportMutation,
  useStockRecipientImportTemplateMutation,
} from '../hooks/use-stock-recipients'
import type { StockRecipientImportPreviewRow } from '../types/stock-recipient.types'
import {
  STOCK_RECIPIENT_IMPORT_MAX_ROWS,
  getImportRecipientTypeLabel,
  toImportItem,
} from '../utils/stock-recipient-import'

const previewColumns: readonly BulkImportColumn<StockRecipientImportPreviewRow>[] = [
  {
    key: 'recipientCode',
    header: 'Mã KH',
    headClassName: 'w-32',
    cellClassName: 'max-w-48 min-w-32 font-mono wrap-anywhere whitespace-normal',
    render: (row) => row.recipientCode ?? 'Tự cấp',
  },
  {
    key: 'recipientName',
    header: 'Tên khách hàng',
    cellClassName: 'max-w-64 min-w-48 wrap-anywhere whitespace-normal',
    render: (row) => row.recipientName,
  },
  {
    key: 'recipientType',
    header: 'Loại',
    headClassName: 'w-28',
    render: (row) => getImportRecipientTypeLabel(row.recipientType),
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
      ['email', 'Email'],
      ['taxCode', 'Mã số thuế'],
      ['address', 'Địa chỉ'],
      ['shippingAddress', 'Địa chỉ giao hàng'],
      ['contactSalutation', 'Xưng hô'],
      ['contactName', 'Người liên hệ'],
      ['contactMobile', 'Điện thoại người liên hệ'],
      ['contactChannel', 'Kênh liên hệ'],
      ['contactChannelName', 'Tên kênh liên hệ'],
    ] as const
  ).map(([key, header]) => ({
    key,
    header,
    isSupplementary: key !== 'email',
    cellClassName: 'max-w-64 min-w-40 wrap-anywhere whitespace-normal',
    render: (row: StockRecipientImportPreviewRow) => row[key] || '—',
  })),
]

function getRowLabel(row: StockRecipientImportPreviewRow) {
  return row.recipientCode ? `${row.recipientCode} · ${row.recipientName}` : row.recipientName
}

function getRowSearchText(row: StockRecipientImportPreviewRow) {
  return [
    row.recipientCode,
    row.recipientName,
    row.recipientType,
    row.taxCode,
    row.phone,
    row.email,
    row.address,
    row.shippingAddress,
    row.contactSalutation,
    row.contactName,
    row.contactMobile,
    row.contactChannel,
    row.contactChannelName,
    ...row.errors,
  ]
    .filter(Boolean)
    .join(' ')
}

export default function StockRecipientImportPage() {
  const me = useMeQuery()
  const permissions = me.data?.permissions ?? []
  const importMutation = useImportStockRecipientsMutation()
  const previewMutation = usePreviewStockRecipientImportMutation()
  const inspectMutation = useInspectStockRecipientImportMutation()
  const templateMutation = useStockRecipientImportTemplateMutation()

  async function handlePreview(
    file: File,
    options: SpreadsheetImportOptions
  ): Promise<BulkImportPreviewOutcome<StockRecipientImportPreviewRow>> {
    try {
      const response = await previewMutation.mutateAsync({ file, options })
      return { isSucceeded: true, rows: response.data.rows }
    } catch (error) {
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
      toast.error(getApiErrorMessage(error, 'Không thể tải tệp mẫu. Vui lòng thử lại.'))
    }
  }

  async function handleImport(
    rows: readonly StockRecipientImportPreviewRow[]
  ): Promise<BulkImportCommitOutcome> {
    try {
      await importMutation.mutateAsync({ items: rows.map(toImportItem) })
      toast.success(`Đã nhập ${rows.length} khách hàng.`)
      return { isSucceeded: true }
    } catch (error) {
      const message = getApiErrorMessage(error, 'Không thể nhập khách hàng. Vui lòng thử lại.')
      toast.error(message)
      return {
        isSucceeded: false,
        message,
        requiresReconciliation: !isApiErrorResponse(error) || error.statusCode >= 500,
      }
    }
  }

  if (me.isPending) return <BulkImportPendingBody />

  if (!permissions.includes(P.STOCK_RECIPIENTS_CREATE)) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        Bạn không có quyền nhập khách hàng từ tệp.
      </p>
    )
  }

  return (
    <BulkImportPage
      key={`${me.data?.tenantId}:${me.data?.id}`}
      eyebrow="Danh mục"
      title="Nhập danh sách khách hàng"
      entityLabel="khách hàng"
      maxRows={STOCK_RECIPIENT_IMPORT_MAX_ROWS}
      backHref={APP_ROUTES.stockRecipients as Route}
      backLabel="Quay lại danh sách khách hàng"
      listLabel="Xem danh sách khách hàng"
      resultFileName="kovia-ket-qua-nhap-khach-hang.csv"
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
