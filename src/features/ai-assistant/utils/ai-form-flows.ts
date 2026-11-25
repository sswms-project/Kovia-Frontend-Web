import { AI_ACTIONS } from '../types/ai-assistant.types'
import {
  AI_FORM_FLOW_TYPES,
  type AiFormFieldKey,
  type AiFormFlowType,
} from '../types/ai-form.types'

export interface AiFormFlowDefinition {
  readonly title: string
  /** The document in running text, e.g. "Biểu mẫu phiếu xuất kho". */
  readonly document: string
  /** Sent as a normal chat message to start again after the form expired. */
  readonly startMessage: string
  /** Fields asked on each step, in order. The last step is the one that sends the form. */
  readonly steps: readonly { readonly fields: readonly AiFormFieldKey[]; readonly hint: string }[]
  /**
   * The draft type the form prepares. Its draft-editor descriptor supplies the pickers, labels,
   * validation and request of every flow except the stock issue one, which keeps its own step components.
   */
  readonly action: string
}

/** What differs per flow type. A new flow is one more entry here, not another branch. */
export const AI_FORM_FLOWS: Readonly<Record<AiFormFlowType, AiFormFlowDefinition>> = {
  [AI_FORM_FLOW_TYPES.stockIssueCreate]: {
    title: 'Lập bản nháp phiếu xuất kho',
    document: 'phiếu xuất kho',
    startMessage: 'Lập bản nháp phiếu xuất kho',
    steps: [
      { fields: ['warehouse', 'recipient'], hint: 'Chọn kho xuất và người nhận' },
      { fields: ['lines', 'purpose'], hint: 'Thêm sản phẩm và mục đích xuất' },
    ],
    action: AI_ACTIONS.createStockIssueRequest,
  },
  [AI_FORM_FLOW_TYPES.inboundRequestCreate]: {
    title: 'Lập bản nháp yêu cầu nhập kho',
    document: 'yêu cầu nhập kho',
    startMessage: 'Lập bản nháp yêu cầu nhập kho',
    steps: [
      {
        fields: ['warehouse', 'supplier', 'expectedDate'],
        hint: 'Chọn kho nhận, nhà cung cấp và ngày dự kiến',
      },
      { fields: ['lines'], hint: 'Thêm sản phẩm cần nhập' },
    ],
    action: AI_ACTIONS.createInboundRequest,
  },
}

/** Every field the flow asks for, across its steps. */
export function aiFormFlowFields(flowType: AiFormFlowType): readonly AiFormFieldKey[] {
  return AI_FORM_FLOWS[flowType].steps.flatMap((step) => step.fields)
}
