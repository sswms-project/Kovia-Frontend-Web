import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { MyWarehouseTaskListResponse } from '@/features/warehouse-task/types/warehouse-task.types'
import { APP_ROUTES } from '@/routes/app-routes'
import { OverviewMetric } from './OverviewMetric'

interface PersonalWorkOverviewProps {
  readonly data?: MyWarehouseTaskListResponse
  readonly isPending: boolean
  readonly isFetching: boolean
  readonly errorMessage?: string
  readonly onRefresh: () => void
}
export function PersonalWorkOverview({
  data,
  isPending,
  isFetching,
  errorMessage,
  onRefresh,
}: PersonalWorkOverviewProps) {
  return (
    <div className="space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Công việc của tôi</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Các công việc chưa kết thúc được giao cho bạn.
          </p>
        </div>
        <Button variant="outline" disabled={isFetching} onClick={onRefresh}>
          Làm mới
        </Button>
      </header>
      {errorMessage ? (
        <div role="alert" className="text-destructive text-sm">
          {data ? 'Dữ liệu cũ — ' : ''}
          {errorMessage}
        </div>
      ) : null}
      {isPending ? <Skeleton className="h-36" /> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <OverviewMetric
              label="Công việc hiện tại"
              value={data.totalCount}
              description="Chưa hoàn tất hoặc hủy"
              href={APP_ROUTES.myTasks}
            />
            <OverviewMetric
              label="Chờ bắt đầu"
              value={data.stats.queuedCount}
              description="Việc đã được giao"
            />
            <OverviewMetric
              label="Đang xử lý"
              value={data.stats.inProgressCount}
              description="Không gồm việc tạm dừng"
            />
            <OverviewMetric
              label="Quá hạn"
              value={data.stats.overdueCount}
              description="Đã qua deadline và chưa kết thúc"
              href={`${APP_ROUTES.myTasks}?deadlineStatus=Overdue`}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Việc cần chú ý</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.items.map((task) => (
                <Link
                  key={`${task.taskType}-${task.id}`}
                  href={APP_ROUTES.myTasks}
                  className="hover:bg-muted flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition-colors motion-reduce:transition-none"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {task.referenceCode} · {task.title}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {task.warehouseName}
                      {task.dueAt
                        ? ` · Hạn: ${new Date(task.dueAt).toLocaleString('vi-VN')}`
                        : ' · Chưa đặt hạn'}
                    </p>
                  </div>
                  <span className="text-xs">
                    {task.deadlineStatus === 'Overdue'
                      ? 'Quá hạn'
                      : task.executionStatus === 'InProgress'
                        ? 'Đang xử lý'
                        : task.executionStatus === 'Paused'
                          ? 'Tạm dừng'
                          : 'Chờ bắt đầu'}
                  </span>
                </Link>
              ))}
              {data.totalCount === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Bạn chưa có công việc đang chờ xử lý.
                </p>
              ) : null}
              <Link
                href={APP_ROUTES.myTasks}
                className="text-primary inline-block text-sm hover:underline"
              >
                Mở danh sách công việc →
              </Link>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
