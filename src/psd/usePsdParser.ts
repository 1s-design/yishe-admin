/**
 * PSD 解析 Worker 封装
 * 提供解析、重合成、导出缩略图的 Promise 化接口
 */
import type {
  PsdLayerNode,
  PsdFidelity,
  PsdWorkerMessage,
  PsdTreeMessage,
} from './types'

export interface PsdParseResult {
  width: number
  height: number
  /** PSD 色彩模式：3 = RGB，4 = CMYK，1 = 灰度 */
  colorMode: number
  layers: PsdLayerNode[]
  imageData: ImageData
  fidelity: PsdFidelity
  fallbackCount: number
  clippingCount: number
  adjustmentCount: number
}

export class PsdParser {
  private worker: Worker
  private listeners = new Map<string, Set<(msg: any) => void>>()
  private terminated = false

  constructor() {
    this.worker = new Worker(
      new URL('./psd-parser.worker.ts', import.meta.url),
      { type: 'module' },
    )
    this.worker.onmessage = (e: MessageEvent<PsdWorkerMessage>) => {
      const msg = e.data
      const set = this.listeners.get(msg.type)
      if (set) set.forEach((fn) => fn(msg))
    }
    this.worker.onerror = (e) => {
      const set = this.listeners.get('error')
      if (set) set.forEach((fn) => fn({ type: 'error', message: e.message }))
    }
  }

  on<T extends PsdWorkerMessage['type']>(
    type: T,
    handler: (msg: Extract<PsdWorkerMessage, { type: T }>) => void,
  ) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type)!.add(handler as any)
    return () => this.listeners.get(type)?.delete(handler as any)
  }

  /**
   * 解析 PSD
   * @param hooks.onTree 图层结构就绪回调（快通道），早于 composite，用于渐进式渲染
   * @returns 完整结果（tree 元数据 + composite 像素）
   */
  parse(
    buffer: ArrayBuffer,
    hooks?: { onTree?: (msg: PsdTreeMessage) => void },
  ): Promise<PsdParseResult> {
    return new Promise((resolve, reject) => {
      let tree: {
        width: number
        height: number
        colorMode: number
        layers: PsdLayerNode[]
      } | null = null
      let composite: {
        imageData: ImageData
        fidelity: PsdFidelity
        fallbackCount: number
        clippingCount: number
        adjustmentCount: number
      } | null = null

      const tryResolve = () => {
        if (tree && composite) {
          cleanup()
          resolve({
            width: tree.width,
            height: tree.height,
            colorMode: tree.colorMode,
            layers: tree.layers,
            imageData: composite.imageData,
            fidelity: composite.fidelity,
            fallbackCount: composite.fallbackCount,
            clippingCount: composite.clippingCount,
            adjustmentCount: composite.adjustmentCount,
          })
        }
      }

      const offTree = this.on('tree', (msg) => {
        tree = {
          width: msg.width,
          height: msg.height,
          colorMode: msg.colorMode,
          layers: msg.layers,
        }
        // 图层树先行回传，UI 可立即渲染侧边栏，无需等待像素解码
        hooks?.onTree?.(msg)
        tryResolve()
      })
      const offComposite = this.on('composite', (msg) => {
        composite = {
          imageData: new ImageData(new Uint8ClampedArray(msg.data), msg.width, msg.height),
          fidelity: msg.fidelity,
          fallbackCount: msg.fallbackCount,
          clippingCount: msg.clippingCount,
          adjustmentCount: msg.adjustmentCount,
        }
        tryResolve()
      })
      const offError = this.on('error', (msg) => {
        cleanup()
        reject(new Error(msg.message))
      })

      function cleanup() {
        offTree()
        offComposite()
        offError()
      }

      this.worker.postMessage({ type: 'parse', buffer }, [buffer])
    })
  }

  /** 根据图层可见性重新合成 */
  recomposite(visibility: Record<number, boolean>): Promise<{
    imageData: ImageData
    fidelity: PsdFidelity
    fallbackCount: number
    clippingCount: number
    adjustmentCount: number
  }> {
    return new Promise((resolve, reject) => {
      const off = this.on('composite', (msg) => {
        off()
        offError()
        resolve({
          imageData: new ImageData(new Uint8ClampedArray(msg.data), msg.width, msg.height),
          fidelity: msg.fidelity,
          fallbackCount: msg.fallbackCount,
          clippingCount: msg.clippingCount,
          adjustmentCount: msg.adjustmentCount,
        })
      })
      const offError = this.on('error', (msg) => {
        off()
        offError()
        reject(new Error(msg.message))
      })
      this.worker.postMessage({ type: 'recomposite', visibility })
    })
  }

  /** 导出缩略图 Blob */
  exportThumbnail(
    maxSize: number,
    type: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
    quality = 0.92,
  ): Promise<{ blob: Blob; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const off = this.on('thumbnail', (msg) => {
        off()
        offError()
        resolve({ blob: msg.blob, width: msg.width, height: msg.height })
      })
      const offError = this.on('error', (msg) => {
        off()
        offError()
        reject(new Error(msg.message))
      })
      this.worker.postMessage({ type: 'export-thumbnail', maxSize, type2: type, quality })
    })
  }

  /** 监听进度 */
  onProgress(handler: (stage: string, message: string) => void) {
    return this.on('progress', (msg) => handler(msg.stage, msg.message))
  }

  terminate() {
    if (this.terminated) return
    this.terminated = true
    this.worker.terminate()
    this.listeners.clear()
  }
}
