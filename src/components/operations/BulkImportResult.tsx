'use client'

import { Download, FileSpreadsheet, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import type { Route } from 'next'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { bulkImportResultsCsv, type BulkImportResultRow } from './bulk-import'

export interface BulkImportResultItem extends BulkImportResultRow {
  readonly isImported: boolean
}

interface BulkImportResultProps {
  readonly entityLabel: string
  readonly listHref: Route
  readonly listLabel: string
  readonly resultFileName: string
  readonly items: readonly BulkImportResultItem[]
  readonly onRestart: () => void
  readonly onExport?: () => void
  readonly children?: ReactNode
}

export function BulkImportResult({
  entityLabel,
  listHref,
  listLabel,
  resultFileName,
  items,
  onRestart,
  onExport,
  children,
}: BulkImportResultProps) {
  const importedCount = items.filter((item) => item.isImported).length
  const skippedCount = items.length - importedCount

  function exportResults() {
    if (onExport) {
      onExport()
      return
    }
    const csv = bulkImportResultsCsv(items)
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = resultFileName
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className={cn('min-w-0', children && 'min-h-0 flex-1 overflow-hidden')}>
      <CardHeader className="shrink-0">
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="text-primary" aria-hidden="true" />
          Đã hoàn tất nhập {entityLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('flex min-w-0 flex-col gap-4', children && 'min-h-0 flex-1')}>
        <p className="text-sm" role="status">
          Đã nhập <strong>{importedCount}</strong> {entityLabel}; bỏ qua {skippedCount} dòng.
        </p>
        {children ?? (
          <div className="max-h-96 overflow-auto border">
            <Table className="table-fixed" aria-label={`Kết quả nhập ${entityLabel}`}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Dòng</TableHead>
                  <TableHead className="wrap-anywhere whitespace-normal">{entityLabel}</TableHead>
                  <TableHead className="w-2/5">Kết quả</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.rowNumber}>
                    <TableCell className="align-top tabular-nums">{item.rowNumber}</TableCell>
                    <TableCell className="align-top wrap-anywhere whitespace-normal">
                      {item.label}
                    </TableCell>
                    <TableCell className="align-top wrap-anywhere whitespace-normal">
                      <Badge
                        variant={item.isImported ? 'default' : 'outline'}
                        className="h-auto max-w-full text-left wrap-anywhere whitespace-normal"
                      >
                        {item.result}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild>
            <Link href={listHref}>{listLabel}</Link>
          </Button>
          <Button variant="outline" onClick={exportResults}>
            <Download aria-hidden="true" />
            Xuất kết quả CSV
          </Button>
          <Button variant="outline" onClick={onRestart}>
            <RefreshCw aria-hidden="true" />
            Nhập thêm tệp
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
