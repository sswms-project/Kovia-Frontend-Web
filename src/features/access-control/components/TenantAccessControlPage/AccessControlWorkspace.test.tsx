import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TenantRolePermissionWorkspace } from '../../types/tenant-access-control.types'
import { AccessControlWorkspace } from './AccessControlWorkspace'
import { TooltipProvider } from '@/components/ui/tooltip'
import { USER_ROLES } from '@/config/roles'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/access-control',
}))
vi.mock('./PermissionCatalog', () => ({ PermissionCatalog: () => <div>Danh mục quyền</div> }))
vi.mock('./RoleSelector', () => ({ RoleSelector: () => <div>Vai trò</div> }))

afterEach(cleanup)

function setup(
  options: { canManage?: boolean; saving?: boolean; legacy?: boolean; fail?: boolean } = {}
) {
  const workspace: TenantRolePermissionWorkspace = {
    roles: [
      {
        roleId: 'manager',
        roleName: USER_ROLES.WarehouseManager,
        assignedPermissionIds: ['old'],
        ...(options.legacy ? {} : { recommendedPermissionIds: ['view', 'outside-ceiling'] }),
      },
    ],
    permissions: ['old', 'view'].map((id) => ({
      id,
      permissionKey: id,
      module: 'products',
      moduleDisplayName: 'Sản phẩm',
      displayName: id,
      description: id,
      category: 'catalog',
      categoryDisplayName: 'Danh mục',
      categoryDescription: '',
      categoryOrder: 1,
      moduleOrder: 1,
    })),
  }
  const onSave = options.fail
    ? vi.fn().mockRejectedValue({ statusCode: 409, message: 'Đã thay đổi' })
    : vi.fn().mockResolvedValue(undefined)
  render(
    <TooltipProvider>
      <AccessControlWorkspace
        activeMode="role"
        workspace={workspace}
        canManage={options.canManage ?? true}
        saving={options.saving ?? false}
        onSave={onSave}
        onReload={vi.fn()}
        onModeChange={vi.fn()}
      />
    </TooltipProvider>
  )
  return onSave
}

async function chooseTemplate() {
  fireEvent.click(screen.getByRole('button', { name: 'Dùng mẫu đề xuất' }))
  fireEvent.click(screen.getByRole('button', { name: 'Chọn mẫu, chưa lưu' }))
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
}

describe('role permission template draft', () => {
  it('previews replacement, filters unavailable IDs and saves only on explicit Save', async () => {
    const onSave = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Dùng mẫu đề xuất' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('thêm 1 quyền, bỏ 1 quyền')
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Dùng mẫu quyền Quản lý kho?')
    expect(onSave).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Chọn mẫu, chưa lưu' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(onSave).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('manager', ['view'], ['old']))
  })

  it('allows discarding the selected template without saving', async () => {
    const onSave = setup()
    await chooseTemplate()
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ thay đổi' }))
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('retains the dirty draft when the save conflicts', async () => {
    setup({ fail: true })
    await chooseTemplate()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    await screen.findByText('Chưa thể lưu quyền')
    expect(screen.getByText('Chưa lưu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bỏ thay đổi' })).toBeEnabled()
  })

  it('hides templates from read-only users and from older API responses', () => {
    setup({ canManage: false })
    expect(screen.queryByRole('button', { name: 'Dùng mẫu đề xuất' })).not.toBeInTheDocument()
    cleanup()
    setup({ legacy: true })
    expect(screen.queryByRole('button', { name: 'Dùng mẫu đề xuất' })).not.toBeInTheDocument()
  })

  it('blocks template selection during save', () => {
    setup({ saving: true })
    expect(screen.getByRole('button', { name: 'Dùng mẫu đề xuất' })).toBeDisabled()
  })
})
