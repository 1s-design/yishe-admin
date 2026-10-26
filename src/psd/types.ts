/**
 * PSD 解析与预览共享类型
 */

/** 图层节点（精简后的图层树结构，用于主线程展示） */
export interface PsdLayerNode {
  id: number
  name: string
  /** 是否为图层组 */
  isGroup: boolean
  /** 是否隐藏 */
  hidden: boolean
  /** 不透明度 0-255 */
  opacity: number
  /** 混合模式 */
  blendMode: string
  /** 图层类型描述 */
  kind: 'group' | 'pixel' | 'text' | 'adjustment' | 'shape' | 'smart' | 'other'
  left: number
  top: number
  width: number
  height: number
  /** 是否使用了非原生混合模式（回退到 normal） */
  blendModeFallback: boolean
  /** 文本图层内容（已截断） */
  text?: string
  children: PsdLayerNode[]
}

export type PsdFidelity = 'original' | 'approximated' | 'fallback'

export interface PsdTreeMessage {
  type: 'tree'
  width: number
  height: number
  /** PSD 色彩模式：3 = RGB，4 = CMYK，1 = 灰度 */
  colorMode: number
  layers: PsdLayerNode[]
}

export interface PsdCompositeMessage {
  type: 'composite'
  /** 原始 RGBA 像素数据，已 transfer */
  data: ArrayBuffer
  width: number
  height: number
  fidelity: PsdFidelity
  fallbackCount: number
  clippingCount: number
  adjustmentCount: number
}

export interface PsdThumbnailMessage {
  type: 'thumbnail'
  blob: Blob
  width: number
  height: number
}

export interface PsdErrorMessage {
  type: 'error'
  message: string
}

export interface PsdProgressMessage {
  type: 'progress'
  stage: 'parse-tree' | 'parse-data' | 'composite' | 'done'
  message: string
}

export type PsdWorkerMessage =
  | PsdTreeMessage
  | PsdCompositeMessage
  | PsdThumbnailMessage
  | PsdErrorMessage
  | PsdProgressMessage

/** 主线程 -> Worker 的请求 */
export interface ParseRequest {
  type: 'parse'
  buffer: ArrayBuffer
}

export interface RecompositeRequest {
  type: 'recomposite'
  /** key: layerId, value: 是否可见 */
  visibility: Record<number, boolean>
}

export interface ExportThumbnailRequest {
  type: 'export-thumbnail'
  maxSize: number
  type2?: 'image/png' | 'image/jpeg' | 'image/webp'
  quality?: number
}

export type PsdWorkerRequest = ParseRequest | RecompositeRequest | ExportThumbnailRequest
