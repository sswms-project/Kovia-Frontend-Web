'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

// Brief pause so a pointer passing over the collapsed rail does not flash it open.
const PEEK_DELAY_MS = 120

export function AppSidebar() {
  const user = useAuthStore((state) => state.user)
  const meQuery = useMeQuery()
  const pathname = usePathname()
  const { isMobile, setOpenMobile, open, setOpen, peek, setPeek } = useSidebar()
  const [, setStoredOpen] = useLocalStorage('sidebar_state', true)
  const reportEntryRef = useRef<string | null>(null)
  const isReportDetail = /^\/reports\/(?!forecast(?:\/|$))[^/]+$/.test(pathname)
  const pointerInsideRef = useRef(false)
  const peekTimerRef = useRef<number | null>(null)
  const [catalogOpenScope, setCatalogOpenScope] = useState<string | null>(null)
  const initializedRef = useRef(false)
  const skipInitialPersistRef = useRef(true)
  const permissionList = meQuery.data?.permissions
  const hasPermissionData = meQuery.data !== undefined
  const role = user?.role
  const sections = useMemo(
    () => (role && permissionList ? getVisibleNavSections(role, new Set(permissionList)) : []),
    [role, permissionList]
  )
  const appearance: SidebarAppearance = role === USER_ROLES.TenantOwner ? 'tenant' : 'default'
  const catalogScope = useMemo(
    () =>
      JSON.stringify([
        user?.id,
        user?.tenantId,
        role,
        pathname,
        isMobile,
        sections
          .find((section) => section.presentation === 'catalog')
          ?.items.map((item) => item.href),
      ]),
    [user?.id, user?.tenantId, role, pathname, isMobile, sections]
  )
  const isCatalogOpen = catalogOpenScope === catalogScope

  const clearPeekTimer = useCallback(() => {
    if (peekTimerRef.current === null) return
    window.clearTimeout(peekTimerRef.current)
    peekTimerRef.current = null
  }, [])

  useEffect(() => clearPeekTimer, [clearPeekTimer])

  // A previous route/session must not reopen its overlay when revisited.
  if (catalogOpenScope !== null && catalogOpenScope !== catalogScope) {
    setCatalogOpenScope(null)
  }

  // Layout effect: apply the saved state before the first paint, so a user who collapsed the sidebar
  // never sees it open and then animate shut. The tree mounts client-side only (ProtectedRoute).
  useLayoutEffect(() => {
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
    clearPeekTimer()
    setOpen(false)
    setOpenMobile(false)
  }, [isReportDetail, pathname, setOpen, setOpenMobile, clearPeekTimer])

  useEffect(() => {
    if (!meQuery.isError) return

    logger.error(meQuery.error)
    toast.error('Không thể tải quyền điều hướng. Vui lòng thử lại.')
  }, [meQuery.error, meQuery.isError])

  // Hovering a collapsed rail peeks it open over the page; the page itself never reflows.
  const handleMouseEnter = () => {
    pointerInsideRef.current = true
    if (open || peek || isMobile || isReportDetail || peekTimerRef.current !== null) return
    peekTimerRef.current = window.setTimeout(() => {
      peekTimerRef.current = null
      setPeek(true)
    }, PEEK_DELAY_MS)
  }

  const handleMouseLeave = () => {
    pointerInsideRef.current = false
    clearPeekTimer()
    if (peek && !isCatalogOpen) setPeek(false)
  }

  const handleCatalogOpenChange = (nextOpen: boolean) => {
    setCatalogOpenScope(nextOpen ? catalogScope : null)
    if (!nextOpen && peek && !pointerInsideRef.current) setPeek(false)
  }

  return (
    <Sidebar
      collapsible="icon"
      className="border-sidebar-border min-w-0 overflow-hidden border-r-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarContent className="min-w-0 overscroll-contain py-3">
        <SidebarNavigation
          pathname={pathname}
          sections={sections}
          isPending={meQuery.isPending}
          isError={meQuery.isError}
          hasPermissionData={hasPermissionData}
          onRetry={() => void meQuery.refetch()}
          onNavigate={() => {
            handleCatalogOpenChange(false)
            if (isMobile) setOpenMobile(false)
          }}
          appearance={appearance}
          catalogMenu={{ open: isCatalogOpen, onOpenChange: handleCatalogOpenChange }}
        />
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border shrink-0 border-t p-2">
        <SidebarTrigger className="w-full" onClick={() => handleCatalogOpenChange(false)} />
      </SidebarFooter>
    </Sidebar>
  )
}
