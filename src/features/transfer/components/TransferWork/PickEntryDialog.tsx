import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type { TransferPickAlternative, TransferPickSheetLine } from '../../types/transfer.types'
import type { PickScanState } from '../../utils/transfer-scan'
import { CameraScanPanel } from './CameraScanPanel'
import { ScanInput, type ScanResult } from './ScanInput'
import { ScanPreferencesBar } from './ScanPreferencesBar'
import { formatTransferLocation } from '../../utils/transfer-location'
import { parseTransferQuantityInput } from '../../schemas/transfer-receipt.schema'

interface PickEntryDialogProps {
  readonly line: TransferPickSheetLine | null
  readonly scan: PickScanState
  readonly quantity: number
  readonly maximumQuantity: number
  readonly quantityError: string | null
  readonly isPending: boolean
  readonly uncertain?: boolean
  /** Quét từng đơn vị: mỗi lần quét mã hàng cộng 1 vào số lượng. */
  readonly eachUnit?: boolean
  readonly onScanSlot: (code: string) => ScanResult
  readonly onScanProduct: (code: string) => ScanResult
  readonly onQuantityChange: (value: number) => void
  readonly onUseAlternative: (alternative: TransferPickAlternative) => void
  readonly onRescan: () => void
  readonly onConfirm: () => void
  readonly onOpenChange: (open: boolean) => void
}

/** Quét từng đơn vị: cho phép quét lại cùng mã sau khoảng ngắn để đếm từng thùng giống nhau. */
const EACH_UNIT_REPEAT_GUARD_MS = 600

export function PickEntryDialog(props: PickEntryDialogProps) {
  return (
    <Dialog
      open={Boolean(props.line)}
      onOpenChange={(next) => !props.isPending && props.onOpenChange(next)}
    >
      <DialogContent size="lg" className="sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Lấy hàng</DialogTitle>
          <DialogDescription>Quét vị trí và mã hàng để ghi nhận lấy hàng.</DialogDescription>
        </DialogHeader>
        <PickEntryWorkspace {...props} />
      </DialogContent>
    </Dialog>
  )
}

