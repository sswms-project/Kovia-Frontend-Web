import type Konva from 'konva'
import type { WarehouseLayoutGeometry } from '../../../types/warehouse-layout-scene.types'

/** Hình học của node sau khi kéo/biến đổi, quy về góc trên trái vì Group được đặt theo tâm. */
export function getCanvasNodeGeometry(node: Konva.Node, zIndex: number): WarehouseLayoutGeometry {
  const width = Math.max(1, node.width() * node.scaleX())
  const height = Math.max(1, node.height() * node.scaleY())
  return {
    x: node.x() - width / 2,
    y: node.y() - height / 2,
    width,
    height,
    rotation: node.rotation(),
    zIndex,
  }
}
