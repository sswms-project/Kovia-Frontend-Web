export function productStockOption(
  product: { id: string; sku: string; productName: string; unitName: string },
  availableQuantity: number | undefined,
  unavailableMessage = 'Chưa tải được tồn khả dụng'
) {
  return {
    value: product.id,
    label: `${product.sku} - ${product.productName}`,
    description:
      availableQuantity === undefined || !Number.isFinite(availableQuantity)
        ? unavailableMessage
        : `Tồn khả dụng: ${availableQuantity.toLocaleString('vi-VN', { maximumFractionDigits: 3 })} ${product.unitName}`,
  }
}
