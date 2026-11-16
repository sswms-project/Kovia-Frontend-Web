import {
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Info,
  OctagonAlert,
  type LucideIcon,
} from 'lucide-react'
import type { AiOutcomeTone } from '../types/ai-outcome-report.types'

// Same tokens the other AI cards use: `primary` is the app's green (there is no success token),
// `warning` and `destructive` come from index.css, neutral stays muted. Never hard-coded colors.

interface ToneView {
  readonly icon: LucideIcon
  readonly text: string
  /** Read by screen readers so tone is not carried by color alone; none for neutral. */
  readonly label: string | null
  /** Colors the Progress indicator. */
  readonly bar: string
}

export const OUTCOME_TONE: Record<AiOutcomeTone, ToneView> = {
  neutral: {
    icon: Info,
    text: 'text-muted-foreground',
    label: null,
    bar: '[&_[data-slot=progress-indicator]]:bg-primary',
  },
  ok: {
    icon: CircleCheck,
    text: 'text-primary',
    label: 'Ổn',
    bar: '[&_[data-slot=progress-indicator]]:bg-primary',
  },
  warning: {
    icon: CircleAlert,
    text: 'text-warning',
    label: 'Cần chú ý',
    bar: '[&_[data-slot=progress-indicator]]:bg-warning',
  },
  danger: {
    icon: OctagonAlert,
    text: 'text-destructive',
    label: 'Nghiêm trọng',
    bar: '[&_[data-slot=progress-indicator]]:bg-destructive',
  },
}

interface StatusView {
  readonly icon: LucideIcon
  readonly tone: AiOutcomeTone
  readonly label: string
}

/** `no_action_needed` is a good outcome, so it is never red. */
const OUTCOME_STATUS: Record<string, StatusView> = {
  completed: { icon: CircleCheck, tone: 'ok', label: 'Hoàn tất' },
  no_action_needed: { icon: CircleCheck, tone: 'ok', label: 'Không cần xử lý' },
  partial: { icon: CircleAlert, tone: 'warning', label: 'Một phần' },
  action_required: { icon: CircleAlert, tone: 'warning', label: 'Cần xử lý' },
  failed: { icon: OctagonAlert, tone: 'danger', label: 'Không hoàn tất' },
  insufficient_data: { icon: CircleHelp, tone: 'neutral', label: 'Chưa đủ dữ liệu' },
}

const UNKNOWN_STATUS: StatusView = { icon: Info, tone: 'neutral', label: 'Kết quả' }

export function getOutcomeStatusView(status: string): StatusView {
  return OUTCOME_STATUS[status] ?? UNKNOWN_STATUS
}

const BUSINESS_STATUS_LABEL: Record<string, string> = {
  NEEDS_SUPPLIER: 'Cần nhà cung cấp',
  HAS_PENDING_REQUEST: 'Đã có yêu cầu chờ xử lý',
  COVERED_BY_CONFIRMED_INBOUND: 'Đã có hàng sắp về',
  READY_TO_PROPOSE: 'Sẵn sàng đề xuất',
  NO_REPLENISHMENT_NEEDED: 'Chưa cần bổ sung',
  INSUFFICIENT_DATA: 'Chưa đủ dữ liệu',
}

/** A status this build does not know is not shown: raw enum names are not user text. */
export function getBusinessStatusLabel(status?: string | null): string | null {
  return (status && BUSINESS_STATUS_LABEL[status]) || null
}
