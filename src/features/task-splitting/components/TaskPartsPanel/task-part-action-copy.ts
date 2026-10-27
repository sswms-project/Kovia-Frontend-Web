import type { TaskPartDialogAction } from '../../schemas/task-part-action.schema'

interface ActionCopy {
  readonly title: string
  readonly description: string
  readonly submit: string
}

export const TASK_PART_ACTION_COPY: Record<TaskPartDialogAction, ActionCopy> = {
  edit: {
    title: 'Sửa phần',
    description: 'Đổi người hoặc số lượng của phần chưa bắt đầu. Số lượng 0 sẽ bỏ dòng khỏi phần.',
    submit: 'Lưu',
  },
  reassign: {
    title: 'Giao lại phần',
    description: 'Phần về hàng đợi của người mới. Lý do được gửi cho cả hai người.',
    submit: 'Giao lại',
  },
  splitRemaining: {
    title: 'Tách phần còn lại',
    description: 'Nhập lượng chưa làm muốn chuyển sang một phần mới cho người khác.',
    submit: 'Tách phần',
  },
  merge: {
    title: 'Gộp phần',
    description: 'Số lượng của phần này được cộng vào phần được chọn; phần này bị huỷ.',
    submit: 'Gộp',
  },
  cancel: {
    title: 'Huỷ phần',
    description: 'Lượng của phần trở về chưa giao.',
    submit: 'Huỷ phần',
  },
  complete: {
    title: 'Hoàn tất phần',
    description: 'Chốt phần với lượng đã làm; phần thiếu trở về chưa giao.',
    submit: 'Hoàn tất phần',
  },
  cancelSplit: {
    title: 'Huỷ chia việc',
    description: 'Huỷ mọi phần chưa bắt đầu; việc trở về hàng đợi chưa giao.',
    submit: 'Huỷ chia',
  },
}
