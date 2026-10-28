'use client'

import { ArrowLeft, CircleOff, Pencil, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Route } from 'next'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/routes/app-routes'
import type { Supplier } from '../../types/supplier.types'
import {
  SUPPLIER_STATUS_LABELS,
  formatSupplierDateTime,
  formatSupplierText,
} from '../../utils/supplier-format'
import { SupplierStatusBadge } from '../SuppliersPage'

interface SupplierDetailProps {
  readonly children?: ReactNode
  readonly supplier: Supplier
  readonly canUpdate: boolean
  readonly canDeactivate: boolean
  readonly canReactivate: boolean
  readonly onEdit: () => void
  readonly onDeactivate: () => void
  readonly onReactivate: () => void
}

export function SupplierDetail({
  children,
  supplier,
  canUpdate,
  canDeactivate,
  canReactivate,
  onEdit,
  onDeactivate,
  onReactivate,
}: SupplierDetailProps) {
  return (
    <div className="flex min-h-full w-full min-w-0 flex-1 flex-col gap-5 pb-3">
      <header className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="outline" size="icon">
            <Link href={APP_ROUTES.suppliers as Route} aria-label="Quay lại danh sách">
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 text-xl font-semibold break-words">{supplier.supplierName}</h1>
              <SupplierStatusBadge status={supplier.status} />
            </div>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          {canUpdate ? (
            <Button type="button" variant="outline" onClick={onEdit}>
              <Pencil aria-hidden="true" />
              Chỉnh sửa
            </Button>
          ) : null}
          {canDeactivate && supplier.status === 'Active' ? (
            <Button type="button" variant="destructive" onClick={onDeactivate}>
              <CircleOff aria-hidden="true" />
              Ngừng hợp tác
            </Button>
          ) : null}
          {canReactivate && supplier.status === 'Inactive' ? (
            <Button type="button" onClick={onReactivate}>
              <RotateCcw aria-hidden="true" />
              Khôi phục hợp tác
            </Button>
          ) : null}
        </div>
      </header>

      <section className="bg-card border" aria-labelledby="supplier-overview">
        <div className="border-b p-4">
          <h2 id="supplier-overview" className="text-sm font-semibold">
            Tổng quan
          </h2>
        </div>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-5 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metadata label="Mã nhà cung cấp" value={supplier.supplierCode} />
          <Metadata label="Tên nhà cung cấp" value={supplier.supplierName} />
          <Metadata label="Mã số thuế" value={formatSupplierText(supplier.taxCode)} />
          <Metadata label="Số điện thoại" value={supplier.phone} />
          <Metadata label="Email" value={formatSupplierText(supplier.email)} />
          <Metadata label="Trạng thái" value={SUPPLIER_STATUS_LABELS[supplier.status]} />
          <Metadata label="Ngày tạo" value={formatSupplierDateTime(supplier.createdAt)} />
          <Metadata label="Cập nhật gần nhất" value={formatSupplierDateTime(supplier.updatedAt)} />
        </dl>
        <div className="border-t px-4 py-3">
          <p className="text-muted-foreground text-xs">Địa chỉ</p>
          <p className="mt-1 text-sm break-words">{formatSupplierText(supplier.address)}</p>
        </div>
        <div className="border-t p-4">
          <h3 className="text-sm font-semibold">Thông tin liên hệ</h3>
          <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metadata
              label="Người liên hệ"
              value={
                [supplier.contactSalutation, supplier.contactName].filter(Boolean).join(' ') || '—'
              }
            />
            <Metadata
              label="Email người liên hệ"
              value={formatSupplierText(supplier.contactEmail)}
            />
            <Metadata
              label="Điện thoại di động"
              value={formatSupplierText(supplier.contactMobile)}
            />
            <Metadata
              label="Kênh liên hệ"
              value={
                [supplier.contactChannel, supplier.contactChannelName]
                  .filter(Boolean)
                  .join(' · ') || '—'
              }
            />
          </dl>
        </div>
      </section>
      {children}
    </div>
  )
}

function Metadata({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 text-sm font-medium break-words">{value}</dd>
    </div>
  )
}
