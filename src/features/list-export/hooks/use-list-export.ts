'use client'

import { P } from '@/config/permissionCodes'
import { useExcelDownload } from '@/hooks/use-excel-download'
import type { ListExportRequest } from '../schemas/list-export.schema'
import { listExportService } from '../services/list-export.service'

interface ListExportOptions {
  readonly dataset: ListExportRequest['dataset']
  readonly filters: object
  readonly permissions: readonly string[]
  readonly viewPermission: string
  readonly totalCount: number
  readonly isFetching: boolean
  readonly isError: boolean
  readonly blocked?: boolean
  readonly selectedIds?: readonly string[]
}

export function useListExport(options: ListExportOptions) {
  const canExport =
    options.permissions.includes(P.LISTS_EXPORT) &&
    options.permissions.includes(options.viewPermission)
  const download = useExcelDownload(
    canExport,
    listExportService.exportExcel,
    'Đã xuất Excel theo phạm vi đã chọn lúc bắt đầu xuất.'
  )
  const disabledReason = options.blocked
    ? 'Vui lòng hoàn tất bộ lọc hoặc chọn snapshot hợp lệ.'
    : options.isFetching
      ? 'Chờ danh sách tải xong trước khi xuất.'
      : options.isError
        ? 'Vui lòng tải lại danh sách trước khi xuất.'
        : options.totalCount === 0
          ? 'Không có dữ liệu phù hợp để xuất.'
          : undefined
  const allDisabledReason =
    disabledReason ??
    (options.totalCount > 10000
      ? 'Danh sách vượt 10.000 dòng. Vui lòng thu hẹp bộ lọc.'
      : undefined)
  const selectedIds =
    options.dataset === 'inbound-requests' && options.selectedIds?.length
      ? options.selectedIds
      : undefined
  function exportRows(selection?: readonly string[]) {
    if (!canExport || (selection ? disabledReason : allDisabledReason)) return
    const filters = Object.fromEntries(
      Object.entries(options.filters).filter(
        ([key]) => !['pageNumber', 'pageSize', 'top', 'skip', 'needTotalCount'].includes(key)
      )
    )
    download.mutate({
      dataset: options.dataset,
      filters,
      ...(selection ? { selectedIds: [...selection] } : {}),
    })
  }
  return {
    canExport,
    buttonProps: {
      isPending: download.isPending,
      disabledReason: selectedIds ? disabledReason : allDisabledReason,
      onExport: () => exportRows(),
      selection: selectedIds
        ? {
            count: selectedIds.length,
            allDisabledReason,
            onExport: () => exportRows(selectedIds),
          }
        : undefined,
    },
  }
}
