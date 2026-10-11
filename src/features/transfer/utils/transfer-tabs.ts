/**
 * Thanh tab của chuyển kho hiển thị nội dung ở vùng riêng (không dùng TabsContent của Radix), nên tự nối
 * tab với vùng nội dung theo mẫu WAI-ARIA: tab có aria-controls trỏ tới tabpanel, tabpanel có aria-labelledby
 * trỏ tới tab đang chọn.
 */
export function transferTabIds(baseId: string, activeValue: string) {
  const panelId = `${baseId}-panel`
  return {
    panelId,
    tabId: (value: string) => `${baseId}-tab-${value}`,
    panelProps: {
      id: panelId,
      role: 'tabpanel' as const,
      'aria-labelledby': `${baseId}-tab-${activeValue}`,
    },
  }
}
