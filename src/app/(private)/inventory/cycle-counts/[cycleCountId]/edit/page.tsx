import CreateCycleCountPage from '@/features/cycle-count/pages/CreateCycleCountPage'

export default async function Page({ params }: { params: Promise<{ cycleCountId: string }> }) {
  const { cycleCountId } = await params
  return <CreateCycleCountPage cycleCountId={cycleCountId} />
}
