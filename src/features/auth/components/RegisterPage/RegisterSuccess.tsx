import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription } from '@/components/ui/card'
import { APP_ROUTES } from '@/routes/app-routes'

interface RegisterSuccessProps {
  readonly message: string
  readonly onCreateAnother: () => void
}

export function RegisterSuccess({ message, onCreateAnother }: RegisterSuccessProps) {
  return (
    <Card className="border-border bg-card rounded-lg border py-0 shadow-sm">
      <CardContent className="flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8">
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <div className="bg-accent text-primary flex size-20 items-center justify-center rounded-full">
            <CheckCircle2 className="size-10" aria-hidden="true" />
          </div>
          <h2 className="text-foreground mt-6 text-2xl font-semibold">Kiểm tra email của bạn</h2>
          <CardDescription className="mt-3 max-w-md text-sm leading-6">{message}</CardDescription>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="auth">
              <Link href={APP_ROUTES.auth.login}>Quay lại đăng nhập</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="auth"
              className="border-secondary text-secondary"
              onClick={onCreateAnother}
            >
              Đăng ký doanh nghiệp khác
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
