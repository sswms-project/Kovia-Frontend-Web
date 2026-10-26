import { Line } from 'react-konva'
import type { CanvasRack } from './types'

interface CanvasRackShapeMarksProps {
  readonly rack: CanvasRack
  readonly stroke: string
  readonly viewportScale: number
}

/** Nét vẽ thêm trên thân kệ để phân biệt kiểu kệ (đứng, giằng chéo, pallet). */
export function CanvasRackShapeMarks({ rack, stroke, viewportScale }: CanvasRackShapeMarksProps) {
  switch (rack.layoutShape) {
    case 'Vertical':
      return (
        <Line
          points={[rack.width / 2, 4, rack.width / 2, rack.height - 4]}
          stroke={stroke}
          strokeWidth={1 / viewportScale}
          listening={false}
        />
      )
    case 'CrossBraced':
      return (
        <>
          <Line
            points={[5, 5, rack.width - 5, rack.height - 5]}
            stroke={stroke}
            strokeWidth={1.5 / viewportScale}
            listening={false}
          />
          <Line
            points={[rack.width - 5, 5, 5, rack.height - 5]}
            stroke={stroke}
            strokeWidth={1.5 / viewportScale}
            listening={false}
          />
        </>
      )
    case 'Pallet':
      return (
        <>
          {[0.3, 0.5, 0.7].map((fraction) => (
            <Line
              key={fraction}
              points={[
                rack.width * fraction,
                rack.height * 0.12,
                rack.width * fraction,
                rack.height * 0.88,
              ]}
              stroke={stroke}
              strokeWidth={2 / viewportScale}
              listening={false}
            />
          ))}
          {[0.35, 0.65].map((fraction) => (
            <Line
              key={fraction}
              points={[
                rack.width * 0.12,
                rack.height * fraction,
                rack.width * 0.88,
                rack.height * fraction,
              ]}
              stroke={stroke}
              strokeWidth={1 / viewportScale}
              listening={false}
            />
          ))}
        </>
      )
    default:
      return null
  }
}
