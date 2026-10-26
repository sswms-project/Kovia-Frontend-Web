import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { AuditLogItem } from '../../types/platform-services.types'
import {
  formatPlatformDateTime,
  getArchivedDocumentHref,
} from '../../utils/platform-services-format'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface AuditLogDetailSheetProps {
  readonly log: AuditLogItem | null
  readonly onOpenChange: (open: boolean) => void
}

export function AuditLogDetailSheet({ log, onOpenChange }: AuditLogDetailSheetProps) {
  const archivedHref = log ? getArchivedDocumentHref(log) : null
  const hasDocumentChanges = Boolean(
    log?.oldValue?.startsWith('{"SchemaVersion":1,"DocumentType":')
  )
  return (
    <Sheet open={log !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-full overflow-hidden data-[side=right]:w-full data-[side=right]:sm:w-full data-[side=right]:sm:max-w-none data-[side=right]:lg:w-1/2"
      >
        {log ? (
          <>
            <SheetHeader className="shrink-0 border-b px-6 py-5 pr-12">
              <SheetTitle>Chi tiết nhật ký hoạt động</SheetTitle>
              <SheetDescription>{formatPlatformDateTime(log.createdAt)}</SheetDescription>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain p-6">
              {archivedHref ? (
                <Button asChild variant="outline">
                  <Link href={archivedHref}>Xem nội dung phiếu đã xóa</Link>
                </Button>
              ) : null}
              <section className="bg-muted rounded-lg border p-4" aria-label="Hoạt động">
                <p className="text-muted-foreground text-xs">Thao tác</p>
                <p className="mt-1 text-base font-semibold wrap-anywhere">{log.actionLabel}</p>
              </section>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Detail label="Người thực hiện" value={log.actorName} hint={log.actorEmail} />
                <Detail label="Đối tượng thao tác" value={log.entityTypeLabel} />
                <Detail label="Tham chiếu" value={log.referenceDisplay} />
                {log.warehouseName ? (
                  <Detail
                    label="Kho liên quan"
                    value={[log.warehouseCode, log.warehouseName].filter(Boolean).join(' · ')}
                  />
                ) : null}
              </dl>

              <section className="rounded-lg border p-4" aria-labelledby="audit-summary-title">
                <h3 id="audit-summary-title" className="text-sm font-semibold">
                  Mô tả chi tiết
                </h3>
                <p className="mt-2 text-sm wrap-anywhere whitespace-pre-wrap">{log.summary}</p>
              </section>

              {log.changes.length > 0 ? (
                <section aria-labelledby="audit-changes-title">
                  <h3 id="audit-changes-title" className="mb-2 text-sm font-semibold">
                    Nội dung thay đổi
                  </h3>
                  {hasDocumentChanges ? (
                    <p className="text-muted-foreground mb-3 text-xs">
                      Tên hàng, đơn vị và vị trí tra theo danh mục hiện tại; giá trị trước/sau giữ
                      theo lần sửa.
                    </p>
                  ) : null}
                  <div className="divide-y overflow-hidden rounded-lg border">
                    {log.changes.map((change, index) => (
                      <div key={`${change.label}-${index}`} className="flex flex-col gap-3 p-4">
                        <p className="text-sm font-medium wrap-anywhere">{change.label}</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <ChangeValue label="Trước" value={change.before} />
                          <ChangeValue label="Sau" value={change.after} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function Detail({
  label,
  value,
  hint,
}: {
  readonly label: string
  readonly value: string
  readonly hint?: string
}) {
  return (
    <div className="min-w-0 rounded-lg border p-3">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 text-sm font-medium wrap-anywhere">{value}</dd>
      {hint ? <dd className="text-muted-foreground mt-1 text-xs wrap-anywhere">{hint}</dd> : null}
    </div>
  )
}

function ChangeValue({ label, value }: { readonly label: string; readonly value: string | null }) {
  return (
    <div className="bg-muted min-w-0 rounded-md p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-sm wrap-anywhere whitespace-pre-wrap">{value ?? '—'}</p>
    </div>
  )
}
