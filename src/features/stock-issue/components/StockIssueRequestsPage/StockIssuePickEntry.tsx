import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { CameraScanPanel } from '@/features/transfer/components/TransferWork/CameraScanPanel'
import { ScanInput } from '@/features/transfer/components/TransferWork/ScanInput'
import { ScanPreferencesBar } from '@/features/transfer/components/TransferWork/ScanPreferencesBar'
import { useStockIssuePickScan } from '../../hooks/use-stock-issue-pick-scan'
import type { StockIssuePickLocation } from '../../types/stock-issue.types'
import type { StockPickingLine } from '../../utils/stock-issue-picking'
import { formatStockIssueUnitQuantity } from '../../utils/stock-issue-format'

interface StockIssuePickEntryProps {
  readonly line: StockPickingLine
  readonly source?: StockIssuePickLocation
  readonly maximum: number
  readonly disabled: boolean
  readonly cameraOn: boolean
  readonly onCameraChange: (open: boolean) => void
  readonly onConfirm: (quantity: number, slotCode: string, productCode: string) => void
}
export function StockIssuePickEntry({
  line,
  source,
  maximum,
  disabled,
  cameraOn,
  onCameraChange,
  onConfirm,
}: StockIssuePickEntryProps) {
  const scan = useStockIssuePickScan(line, source, maximum, disabled)
  const quantityRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (scan.ready && !scan.eachUnit) {
      quantityRef.current?.focus()
      quantityRef.current?.select()
    }
  }, [scan.ready, scan.eachUnit])
  function confirm() {
    if (!disabled && scan.ready && !scan.quantityError && !scan.error)
      onConfirm(scan.quantity, scan.slotCode, scan.productCode)
  }
  return (
    <section
      aria-label="Khu vực quét lấy hàng"
      className="bg-card flex min-w-0 flex-col gap-4 border p-3"
    >
      <header>
        <h2 className="text-sm font-semibold">Lấy hàng</h2>
        <p className="text-sm">
          <span className="font-mono" translate="no">
            {line.sku}
          </span>{' '}
          · {line.productName}
        </p>
        <p className="text-muted-foreground text-sm">
          {line.slotPath || 'Chưa xác định vị trí nguồn'}
        </p>
        <p className="text-sm">
          Còn cần lấy {formatStockIssueUnitQuantity(maximum, line.unitName)}
          {line.lotNumber ? ` · Lô ${line.lotNumber}` : ''}
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          Đưa tới: {line.stagingPath || 'Chưa xác định điểm chờ xuất'}. Không cần quét tại điểm chờ
          xuất.
        </p>
      </header>
      <CameraScanPanel
        label={!scan.slotCode ? 'Quét vị trí lấy hàng' : 'Quét hàng hóa cần lấy'}
        open={cameraOn}
        disabled={disabled}
        onOpenChange={onCameraChange}
        pausedMessage={
          scan.ready && !scan.eachUnit
            ? 'Đã quét đủ. Camera tạm dừng để nhập số lượng; bấm Quét lại nếu cần.'
            : undefined
        }
        repeatGuardMs={scan.eachUnit ? 600 : undefined}
        onCode={!scan.slotCode ? scan.scanSlot : scan.scanProduct}
      />
      <fieldset disabled={disabled} className="grid min-w-0 gap-4">
        <ScanPreferencesBar showEachUnit />
        <ScanInput
          id="outbound-pick-source"
          label="1. Quét mã vị trí"
          hideCamera
          focusWhen={!scan.slotCode}
          confirmedValue={scan.slotCode ? line.slotPath || scan.slotCode : undefined}
          error={!scan.slotCode ? scan.error : null}
          disabled={disabled}
          onScan={scan.scanSlot}
        />
        <ScanInput
          id="outbound-pick-product"
          label="2. Quét mã hàng"
          hideCamera
          focusWhen={Boolean(scan.slotCode) && !scan.ready}
          confirmedValue={scan.productCode}
          error={scan.slotCode ? scan.error : null}
          description={
            scan.eachUnit
              ? `Mỗi lần quét cộng 1 ${line.unitName}, không phải 1 đơn vị cơ sở. Đã quét ${scan.quantityText || 0}/${maximum}.`
              : 'Quét đúng mã hàng rồi kiểm tra số lượng thực lấy.'
          }
          disabled={disabled || !scan.slotCode}
          onScan={scan.scanProduct}
          onEmptyEnter={scan.eachUnit && scan.ready ? confirm : undefined}
        />
        <Field data-invalid={Boolean(scan.quantityError)}>
          <FieldLabel htmlFor="outbound-pick-quantity">
            3. Số lượng lấy ({line.unitName})
          </FieldLabel>
          <Input
            id="outbound-pick-quantity"
            ref={quantityRef}
            type="text"
            inputMode={line.unitFactor !== 1 ? 'numeric' : 'decimal'}
            autoComplete="off"
            className="h-11 text-base tabular-nums"
            disabled={disabled || !scan.ready}
            aria-invalid={Boolean(scan.quantityError)}
            value={scan.quantityText}
            onChange={(event) => scan.changeQuantity(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                confirm()
              }
            }}
          />
          <FieldDescription>
            Tối đa {formatStockIssueUnitQuantity(maximum, line.unitName)}. Lấy thiếu thì nhập số
            thực tế.
          </FieldDescription>
          <FieldError>{scan.quantityError}</FieldError>
        </Field>
      </fieldset>
      <footer className="grid gap-2 sm:flex sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={disabled}
          onClick={scan.reset}
        >
          Quét lại
        </Button>
        <Button
          type="button"
          className="h-11"
          disabled={disabled || !scan.ready || Boolean(scan.quantityError) || Boolean(scan.error)}
          onClick={confirm}
        >
          Xác nhận & tiếp tục
        </Button>
      </footer>
      <p className="text-muted-foreground text-xs">
        Mỗi lần xác nhận sẽ lưu ngay lượt lấy và chuyển hàng tới điểm chờ xuất. Lấy thiếu có thể
        tiếp tục sau.
      </p>
    </section>
  )
}
