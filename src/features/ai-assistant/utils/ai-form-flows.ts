import {
  AI_FORM_FLOW_TYPES,
  type AiFormFieldKey,
  type AiFormFlowType,
} from '../types/ai-form.types'

export interface AiFormFlowDefinition {
  readonly title: string
  /** Sent as a normal chat message to start again after the form expired. */
  readonly startMessage: string
  /** Fields asked on each step, in order. The last step is the one that sends the form. */
  readonly steps: readonly { readonly fields: readonly AiFormFieldKey[]; readonly hint: string }[]
}

/** What differs per flow type. A new flow (inbound) is one more entry here, not another branch. */
export const AI_FORM_FLOWS: Readonly<Record<AiFormFlowType, AiFormFlowDefinition>> = {
  [AI_FORM_FLOW_TYPES.stockIssueCreate]: {
    title: 'Lập bản nháp phiếu xuất kho',
    startMessage: 'Lập bản nháp phiếu xuất kho',
    steps: [
      { fields: ['warehouse', 'recipient'], hint: 'Chọn kho xuất và người nhận' },
      { fields: ['lines', 'purpose'], hint: 'Thêm sản phẩm và mục đích xuất' },
    ],
  },
}
