import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AiAssistantDock, AppHeader, AppSidebar } from '@/components/layout'
import { PageTransition } from '@/components/PageTransition'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { SubscriptionReadOnlyBanner } from '@/features/subscription/components/SubscriptionReadOnlyBanner'
import { SubscriptionReadOnlyProvider } from '@/features/subscription/components/SubscriptionReadOnlyProvider'
import { SubscriptionWriteGuard } from '@/features/subscription/components/SubscriptionWriteGuard'
import { NotificationRealtimeProvider } from '@/features/platform-services/providers/NotificationRealtimeProvider'

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <TooltipProvider>
        <NotificationRealtimeProvider>
          <SubscriptionReadOnlyProvider>
            <AiAssistantDock>
              <SidebarProvider
                defaultOpen={true}
                className="h-svh min-h-0 flex-col overflow-hidden print:h-auto print:overflow-visible"
                style={
                  {
                    '--sidebar-width': '17.5rem',
                    '--sidebar-width-icon': '3.5rem',
                  } as React.CSSProperties
                }
              >
                <AppHeader />
                <div className="flex min-h-0 flex-1">
                  <div className="print:hidden">
                    <AppSidebar />
                  </div>
                  <SidebarInset className="h-full min-h-0 min-w-0 overflow-hidden print:m-0 print:block print:h-auto print:overflow-visible">
                    <div
                      data-slot="workspace-scroll-area"
                      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-3 sm:p-4 lg:p-5 print:overflow-visible print:p-0 [&:has([data-slot=operational-workspace-navigation])]:pt-1"
                    >
                      <div className="shrink-0 print:hidden">
                        <SubscriptionReadOnlyBanner />
                      </div>
                      <SubscriptionWriteGuard>
                        <PageTransition>{children}</PageTransition>
                      </SubscriptionWriteGuard>
                    </div>
                  </SidebarInset>
                </div>
              </SidebarProvider>
            </AiAssistantDock>
          </SubscriptionReadOnlyProvider>
        </NotificationRealtimeProvider>
      </TooltipProvider>
    </ProtectedRoute>
  )
}
