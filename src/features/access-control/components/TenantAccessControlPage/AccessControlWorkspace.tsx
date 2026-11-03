'use client'

import type { Route } from 'next'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import type { ApiErrorResponse } from '@/types/api'
import type {
  AccessControlMode,
  TenantRolePermissionWorkspace,
  TenantRolePolicy,
} from '../../types/tenant-access-control.types'
import {
  arePermissionSetsEqual,
  filterPermissionGroups,
  getRoleById,
  groupTenantPermissions,
  getTenantRoleContent,
  rebasePermissionDraft,
} from '../../utils/tenant-access-control'
import { PermissionCatalog } from './PermissionCatalog'
import { AccessControlModeTabs } from './AccessControlModeTabs'
import { PermissionEditorHeader } from './PermissionEditorHeader'
import { PermissionTemplateButton } from './PermissionTemplateButton'
import { RoleSelector } from './RoleSelector'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'

type PendingIntent =
  | { type: 'role'; roleId: string }
  | { type: 'mode'; mode: AccessControlMode }
  | { type: 'navigation'; href: string }
  | { type: 'history' }

function isApiErrorResponse(error: unknown): error is ApiErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    'message' in error &&
    typeof error.message === 'string'
  )
}

function getMutationMessage(error: unknown) {
  if (!isApiErrorResponse(error)) {
    return 'Không thể lưu thay đổi. Dữ liệu đang chỉnh vẫn được giữ lại.'
  }
  if (error.statusCode === 403) {
    return 'Bạn chỉ có quyền xem cấu hình phân quyền và không thể lưu thay đổi.'
  }
  if (error.statusCode === 404 || error.statusCode === 409) {
    return 'Cấu hình quyền đã thay đổi ở nơi khác. Hãy tải lại và kiểm tra trước khi lưu.'
  }
  return error.message || 'Không thể lưu thay đổi. Dữ liệu đang chỉnh vẫn được giữ lại.'
}

interface AccessControlWorkspaceProps {
  readonly activeMode: AccessControlMode
  readonly workspace: TenantRolePermissionWorkspace
  readonly canManage: boolean
  readonly saving: boolean
  readonly onSave: (roleId: string, toAdd: string[], toRemove: string[]) => Promise<void>
  readonly onReload: () => Promise<boolean>
  readonly onModeChange: (mode: AccessControlMode) => void
}

