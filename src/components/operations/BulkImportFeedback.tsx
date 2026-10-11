import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { TableCell } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface BulkImportRowResultProps {
  readonly errors: readonly string[]
  readonly warnings?: readonly string[]
  /** Lỗi không hiện được ở ô nào của dòng (không thuộc cột nào đang hiển thị): luôn hiện đủ, không gấp lại. */
  readonly pinned?: readonly string[]
  /** Kết quả kiểm tra của dòng khi có điều kiện ngoài danh sách lỗi (thiếu đơn vị, danh mục...). */
  readonly valid?: boolean
  readonly children?: ReactNode
}

export function BulkImportRowResult({
  errors,
  warnings = [],
  pinned = [],
  valid,
  children,
}: BulkImportRowResultProps) {
  const errorMessages = [...new Set(errors)]
  const warningMessages = [...new Set(warnings.filter((message) => !errors.includes(message)))]
  const pinnedMessages = errorMessages.filter((message) => pinned.includes(message))
  const otherMessages = [
    ...errorMessages.filter((message) => !pinnedMessages.includes(message)),
    ...warningMessages,
  ]
  const shown = pinnedMessages.length ? pinnedMessages : otherMessages.slice(0, 1)
  const hidden = pinnedMessages.length ? otherMessages : otherMessages.slice(1)
  const isValid = valid ?? errors.length === 0
  return (
    <div className="flex flex-col items-start gap-1 text-xs wrap-anywhere whitespace-normal">
      <Badge variant={isValid ? 'default' : 'destructive'}>
        {isValid ? 'Hợp lệ' : 'Không hợp lệ'}
      </Badge>
      {children}
      {shown.map((message) => (
        <p
          key={message}
          className={cn(
            errorMessages.includes(message) ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {message}
        </p>
      ))}
      {hidden.length ? (
        <details className="w-full">
          <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2">
            Xem chi tiết ({hidden.length} thông báo khác)
          </summary>
          <ul className="mt-1 flex max-h-48 flex-col gap-1 overflow-auto">
            {hidden.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}

interface BulkImportFieldCellProps {
  readonly errors?: readonly string[]
  readonly className?: string
  readonly children: ReactNode
}

export function BulkImportFieldCell({
  errors = [],
  className,
  children,
}: BulkImportFieldCellProps) {
  return (
    <TableCell
      className={cn(
        'wrap-anywhere whitespace-normal',
        className,
        errors.length > 0 && 'bg-destructive/5'
      )}
    >
      {children}
      {[...new Set(errors)].map((message) => (
        <p
          key={message}
          className="text-destructive mt-1 max-w-64 text-xs wrap-anywhere whitespace-normal"
        >
          {message}
        </p>
      ))}
    </TableCell>
  )
}
