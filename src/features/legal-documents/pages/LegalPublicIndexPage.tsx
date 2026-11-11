'use client'

import Link from 'next/link'
import { ArrowUpRight, FileText, ShieldCheck } from 'lucide-react'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { APP_ROUTES } from '@/routes/app-routes'
import { legalDate } from '../components/LegalDocumentReader'
import { useLegalRegistration } from '../hooks/use-legal-documents'

const documentTypes = [
  {
    key: 'terms',
    title: 'Điều khoản sử dụng',
    description: 'Các quy định áp dụng khi truy cập và sử dụng dịch vụ Kovia.',
    icon: FileText,
  },
  {
    key: 'privacy',
    title: 'Chính sách bảo vệ dữ liệu cá nhân',
    description: 'Cách Kovia xử lý dữ liệu cá nhân và các quyền liên quan đến dữ liệu của bạn.',
    icon: ShieldCheck,
  },
] as const

export default function LegalPublicIndexPage() {
  const query = useLegalRegistration()
  const documents = query.data

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-8 sm:py-16">
      <header className="border-border/80 border-b pb-7 sm:pb-9">
        <h1 className="text-foreground max-w-3xl text-3xl leading-tight font-bold tracking-tight sm:text-5xl">
          Điều khoản và chính sách Kovia
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-base leading-relaxed sm:mt-4 sm:text-lg">
          Xem các văn bản đang áp dụng cho việc sử dụng dịch vụ và bảo vệ dữ liệu cá nhân.
        </p>
      </header>
      {query.isError ? (
        <OperationalErrorState
          title="Không tải được văn bản"
          onRetry={() => void query.refetch()}
        />
      ) : documents ? (
        <ul className="grid gap-4 md:grid-cols-2 md:gap-6">
          {documentTypes.map(({ key, title, description, icon: Icon }) => {
            const document = documents[key]
            const content = (
              <>
                <span className="bg-muted text-primary grid size-11 place-items-center rounded-lg">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <h2 className="text-card-foreground text-xl leading-snug font-semibold wrap-anywhere">
                    {document?.title ?? title}
                  </h2>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {description}
                  </p>
                </div>
                <div className="border-border/70 text-muted-foreground flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-4 text-sm">
                  {document ? (
                    <>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {document.version !== null && (
                          <span className="bg-muted text-primary rounded-full px-2.5 py-1 text-xs font-medium">
                            Phiên bản {document.version}
                          </span>
                        )}
                        {document.publishedAt && (
                          <time dateTime={document.publishedAt}>
                            {legalDate(document.publishedAt)}
                          </time>
                        )}
                      </span>
                      <span className="text-primary inline-flex items-center gap-1.5 font-semibold">
                        Đọc văn bản
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      </span>
                    </>
                  ) : (
                    <span>Chưa công bố</span>
                  )}
                </div>
              </>
            )

            return (
              <li key={key} className="bg-card border-border/80 min-w-0 rounded-2xl border">
                {document ? (
                  <Link
                    className="hover:bg-muted/70 focus-visible:outline-ring flex h-full flex-col gap-5 rounded-2xl p-5 outline-offset-4 transition-colors focus-visible:outline-2 motion-reduce:transition-none sm:p-6"
                    href={APP_ROUTES.legalDocument(document.id)}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex h-full flex-col gap-5 p-5 sm:p-6">{content}</div>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <OperationalLoadingState rows={2} />
      )}
    </main>
  )
}
