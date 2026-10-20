import { CycleCountDetailPage } from '@/features/cycle-count/pages'

export default async function Page({
  params,
}: {
  readonly params: Promise<{ cycleCountId: string }>
}) {
  const { cycleCountId } = await params
  return <CycleCountDetailPage cycleCountId={cycleCountId} view="lines" />
}
