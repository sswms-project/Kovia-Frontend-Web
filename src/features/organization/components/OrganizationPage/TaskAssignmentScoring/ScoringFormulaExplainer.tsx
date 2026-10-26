import { Sigma } from 'lucide-react'
import type { TaskAssignmentScoringWeights } from '../../../types/organization.types'
import { formatScore } from './scoring-fields'

const EXAMPLE_LINES = 5
const EXAMPLE_QUANTITY = 200

interface ScoringFormulaExplainerProps {
  /** null khi ô nhập đang có giá trị không hợp lệ, lúc đó bỏ qua ví dụ. */
  readonly weights: TaskAssignmentScoringWeights | null
}

// Cùng công thức với AssigneeWorkloadScoring ở Backend, chỉ để minh họa.
function exampleScore(weights: TaskAssignmentScoringWeights) {
  const raw =
    weights.receivingBase +
    weights.pointsPerLine * EXAMPLE_LINES +
    weights.pointsPerQuantityLog * Math.log10(1 + EXAMPLE_QUANTITY)
  return Math.round(raw * weights.urgentMultiplier * 10) / 10
}

export function ScoringFormulaExplainer({ weights }: ScoringFormulaExplainerProps) {
  return (
    <div className="bg-muted/40 space-y-2 border p-4 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <Sigma className="text-primary size-4" aria-hidden="true" />
        Cách tính điểm tải
      </p>
      <p className="text-xs leading-relaxed">
        Điểm một việc = (điểm nền theo loại việc + điểm mỗi dòng × số dòng còn lại + hệ số số lượng
        × log10(1 + số lượng còn lại)) × hệ số việc gấp (chỉ với việc Khẩn).
      </p>
      <p className="text-muted-foreground text-xs">
        Điểm tải của nhân viên là tổng điểm mọi việc đang mở của họ, chỉ tính phần còn phải làm. Khi
        giao việc, danh sách nhân viên xếp theo điểm tải tăng dần và người thấp nhất được đề xuất.
      </p>
      {weights ? (
        <p className="text-muted-foreground text-xs">
          Ví dụ: một việc nhận hàng Khẩn còn {EXAMPLE_LINES} dòng, {EXAMPLE_QUANTITY} đơn vị được
          tính{' '}
          <span className="text-foreground font-medium tabular-nums">
            {formatScore(exampleScore(weights))} điểm
          </span>{' '}
          với các hệ số đang nhập.
        </p>
      ) : null}
    </div>
  )
}
