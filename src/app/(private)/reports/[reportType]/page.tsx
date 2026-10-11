import ReportWorkspacePage from '@/features/reporting/pages/ReportWorkspacePage'

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ reportType: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { reportType } = await params
  const filters = await searchParams
  return (
    <ReportWorkspacePage
      key={`${reportType}:${JSON.stringify(filters)}`}
      reportType={reportType}
      initialFilters={filters}
    />
  )
}
