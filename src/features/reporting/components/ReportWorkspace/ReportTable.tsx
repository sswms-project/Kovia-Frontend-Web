import Link from 'next/link'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { format } from 'url'
import type { UrlObject } from 'url'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { WarehouseReport } from '../../schemas/warehouse-report.schema'
import { reportStatusLabel } from '../../utils/report-status'
import { cn } from '@/lib/utils'
import { balanceColumnHints, reportTableLayout } from '../../utils/report-table-layout'
import { ReportColumnHeading } from './ReportColumnHeading'

interface ReportTableProps {
  readonly report: WarehouseReport
  readonly isFetching: boolean
  readonly sourceLinks: ReadonlyMap<string, UrlObject>
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (size: number) => void
}
function formatCell(value: unknown, dataType: string): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') return value.toLocaleString('vi-VN', { maximumFractionDigits: 6 })
  if (typeof value === 'boolean') return value ? 'Có' : 'Không'
  if (typeof value !== 'string') return '—'
  if (dataType === 'datetime')
    return new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
  return dataType === 'status' ? reportStatusLabel(value) : value
}
export function ReportTable({
  report,
  isFetching,
  sourceLinks,
  onPageChange,
  onPageSizeChange,
}: ReportTableProps) {
  const router = useRouter()
  const { columns, productKey } = reportTableLayout(report)
  const isBalance = report.reportType === 'inventory-balance'
  const movementGroups = [
    { label: 'Nhập kho', keys: ['externalIn', 'transferIn'] },
    { label: 'Xuất kho', keys: ['externalOut', 'transferOut'] },
  ]
  return (
    <OperationalListPanel aria-label="Kết quả báo cáo kho" aria-busy={isFetching}>
      <Table className="text-sm">
        <TableHeader className="sticky top-0 z-20 [&_th]:top-auto!">
          <TableRow>
            {columns.map((column) => {
              const group = isBalance
                ? movementGroups.find((item) => item.keys.includes(column.key))
                : undefined
              if (group)
                return columns.find((c) => group.keys.includes(c.key))?.key === column.key ? (
                  <TableHead
                    key={group.label}
                    scope="colgroup"
                    colSpan={columns.filter((c) => group.keys.includes(c.key)).length}
                    className="bg-muted relative! h-8 border-x text-center font-semibold"
                  >
                    {group.label}
                  </TableHead>
                ) : null
              return (
                <TableHead
                  key={column.key}
                  scope="col"
                  aria-label={column.label}
                  rowSpan={isBalance ? 2 : 1}
                  className={cn(
                    'bg-muted relative! whitespace-nowrap',
                    column.dataType === 'number' && 'text-center',
                    column.key === productKey && 'sticky! left-0 z-30 min-w-56'
                  )}
                >
                  <ReportColumnHeading
                    label={column.label}
                    help={isBalance ? balanceColumnHints[column.key] : undefined}
                  />
                </TableHead>
              )
            })}
          </TableRow>
          {isBalance ? (
            <TableRow>
              {columns
                .filter((c) => movementGroups.some((group) => group.keys.includes(c.key)))
                .map((column) => (
                  <TableHead
                    key={column.key}
                    scope="col"
                    aria-label={column.label}
                    className="bg-card relative! h-10 border-l text-center"
                  >
                    <ReportColumnHeading
                      label={column.label}
                      help={balanceColumnHints[column.key]}
                    />
                  </TableHead>
                ))}
            </TableRow>
          ) : null}
        </TableHeader>
        <TableBody>
          {report.items.map((row) => (
            <TableRow
              key={row.id}
              tabIndex={sourceLinks.has(row.id) ? 0 : undefined}
              className={
                sourceLinks.has(row.id)
                  ? 'hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:outline-primary cursor-pointer transition-colors duration-150 focus-visible:outline motion-reduce:transition-none'
                  : undefined
              }
              onClick={(event) => {
                const target = event.target as HTMLElement
                const href = sourceLinks.get(row.id)
                if (href && !target.closest('a, button') && !window.getSelection()?.toString())
                  router.push(format(href) as Route)
              }}
              onKeyDown={(event) => {
                const href = sourceLinks.get(row.id)
                if (href && event.key === 'Enter' && event.target === event.currentTarget)
                  router.push(format(href) as Route)
              }}
            >
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={cn(
                    'whitespace-nowrap',
                    column.key === 'warehouseName' && 'max-w-32 min-w-28 whitespace-normal',
                    column.key === 'categoryName' && 'max-w-48 min-w-36 whitespace-normal',
                    column.dataType === 'number' && 'text-right tabular-nums',
                    column.key === productKey &&
                      'bg-card sticky left-0 z-10 max-w-72 min-w-56 whitespace-normal',
                    isBalance &&
                      ['openingBalance', 'closingBalance'].includes(column.key) &&
                      'bg-muted/40 font-semibold'
                  )}
                >
                  {column.key === productKey ? (
                    <div className="space-y-1 py-1">
                      {sourceLinks.has(row.id) ? (
                        <Link
                          href={sourceLinks.get(row.id) ?? { pathname: '/' }}
                          className="text-primary block font-medium hover:underline"
                        >
                          {row.productName || row.sku}
                        </Link>
                      ) : (
                        <span className="block font-medium">{row.productName || row.sku}</span>
                      )}
                      <p className="text-muted-foreground text-xs">
                        <span className="font-mono">{row.sku}</span>
                      </p>
                      {'historyStatus' in row && row.historyStatus !== 'ReconciledJournal' ? (
                        <p className="text-warning text-xs">
                          Chưa đủ dữ liệu lịch sử — tồn đầu/cuối chưa xác định.
                        </p>
                      ) : null}
                    </div>
                  ) : ['taskCode', 'documentCode'].includes(column.key) &&
                    sourceLinks.has(row.id) ? (
                    <Link
                      href={sourceLinks.get(row.id) ?? { pathname: '/' }}
                      className="text-primary font-medium hover:underline"
                    >
                      {formatCell(
                        Object.entries(row).find(([key]) => key === column.key)?.[1],
                        column.dataType
                      )}
                    </Link>
                  ) : isBalance &&
                    ['openingBalance', 'closingBalance'].includes(column.key) &&
                    Object.entries(row).find(([key]) => key === column.key)?.[1] == null ? (
                    <span className="text-warning text-xs font-normal">Chưa xác định</span>
                  ) : (
                    formatCell(
                      Object.entries(row).find(([key]) => key === column.key)?.[1],
                      column.dataType
                    )
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {report.items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={Math.max(1, columns.length)}
                className="text-muted-foreground py-10 text-center"
              >
                Không có dữ liệu phù hợp với bộ lọc đã áp dụng.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      <OperationalPagination
        page={report.pageNumber}
        pageSize={report.pageSize}
        totalCount={report.totalCount}
        pageSizeOptions={[25, 50, 100]}
        isPending={isFetching}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </OperationalListPanel>
  )
}