export function PickEntryWorkspace({
  line,
  scan,
  quantity,
  maximumQuantity,
  quantityError,
  isPending,
  uncertain = false,
  eachUnit = false,
  onScanSlot,
  onScanProduct,
  onQuantityChange,
  onUseAlternative,
  onRescan,
  onConfirm,
}: Omit<PickEntryDialogProps, 'onOpenChange'>) {
  const isReady = scan.step === 'ready'
  const offered = scan.offeredAlternative
  const quantityRef = useRef<HTMLInputElement>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [quantityText, setQuantityText] = useState(String(quantity))
  const [previousQuantity, setPreviousQuantity] = useState(quantity)
  if (!Object.is(previousQuantity, quantity)) {
    setPreviousQuantity(quantity)
    const parsed = parseTransferQuantityInput(quantityText)
    if (!Object.is(parsed, quantity))
      setQuantityText(Number.isFinite(quantity) ? String(quantity) : '')
  }
  // Quét xong mã hàng thì con trỏ nhảy sang số lượng để nhân viên chỉ cần Enter xác nhận.
  useEffect(() => {
    // Quét từng đơn vị: con trỏ ở lại ô mã hàng để quét tiếp.
    if (!isReady || eachUnit) return
    quantityRef.current?.focus()
    quantityRef.current?.select()
  }, [isReady, eachUnit])
  return (
    <section aria-label="Khu vực quét lấy hàng" className="bg-card min-w-0 border p-3">
      {line ? (
        <div className="grid gap-4">
          <header>
            <h2 className="text-sm font-semibold">Lấy hàng</h2>
            <p className="text-muted-foreground text-sm">
              <span className="font-mono" translate="no">
                {line.sku}
              </span>{' '}
              · {line.productName} · còn cần lấy {formatQuantity(line.remainingQuantity)}{' '}
              {line.baseUnitName}
            </p>
          </header>
          {uncertain ? (
            <p role="alert" className="text-destructive text-sm">
              Chưa xác định kết quả lấy hàng. Bấm kiểm tra lại để gửi đúng thao tác trước, không
              nhập lượt lấy mới.
            </p>
          ) : null}
          <CameraScanPanel
            label={scan.step === 'slot' ? 'Quét vị trí lấy hàng' : 'Quét hàng hóa cần lấy'}
            open={cameraOn}
            disabled={isPending || uncertain}
            pausedMessage={
              isReady && !eachUnit
                ? 'Đã quét đủ. Camera tạm dừng để bạn nhập số lượng; bấm Quét lại để quét tiếp.'
                : undefined
            }
            onOpenChange={setCameraOn}
            onCode={scan.step === 'slot' ? onScanSlot : onScanProduct}
            repeatGuardMs={eachUnit ? EACH_UNIT_REPEAT_GUARD_MS : undefined}
          />
          <fieldset disabled={isPending || uncertain} className="grid min-w-0 gap-4">
            <ScanPreferencesBar showEachUnit />
            <ScanInput
              id="pick-scan-slot"
              label="1. Quét mã vị trí"
              autoFocus
              focusWhen={scan.step === 'slot'}
              confirmedValue={scan.suggestion ? formatTransferLocation(scan.suggestion) : undefined}
              error={scan.step === 'slot' ? scan.error : null}
              disabled={isPending}
              hideCamera
              onScan={onScanSlot}
            />
            {offered ? (
              <div className="bg-muted flex flex-wrap items-center justify-between gap-2 border p-3 text-sm">
                <span>
                  <strong className="font-mono">{formatTransferLocation(offered)}</strong> có đúng
                  hàng (còn {formatQuantity(offered.availableQuantity)}). Lấy ở vị trí này thay?
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onUseAlternative(offered)}
                >
                  Lấy thay
                </Button>
              </div>
            ) : null}

            <ScanInput
              id="pick-scan-product"
              label="2. Quét mã hàng"
              focusWhen={scan.step === 'product'}
              description={
                eachUnit
                  ? `Mỗi lần quét tính 1 đơn vị (đã quét ${formatQuantity(quantity)}/${formatQuantity(maximumQuantity)}). Nhấn Enter khi ô trống để xác nhận lấy.`
                  : undefined
              }
              onEmptyEnter={eachUnit && isReady && !isPending ? onConfirm : undefined}
              confirmedValue={isReady ? scan.productCode : undefined}
              error={scan.step === 'product' ? scan.error : null}
              disabled={scan.step === 'slot' || isPending}
              hideCamera
              onScan={onScanProduct}
            />

            <Field data-invalid={Boolean(quantityError)}>
              <FieldLabel htmlFor="pick-quantity">3. Số lượng lấy</FieldLabel>
              <Input
                id="pick-quantity"
                ref={quantityRef}
                type="text"
                inputMode={line.baseQuantityPrecision === 0 ? 'numeric' : 'decimal'}
                className="h-11 text-base tabular-nums"
                disabled={!isReady || isPending}
                value={quantityText}
                aria-invalid={Boolean(quantityError)}
                onChange={(event) => {
                  setQuantityText(event.target.value)
                  onQuantityChange(parseTransferQuantityInput(event.target.value))
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' || !isReady || isPending) return
                  event.preventDefault()
                  onConfirm()
                }}
              />
              <FieldDescription>
                Tự điền theo số cần lấy tại vị trí này (tối đa {formatQuantity(maximumQuantity)}).
                Nếu thực tế ít hơn, lấy phần có và dùng Đổi vị trí/lô hoặc Báo quản lý cho phần còn
                lại.
              </FieldDescription>
              <FieldError>{quantityError}</FieldError>
            </Field>
          </fieldset>

          <footer className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={isPending || uncertain}
              onClick={onRescan}
            >
              Quét lại
            </Button>
            <Button
              type="button"
              className="h-11"
              disabled={!isReady || isPending || (!uncertain && Boolean(quantityError))}
              onClick={onConfirm}
            >
              {isPending
                ? 'Đang ghi nhận…'
                : uncertain
                  ? 'Kiểm tra lại thao tác'
                  : 'Xác nhận & tiếp tục'}
            </Button>
          </footer>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm" role="status">
          Chọn dòng cần lấy ở bảng bên cạnh để bắt đầu quét.
        </p>
      )}
    </section>
  )
}
