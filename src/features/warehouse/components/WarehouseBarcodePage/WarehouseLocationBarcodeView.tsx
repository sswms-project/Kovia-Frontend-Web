'use client'

import JsBarcode from 'jsbarcode'
import { ArrowLeft, Download, Printer, TriangleAlert } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { BarcodePrintLayer } from '@/components/barcode/BarcodePrintLayer'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'
import { APP_ROUTES } from '@/routes/app-routes'
import type { LocationBarcodeResponse } from '../../types/warehouse.types'

interface WarehouseLocationBarcodeViewProps {
  readonly warehouseId: string
  readonly barcode: LocationBarcodeResponse
}

const TYPE_LABELS = { Zone: 'Khu vực', Rack: 'Kệ hàng', Slot: 'Vị trí lưu trữ' } as const

export function WarehouseLocationBarcodeView({
  warehouseId,
  barcode,
}: WarehouseLocationBarcodeViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [printMarkup, setPrintMarkup] = useState<string | null>(null)

  useEffect(() => {
    if (!svgRef.current) return
    let isCancelled = false
    try {
      // Printed logistics labels require fixed black bars on a white substrate.
      JsBarcode(svgRef.current, barcode.barcodeValue, {
        format: 'CODE128',
        displayValue: false,
        font: 'JetBrains Mono, monospace',
        fontSize: 16,
        // Mã vị trí ngắn (vd. A01, khoảng 68 vạch) nên dùng vạch dày 6px để phần vạch rộng ~408px,
        // dễ quét. Lề = 10 vạch (Code 128 cần vùng trống tối thiểu 10 vạch ở hai đầu).
        width: 6,
        height: 120,
        margin: 60,
        background: '#ffffff',
        lineColor: '#111111',
      })
    } catch (error) {
      logger.error(error)
      queueMicrotask(() => {
        if (!isCancelled) {
          setRenderError('Giá trị mã vạch không thể hiển thị bằng chuẩn Code 128.')
        }
      })
    }

    return () => {
      isCancelled = true
    }
  }, [barcode.barcodeValue])

  // Dựng lớp in rồi mới gọi hộp thoại in; xong thì gỡ lớp để không còn ẩn trang khi xem bình thường.
  useEffect(() => {
    if (!printMarkup) return
    const clear = () => setPrintMarkup(null)
    window.addEventListener('afterprint', clear, { once: true })
    const frame = requestAnimationFrame(() => window.print())
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('afterprint', clear)
    }
  }, [printMarkup])

  function printLabel() {
    if (!svgRef.current) return
    setPrintMarkup(new XMLSerializer().serializeToString(svgRef.current))
  }

  function downloadSvg() {
    if (!svgRef.current) return
    const serializedSvg = new XMLSerializer().serializeToString(svgRef.current)
    const blob = new Blob([serializedSvg], { type: 'image/svg+xml;charset=utf-8' })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = `${barcode.locationType.toLowerCase()}-${barcode.locationCode}.svg`
    link.click()
    URL.revokeObjectURL(objectUrl)
  }

  return (
    <section className="bg-card mx-auto flex max-w-2xl flex-col gap-5 border p-4 sm:p-6">
      <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="outline" size="icon-sm">
            <Link
              href={APP_ROUTES.warehouseLocations(warehouseId) as Route}
              aria-label="Quay lại danh mục vị trí"
            >
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">Mã vạch vị trí</h2>
              <Badge variant="outline">{TYPE_LABELS[barcode.locationType]}</Badge>
            </div>
            <p translate="no" className="text-muted-foreground mt-1 font-mono text-xs">
              {barcode.displayPath ?? barcode.locationCode}
            </p>
          </div>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none"
            disabled={Boolean(renderError)}
            onClick={downloadSvg}
          >
            <Download data-icon="inline-start" aria-hidden="true" />
            Tải SVG
          </Button>
          <Button
            type="button"
            className="flex-1 sm:flex-none"
            disabled={Boolean(renderError)}
            onClick={printLabel}
          >
            <Printer data-icon="inline-start" aria-hidden="true" />
            In nhãn
          </Button>
        </div>
      </header>

      {renderError ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Không thể tạo mã vạch</AlertTitle>
          <AlertDescription>{renderError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex min-h-64 items-center justify-center bg-white p-4">
        <div className="grid w-full min-w-0 justify-items-center gap-3 text-center">
          <p className="font-medium">{barcode.displayPath ?? barcode.locationCode}</p>
          {/* JsBarcode đặt width/height cố định theo độ dài mã; thu vừa khung nhờ viewBox. */}
          <svg
            ref={svgRef}
            role="img"
            className="h-auto max-w-full [&_rect]:[shape-rendering:crispEdges]"
            aria-label={`Mã vạch ${barcode.locationCode}`}
          />
          <p translate="no" className="font-mono text-sm font-semibold">
            {barcode.locationCode}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground">Loại vị trí</dt>
          <dd>{TYPE_LABELS[barcode.locationType]}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground">Chuẩn mã</dt>
          <dd>{barcode.symbology}</dd>
        </div>
        <div className="col-span-2 flex min-w-0 flex-col gap-1 sm:col-span-1">
          <dt className="text-muted-foreground">Đường dẫn vị trí</dt>
          <dd>{barcode.displayPath ?? barcode.locationCode}</dd>
        </div>
      </dl>
      {printMarkup ? (
        <BarcodePrintLayer
          svgMarkup={printMarkup}
          title={barcode.displayPath ?? barcode.locationCode}
          code={barcode.locationCode}
        />
      ) : null}
    </section>
  )
}
