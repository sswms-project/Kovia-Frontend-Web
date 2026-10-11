import { Badge } from '@/components/ui/badge'
import type { InvoiceCustomerSnapshot, InvoiceDataResponse } from '../../types/subscription.types'
import {
  formatCurrency,
  formatDate,
  formatHistoricalPlanName,
  formatInvoiceSnapshotValue,
  formatPaymentStatus,
} from '../../utils/format-subscription'

interface InvoicePrintViewProps {
  readonly invoice: InvoiceDataResponse
  readonly customer: InvoiceCustomerSnapshot
}

export function InvoicePrintView({ invoice, customer }: InvoicePrintViewProps) {
  const customerName = customer.displayName?.trim() || 'TenantOwner'
  const customerEmail = customer.email?.trim() || 'Không có dữ liệu lịch sử'

  return (
    <main className="bg-background min-h-screen px-4 py-8 print:bg-white print:p-0">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 16mm;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
      <section className="border-border bg-card text-foreground mx-auto max-w-3xl rounded-md border p-6 print:border-0 print:bg-white print:p-0">
        <header className="border-border flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xl font-semibold">KOVIA</p>
            <p className="text-muted-foreground text-sm">Warehouse Management SaaS</p>
          </div>
          <div className="text-left sm:text-right">
            <Badge>Biên nhận thanh toán</Badge>
            <p className="mt-2 font-mono text-sm">{invoice.invoiceNumber || 'invoice'}</p>
          </div>
        </header>

        <div className="grid gap-3 py-6">
          <PrintRow label="Khách hàng" value={customerName} />
          <PrintRow label="Email" value={customerEmail} />
          <PrintRow label="Gói dịch vụ" value={formatHistoricalPlanName(invoice.planName)} />
          <PrintRow label="Trạng thái" value={formatPaymentStatus(invoice.status)} />
          <PrintRow label="Ngày tạo" value={formatDate(invoice.createdAt)} />
          <PrintRow label="Ngày thanh toán" value={formatDate(invoice.paidAt)} />
          <PrintRow
            label="Bắt đầu subscription"
            value={formatInvoiceSnapshotValue(
              invoice.subscriptionStartDate ? formatDate(invoice.subscriptionStartDate) : null
            )}
          />
          <PrintRow
            label="Kết thúc subscription"
            value={formatInvoiceSnapshotValue(
              invoice.subscriptionEndDate ? formatDate(invoice.subscriptionEndDate) : null
            )}
          />
        </div>

        <div className="bg-muted print:border-border flex items-center justify-between rounded-md p-4 font-semibold print:border print:bg-white">
          <span>Tổng thanh toán</span>
          <span>{formatCurrency(invoice.amount, invoice.currency)}</span>
        </div>

        <p className="text-muted-foreground mt-6 text-xs leading-5">
          Biên nhận này được tạo từ dữ liệu thanh toán hiện có của hệ thống. Tài liệu này không phải
          hóa đơn điện tử hợp pháp, không bao gồm thuế, chữ ký số hoặc thông tin pháp lý ngoài dữ
          liệu hệ thống cung cấp.
        </p>
      </section>
    </main>
  )
}

function PrintRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border-border flex flex-col gap-1 border-b py-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
