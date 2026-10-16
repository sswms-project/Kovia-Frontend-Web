import { SCORING_LIMITS } from '../../../schemas/task-assignment-scoring.schema'
import type { ScoringFieldDefinition } from './types'

export const BASE_SCORE_FIELDS: readonly ScoringFieldDefinition[] = [
  {
    key: 'receivingBase',
    label: 'Nhận hàng',
    hint: 'Điểm nền của mỗi việc nhận hàng đang mở.',
    ...SCORING_LIMITS.base,
  },
  {
    key: 'putAwayBase',
    label: 'Cất hàng',
    hint: 'Điểm nền của mỗi việc cất hàng đang mở.',
    ...SCORING_LIMITS.base,
  },
  {
    key: 'warehouseTaskBase',
    label: 'Công việc kho',
    hint: 'Điều chuyển vị trí, lấy hàng điều chuyển và các việc kho khác.',
    ...SCORING_LIMITS.base,
  },
  {
    key: 'cycleCountBase',
    label: 'Kiểm kê',
    hint: 'Điểm nền của mỗi phiếu kiểm kê đang mở.',
    ...SCORING_LIMITS.base,
  },
]

export const VOLUME_FIELDS: readonly ScoringFieldDefinition[] = [
  {
    key: 'pointsPerLine',
    label: 'Điểm mỗi dòng hàng',
    hint: 'Cộng thêm cho mỗi dòng hàng còn phải làm.',
    ...SCORING_LIMITS.points,
  },
  {
    key: 'pointsPerQuantityLog',
    label: 'Hệ số theo số lượng',
    hint: 'Nhân với log10(1 + số lượng còn lại), để lô hàng lớn không lấn át mọi yếu tố khác.',
    ...SCORING_LIMITS.points,
  },
  {
    key: 'urgentMultiplier',
    label: 'Hệ số việc gấp',
    hint: 'Điểm của việc có mức ưu tiên Khẩn được nhân với hệ số này.',
    ...SCORING_LIMITS.urgentMultiplier,
  },
]

export function formatScore(value: number) {
  return value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
}
