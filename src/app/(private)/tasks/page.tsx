import { MyWarehouseTasksPage } from '@/features/warehouse-task/pages'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ taskId?: string; warehouseId?: string; deadlineStatus?: string }>
}) {
  const { taskId, warehouseId, deadlineStatus } = await searchParams
  return (
    <MyWarehouseTasksPage
      key={`${taskId ?? ''}:${warehouseId ?? ''}:${deadlineStatus ?? ''}`}
      initialTaskId={taskId}
      initialWarehouseId={warehouseId}
      initialDeadline={deadlineStatus === 'Overdue' ? 'Overdue' : undefined}
    />
  )
}
