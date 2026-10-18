'use client'

import { useState } from 'react'
import {
  FileSpreadsheet,
  Mail,
  MailPlus,
  RefreshCw,
  UserRoundSearch,
  UserRoundX,
  Users,
  Warehouse,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { logger } from '@/lib/logger'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { P } from '@/config/permissionCodes'
import { USER_ROLES } from '@/config/roles'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useAuthStore } from '@/stores/auth.store'
import { APP_ROUTES } from '@/routes/app-routes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import {
  FormerStaffPanel,
  StaffAccountStatusDialog,
  StaffInvitation,
  InvitationManagementPanel,
  InvitationRevokeDialog,
  StaffWarehouseAssignment,
  StaffDetailsSheet,
  StaffDirectoryTable,
  StaffDirectoryToolbar,
  StaffTerminationDialog,
} from '../components/StaffDirectoryPage'
import {
  useInvitationsQuery,
  useResendInvitationMutation,
  useRevokeInvitationMutation,
} from '../hooks/use-invitations'
import {
  useAssignmentWarehousesQuery,
  useStaffWarehouseAssignmentsQuery,
  useUpdateStaffWarehousesMutation,
} from '../hooks/use-manager-assignment'
import {
  useChangeStaffAccountStatusMutation,
  useTerminateStaffMutation,
  useStaffDetailsQuery,
  useStaffListQuery,
} from '../hooks/use-staff'
import type { InvitationQuery, InvitationResponse } from '../types/invitation.types'
import type { WarehouseAssignmentQuery } from '../types/manager-assignment.types'
import {
  STAFF_DIRECTORY_KINDS,
  type StaffDirectoryKind,
  type StaffQuery,
  type StaffResponse,
} from '../types/staff.types'

const warehouseScopeQuery: WarehouseAssignmentQuery = {
  top: 1000,
  skip: 0,
  needTotalCount: true,
}

const STAFF_PAGE_VIEWS = {
  directory: 'directory',
  invitations: 'invitations',
  former: 'former',
} as const

type StaffPageView = (typeof STAFF_PAGE_VIEWS)[keyof typeof STAFF_PAGE_VIEWS]

function isStaffDirectoryKind(value: string): value is StaffDirectoryKind {
  return value === STAFF_DIRECTORY_KINDS.managers || value === STAFF_DIRECTORY_KINDS.staff
}

function isStaffPageView(value: string): value is StaffPageView {
  return (
    value === STAFF_PAGE_VIEWS.directory ||
    value === STAFF_PAGE_VIEWS.invitations ||
    value === STAFF_PAGE_VIEWS.former
  )
}

