import type { ReactNode } from 'react'
import { Circle, Group, Line, Rect, Text } from 'react-konva'
import type { WarehouseLayoutDecorationType } from '../../../types/warehouse-layout-scene.types'
import type { CanvasPalette } from './canvas-palette'

export function renderDecorationSymbol(
  type: WarehouseLayoutDecorationType,
  width: number,
  height: number,
  palette: CanvasPalette,
  foreground?: string,
  sizeMultiplier = 1
) {
  const iconSize =
    Math.max(20, Math.min(width, height - (height >= 58 ? 18 : 0)) * 0.62) * sizeMultiplier
  const scale = iconSize / 24
  const x = (width - iconSize) / 2
  const y = Math.max(0, (height - iconSize - (height >= 58 ? 18 : 0)) / 2)
  const stroke = foreground ?? palette.foreground
  const strokeWidth = 1.6
  let symbol: ReactNode

  switch (type) {
    case 'Door':
      symbol = (
        <>
          <Line points={[3, 22, 21, 22]} stroke={stroke} strokeWidth={2} />
          <Line points={[6, 22, 6, 4]} stroke={stroke} strokeWidth={strokeWidth} />
          <Line
            points={[6, 4, 16, 4, 21, 12, 21, 22]}
            bezier
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </>
      )
      break
    case 'DoubleDoor':
      symbol = (
        <>
          <Line points={[1, 22, 23, 22]} stroke={stroke} strokeWidth={2} />
          <Line points={[4, 22, 4, 7]} stroke={stroke} strokeWidth={strokeWidth} />
          <Line points={[20, 22, 20, 7]} stroke={stroke} strokeWidth={strokeWidth} />
          <Line
            points={[4, 7, 12, 7, 12, 15, 12, 22]}
            bezier
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Line
            points={[20, 7, 12, 7, 12, 15, 12, 22]}
            bezier
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </>
      )
      break
    case 'Gate':
      symbol = (
        <>
          <Line points={[3, 4, 3, 21, 6, 21, 6, 4, 3, 4]} stroke={stroke} strokeWidth={1.4} />
          <Line points={[18, 4, 18, 21, 21, 21, 21, 4, 18, 4]} stroke={stroke} strokeWidth={1.4} />
          <Line points={[6, 14, 18, 14]} stroke={stroke} strokeWidth={2} />
          <Rect x={10.5} y={11.5} width={3} height={5} stroke={stroke} strokeWidth={1.2} />
        </>
      )
      break
    case 'DirectionArrow':
      symbol = (
        <Line
          points={[3, 12, 19, 12, 14, 7, 19, 12, 14, 17]}
          stroke={stroke}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
      )
      break
    case 'Exit':
      symbol = (
        <>
          <Rect x={3} y={3} width={12} height={18} stroke={stroke} strokeWidth={strokeWidth} />
          <Line
            points={[9, 12, 22, 12, 18, 8, 22, 12, 18, 16]}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </>
      )
      break
    case 'Forklift':
      symbol = (
        <>
          <Rect x={3} y={8} width={12} height={9} fill={stroke} opacity={0.16} />
          <Line points={[5, 8, 5, 3, 8, 3, 8, 8]} stroke={stroke} strokeWidth={strokeWidth} />
          <Line
            points={[12, 8, 12, 3, 15, 3, 17, 17, 21, 17]}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Line points={[5, 12, 14, 12]} stroke={stroke} strokeWidth={1.2} />
          <Circle x={7} y={20} radius={2.2} fill={stroke} />
          <Circle x={17} y={20} radius={2.2} fill={stroke} />
        </>
      )
      break
    case 'PalletTruck':
      symbol = (
        <>
          <Rect x={6} y={3} width={12} height={17} fill={stroke} opacity={0.16} />
          <Line points={[8, 7, 16, 7]} stroke={stroke} strokeWidth={1.2} />
          <Line points={[8, 10, 16, 10]} stroke={stroke} strokeWidth={1.2} />
          <Line points={[8, 13, 16, 13]} stroke={stroke} strokeWidth={1.2} />
          <Line points={[8, 16, 16, 16]} stroke={stroke} strokeWidth={1.2} />
          <Line points={[6, 5, 3, 5, 3, 21, 21, 21]} stroke={stroke} strokeWidth={strokeWidth} />
          <Circle x={7} y={22} radius={1.5} fill={stroke} />
          <Circle x={18} y={22} radius={1.5} fill={stroke} />
        </>
      )
      break
    case 'Packing':
      symbol = (
        <>
          <Rect x={4} y={5} width={16} height={15} stroke={stroke} strokeWidth={strokeWidth} />
          <Line points={[4, 10, 20, 10]} stroke={stroke} strokeWidth={strokeWidth} />
          <Line points={[12, 5, 12, 20]} stroke={stroke} strokeWidth={strokeWidth} />
        </>
      )
      break
    case 'Picking':
      symbol = (
        <>
          <Rect x={4} y={4} width={16} height={16} stroke={stroke} strokeWidth={strokeWidth} />
          <Line points={[7, 12, 10.5, 15.5, 17, 8]} stroke={stroke} strokeWidth={2} />
        </>
      )
      break
    case 'Damaged':
      symbol = (
        <>
          <Line
            points={[12, 2, 22, 21, 2, 21]}
            closed
            stroke={foreground ?? palette.destructive}
            strokeWidth={strokeWidth}
          />
          <Text
            x={9}
            y={7}
            width={6}
            text="!"
            align="center"
            fill={foreground ?? palette.destructive}
            fontSize={12}
          />
        </>
      )
      break
    case 'Office':
      symbol = (
        <>
          <Rect x={4} y={3} width={16} height={18} stroke={stroke} strokeWidth={strokeWidth} />
          <Rect x={7} y={7} width={3} height={3} stroke={stroke} strokeWidth={1} />
          <Rect x={14} y={7} width={3} height={3} stroke={stroke} strokeWidth={1} />
          <Rect x={10} y={14} width={5} height={7} stroke={stroke} strokeWidth={1} />
        </>
      )
      break
    case 'DoubleGate':
      symbol = (
        <>
          <Line points={[3, 4, 3, 21, 6, 21, 6, 4, 3, 4]} stroke={stroke} strokeWidth={1.4} />
          <Line points={[18, 4, 18, 21, 21, 21, 21, 4, 18, 4]} stroke={stroke} strokeWidth={1.4} />
          <Line points={[6, 16, 18, 10]} stroke={stroke} strokeWidth={2} />
          <Rect x={10.5} y={10.5} width={3} height={5} stroke={stroke} strokeWidth={1.2} />
        </>
      )
      break
    case 'Aisle':
      symbol = (
        <>
          <Line points={[4, 3, 4, 21]} stroke={stroke} strokeWidth={strokeWidth} />
          <Line points={[20, 3, 20, 21]} stroke={stroke} strokeWidth={strokeWidth} />
          <Line points={[8, 12, 16, 12]} stroke={stroke} strokeWidth={strokeWidth} />
        </>
      )
      break
    case 'Receiving':
      symbol = (
        <>
          <Rect x={4} y={5} width={16} height={15} stroke={stroke} strokeWidth={strokeWidth} />
          <Line points={[2, 12, 12, 12, 9, 9, 12, 12, 9, 15]} stroke={stroke} strokeWidth={1.5} />
        </>
      )
      break
    case 'Other':
      symbol = (
        <>
          <Line
            points={[12, 2, 21, 7, 12, 12, 3, 7, 12, 2]}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Line
            points={[3, 7, 3, 17, 12, 22, 21, 17, 21, 7]}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Line points={[12, 12, 12, 22]} stroke={stroke} strokeWidth={strokeWidth} />
        </>
      )
      break
    default:
      symbol = <Rect x={4} y={4} width={16} height={16} stroke={stroke} strokeWidth={strokeWidth} />
  }

  return (
    <Group x={x} y={y} scaleX={scale} scaleY={scale} listening={false}>
      {symbol}
    </Group>
  )
}
