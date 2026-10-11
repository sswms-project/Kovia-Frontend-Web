import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { APP_ROUTES } from '@/routes/app-routes'

export function TenantOwnerOnlyState() {
  return (
    <Card className="border-border mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>Chỉ TenantOwner được truy cập</CardTitle>
        <CardDescription>
          Trang gói dịch vụ chứa thông tin billing của doanh nghiệp nên không mở cho role hiện tại.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href={APP_ROUTES.dashboard}>Quay lại dashboard</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
