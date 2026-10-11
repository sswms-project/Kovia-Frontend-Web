import { formatTransferLocation, transferLocationScanCodes } from './transfer-location'
import type {
  TransferPickAlternative,
  TransferPickSheetLine,
  TransferPickSuggestion,
} from '../types/transfer.types'

/** BE so khớp không phân biệt hoa thường và đã cắt khoảng trắng; FE phản chiếu đúng quy tắc đó. */
export function normalizeScanCode(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase('vi')
}

export function codesMatch(
  scanned: string,
  ...candidates: ReadonlyArray<string | null | undefined>
): boolean {
  const code = normalizeScanCode(scanned)
  if (!code) return false
  return candidates.some((candidate) => normalizeScanCode(candidate) === code)
}

export type PickScanStep = 'slot' | 'product' | 'ready'

export interface PickScanState {
  readonly step: PickScanStep
  readonly slotCode: string
  readonly suggestion: TransferPickSuggestion | null
  readonly productCode: string
  readonly error: string | null
  /** Vị trí vừa quét không phải gợi ý nhưng có đúng hàng, còn tồn khả dụng: hỏi nhân viên có lấy thay không. */
  readonly offeredAlternative: TransferPickAlternative | null
}

export const INITIAL_PICK_SCAN_STATE: PickScanState = {
  step: 'slot',
  slotCode: '',
  suggestion: null,
  productCode: '',
  error: null,
  offeredAlternative: null,
}

export type PickScanAction =
  | {
      readonly type: 'scan-slot'
      readonly code: string
      readonly suggestions: readonly TransferPickSuggestion[]
      readonly alternatives: readonly TransferPickAlternative[]
      /** Để nhận ra nhân viên quét nhầm mã hàng vào ô vị trí. */
      readonly line?: Pick<TransferPickSheetLine, 'sku' | 'productBarcode'>
    }
  | { readonly type: 'scan-product'; readonly code: string; readonly line: TransferPickSheetLine }
  | { readonly type: 'reset' }

export function pickScanReducer(state: PickScanState, action: PickScanAction): PickScanState {
  switch (action.type) {
    case 'reset':
      return INITIAL_PICK_SCAN_STATE
    case 'scan-slot': {
      const code = action.code.trim()
      if (!code) return { ...INITIAL_PICK_SCAN_STATE, error: 'Hãy quét hoặc nhập mã vị trí.' }
      const suggestion = action.suggestions.find((candidate) =>
        codesMatch(code, ...transferLocationScanCodes(candidate))
      )
      if (suggestion) {
        return { ...INITIAL_PICK_SCAN_STATE, step: 'product', slotCode: code, suggestion }
      }
      const alternative = action.alternatives.find((candidate) =>
        codesMatch(code, ...transferLocationScanCodes(candidate))
      )
      const isProductCode =
        !alternative && action.line && codesMatch(code, action.line.sku, action.line.productBarcode)
      return {
        ...INITIAL_PICK_SCAN_STATE,
        slotCode: code,
        error: alternative
          ? `${formatTransferLocation(alternative)} không phải vị trí được gợi ý cho dòng này.`
          : isProductCode
            ? 'Đây là mã hàng. Hãy quét mã vị trí trước.'
            : `Mã vị trí ${code} không khớp với vị trí cần lấy của dòng này.`,
        offeredAlternative: alternative ?? null,
      }
    }
    case 'scan-product': {
      if (state.step === 'slot') return state
      const code = action.code.trim()
      if (!code) return { ...state, error: 'Hãy quét hoặc nhập mã hàng.' }
      if (!codesMatch(code, action.line.sku, action.line.productBarcode)) {
        const isSlotCode =
          state.suggestion && codesMatch(code, ...transferLocationScanCodes(state.suggestion))
        return {
          ...state,
          step: 'product',
          productCode: '',
          error: isSlotCode
            ? 'Đây là mã vị trí. Hãy quét mã hàng.'
            : `Mã hàng ${code} không khớp với ${action.line.sku}.`,
        }
      }
      return { ...state, step: 'ready', productCode: code, error: null }
    }
  }
}

/**
 * Quét từng đơn vị: mỗi lần quét đúng mã hàng cộng 1 vào số lượng đã quét; trả null khi đã đủ số tối đa của vị trí.
 * Lần quét đầu (chưa ở bước sẵn sàng) tính từ 0.
 */
export function nextEachUnitQuantity(
  step: PickScanStep,
  quantity: number,
  maximum: number
): number | null {
  const current = step === 'ready' ? quantity : 0
  return current >= maximum ? null : current + 1
}

export function getDefaultPickQuantity(
  suggestion: Pick<TransferPickSuggestion, 'suggestedQuantity'>,
  line: Pick<TransferPickSheetLine, 'remainingQuantity'>
): number {
  return Math.max(0, Math.min(suggestion.suggestedQuantity, line.remainingQuantity))
}

export function hasAtMostTwoDecimals(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-9
}

/** Trả về thông báo lỗi tiếng Việt hoặc null nếu số lượng hợp lệ. */
export function validatePickQuantity(quantity: number, maximum: number): string | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return 'Số lượng phải lớn hơn 0.'
  if (!hasAtMostTwoDecimals(quantity)) return 'Số lượng chỉ có tối đa 2 chữ số thập phân.'
  if (quantity > maximum) return `Không được lấy vượt quá số lượng cần lấy (${maximum}).`
  return null
}

/** Lô có hạn sớm hơn lô được chọn nghĩa là chọn lô không theo FEFO. */
export function isNonFefoChoice(
  chosen: Pick<TransferPickAlternative, 'expiryDate' | 'inventoryStockId'>,
  candidates: ReadonlyArray<Pick<TransferPickAlternative, 'expiryDate' | 'inventoryStockId'>>
): boolean {
  const expiry = (value: string | null) => value ?? '9999-12-31'
  const earliest = candidates.reduce<string>(
    (current, candidate) =>
      expiry(candidate.expiryDate) < current ? expiry(candidate.expiryDate) : current,
    '9999-12-31'
  )
  return expiry(chosen.expiryDate) > earliest
}
