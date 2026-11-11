import Link from 'next/link'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { APP_ROUTES } from '@/routes/app-routes'

const faqItems = [
  {
    question: 'KOVIA phù hợp với doanh nghiệp như thế nào?',
    answer:
      'KOVIA dành cho doanh nghiệp vận hành một hoặc nhiều kho hàng — từ nhà phân phối, bán lẻ đến sản xuất — cần quản lý tồn kho theo vị trí và chứng từ nhập – xuất rõ ràng.',
  },
  {
    question: 'Tôi có quản lý được nhiều kho cùng lúc không?',
    answer:
      'Có. Mỗi tổ chức có thể tạo nhiều kho, mỗi kho có sơ đồ và vị trí riêng. Hàng hóa được điều chuyển giữa các kho theo từng chuyến với các bước lấy hàng, giao, nhận và cất.',
  },
  {
    question: 'Nhân viên kho cần thiết bị gì?',
    answer:
      'Chỉ cần điện thoại hoặc máy tính có trình duyệt. Nhân viên có thể quét mã vạch vị trí và sản phẩm trực tiếp bằng camera điện thoại, không bắt buộc mua máy quét chuyên dụng.',
  },
  {
    question: 'Dữ liệu hiện có của tôi có chuyển sang được không?',
    answer:
      'Được. KOVIA hỗ trợ nhập từ tệp Excel cho sản phẩm, danh mục, đơn vị tính, nhà cung cấp, vị trí kho, tồn đầu kỳ và danh sách nhân sự.',
  },
  {
    question: 'Dữ liệu của tôi được bảo vệ ra sao?',
    answer:
      'Mỗi tổ chức có không gian dữ liệu riêng. Quyền truy cập được kiểm soát theo vai trò, hỗ trợ xác thực hai lớp và mọi thao tác trên chứng từ đều được ghi nhật ký.',
    link: { href: APP_ROUTES.legalDocuments, label: 'Xem chính sách bảo vệ dữ liệu' },
  },
] as const

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-14" aria-labelledby="faq-heading">
      <div className="mx-auto grid w-full max-w-(--container-landing) gap-10 px-4 py-16 md:px-6 lg:grid-cols-[1fr_1.6fr] lg:py-24">
        <div>
          <p className="text-primary text-xs font-semibold tracking-[0.12em] uppercase">
            Câu hỏi thường gặp
          </p>
          <h2 id="faq-heading" className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
            Những điều bạn có thể đang thắc mắc
          </h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            Chưa thấy câu trả lời bạn cần? Hãy tạo tài khoản và trải nghiệm trực tiếp, hoặc liên hệ
            đội ngũ KOVIA.
          </p>
        </div>

        <Accordion
          type="single"
          collapsible
          defaultValue="faq-0"
          className="border-border/70 bg-card rounded-xl border px-5"
        >
          {faqItems.map((item, index) => (
            <AccordionItem key={item.question} value={`faq-${index}`} className="border-border/70">
              <AccordionTrigger className="py-4 text-left text-sm font-semibold md:text-base">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                {item.answer}
                {'link' in item && (
                  <Link
                    href={item.link.href}
                    className="text-primary mt-2 block font-medium underline underline-offset-4"
                  >
                    {item.link.label}
                  </Link>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
