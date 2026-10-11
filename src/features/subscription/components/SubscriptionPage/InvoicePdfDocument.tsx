import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { InvoiceCustomerSnapshot, InvoiceDataResponse } from '../../types/subscription.types'
import {
  formatCurrency,
  formatDate,
  formatHistoricalPlanName,
  formatInvoiceSnapshotValue,
  formatPaymentStatus,
} from '../../utils/format-subscription'

interface InvoicePdfDocumentProps {
  readonly invoice: InvoiceDataResponse
  readonly customer: InvoiceCustomerSnapshot
}

const invoicePdfFontUrl = new URL(
  '../../../../assets/fonts/NotoSans-VariableFont_wdth,wght.ttf',
  import.meta.url
)
const invoicePdfFontSource =
  typeof window === 'undefined'
    ? decodeURIComponent(invoicePdfFontUrl.pathname).replace(/^\/([A-Z]:)/i, '$1')
    : invoicePdfFontUrl.href

Font.register({
  family: 'Noto Sans',
  fonts: [
    { src: invoicePdfFontSource, fontWeight: 400 },
    { src: invoicePdfFontSource, fontWeight: 700 },
  ],
})

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    color: '#18232f',
    fontFamily: 'Noto Sans',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  brand: {
    fontSize: 20,
    fontWeight: 700,
  },
  muted: {
    color: '#3f5442',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 12,
  },
  section: {
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#d5ecc8',
    paddingVertical: 7,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#eaf7e2',
    fontSize: 13,
    fontWeight: 700,
  },
  note: {
    marginTop: 24,
    fontSize: 10,
    color: '#3f5442',
    lineHeight: 1.5,
  },
})

export function InvoicePdfDocument({ invoice, customer }: InvoicePdfDocumentProps) {
  const customerName = customer.displayName?.trim() || 'TenantOwner'
  const customerEmail = customer.email?.trim() || 'Không có dữ liệu lịch sử'

  return (
    <Document title={invoice.invoiceNumber || 'invoice'}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>KOVIA</Text>
            <Text style={styles.muted}>Warehouse Management SaaS</Text>
          </View>
          <View>
            <Text>Biên nhận thanh toán</Text>
            <Text style={styles.muted}>{invoice.invoiceNumber || 'invoice'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>Thông tin hóa đơn</Text>
          <InvoiceRow label="Khách hàng" value={customerName} />
          <InvoiceRow label="Email" value={customerEmail} />
          <InvoiceRow label="Gói dịch vụ" value={formatHistoricalPlanName(invoice.planName)} />
          <InvoiceRow label="Trạng thái" value={formatPaymentStatus(invoice.status)} />
          <InvoiceRow label="Ngày tạo" value={formatDate(invoice.createdAt)} />
          <InvoiceRow label="Ngày thanh toán" value={formatDate(invoice.paidAt)} />
          <InvoiceRow
            label="Bắt đầu subscription"
            value={formatInvoiceSnapshotValue(
              invoice.subscriptionStartDate ? formatDate(invoice.subscriptionStartDate) : null
            )}
          />
          <InvoiceRow
            label="Kết thúc subscription"
            value={formatInvoiceSnapshotValue(
              invoice.subscriptionEndDate ? formatDate(invoice.subscriptionEndDate) : null
            )}
          />
        </View>

        <View style={styles.totalRow}>
          <Text>Tổng thanh toán</Text>
          <Text>{formatCurrency(invoice.amount, invoice.currency)}</Text>
        </View>

        <Text style={styles.note}>
          Biên nhận này được tạo từ dữ liệu thanh toán hiện có của hệ thống. Tài liệu này không phải
          hóa đơn điện tử hợp pháp, không bao gồm thuế, chữ ký số hoặc thông tin pháp lý ngoài dữ
          liệu hệ thống cung cấp.
        </Text>
      </Page>
    </Document>
  )
}

function InvoiceRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.muted}>{label}</Text>
      <Text>{value}</Text>
    </View>
  )
}
