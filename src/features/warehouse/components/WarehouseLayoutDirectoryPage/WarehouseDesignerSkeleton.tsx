import { Skeleton } from '@/components/ui/skeleton'

export function WarehouseDesignerSkeleton() {
  return (
    <section
      className="bg-surface-container-lowest fixed inset-0 z-40 flex min-h-0 flex-col overflow-hidden"
      aria-label="Đang tải sơ đồ kho"
    >
      <header className="flex min-h-16 shrink-0 items-center border-b px-5">
        <Skeleton className="h-6 w-56" />
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(16rem,30%)_1fr]">
        <div className="space-y-3 border-r p-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="m-5 h-[calc(100%-2.5rem)] w-[calc(100%-2.5rem)]" />
      </div>
    </section>
  )
}
