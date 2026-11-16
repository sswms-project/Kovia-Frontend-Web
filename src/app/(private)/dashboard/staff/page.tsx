import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/routes/app-routes'

// Staff land on My Tasks; this keeps old bookmarks and return URLs off the retired staff dashboard.
export default function StaffDashboardRoutePage() {
  redirect(APP_ROUTES.myTasks)
}
