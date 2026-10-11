import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/routes/app-routes'

export default function InventoryForecastRoutePage() {
  redirect(APP_ROUTES.reportForecast)
}
