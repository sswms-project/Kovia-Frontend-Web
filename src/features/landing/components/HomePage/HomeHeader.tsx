import { Menu } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { APP_ROUTES } from '@/routes/app-routes'

const sectionLinks = [
  { href: '/#features', label: 'Tính năng' },
  { href: '/#roles', label: 'Vai trò' },
  { href: '/#insights', label: 'Dữ liệu' },
  { href: APP_ROUTES.pricing, label: 'Bảng giá' },
  { href: '/#faq', label: 'Hỏi đáp' },
] as const

function MobileNavigation() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Mở menu điều hướng">
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      {/* The sheet portals out of the page, so re-apply the landing palette */}
      <SheetContent side="right" className="theme-home bg-background text-foreground">
        <SheetHeader>
          <SheetTitle>
            <Logo href={null} size="sm" />
          </SheetTitle>
          <SheetDescription className="sr-only">
            Điều hướng tới các phần trong trang
          </SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4" aria-label="Điều hướng trên di động">
          {sectionLinks.map((link) => (
            <SheetClose key={link.href} asChild>
              <Link
                href={link.href as Route}
                className="hover:bg-muted rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
              >
                {link.label}
              </Link>
            </SheetClose>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 p-4">
          <Button variant="outline" className="h-10 rounded-full" asChild>
            <Link href={APP_ROUTES.auth.login}>Đăng nhập</Link>
          </Button>
          <Button className="h-10 rounded-full font-semibold" asChild>
            <Link href={APP_ROUTES.auth.register}>Dùng thử miễn phí</Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function HomeHeader() {
  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-(--container-landing) items-center justify-between px-4 md:px-6">
        <Logo />

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Điều hướng tới các phần trong trang"
        >
          {sectionLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href as Route}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" className="hidden sm:inline-flex" asChild>
            <Link href={APP_ROUTES.auth.login}>Đăng nhập</Link>
          </Button>
          <Button className="rounded-full font-semibold" asChild>
            <Link href={APP_ROUTES.auth.register}>Dùng thử miễn phí</Link>
          </Button>
          <MobileNavigation />
        </div>
      </div>
    </header>
  )
}