export function StaffDirectoryPage() {
  const user = useAuthStore((state) => state.user)
  const isTenantOwner = user?.role === USER_ROLES.TenantOwner
  const meQuery = useMeQuery()
  const permissions = new Set(meQuery.data?.permissions ?? [])
  const canInvite = permissions.has(P.STAFF_INVITE)
  const canViewFormerStaff = permissions.has(P.STAFF_TERMINATE)
  const [kind, setKind] = useState<StaffDirectoryKind>(
    isTenantOwner ? STAFF_DIRECTORY_KINDS.managers : STAFF_DIRECTORY_KINDS.staff
  )
  const [activeView, setActiveView] = useState<StaffPageView>(STAFF_PAGE_VIEWS.directory)
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(1)
  const [invitationPage, setInvitationPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [managerToAssign, setManagerToAssign] = useState<StaffResponse | null>(null)
  const [staffToTerminate, setStaffToTerminate] = useState<StaffResponse | null>(null)
  const [staffToChangeStatus, setStaffToChangeStatus] = useState<StaffResponse | null>(null)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [invitationToRevoke, setInvitationToRevoke] = useState<InvitationResponse | null>(null)
  const debouncedSearchText = useDebouncedValue(searchText.trim(), 300)
  const params: StaffQuery = {
    top: pageSize,
    skip: (page - 1) * pageSize,
    needTotalCount: true,
    ...(debouncedSearchText ? { searchText: debouncedSearchText } : {}),
  }
  const invitationParams: InvitationQuery = {
    top: pageSize,
    skip: (invitationPage - 1) * pageSize,
    needTotalCount: true,
  }
  const listQuery = useStaffListQuery(kind, params)
  const people = listQuery.data?.items ?? []
  const warehousesQuery = useAssignmentWarehousesQuery(
    warehouseScopeQuery,
    people.some((person) => person.assignedWarehouseIds.length > 0)
  )
  const invitationsQuery = useInvitationsQuery(
    invitationParams,
    canInvite && activeView === STAFF_PAGE_VIEWS.invitations
  )
  const detailsQuery = useStaffDetailsQuery(selectedUserId)
  const warehouseAssignmentsQuery = useStaffWarehouseAssignmentsQuery(
    managerToAssign?.id ?? '',
    Boolean(managerToAssign)
  )
  const updateWarehousesMutation = useUpdateStaffWarehousesMutation(managerToAssign?.id ?? '')
  const terminateMutation = useTerminateStaffMutation()
  const changeStatusMutation = useChangeStaffAccountStatusMutation()
  const resendInvitationMutation = useResendInvitationMutation()
  const revokeInvitationMutation = useRevokeInvitationMutation()

  function changeKind(nextKind: StaffDirectoryKind) {
    setKind(nextKind)
    setPage(1)
    setSearchText('')
  }

  function changeSearch(value: string) {
    setSearchText(value)
    setPage(1)
  }

  async function confirmTermination() {
    if (!staffToTerminate || !permissions.has(P.STAFF_TERMINATE)) return

    try {
      await terminateMutation.mutateAsync(staffToTerminate.id)
      toast.success('Đã chấm dứt quyền truy cập của nhân viên.')
      setStaffToTerminate(null)
    } catch (error) {
      logger.error(error)
      toast.error(
        typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof error.message === 'string'
          ? error.message
          : 'Không thể chấm dứt quyền truy cập của nhân viên.'
      )
    }
  }

  async function confirmStatusChange() {
    if (!staffToChangeStatus || !permissions.has(P.STAFF_TERMINATE)) return
    const activate = staffToChangeStatus.status !== 'Active'

    try {
      await changeStatusMutation.mutateAsync({ userId: staffToChangeStatus.id, activate })
      toast.success(activate ? 'Đã mở khóa tài khoản nhân sự.' : 'Đã khóa tài khoản nhân sự.')
      setStaffToChangeStatus(null)
    } catch (error) {
      logger.error(error)
      toast.error(
        typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof error.message === 'string'
          ? error.message
          : activate
            ? 'Không thể mở khóa tài khoản nhân sự.'
            : 'Không thể khóa tài khoản nhân sự.'
      )
    }
  }

  async function resendInvitation(invitation: InvitationResponse) {
    if (!canInvite) return
    try {
      await resendInvitationMutation.mutateAsync(invitation.id)
      toast.success(`Đã gửi lại lời mời tới ${invitation.email}.`)
    } catch (error) {
      logger.error(error)
      toast.error(
        typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof error.message === 'string'
          ? error.message
          : 'Không thể gửi lại lời mời.'
      )
    }
  }

  async function confirmRevokeInvitation() {
    if (!canInvite || !invitationToRevoke) return
    const shouldReturnToPreviousPage = invitations.length === 1 && invitationPage > 1

    try {
      await revokeInvitationMutation.mutateAsync(invitationToRevoke.id)
      toast.success(`Đã thu hồi lời mời tới ${invitationToRevoke.email}.`)
      setInvitationToRevoke(null)
      if (shouldReturnToPreviousPage) setInvitationPage((currentPage) => currentPage - 1)
    } catch (error) {
      logger.error(error)
      toast.error(
        typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof error.message === 'string'
          ? error.message
          : 'Không thể thu hồi lời mời.'
      )
    }
  }

  const invitations = invitationsQuery.data?.items ?? []
  const directoryLabel = kind === STAFF_DIRECTORY_KINDS.managers ? 'quản lý kho' : 'nhân viên kho'

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <header className="flex flex-col gap-3 pb-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center">
            <Users className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-primary text-xs font-medium">Doanh nghiệp và nhân sự</p>
            <h1 className="mt-0.5 text-xl font-semibold">Danh bạ nhân sự</h1>
          </div>
        </div>
        {canInvite && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline">
              <Link href={APP_ROUTES.staffImport}>
                <FileSpreadsheet aria-hidden="true" />
                Nhập danh sách
              </Link>
            </Button>
            <Button type="button" onClick={() => setIsInviteDialogOpen(true)}>
              <MailPlus aria-hidden="true" />
              Mời nhân sự
            </Button>
          </div>
        )}
      </header>

      <Tabs
        value={activeView}
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-4"
        onValueChange={(value) => isStaffPageView(value) && setActiveView(value)}
      >
        <TabsList
          variant="workspace"
          className="w-full justify-start overflow-x-auto border-b px-1 pt-0 pb-1"
        >
          <TabsTrigger
            value={STAFF_PAGE_VIEWS.directory}
            className="h-9 flex-none shrink-0 touch-manipulation rounded-sm px-3 text-xs"
          >
            <Users className="size-4" aria-hidden="true" />
            Nhân sự
          </TabsTrigger>
          {canViewFormerStaff && (
            <TabsTrigger
              value={STAFF_PAGE_VIEWS.former}
              className="h-9 flex-none shrink-0 touch-manipulation rounded-sm px-3 text-xs"
            >
              <UserRoundX className="size-4" aria-hidden="true" />
              Đã nghỉ việc
            </TabsTrigger>
          )}
          {canInvite && (
            <TabsTrigger
              value={STAFF_PAGE_VIEWS.invitations}
              className="h-9 flex-none shrink-0 touch-manipulation rounded-sm px-3 text-xs"
            >
              <Mail className="size-4" aria-hidden="true" />
              Lời mời
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent
          value={STAFF_PAGE_VIEWS.directory}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-md:min-h-fit max-md:overflow-visible"
        >
          <OperationalListPanel aria-labelledby="staff-directory-title">
            <div className="flex min-h-12 flex-col gap-3 border-b px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div>
                <h2 id="staff-directory-title" className="text-sm font-semibold">
                  Danh sách {directoryLabel}
                </h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {listQuery.data?.totalCount ?? 0} tài khoản
                </p>
              </div>
              {isTenantOwner && (
                <Tabs
                  value={kind}
                  onValueChange={(value) => isStaffDirectoryKind(value) && changeKind(value)}
                >
                  <TabsList>
                    <TabsTrigger
                      value={STAFF_DIRECTORY_KINDS.managers}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary data-[state=active]:hover:text-primary-foreground"
                    >
                      Quản lý kho
                    </TabsTrigger>
                    <TabsTrigger
                      value={STAFF_DIRECTORY_KINDS.staff}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary data-[state=active]:hover:text-primary-foreground"
                    >
                      Nhân viên kho
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>

            <StaffDirectoryToolbar
              searchText={searchText}
              isFetching={listQuery.isFetching}
              onSearchChange={changeSearch}
            />

            {people.length > 0 && warehousesQuery.isError && (
              <Alert variant="destructive" className="mx-3 mb-3 sm:mx-4">
                <Warehouse aria-hidden="true" />
                <AlertTitle>Không thể tải phạm vi kho</AlertTitle>
                <AlertDescription className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>Danh sách nhân sự vẫn khả dụng, nhưng tên kho chưa thể hiển thị.</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    disabled={warehousesQuery.isFetching}
                    onClick={() => void warehousesQuery.refetch()}
                  >
                    <RefreshCw
                      data-icon="inline-start"
                      className={warehousesQuery.isFetching ? 'animate-spin' : undefined}
                      aria-hidden="true"
                    />
                    Thử lại
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {listQuery.isLoading && (
              <div className="divide-y">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="flex h-16 items-center gap-3 px-4">
                    <Skeleton className="size-8" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="ml-auto hidden h-4 w-24 sm:block" />
                  </div>
                ))}
              </div>
            )}

            {listQuery.isError && (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-4 text-center">
                <UserRoundSearch className="text-destructive size-10" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">Không thể tải danh sách nhân sự</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Bạn không có quyền xem hoặc kết nối đã gián đoạn.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={listQuery.isFetching}
                  onClick={() => void listQuery.refetch()}
                >
                  <RefreshCw
                    className={listQuery.isFetching ? 'size-4 animate-spin' : 'size-4'}
                    aria-hidden="true"
                  />
                  Thử lại
                </Button>
              </div>
            )}

            {!listQuery.isLoading && !listQuery.isError && people.length === 0 && (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-4 text-center">
                <div className="bg-muted flex size-12 items-center justify-center">
                  <UserRoundSearch className="text-muted-foreground size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium">Không tìm thấy {directoryLabel}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {debouncedSearchText
                      ? 'Thử tên hoặc email khác.'
                      : 'Danh sách hiện chưa có tài khoản.'}
                  </p>
                </div>
                {searchText && (
                  <Button type="button" variant="outline" onClick={() => changeSearch('')}>
                    Xóa tìm kiếm
                  </Button>
                )}
              </div>
            )}

            {people.length > 0 && (
              <>
                <StaffDirectoryTable
                  people={people}
                  warehouses={warehousesQuery.data?.items ?? []}
                  isWarehouseScopeLoading={warehousesQuery.isLoading}
                  canAssignWarehouse={permissions.has(P.STAFF_ASSIGN_WAREHOUSE)}
                  canTerminate={permissions.has(P.STAFF_TERMINATE)}
                  canManageStatus={permissions.has(P.STAFF_TERMINATE)}
                  onView={(person) => setSelectedUserId(person.id)}
                  onAssignWarehouse={setManagerToAssign}
                  onTerminate={setStaffToTerminate}
                  onChangeStatus={setStaffToChangeStatus}
                />
                <OperationalPagination
                  page={page}
                  pageSize={pageSize}
                  totalCount={listQuery.data?.totalCount ?? 0}
                  onPageChange={setPage}
                  onPageSizeChange={(value) => {
                    setPageSize(value)
                    setPage(1)
                    setInvitationPage(1)
                  }}
                />
              </>
            )}
          </OperationalListPanel>
        </TabsContent>

        {canViewFormerStaff && (
          <TabsContent
            value={STAFF_PAGE_VIEWS.former}
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-md:min-h-fit max-md:overflow-visible"
          >
            <FormerStaffPanel
              enabled={activeView === STAFF_PAGE_VIEWS.former}
              canEditHistory={canViewFormerStaff}
            />
          </TabsContent>
        )}

        {canInvite && (
          <TabsContent
            value={STAFF_PAGE_VIEWS.invitations}
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-md:min-h-fit max-md:overflow-visible"
          >
            <InvitationManagementPanel
              invitations={invitations}
              totalCount={invitationsQuery.data?.totalCount ?? 0}
              page={invitationPage}
              pageSize={pageSize}
              isLoading={invitationsQuery.isLoading}
              isError={invitationsQuery.isError}
              isFetching={invitationsQuery.isFetching}
              resendingId={
                resendInvitationMutation.isPending
                  ? (resendInvitationMutation.variables ?? null)
                  : null
              }
              onPageChange={setInvitationPage}
              onPageSizeChange={(value) => {
                setPageSize(value)
                setPage(1)
                setInvitationPage(1)
              }}
              onRefresh={() => void invitationsQuery.refetch()}
              onResend={(invitation) => void resendInvitation(invitation)}
              onRevoke={setInvitationToRevoke}
            />
          </TabsContent>
        )}
      </Tabs>

      <StaffDetailsSheet
        open={Boolean(selectedUserId)}
        person={detailsQuery.data}
        isLoading={detailsQuery.isLoading}
        isError={detailsQuery.isError}
        canEditEmploymentHistory={permissions.has(P.STAFF_TERMINATE)}
        onOpenChange={(open) => !open && setSelectedUserId(null)}
      />

      {staffToTerminate && permissions.has(P.STAFF_TERMINATE) && (
        <StaffTerminationDialog
          person={staffToTerminate}
          isPending={terminateMutation.isPending}
          onOpenChange={(open) => !open && setStaffToTerminate(null)}
          onConfirm={() => void confirmTermination()}
        />
      )}

      {staffToChangeStatus && permissions.has(P.STAFF_TERMINATE) && (
        <StaffAccountStatusDialog
          person={staffToChangeStatus}
          isPending={changeStatusMutation.isPending}
          onOpenChange={(open) => !open && setStaffToChangeStatus(null)}
          onConfirm={() => void confirmStatusChange()}
        />
      )}

      {canInvite && isInviteDialogOpen && (
        <StaffInvitation
          canInviteManagers={isTenantOwner}
          onClose={() => setIsInviteDialogOpen(false)}
        />
      )}

      {canInvite && invitationToRevoke && (
        <InvitationRevokeDialog
          invitation={invitationToRevoke}
          isPending={revokeInvitationMutation.isPending}
          onOpenChange={(open) => !open && setInvitationToRevoke(null)}
          onConfirm={() => void confirmRevokeInvitation()}
        />
      )}

      {managerToAssign && permissions.has(P.STAFF_ASSIGN_WAREHOUSE) && (
        <StaffWarehouseAssignment
          person={managerToAssign}
          query={warehouseAssignmentsQuery}
          mutation={updateWarehousesMutation}
          onClose={() => setManagerToAssign(null)}
        />
      )}
    </div>
  )
}
