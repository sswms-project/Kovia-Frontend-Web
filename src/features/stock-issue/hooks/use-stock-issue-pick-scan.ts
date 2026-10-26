import { useRef, useState } from 'react'
import { codesMatch } from '@/features/transfer/utils/transfer-scan'
import { transferLocationScanCodes } from '@/features/transfer/utils/transfer-location'
import { parseTransferQuantityInput } from '@/features/transfer/schemas/transfer-receipt.schema'
import { useScanPreferences } from '@/features/transfer/utils/scan-preferences'
import type { StockIssuePickLocation } from '../types/stock-issue.types'
import type { StockPickingLine } from '../utils/stock-issue-picking'
import { isStockIssueRackLocation } from '../utils/stock-issue-location'

export function useStockIssuePickScan(
  line: StockPickingLine,
  source: StockIssuePickLocation | undefined,
  maximum: number,
  disabled: boolean
) {
  const [preferences] = useScanPreferences()
  const [slotCode, setSlotCode] = useState('')
  const [productCode, setProductCode] = useState('')
  const [quantityText, setQuantityText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const count = useRef(0)
  const quantity = parseTransferQuantityInput(quantityText)
  const ready = Boolean(slotCode && productCode)
  const quantityError = !ready
    ? null
    : !Number.isFinite(quantity) || quantity <= 0
      ? 'Số lượng phải lớn hơn 0.'
      : quantity > maximum
        ? `Chỉ được lấy tối đa ${maximum} ${line.unitName}.`
        : line.unitFactor !== 1 && !Number.isInteger(quantity)
          ? `Chỉ lấy nguyên ${line.unitName}.`
          : Math.abs(quantity * 100 - Math.round(quantity * 100)) > 1e-7
            ? 'Số lượng có tối đa 2 chữ số thập phân.'
            : null
  function scanSlot(code: string) {
    if (disabled) return false
    setProductCode('')
    setQuantityText('')
    count.current = 0
    const candidates = source
      ? transferLocationScanCodes({
          ...source,
          isSystemDefaultSlot: isStockIssueRackLocation(source),
        })
      : []
    if (!source || !codesMatch(code, ...candidates)) {
      setSlotCode('')
      setError('Mã vị trí không khớp với dòng đang lấy. Kiểm tra đúng khu vực và kệ.')
      return false
    }
    setSlotCode(code.trim())
    setError(null)
    return true
  }
  function scanProduct(code: string) {
    if (disabled || !slotCode) return false
    // Outbound requires the actual product barcode when configured.
    if (!codesMatch(code, line.barcode || line.sku)) {
      setProductCode('')
      setError('Mã hàng không khớp với sản phẩm đang lấy.')
      return false
    }
    if (preferences.eachUnit && count.current + 1 > maximum) {
      setError(`Đã đủ ${maximum} ${line.unitName} tại vị trí này.`)
      return false
    }
    count.current = preferences.eachUnit ? Math.min(count.current + 1, maximum) : maximum
    setProductCode(code.trim())
    setQuantityText(String(count.current))
    setError(null)
    return true
  }
  return {
    slotCode,
    productCode,
    quantityText,
    quantity,
    quantityError,
    error,
    ready,
    eachUnit: preferences.eachUnit,
    scanSlot,
    scanProduct,
    changeQuantity: (value: string) => {
      if (!disabled) {
        setQuantityText(value)
        count.current = parseTransferQuantityInput(value) || 0
        setError(null)
      }
    },
    reset: () => {
      if (!disabled) {
        setSlotCode('')
        setProductCode('')
        setQuantityText('')
        setError(null)
        count.current = 0
      }
    },
  }
}