export function AccessControlWorkspace({
  activeMode,
  workspace,
  canManage,
  saving,
  onSave,
  onReload,
  onModeChange,
}: AccessControlWorkspaceProps) {
  const router = useRouter()
  const pathname = usePathname()
  const historyTraversal = useRef<'idle' | 'restoring' | 'leaving'>('idle')
  const firstRole = workspace.roles[0]!
  const [selectedRoleId, setSelectedRoleId] = useState(firstRole.roleId)
  const [baselineIds, setBaselineIds] = useState<Set<string>>(
    () => new Set(firstRole.assignedPermissionIds)
  )
  const [draftIds, setDraftIds] = useState<Set<string>>(
    () => new Set(firstRole.assignedPermissionIds)
  )
  const [searchText, setSearchText] = useState('')
  const [openModules, setOpenModules] = useState<string[]>([])
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const selectedRole = getRoleById(workspace.roles, selectedRoleId) ?? firstRole
  const permissionGroups = useMemo(
    () => groupTenantPermissions(workspace.permissions),
    [workspace.permissions]
  )
  const eligiblePermissionIds = useMemo(
    () => new Set(workspace.permissions.map((permission) => permission.id)),
    [workspace.permissions]
  )
  const filteredGroups = useMemo(
    () => filterPermissionGroups(permissionGroups, searchText),
    [permissionGroups, searchText]
  )
  const isDirty = !arePermissionSetsEqual(draftIds, baselineIds)
  const recommendedIds = selectedRole.recommendedPermissionIds
  const templateIds = new Set(recommendedIds?.filter((id) => eligiblePermissionIds.has(id)))

  useEffect(() => {
    if (getRoleById(workspace.roles, selectedRoleId)) return

    queueMicrotask(() => {
      setSelectedRoleId(firstRole.roleId)
      setBaselineIds(new Set(firstRole.assignedPermissionIds))
      setDraftIds(new Set(firstRole.assignedPermissionIds))
    })
  }, [firstRole, selectedRoleId, workspace.roles])

  useEffect(() => {
    const authoritativeIds = new Set(selectedRole.assignedPermissionIds)
    const rebased = rebasePermissionDraft(
      baselineIds,
      draftIds,
      authoritativeIds,
      eligiblePermissionIds
    )
    if (
      arePermissionSetsEqual(rebased.baselineIds, baselineIds) &&
      arePermissionSetsEqual(rebased.draftIds, draftIds)
    )
      return

    queueMicrotask(() => {
      setBaselineIds(rebased.baselineIds)
      setDraftIds(rebased.draftIds)
    })
  }, [baselineIds, draftIds, eligiblePermissionIds, selectedRole.assignedPermissionIds])

  useEffect(() => {
    if (!isDirty) return

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    const interceptNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.download)
        return

      const url = new URL(anchor.href, window.location.href)
      const href = `${url.pathname}${url.search}${url.hash}`
      if (url.origin !== window.location.origin || href === pathname) return

      event.preventDefault()
      event.stopPropagation()
      setPendingIntent({ type: 'navigation', href })
      setDialogOpen(true)
    }
    const interceptHistoryNavigation = () => {
      if (historyTraversal.current !== 'idle') {
        historyTraversal.current = 'idle'
        return
      }

      historyTraversal.current = 'restoring'
      window.history.forward()
      setPendingIntent({ type: 'history' })
      setDialogOpen(true)
    }

    window.addEventListener('beforeunload', warnBeforeUnload)
    window.addEventListener('popstate', interceptHistoryNavigation)
    document.addEventListener('click', interceptNavigation, true)
    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload)
      window.removeEventListener('popstate', interceptHistoryNavigation)
      document.removeEventListener('click', interceptNavigation, true)
    }
  }, [isDirty, pathname])

  function selectRole(role: TenantRolePolicy) {
    setSelectedRoleId(role.roleId)
    setBaselineIds(new Set(role.assignedPermissionIds))
    setDraftIds(new Set(role.assignedPermissionIds))
    setMutationError(null)
    setSearchText('')
    setOpenModules([])
  }

  function requestRoleChange(roleId: string) {
    if (roleId === selectedRole.roleId || saving) return
    const nextRole = getRoleById(workspace.roles, roleId)
    if (!nextRole) return

    if (!isDirty) {
      selectRole(nextRole)
      return
    }

    setPendingIntent({ type: 'role', roleId })
    setDialogOpen(true)
  }

  function requestModeChange(mode: AccessControlMode) {
    if (mode === activeMode || saving) return
    if (!isDirty) {
      onModeChange(mode)
      return
    }
    setPendingIntent({ type: 'mode', mode })
    setDialogOpen(true)
  }

  function togglePermission(permissionId: string) {
    if (!canManage) return
    setMutationError(null)
    setDraftIds((current) => {
      const next = new Set(current)
      if (next.has(permissionId)) next.delete(permissionId)
      else next.add(permissionId)
      return next
    })
  }

  function toggleModule(permissionIds: string[]) {
    if (!canManage) return
    setMutationError(null)
    setDraftIds((current) => {
      const next = new Set(current)
      const allSelected = permissionIds.every((permissionId) => next.has(permissionId))
      for (const permissionId of permissionIds) {
        if (allSelected) next.delete(permissionId)
        else next.add(permissionId)
      }
      return next
    })
  }

  async function saveDraft() {
    if (!canManage || !isDirty || saving) return !isDirty

    const toAdd = [...draftIds].filter((id) => !baselineIds.has(id))
    const toRemove = [...baselineIds].filter((id) => !draftIds.has(id))

    try {
      await onSave(selectedRole.roleId, toAdd, toRemove)
      setBaselineIds(new Set(draftIds))
      setMutationError(null)
      return true
    } catch (error) {
      setMutationError(getMutationMessage(error))
      return false
    }
  }

  function completePendingIntent() {
    if (!pendingIntent) return
    if (pendingIntent.type === 'role') {
      const nextRole = getRoleById(workspace.roles, pendingIntent.roleId)
      if (nextRole) selectRole(nextRole)
    } else if (pendingIntent.type === 'mode') {
      onModeChange(pendingIntent.mode)
    } else if (pendingIntent.type === 'navigation') {
      router.push(pendingIntent.href as Route)
    } else {
      historyTraversal.current = 'leaving'
      window.history.back()
    }
    setPendingIntent(null)
    setDialogOpen(false)
  }

  async function saveBeforeContinuing() {
    if (await saveDraft()) completePendingIntent()
  }

  async function reloadWorkspace() {
    if (await onReload()) setMutationError(null)
  }

  return (
    <>
      <AccessControlModeTabs value={activeMode} disabled={saving} onChange={requestModeChange} />
      <Tabs
        value={selectedRole.roleId}
        onValueChange={requestRoleChange}
        className="flex min-h-0 flex-1 flex-col gap-3"
      >
        <RoleSelector
          roles={workspace.roles}
          selectedRoleId={selectedRole.roleId}
          disabled={saving}
          onSelect={requestRoleChange}
        />

        <TabsContent
          value={selectedRole.roleId}
          className="border-border bg-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border"
        >
          <PermissionEditorHeader
            templateAction={
              recommendedIds != null && (
                <PermissionTemplateButton
                  roleLabel={getTenantRoleContent(selectedRole.roleName).label}
                  addedCount={[...templateIds].filter((id) => !draftIds.has(id)).length}
                  removedCount={[...draftIds].filter((id) => !templateIds.has(id)).length}
                  disabled={saving || !canManage}
                  onApply={() => {
                    if (saving || !canManage) return
                    setDraftIds(templateIds)
                    setMutationError(null)
                    setSearchText('')
                  }}
                />
              )
            }
            selectedCount={draftIds.size}
            permissionCount={workspace.permissions.length}
            categoryCount={permissionGroups.length}
            searchText={searchText}
            canManage={canManage}
            dirty={isDirty}
            pending={saving}
            canCollapse={openModules.length > 0 && !searchText.trim()}
            onSearchChange={setSearchText}
            onCollapseAll={() => setOpenModules([])}
            onDiscard={() => {
              setDraftIds(new Set(baselineIds))
              setMutationError(null)
            }}
            onSave={() => void saveDraft()}
          />

          {mutationError && (
            <Alert variant="destructive" className="m-3 mb-0 shrink-0 sm:mx-4">
              <TriangleAlert aria-hidden="true" />
              <AlertTitle>Chưa thể lưu quyền</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>{mutationError}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => void reloadWorkspace()}
                >
                  Tải lại quyền
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-muted/10 min-h-0 flex-1 p-3 sm:p-4">
            <PermissionCatalog
              groups={filteredGroups}
              completeGroups={permissionGroups}
              context={{
                kind: 'role',
                subjectId: selectedRole.roleId,
                selectedIds: draftIds,
              }}
              openModules={openModules}
              disabled={saving || !canManage}
              hasSearch={Boolean(searchText.trim())}
              onOpenModulesChange={setOpenModules}
              onTogglePermission={togglePermission}
              onToggleModule={toggleModule}
            />
          </div>
        </TabsContent>
      </Tabs>

      <UnsavedChangesDialog
        open={dialogOpen}
        saving={saving}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setPendingIntent(null)
        }}
        onSave={() => void saveBeforeContinuing()}
        onDiscard={completePendingIntent}
      />
    </>
  )
}
