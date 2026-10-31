import ReturnWorkTaskPage from '@/features/warehouse-task/pages/ReturnWorkTaskPage'

export default async function Page({ params }: { readonly params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  return <ReturnWorkTaskPage supplier={false} taskId={taskId} />
}
