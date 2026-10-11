import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/routes/app-routes'

export function ProductImportSetupGuide({
  disabled = false,
  setup,
}: {
  readonly disabled?: boolean
  readonly setup?: { canImportUnits: boolean; canImportCategories: boolean; missing: boolean }
}) {
  return (
    <Alert className="shrink-0">
      <details key={String(setup?.missing)} open={setup?.missing}>
        <summary className="cursor-pointer focus-visible:outline-2">
          Bạn mới thiết lập danh mục?
        </summary>
        <AlertDescription className="mt-2 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span>Chuẩn bị danh mục trước — Khuyến nghị</span>
            {setup?.canImportUnits ? (
              <Button variant="outline" size="sm" disabled={disabled} asChild>
                <Link
                  href={APP_ROUTES.unitImport}
                  aria-disabled={disabled}
                  onClick={(event) => {
                    if (disabled) event.preventDefault()
                  }}
                >
                  Nhập đơn vị tính
                </Link>
              </Button>
            ) : null}
            {setup?.canImportCategories ? (
              <Button variant="outline" size="sm" disabled={disabled} asChild>
                <Link
                  href={APP_ROUTES.categoryImport}
                  aria-disabled={disabled}
                  onClick={(event) => {
                    if (disabled) event.preventDefault()
                  }}
                >
                  Nhập nhóm VTHH
                </Link>
              </Button>
            ) : null}
          </div>
          <p>Hoặc nhập hàng hóa ngay và xác nhận tạo danh mục còn thiếu ở bước Kiểm tra.</p>
        </AlertDescription>
      </details>
    </Alert>
  )
}
