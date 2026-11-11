import {
  Building2,
  CheckCircle2,
  ClipboardList,
  HardHat,
  ScanBarcode,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type PreviewRow = {
  code: string
  label: string
  status: string
}

type RoleWorkspace = {
  value: string
  icon: LucideIcon
  label: string
  headline: string
  description: string
  capabilities: readonly string[]
  previewTitle: string
  previewRows: readonly PreviewRow[]
}

/* Mirrors the tenant / manager / staff dashboards each role lands on after login */
const roleWorkspaces: RoleWorkspace[] = [
  {
    value: 'owner',
    icon: Building2,
    label: 'Chủ doanh nghiệp',
    headline: 'Nhìn toàn bộ chuỗi kho từ một nơi',
    description:
      'Quản lý tổ chức, nhân sự và gói dịch vụ. Theo dõi tồn kho, sản lượng và báo cáo của tất cả các kho.',
    capabilities: [
      'Mời nhân sự và gán vai trò tùy chỉnh',
      'Báo cáo tồn kho, nhập – xuất theo kỳ',
      'Quản lý gói dịch vụ và hóa đơn',
    ],
    previewTitle: 'Tổng quan tổ chức',
    previewRows: [
      { code: 'KHO-HN', label: 'Kho Hà Nội · 12.480 SKU', status: 'Hoạt động' },
      { code: 'KHO-DN', label: 'Kho Đà Nẵng · 8.215 SKU', status: 'Hoạt động' },
      { code: 'KHO-HCM', label: 'Kho TP.HCM · 15.902 SKU', status: 'Hoạt động' },
    ],
  },
  {
    value: 'manager',
    icon: ClipboardList,
    label: 'Quản lý kho',
    headline: 'Duyệt chứng từ, điều phối công việc',
    description:
      'Phê duyệt yêu cầu nhập, phiếu xuất và điều chỉnh tồn. Giao việc cho nhân viên và theo dõi tiến độ trong ngày.',
    capabilities: [
      'Duyệt yêu cầu nhập, xuất và điều chuyển',
      'Lập đợt kiểm kê, xử lý chênh lệch',
      'Thiết kế sơ đồ kho và vị trí lưu trữ',
    ],
    previewTitle: 'Chờ phê duyệt',
    previewRows: [
      { code: 'YCN-0412', label: 'Yêu cầu nhập · NCC Minh Phát', status: 'Chờ duyệt' },
      { code: 'PXK-1187', label: 'Phiếu xuất · Đại lý Sơn Trà', status: 'Chờ duyệt' },
      { code: 'DCT-0093', label: 'Điều chuyển HN → ĐN', status: 'Đang giao' },
    ],
  },
  {
    value: 'staff',
    icon: HardHat,
    label: 'Nhân viên kho',
    headline: 'Biết rõ việc cần làm, quét là xong',
    description:
      'Danh sách công việc được giao rõ ràng. Quét mã vạch vị trí và sản phẩm để nhận, cất, lấy hàng chính xác.',
    capabilities: [
      'Danh sách việc được giao theo ca',
      'Quét mã vạch bằng camera điện thoại',
      'Lịch sử công việc đã hoàn thành',
    ],
    previewTitle: 'Việc của tôi hôm nay',
    previewRows: [
      { code: 'A-04-12', label: 'Cất 24 thùng · SKU-TP-0192', status: 'Đang làm' },
      { code: 'B-01-03', label: 'Lấy 6 thùng · PXK-1187', status: 'Chờ làm' },
      { code: 'C-02-07', label: 'Kiểm kê bin · Đợt KK-11', status: 'Chờ làm' },
    ],
  },
]

function WorkspacePreview({ workspace }: { workspace: RoleWorkspace }) {
  return (
    <Card aria-hidden="true" className="border-border/70 gap-0 py-0 shadow-sm">
      <CardContent className="p-0">
        <div className="border-border/70 flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">{workspace.previewTitle}</span>
          <ScanBarcode className="text-muted-foreground size-4" />
        </div>
        <ul className="divide-border/70 divide-y">
          {workspace.previewRows.map((row) => (
            <li key={row.code} className="flex items-center gap-3 px-4 py-3">
              <span className="bg-muted text-primary rounded-md px-2 py-1 font-mono text-[11px] font-semibold">
                {row.code}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{row.label}</span>
              <span className="bg-secondary-container text-on-secondary-container shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium">
                {row.status}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function RoleWorkspacesSection() {
  return (
    <section
      id="roles"
      className="border-border/60 bg-surface-container-low/60 scroll-mt-14 border-y"
      aria-labelledby="roles-heading"
    >
      <div className="mx-auto w-full max-w-(--container-landing) px-4 py-16 md:px-6 lg:py-24">
        <div className="mb-10 max-w-2xl">
          <p className="text-primary text-xs font-semibold tracking-[0.12em] uppercase">
            Đúng người, đúng việc
          </p>
          <h2 id="roles-heading" className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
            Mỗi vai trò có một không gian làm việc riêng
          </h2>
        </div>

        <Tabs defaultValue="owner" className="gap-8">
          <TabsList variant="workspace" className="h-auto flex-wrap gap-2">
            {roleWorkspaces.map((workspace) => {
              const RoleIcon = workspace.icon
              return (
                <TabsTrigger
                  key={workspace.value}
                  value={workspace.value}
                  className="h-9 rounded-full border border-transparent px-4"
                >
                  <RoleIcon className="size-4" aria-hidden="true" />
                  {workspace.label}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {roleWorkspaces.map((workspace) => (
            <TabsContent
              key={workspace.value}
              value={workspace.value}
              className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12"
            >
              <div>
                <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
                  {workspace.headline}
                </h3>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed md:text-base">
                  {workspace.description}
                </p>
                <ul className="mt-6 flex flex-col gap-3">
                  {workspace.capabilities.map((capability) => (
                    <li key={capability} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2
                        className="text-primary mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                      />
                      {capability}
                    </li>
                  ))}
                </ul>
              </div>
              <WorkspacePreview workspace={workspace} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  )
}
