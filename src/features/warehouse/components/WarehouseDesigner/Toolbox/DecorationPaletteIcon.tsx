import type { WarehouseLayoutDecorationType } from '../../../types/warehouse-layout-scene.types'

export function DecorationPaletteIcon({ type }: { readonly type: WarehouseLayoutDecorationType }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8">
      {type === 'Gate' ? (
        <g {...common}>
          <path d="M4 8v16M28 8v16M4 18h24" />
          <path d="M7 15v6M25 15v6M14 15h4v3h-4z" />
        </g>
      ) : null}
      {type === 'DoubleGate' ? (
        <g {...common}>
          <path d="M4 8v16M28 8v16M4 19l24-7" />
          <path d="M7 16v6M25 10v6M14.5 14.7l4-1.2.5 3-4 1.2z" />
        </g>
      ) : null}
      {type === 'Door' ? (
        <g {...common}>
          <path d="M4 25h24M8 25V7M8 7a18 18 0 0 1 18 18" />
        </g>
      ) : null}
      {type === 'DoubleDoor' ? (
        <g {...common}>
          <path d="M3 25h26M7 25V10M25 25V10M7 10a15 15 0 0 1 15 15M25 10a15 15 0 0 0-15 15" />
        </g>
      ) : null}
      {type === 'Forklift' ? (
        <g {...common} className="text-primary">
          <path d="M7 10h10l3 8H6z" fill="currentColor" fillOpacity="0.18" />
          <path d="M9 10V5M16 10V5M18 19h6V7M24 7h3M24 20h4" />
          <path d="M9 14h7M8 18h10" />
          <circle cx="10" cy="23" r="2.5" fill="currentColor" />
          <circle cx="21" cy="23" r="2.5" fill="currentColor" />
        </g>
      ) : null}
      {type === 'PalletTruck' ? (
        <g {...common} className="text-primary">
          <path d="M11 5h10l2 4v15H9V9z" fill="currentColor" fillOpacity="0.18" />
          <path d="M12 9h8M12 12h8M12 15h8M12 18h8M12 21h8" />
          <path d="M9 8H6v17h20M12 27h8" />
          <circle cx="10" cy="26" r="1.5" fill="currentColor" />
          <circle cx="23" cy="26" r="1.5" fill="currentColor" />
        </g>
      ) : null}
      {type === 'DirectionArrow' ? (
        <g {...common} strokeWidth="2.2">
          <path d="M4 16h22M19 9l7 7-7 7" />
        </g>
      ) : null}
      {type === 'Exit' ? (
        <g {...common} strokeWidth="2">
          <path d="M6 7h12v18H6zM13 16h15M23 11l5 5-5 5" />
        </g>
      ) : null}
    </svg>
  )
}
