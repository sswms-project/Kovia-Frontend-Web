import type { WarehouseLayoutRackShape } from '../../../types/warehouse-layout-scene.types'

export function RackShapeIcon({ shape }: { readonly shape: WarehouseLayoutRackShape }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      aria-hidden="true"
      className="size-8"
    >
      {shape === 'Standard' ? <rect x="3" y="10" width="26" height="12" fill="white" /> : null}
      {shape === 'Vertical' ? (
        <>
          <rect x="10" y="4" width="12" height="24" fill="white" />
          <path d="M16 5v22" />
        </>
      ) : null}
      {shape === 'CrossBraced' ? (
        <>
          <rect x="5" y="6" width="22" height="20" fill="white" />
          <path d="m7 8 18 16M25 8 7 24" />
        </>
      ) : null}
      {shape === 'Pallet' ? (
        <>
          <rect
            x="4"
            y="4"
            width="24"
            height="24"
            fill="currentColor"
            stroke="none"
            className="text-muted-foreground"
          />
          {[9, 16, 23].flatMap((position) => [
            <path key={`v-${position}`} d={`M${position} 6v20`} stroke="white" strokeWidth="2.4" />,
            <path key={`h-${position}`} d={`M6 ${position}h20`} stroke="white" strokeWidth="2.4" />,
          ])}
        </>
      ) : null}
    </svg>
  )
}
