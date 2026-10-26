import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AuditLogItem } from '../../types/platform-services.types'
import { AuditLogDetailSheet } from './AuditLogDetailSheet'

const auditLog: AuditLogItem = {
  id: '11111111-1111-4111-8111-111111111111',
  tenantId: '22222222-2222-4222-8222-222222222222',
  warehouseId: null,
  warehouseCode: null,
  warehouseName: null,
  userId: '33333333-3333-4333-8333-333333333333',
  actorName: 'Tenant Owner',
  actorEmail: 'tenant.owner@sswms.local',
  action: 'ConfigureRolePermissions',
  actionLabel: 'Cấu hình quyền vai trò',
  entityType: 'TenantRolePermission',
  entityTypeLabel: 'Quyền vai trò của đơn vị thuê',
  entityId: '44444444-4444-4444-8444-444444444444',
  referenceDisplay: 'Quản lý kho',
  summary: 'Cấu hình quyền vai trò: Quản lý kho',
  description: 'ConfigureRolePermissions',
  reason: null,
  oldValue: 'warehouse-tasks:manage-own',
  newValue: 'warehouse-tasks:view-own',
  changes: [
    {
      label: 'Quyền truy cập',
      before: 'Xử lý công việc được giao',
      after: 'Xem công việc được giao',
    },
  ],
  createdAt: '2026-09-28T06:07:00Z',
}

describe('AuditLogDetailSheet', () => {
  it('explains current catalog references while preserving field comparisons for document edits', () => {
    render(
      <AuditLogDetailSheet
        log={{
          ...auditLog,
          oldValue: '{"SchemaVersion":1,"DocumentType":"StockTransfer","Header":{},"Lines":[]}',
          changes: [
            { label: 'Sửa dòng hàng: SKU001 · Bia · Số lượng ĐVT', before: '1', after: '2' },
          ],
        }}
        onOpenChange={vi.fn()}
      />
    )
    expect(screen.getByText(/danh mục hiện tại/)).toBeInTheDocument()
    expect(screen.getByText('Sửa dòng hàng: SKU001 · Bia · Số lượng ĐVT')).toBeInTheDocument()
    expect(screen.getByText('Trước')).toBeInTheDocument()
    expect(screen.getByText('Sau')).toBeInTheDocument()
  })
  it('uses a right-side half-width desktop panel with a separately scrolling body', () => {
    render(<AuditLogDetailSheet log={auditLog} onOpenChange={vi.fn()} />)
    const panel = screen.getByRole('dialog')
    expect(panel).toHaveAttribute('data-side', 'right')
    expect(panel).toHaveClass('data-[side=right]:lg:w-1/2', 'data-[side=right]:sm:max-w-none')
    expect(screen.getByText('Mô tả chi tiết').closest('section')?.parentElement).toHaveClass(
      'overflow-y-auto',
      'min-h-0'
    )
  })

  it('wraps long references and change values within their own columns', () => {
    const reference = 'NCC-' + 'A'.repeat(200)
    render(
      <AuditLogDetailSheet
        log={{ ...auditLog, referenceDisplay: reference }}
        onOpenChange={vi.fn()}
      />
    )
    expect(screen.getByText(reference)).toHaveClass('wrap-anywhere')
    expect(screen.getByText('Xem công việc được giao')).toHaveClass('wrap-anywhere')
  })

  it('shows business values without technical identifiers or raw permission keys', () => {
    render(<AuditLogDetailSheet log={auditLog} onOpenChange={vi.fn()} />)

    expect(screen.getByText('Xử lý công việc được giao')).toBeInTheDocument()
    expect(screen.getByText('Xem công việc được giao')).toBeInTheDocument()
    expect(screen.queryByText('Thông tin kỹ thuật')).not.toBeInTheDocument()
    expect(screen.queryByText(auditLog.id)).not.toBeInTheDocument()
    expect(screen.queryByText(auditLog.oldValue!)).not.toBeInTheDocument()
  })
})
