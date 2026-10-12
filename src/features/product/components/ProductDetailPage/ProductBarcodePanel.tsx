'use client'

import JsBarcode from 'jsbarcode'
import { Download, LoaderCircle, Printer, QrCode, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BarcodePrintLayer } from '@/components/barcode/BarcodePrintLayer'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'

const SHORT_BARCODE_LENGTH = 16

interface ProductBarcodePanelProps {
  readonly sku: string
  readonly barcodeValue: string | null
  readonly canGenerate: boolean
  readonly isGenerating: boolean
  readonly onGenerate: () => void
}

export function ProductBarcodePanel({
  sku,
  barcodeValue,
  canGenerate,
  isGenerating,
  onGenerate,
}: ProductBarcodePanelProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [printMarkup, setPrintMarkup] = useState<string | null>(null)

  useEffect(() => {
    if (!barcodeValue || !svgRef.current) return
    let isActive = true

    function scheduleRenderError(message: string | null) {
      queueMicrotask(() => {
        if (isActive) setRenderError(message)
      })
    }

    const barWidth = barcodeValue.length <= SHORT_BARCODE_LENGTH ? 4 : 2
    try {
      // Printed product labels need fixed black bars on a white substrate, same as
      // the warehouse location labels.
      JsBarcode(svgRef.current, barcodeValue, {
        format: 'CODE128',
        displayValue: true,
        font: 'JetBrains Mono, monospace',
        fontSize: 16,
        // Mã ngắn (SKU) thì vạch dày 4px cho dễ quét; mã dài vẫn dùng 2px để không vượt khung.
        // Lề = 10 vạch vì Code 128 cần vùng trống tối thiểu 10 vạch ở hai đầu.
        width: barWidth,
        height: 120,
        margin: barWidth * 10,
        background: '#ffffff',
        lineColor: '#111111',
      })
      scheduleRenderError(null)
    } catch (error) {
      logger.error(error)
      scheduleRenderError('Giá trị mã vạch không hiển thị được bằng chuẩn Code 128.')
    }
    return () => {
      isActive = false
    }
  }, [barcodeValue])

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
    link.download = `san-pham-${sku}.svg`
    link.click()
    URL.revokeObjectURL(objectUrl)
  }

  if (!barcodeValue) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="bg-muted flex size-14 items-center justify-center rounded-xl">
          <QrCode className="text-muted-foreground size-7" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-medium">Chưa có mã vạch</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Nhấn nút bên dưới để tạo mã vạch cho sản phẩm này.
          </p>
        </div>
        {canGenerate && (
          <Button type="button" onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <QrCode className="size-4" aria-hidden="true" />
            )}
            Tạo mã vạch
          </Button>
        )}
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-5 p-4 sm:p-6">
      <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Mã vạch sản phẩm</h3>
          <p translate="no" className="text-muted-foreground mt-1 font-mono text-xs">
            {sku}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            disabled={Boolean(renderError)}
            onClick={downloadSvg}
          >
            <Download className="size-4" aria-hidden="true" />
            Tải SVG
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            disabled={Boolean(renderError)}
            onClick={printLabel}
          >
            <Printer className="size-4" aria-hidden="true" />
            In nhãn
          </Button>
          {canGenerate && (
            <Button
              type="button"
              size="sm"
              className="flex-1 sm:flex-none"
              disabled={isGenerating}
              onClick={onGenerate}
            >
              {isGenerating && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
              Tạo lại
            </Button>
          )}
        </div>
      </header>

      {renderError ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Không thể hiển thị mã vạch</AlertTitle>
          <AlertDescription>{renderError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex min-h-64 items-center justify-center bg-white p-4">
        <svg
          ref={svgRef}
          role="img"
          className="h-auto max-w-full [&_rect]:[shape-rendering:crispEdges]"
          aria-label={`Mã vạch sản phẩm ${sku}`}
        />
      </div>

      <dl className="grid gap-1 text-xs">
        <dt className="text-muted-foreground">Giá trị mã vạch</dt>
        <dd translate="no" className="font-mono break-all">
          {barcodeValue}
        </dd>
      </dl>
      {printMarkup ? <BarcodePrintLayer svgMarkup={printMarkup} title={sku} /> : null}
    </section>
  )
}
