import { useRef, useState } from 'react'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../../types/warehouse-layout-scene.types'

export function WarehouseUnplacedLocations({
  scene,
  onSelect,
}: {
  readonly scene: WarehouseLayoutEditorScene
  readonly onSelect: (selection: WarehouseLayoutSelection) => void
}) {
  const [open, setOpen] = useState(false)
  const pendingSelection = useRef<WarehouseLayoutSelection | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const zones = new Map(scene.zones.map((zone) => [zone.id, zone]))
  const items = [
    ...scene.zones
      .filter((zone) => zone.placementPending && zone.status === 'Active')
      .map((zone) => ({
        kind: 'zone' as const,
        id: zone.id,
        path: zone.zoneCode,
        name: zone.zoneName,
      })),
    ...scene.racks
      .filter(
        (rack) =>
          rack.placementPending &&
          rack.status === 'Active' &&
          zones.get(rack.zoneId)?.status === 'Active'
      )
      .map((rack) => ({
        kind: 'rack' as const,
        id: rack.id,
        path: `${zones.get(rack.zoneId)?.zoneCode ?? ''} / ${rack.rackCode}`,
        name: rack.rackName,
      })),
  ]
  if (!items.length) return null
  const filtered = items.filter((item) =>
    `${item.path} ${item.name}`
      .toLocaleLowerCase('vi')
      .includes(search.trim().toLocaleLowerCase('vi'))
  )
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)))
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="mx-4 mb-3 shrink-0">
          Chưa sắp xếp ({items.length})
        </Button>
      </SheetTrigger>
      <SheetContent
        onCloseAutoFocus={(event) => {
          const nextSelection = pendingSelection.current
          if (!nextSelection) return
          event.preventDefault()
          pendingSelection.current = null
          onSelect(nextSelection)
        }}
        showCloseButton={false}
        className="flex flex-col data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader className="pr-20">
          <SheetTitle>Vị trí chưa sắp xếp</SheetTitle>
          <SheetDescription>
            Hình trên sơ đồ là vị trí tạm. Chọn đúng mục tại đây để xem hoặc chỉnh; chỉ lưu bố cục
            các khu/kệ đã chủ động đặt vị trí khi bạn nhấn Lưu.
          </SheetDescription>
        </SheetHeader>
        <SheetClose asChild>
          <Button variant="outline" size="sm" className="absolute top-4 right-4">
            Đóng
          </Button>
        </SheetClose>
        <OperationalListPanel
          aria-label="Danh sách vị trí chưa sắp xếp"
          className="mx-4 mb-4 w-auto"
        >
          <div className="shrink-0 border-b p-3">
            <Input
              aria-label="Tìm vị trí chưa sắp xếp"
              placeholder="Tìm mã hoặc tên…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <Table className="table-fixed">
            <colgroup>
              <col className="w-2/5" />
              <col />
              <col className="w-20" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Đường dẫn</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Chọn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="wrap-anywhere whitespace-normal">{item.path}</TableCell>
                  <TableCell className="wrap-anywhere whitespace-normal">{item.name}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Chọn ${item.path}`}
                      onClick={() => {
                        pendingSelection.current = { kind: item.kind, id: item.id }
                        setOpen(false)
                      }}
                    >
                      Chọn
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length ? (
                <TableRow>
                  <TableCell colSpan={3}>Không có vị trí phù hợp.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <OperationalPagination
            page={currentPage}
            pageSize={pageSize}
            totalCount={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </OperationalListPanel>
      </SheetContent>
    </Sheet>
  )
}
