'use client'

import { Fragment, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { getAiTableLayout, isAiNumericColumn } from '../../utils/ai-markdown-table'

/** Rows rendered per step: hundreds of rows must not freeze the panel or bury the conversation. */
export const AI_TABLE_ROW_PAGE = 20

interface AiMarkdownTableProps {
  readonly header: readonly string[]
  readonly rows: readonly (readonly string[])[]
  /** `column` is set for body cells only; headers and labels are rendered without it. */
  readonly renderCell: (text: string, column?: number) => ReactNode
}

/**
 * A markdown table sized to the panel's real width (container query on the chat column): wide
 * tables become stacked label/value cards when the panel is narrow, instead of scrolling sideways.
 */
export function AiMarkdownTable({ header, rows, renderCell }: AiMarkdownTableProps) {
  const [visibleCount, setVisibleCount] = useState(AI_TABLE_ROW_PAGE)
  const layout = getAiTableLayout(header.length)
  const visibleRows = rows.slice(0, visibleCount)
  const remaining = rows.length - visibleRows.length
  const numeric = header.map((_, column) => isAiNumericColumn(rows, column))
  // Rows may have fewer cells than the header (model-written markdown); missing cells stay empty.
  const cellAt = (row: readonly string[], column: number) => row[column] ?? ''

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div
        data-slot="ai-table"
        className={cn(
          'overflow-x-auto rounded-md border',
          layout === 'cards-narrow' && 'hidden @lg/ai-panel:block',
          layout === 'cards-wide' && 'hidden @2xl/ai-panel:block'
        )}
      >
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              {header.map((cell, column) => (
                <TableHead
                  key={column}
                  className={cn('h-8 px-2 whitespace-nowrap', numeric[column] && 'text-right')}
                >
                  {renderCell(cell)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {header.map((_, column) => (
                  <TableCell
                    key={column}
                    className={cn(
                      'px-2 py-1.5 [overflow-wrap:anywhere] whitespace-normal',
                      numeric[column] && 'text-right tabular-nums'
                    )}
                  >
                    {renderCell(cellAt(row, column), column)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {layout === 'table' ? null : (
        <ul
          data-slot="ai-table-cards"
          className={cn(
            'flex flex-col gap-1.5',
            layout === 'cards-narrow' ? '@lg/ai-panel:hidden' : '@2xl/ai-panel:hidden'
          )}
        >
          {visibleRows.map((row, rowIndex) => (
            <li key={rowIndex} className="rounded-md border px-3 py-2 text-xs">
              <p className="text-sm font-medium [overflow-wrap:anywhere]">
                {renderCell(cellAt(row, 0), 0)}
              </p>
              <dl className="mt-1 grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-3 gap-y-0.5">
                {header.slice(1).map((label, index) => (
                  <Fragment key={index}>
                    <dt className="text-muted-foreground [overflow-wrap:anywhere]">
                      {renderCell(label)}
                    </dt>
                    <dd
                      className={cn(
                        '[overflow-wrap:anywhere]',
                        numeric[index + 1] && 'text-right tabular-nums'
                      )}
                    >
                      {renderCell(cellAt(row, index + 1), index + 1)}
                    </dd>
                  </Fragment>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 ? (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-xs">
          <span className="tabular-nums">
            Đang hiện {visibleRows.length}/{rows.length} dòng
          </span>
          <Button
            type="button"
            variant="link"
            size="xs"
            className="h-7 px-0"
            onClick={() => setVisibleCount((count) => count + AI_TABLE_ROW_PAGE)}
          >
            Xem thêm {Math.min(remaining, AI_TABLE_ROW_PAGE)} dòng
          </Button>
        </div>
      ) : null}
    </div>
  )
}
