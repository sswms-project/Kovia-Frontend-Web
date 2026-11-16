import type { AiDraftWarning } from '../schemas/ai-draft-edit.schema'

const LINE_NUMBER = /^lines\.(\d+)/

const COPY_BY_CODE: Readonly<Record<string, string>> = {
  EXPECTED_DATE_RESET: 'Ngày dự kiến nhận đã qua nên được đặt lại thành hôm nay.',
  SUPPLIER_UNAVAILABLE:
    'Nhà cung cấp đã lưu không còn hoạt động. Hãy chọn nhà cung cấp khác trước khi lưu.',
  UNIT_CHANGED_QUANTITY_KEPT: 'Đã đổi đơn vị, số lượng được giữ nguyên.',
}

/** The line the BE sent a warning for, when the warning names one (`lines.{index}.…`). */
function getLinePrefix(field: string | null | undefined): string {
  const index = LINE_NUMBER.exec(field ?? '')?.[1]
  return index === undefined ? '' : `Sản phẩm ${Number(index) + 1}: `
}

/** FE copy for the codes it knows; any other warning (a shortage, an older code) keeps the BE's message. */
export function getAiDraftWarningText(warning: AiDraftWarning): string {
  const copy = COPY_BY_CODE[warning.code]
  return copy ? `${getLinePrefix(warning.field)}${copy}` : warning.message
}
