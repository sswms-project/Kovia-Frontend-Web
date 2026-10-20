import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { P } from '@/config/permissionCodes'
import { useListExport } from './use-list-export'
import { listExportSchema } from '../schemas/list-export.schema'

const download = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }))
vi.mock('@/hooks/use-excel-download', () => ({ useExcelDownload: () => download }))

describe('shared list export capability and applied filters', () => {
  it('keeps selected-row export separate from all-filtered export, including when the full list exceeds the limit', () => {
    download.mutate.mockClear()
    const selectedIds = ['11111111-1111-4111-8111-111111111111']
    const { result } = renderHook(() =>
      useListExport({
        dataset: 'inbound-requests',
        filters: { status: 'Draft', pageNumber: 3 },
        selectedIds,
        permissions: [P.LISTS_EXPORT, P.INBOUND_REQUESTS_VIEW],
        viewPermission: P.INBOUND_REQUESTS_VIEW,
        totalCount: 10001,
        isFetching: false,
        isError: false,
      })
    )
    expect(result.current.buttonProps.disabledReason).toBeUndefined()
    expect(result.current.buttonProps.selection?.allDisabledReason).toContain('10.000')
    act(() => result.current.buttonProps.onExport())
    expect(download.mutate).not.toHaveBeenCalled()
    act(() => result.current.buttonProps.selection?.onExport())
    expect(download.mutate).toHaveBeenCalledExactlyOnceWith({
      dataset: 'inbound-requests',
      filters: { status: 'Draft' },
      selectedIds,
    })
    expect(
      listExportSchema.safeParse({ dataset: 'products', filters: {}, selectedIds }).success
    ).toBe(false)
    expect(
      listExportSchema.safeParse({
        dataset: 'inbound-requests',
        filters: {},
        selectedIds: [...selectedIds, ...selectedIds],
      }).success
    ).toBe(false)
    expect(
      listExportSchema.safeParse({ dataset: 'inbound-requests', filters: {}, selectedIds }).success
    ).toBe(true)
  })
  it.each([[P.INVENTORY_VIEW], [P.LISTS_EXPORT], [P.PRODUCTS_VIEW, P.LISTS_EXPORT], []])(
    'does not show inventory export without both permissions: %j',
    (...permissions) => {
      const { result } = renderHook(() =>
        useListExport({
          dataset: 'movements',
          filters: {},
          permissions,
          viewPermission: P.INVENTORY_VIEW,
          totalCount: 1,
          isFetching: false,
          isError: false,
        })
      )
      expect(result.current.canExport).toBe(false)
    }
  )

  it('exports all applied results without page parameters and retains the exact scope', () => {
    download.mutate.mockClear()
    const { result } = renderHook(() =>
      useListExport({
        dataset: 'managed-task-history',
        filters: {
          pageNumber: 3,
          pageSize: 20,
          skip: 40,
          top: 20,
          needTotalCount: true,
          warehouseId: 'warehouse',
          taskType: 'Receiving',
          executionStatus: 'Completed',
        },
        permissions: [P.LISTS_EXPORT, P.WAREHOUSE_TASKS_VIEW_ALL],
        viewPermission: P.WAREHOUSE_TASKS_VIEW_ALL,
        totalCount: 201,
        isFetching: false,
        isError: false,
      })
    )
    expect(result.current.canExport).toBe(true)
    act(() => result.current.buttonProps.onExport())
    expect(download.mutate).toHaveBeenCalledExactlyOnceWith({
      dataset: 'managed-task-history',
      filters: { warehouseId: 'warehouse', taskType: 'Receiving', executionStatus: 'Completed' },
    })
  })

  it.each([
    { totalCount: 0 },
    { totalCount: 10001 },
    { isFetching: true },
    { isError: true },
    { blocked: true },
  ])('prevents export while unavailable: %j', (state) => {
    download.mutate.mockClear()
    const { result } = renderHook(() =>
      useListExport({
        dataset: 'products',
        filters: {},
        permissions: [P.LISTS_EXPORT, P.PRODUCTS_VIEW],
        viewPermission: P.PRODUCTS_VIEW,
        totalCount: 1,
        isFetching: false,
        isError: false,
        ...state,
      })
    )
    expect(result.current.buttonProps.disabledReason).toBeTruthy()
    act(() => result.current.buttonProps.onExport())
    expect(download.mutate).not.toHaveBeenCalled()
  })

  it('allows the maximum, rejects unsupported sensitive datasets and excessive filters', () => {
    const { result } = renderHook(() =>
      useListExport({
        dataset: 'products',
        filters: {},
        permissions: [P.LISTS_EXPORT, P.PRODUCTS_VIEW],
        viewPermission: P.PRODUCTS_VIEW,
        totalCount: 10000,
        isFetching: false,
        isError: false,
      })
    )
    expect(result.current.buttonProps.disabledReason).toBeUndefined()
    for (const dataset of ['staff', 'payments', 'audit-logs', 'roles', 'notifications']) {
      expect(listExportSchema.safeParse({ dataset, filters: {} }).success).toBe(false)
    }
    expect(
      listExportSchema.safeParse({ dataset: 'products', filters: { search: 'x'.repeat(17000) } })
        .success
    ).toBe(false)
  })
})
