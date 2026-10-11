import {
  AlertTriangle,
  Boxes,
  ClipboardCheck,
  PackageCheck,
  PackageMinus,
  Warehouse,
} from 'lucide-react'

const metrics = [
  { label: 'Available stock', value: '42,680', detail: 'Across 3 warehouses', icon: Boxes },
  { label: 'Low stock SKUs', value: '18', detail: 'Need reorder review', icon: AlertTriangle },
  { label: 'Inbound today', value: '12', detail: '4 awaiting approval', icon: PackageCheck },
  { label: 'Stock issues', value: '31', detail: '7 awaiting dispatch', icon: PackageMinus },
]

const workflows = [
  ['Inbound request IR-1048', 'Confirmed', 'Awaiting goods receipt'],
  ['Stock issue request SIR-8831', 'Picking', 'Assigned to staff team A'],
  ['Cycle count WH-A-Z2', 'In progress', '128 slots remaining'],
  ['Stock transfer ST-221', 'Approved', 'From WH-A to WH-C'],
]

export function OperationsDashboard() {
  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon

          return (
            <article
              key={metric.label}
              className="border-border bg-card rounded-lg border p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm font-medium">{metric.label}</p>
                <Icon className="text-primary size-5" aria-hidden="true" />
              </div>
              <p className="text-foreground mt-4 text-3xl font-semibold">{metric.value}</p>
              <p className="text-muted-foreground mt-1 text-sm">{metric.detail}</p>
            </article>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="border-border bg-card rounded-lg border p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <Warehouse className="text-primary size-5" aria-hidden="true" />
            <h2 className="text-foreground text-lg font-semibold">Warehouse Activity</h2>
          </div>
          <div className="border-border mt-6 overflow-x-auto rounded-md border">
            <div className="bg-muted text-muted-foreground grid min-w-[620px] grid-cols-3 px-4 py-3 text-xs font-semibold uppercase">
              <span>Workflow</span>
              <span>Status</span>
              <span>Next action</span>
            </div>
            {workflows.map(([name, status, action]) => (
              <div
                key={name}
                className="border-border grid min-w-[620px] grid-cols-3 border-t px-4 py-4 text-sm"
              >
                <span className="text-foreground font-medium">{name}</span>
                <span className="text-muted-foreground">{status}</span>
                <span className="text-muted-foreground">{action}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-border bg-card rounded-lg border p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="text-primary size-5" aria-hidden="true" />
            <h2 className="text-foreground text-lg font-semibold">Controls Ready</h2>
          </div>
          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-muted-foreground">API theo doanh nghiệp</dt>
              <dd className="text-foreground font-medium">Enabled</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-muted-foreground">RBAC route group</dt>
              <dd className="text-foreground font-medium">Prepared</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-muted-foreground">RTK Query cache tags</dt>
              <dd className="text-foreground font-medium">Configured</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  )
}
