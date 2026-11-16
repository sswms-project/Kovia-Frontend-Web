import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import type { OperationalAlert } from '../../types/ai-alerts.types'
import { AlertFilters, type AlertFilterValues, type FilterOption } from './AlertFilters'
import { AlertList } from './AlertList'

interface AlertDirectoryProps {
  readonly items: OperationalAlert[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly filters: AlertFilterValues
  readonly warehouseOptions: readonly FilterOption[]
  readonly typeOptions: readonly FilterOption[]
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly warehouseName: (warehouseId: string | null) => string
  readonly onFilterChange: (key: keyof AlertFilterValues, value: string) => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onOpen: (alertId: string) => void
  readonly onRetry: () => void
}

export function AlertDirectory(props: AlertDirectoryProps) {
  const hasActiveFilters = Object.values(props.filters).some(Boolean)
  return (
    <OperationalListPanel aria-labelledby="alerts-title">
      <div className="flex shrink-0 flex-col gap-2 border-b p-3 @3xl:flex-row @3xl:items-center @3xl:justify-between">
        <h2 id="alerts-title" className="text-sm font-semibold">
          Danh sách cảnh báo
        </h2>
        <AlertFilters
          filters={props.filters}
          warehouseOptions={props.warehouseOptions}
          typeOptions={props.typeOptions}
          onChange={props.onFilterChange}
        />
      </div>
      <AlertList
        items={props.items}
        isLoading={props.isLoading}
        isError={props.isError}
        hasActiveFilters={hasActiveFilters}
        warehouseName={props.warehouseName}
        onOpen={props.onOpen}
        onRetry={props.onRetry}
      />
      {!props.isLoading && !props.isError && props.totalCount > 0 ? (
        <OperationalPagination
          page={props.page}
          pageSize={props.pageSize}
          totalCount={props.totalCount}
          isPending={props.isFetching}
          onPageChange={props.onPageChange}
          onPageSizeChange={props.onPageSizeChange}
        />
      ) : null}
    </OperationalListPanel>
  )
}
