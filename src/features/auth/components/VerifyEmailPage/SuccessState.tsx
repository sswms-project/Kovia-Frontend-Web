import { Clock3 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/routes/app-routes'

interface SuccessStateProps {
  readonly message: string
}

export function SuccessState({ message }: SuccessStateProps) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
      <div className="bg-accent text-primary flex size-20 items-center justify-center rounded-full">
        <Clock3 className="size-10" aria-hidden="true" />
      </div>
      <p className="text-primary mt-6 text-xs font-semibold">Email đã được xác minh</p>
      <h2 className="text-foreground mt-2 text-2xl leading-8 font-semibold">
        Đăng ký đang chờ phê duyệt
      </h2>
      <p className="text-muted-foreground mt-3 max-w-md text-sm leading-6">{message}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="auth">
          <Link href={APP_ROUTES.auth.login}>Quay lại đăng nhập</Link>
        </Button>
        <Button asChild variant="outline" size="auth" className="border-secondary text-secondary">
          <Link href={APP_ROUTES.auth.register}>Tạo doanh nghiệp khác</Link>
        </Button>
      </div>
    </div>
  )
}
