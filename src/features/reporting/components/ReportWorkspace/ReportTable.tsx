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
  return (
    <OperationalListPanel>
      <Table>
        <TableHeader>
          <TableRow>
            {report.columns.map((column) => (
              <TableHead key={column.key} className="bg-card sticky top-0 z-10 whitespace-nowrap">
                {column.label}
              </TableHead>
            ))}
            <TableHead className="bg-card sticky top-0 z-10">Nguồn</TableHead>
          </TableRow>
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
              {report.columns.map((column) => (
                <TableCell key={column.key} className="whitespace-nowrap tabular-nums">
                  {formatCell(
                    Object.entries(row).find(([key]) => key === column.key)?.[1],
                    column.dataType
                  )}
                </TableCell>
              ))}
              <TableCell>
                {sourceLinks.has(row.id) ? (
                  <Link
                    href={sourceLinks.get(row.id) ?? { pathname: '/' }}
                    className="text-primary text-sm whitespace-nowrap hover:underline"
                  >
                    Mở chứng từ
                  </Link>
                ) : (
                  '—'
                )}
              </TableCell>
            </TableRow>
          ))}
          {report.items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={report.columns.length + 1}
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
