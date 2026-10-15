'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { USER_ROLES } from '@/config/roles'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { logger } from '@/lib/logger'
import { useAuthStore } from '@/stores/auth.store'
import { getVisibleNavSections } from '../nav-config'
import { SidebarNavigation, type SidebarAppearance } from './SidebarNavigation'

export function AppSidebar() {
  const user = useAuthStore((state) => state.user)
  const meQuery = useMeQuery()
  const pathname = usePathname()
  const { isMobile, setOpenMobile, open, setOpen } = useSidebar()
  const [, setStoredOpen] = useLocalStorage('sidebar_state', true)
  const reportEntryRef = useRef<string | null>(null)
  const isReportDetail = /^\/reports\/(?!forecast(?:\/|$))[^/]+$/.test(pathname)
  const hoverOpenRef = useRef(false)
  const initializedRef = useRef(false)
  const skipInitialPersistRef = useRef(true)
  const permissions = new Set(meQuery.data?.permissions ?? [])
  const hasPermissionData = meQuery.data !== undefined
  const sections =
    user?.role && hasPermissionData ? getVisibleNavSections(user.role, permissions) : []
  const appearance: SidebarAppearance = user?.role === USER_ROLES.TenantOwner ? 'tenant' : 'default'

  useEffect(() => {
    if (initializedRef.current) return
    const storedOpen = localStorage.getItem('sidebar_state')
    if (storedOpen !== null) setOpen(storedOpen === 'true')
    initializedRef.current = true
  }, [setOpen])

  useEffect(() => {
    if (skipInitialPersistRef.current) {
      skipInitialPersistRef.current = false
      return
    }
    setStoredOpen(open)
  }, [open, setStoredOpen])

  useEffect(() => {
    if (!isReportDetail) {
      reportEntryRef.current = null
      return
    }
    if (reportEntryRef.current === pathname) return
    reportEntryRef.current = pathname
    hoverOpenRef.current = false
    setOpen(false)
    setOpenMobile(false)
  }, [isReportDetail, pathname, setOpen, setOpenMobile])

  useEffect(() => {
    if (!meQuery.isError) return

    logger.error(meQuery.error)
    toast.error('Không thể tải quyền điều hướng. Vui lòng thử lại.')
  }, [meQuery.error, meQuery.isError])

  const handleMouseEnter = () => {
    if (!open && !isMobile && !isReportDetail) {
      hoverOpenRef.current = true
      setOpen(true)
    }
  }

  const handleMouseLeave = () => {
    if (hoverOpenRef.current) {
      hoverOpenRef.current = false
      setOpen(false)
    }
  }

  return (
    <Sidebar
      collapsible="icon"
      className="border-sidebar-border min-w-0 overflow-hidden border-r-0"
    >
      <SidebarContent
        className="min-w-0 overscroll-contain py-3"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <SidebarNavigation
          pathname={pathname}
          sections={sections}
          isPending={meQuery.isPending}
          isError={meQuery.isError}
          hasPermissionData={hasPermissionData}
          onRetry={() => void meQuery.refetch()}
          onNavigate={() => {
            if (isMobile) setOpenMobile(false)
          }}
          appearance={appearance}
        />
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border shrink-0 border-t p-2">
        <SidebarTrigger className="w-full" />
      </SidebarFooter>
    </Sidebar>
  )
}
