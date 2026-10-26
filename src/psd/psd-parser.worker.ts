/**
 * PSD 解析 Worker（基于 @webtoon/psd，零依赖 + 像素懒解码）
 *
 * PeekPSD 两遍式架构：
 *  1) 快通道：`Psd.parse()` 仅读取文件结构（56MB 文件实测 ~29ms），结构就绪立即回传图层树
 *  2) 完整通道：像素由 `composite()` 按需解码（异步），合成完成后回传
 *
 * 合成策略：
 *  - 优先使用 PSD 内嵌合并合成图（文件以 Maximize Compatibility 保存时可用），保真度 = original
 *  - 无内嵌合成图时按图层重建：@webtoon/psd 的 children[0] 是最顶层图层，故倒序自底向上绘制
 *  - 16 种 Canvas 原生混合模式直接映射，其余 PSD 特有模式回退 source-over 并计入 fallbackCount
 */
import Psd, { type Layer, type Group, type NodeChild } from '@webtoon/psd'
import type {
  PsdLayerNode,
  PsdWorkerRequest,
  PsdTreeMessage,
  PsdCompositeMessage,
  PsdThumbnailMessage,
} from './types'

/** worker 作用域（避开 DOM lib 的 window.postMessage 重载干扰） */
type WorkerScope = { postMessage(message: unknown, transfer?: Transferable[]): void }
const scope = self as unknown as WorkerScope

/* ------------------------------------------------------------------ *
 * 混合模式：PSD 4 字符编码 -> Canvas globalCompositeOperation
 * ------------------------------------------------------------------ */

const BLEND_TO_OP: Record<string, GlobalCompositeOperation> = {
  norm: 'source-over',
  pass: 'source-over', // 图层组直通（pass through）
  diss: 'source-over', // 溶解：Canvas 不支持，回退
  'mul ': 'multiply',
  scrn: 'screen',
  over: 'overlay',
  dark: 'darken',
  lite: 'lighten',
  'div ': 'color-dodge',
  idiv: 'color-burn',
  hLit: 'hard-light',
  sLit: 'soft-light',
  diff: 'difference',
  smud: 'exclusion',
  'hue ': 'hue',
  'sat ': 'saturation',
  colr: 'color',
  'lum ': 'luminosity',
}

/** Canvas 原生支持的模式；其余走回退并计入统计 */
const NATIVE_MODES = new Set([
  'norm', 'pass', 'mul ', 'scrn', 'over', 'dark', 'lite', 'div ', 'idiv',
  'hLit', 'sLit', 'diff', 'smud', 'hue ', 'sat ', 'colr', 'lum ',
])

/* ------------------------------------------------------------------ *
 * 内部属性访问（公共 API 未暴露 blendMode / 组的 hidden / clipping）
 * ------------------------------------------------------------------ */

interface LayerPropsInternal {
  blendMode?: string
  hidden?: boolean
  clippingMask?: number
}

function propsOf(node: Layer | Group): LayerPropsInternal {
  const frame = (node as unknown as { layerFrame?: { layerProperties?: LayerPropsInternal } })
    .layerFrame
  return frame?.layerProperties ?? {}
}

function isNodeHidden(node: Layer | Group): boolean {
  return node.type === 'Layer' ? (node as Layer).isHidden : (propsOf(node).hidden ?? false)
}

function blendModeOf(node: Layer | Group): string {
  return propsOf(node).blendMode ?? 'norm'
}

/* ------------------------------------------------------------------ *
 * 状态
 * ------------------------------------------------------------------ */

let currentPsd: Psd | null = null
let idCounter = 0
/** 图层 id -> 节点引用（重合成时按 id 查回） */
const nodeRefs = new Map<number, Layer | Group>()
/** 节点 -> id（反向查找） */
const nodeIds = new WeakMap<object, number>()
/** 已解码图层像素缓存（提升可见性切换的重合成速度） */
const layerCanvasCache = new Map<number, OffscreenCanvas>()
let cacheBytes = 0
const CACHE_BUDGET = 256 * 1024 * 1024

function resetState() {
  currentPsd = null
  idCounter = 0
  nodeRefs.clear()
  layerCanvasCache.clear()
  cacheBytes = 0
}

/* ------------------------------------------------------------------ *
 * 图层树
 * ------------------------------------------------------------------ */

function detectKind(node: NodeChild): PsdLayerNode['kind'] {
  if (node.type === 'Group') return 'group'
  const layer = node as Layer
  if (layer.text !== undefined) return 'text'
  // 调整层通常没有像素通道（尺寸为 0）
  if ((layer.width ?? 0) <= 0 || (layer.height ?? 0) <= 0) return 'adjustment'
  return 'pixel'
}

/** 由子节点包围盒推导组的位置尺寸 */
function bboxOf(children: PsdLayerNode[]) {
  let left = Number.POSITIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY
  const walk = (nodes: PsdLayerNode[]) => {
    for (const n of nodes) {
      if (n.children?.length) {
        walk(n.children)
        continue
      }
      left = Math.min(left, n.left)
      top = Math.min(top, n.top)
      right = Math.max(right, n.left + n.width)
      bottom = Math.max(bottom, n.top + n.height)
    }
  }
  walk(children)
  if (!Number.isFinite(left) || !Number.isFinite(top)) return { left: 0, top: 0, width: 0, height: 0 }
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) }
}

function buildNode(node: NodeChild): PsdLayerNode {
  const id = ++idCounter
  nodeRefs.set(id, node)
  nodeIds.set(node, id)

  const isGroup = node.type === 'Group'
  const blendMode = blendModeOf(node)

  const result: PsdLayerNode = {
    id,
    name: node.name || '未命名图层',
    isGroup,
    hidden: isNodeHidden(node),
    opacity: node.opacity ?? 255,
    blendMode,
    kind: detectKind(node),
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    blendModeFallback: !NATIVE_MODES.has(blendMode),
    text: isGroup ? undefined : ((node as Layer).text?.slice(0, 300) || undefined),
    children: [],
  }

  if (isGroup) {
    const children = (node as Group).children ?? []
    result.children = children.map(buildNode)
    const bbox = bboxOf(result.children)
    result.left = bbox.left
    result.top = bbox.top
    result.width = bbox.width
    result.height = bbox.height
  } else {
    const layer = node as Layer
    result.left = layer.left ?? 0
    result.top = layer.top ?? 0
    result.width = Math.max(0, layer.width ?? 0)
    result.height = Math.max(0, layer.height ?? 0)
  }

  return result
}

/* ------------------------------------------------------------------ *
 * 解码与合成
 * ------------------------------------------------------------------ */

interface ComposeStats {
  fallbackCount: number
  clippingCount: number
  adjustmentCount: number
}

function newStats(): ComposeStats {
  return { fallbackCount: 0, clippingCount: 0, adjustmentCount: 0 }
}

/** 采样判断像素是否可见（提前退出，真实合成图几乎立即返回） */
function hasVisiblePixels(px: Uint8ClampedArray): boolean {
  for (let i = 3; i < px.length; i += 4) {
    if (px[i] !== 0) return true
  }
  return false
}

/** 把 RGBA 像素画到 OffscreenCanvas */
function pixelsToCanvas(px: Uint8ClampedArray, width: number, height: number): OffscreenCanvas {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(width, height)
  imageData.data.set(px)
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

/** 取得（并缓存）图层像素画布；composite(false) 返回未叠加不透明度的原始 RGBA */
async function getLayerCanvas(layer: Layer): Promise<OffscreenCanvas | null> {
  const id = nodeIds.get(layer)
  const cached = id !== undefined ? layerCanvasCache.get(id) : undefined
  if (cached) return cached

  const width = layer.width ?? 0
  const height = layer.height ?? 0
  if (width <= 0 || height <= 0) return null

  const px = await layer.composite(false)
  if (!px || px.length !== width * height * 4) return null

  const canvas = pixelsToCanvas(px, width, height)

  if (id !== undefined && cacheBytes < CACHE_BUDGET) {
    layerCanvasCache.set(id, canvas)
    cacheBytes += width * height * 4
  }
  return canvas
}

/**
 * 在目标 ctx 上绘制节点（含组）
 * @returns 是否绘制了内容
 */
async function compositeNode(
  node: Layer | Group,
  ctx: OffscreenCanvasRenderingContext2D,
  stats: ComposeStats,
  visibility: Record<number, boolean> | null,
): Promise<boolean> {
  const id = nodeIds.get(node)
  const visible = visibility ? visibility[id ?? -1] !== false : !isNodeHidden(node)
  if (!visible) return false

  const blendMode = blendModeOf(node)
  if (!NATIVE_MODES.has(blendMode)) stats.fallbackCount++

  const opacity = (node.opacity ?? 255) / 255

  if (node.type === 'Group') {
    const children = (node as Group).children ?? []

    // 直通组（pass through，且不透明度为 100%）：子层直接叠加到父级，语义更接近 Photoshop
    if (blendMode === 'pass' && opacity >= 1) {
      let has = false
      for (let i = children.length - 1; i >= 0; i--) {
        if (await compositeNode(children[i], ctx, stats, visibility)) has = true
      }
      return has
    }

    // 其余组先在离屏画布上合成，再整体绘制（保证组不透明度/混合模式生效）
    const tmp = new OffscreenCanvas(ctx.canvas.width, ctx.canvas.height)
    const tctx = tmp.getContext('2d')!
    let has = false
    for (let i = children.length - 1; i >= 0; i--) {
      if (await compositeNode(children[i], tctx, stats, visibility)) has = true
    }
    if (!has) return false

    ctx.save()
    ctx.globalAlpha = opacity
    ctx.globalCompositeOperation = BLEND_TO_OP[blendMode] ?? 'source-over'
    ctx.drawImage(tmp, 0, 0)
    ctx.restore()
    return true
  }

  // 普通图层
  const layer = node as Layer
  if (layer.text === undefined && ((layer.width ?? 0) <= 0 || (layer.height ?? 0) <= 0)) {
    stats.adjustmentCount++
    return false
  }
  if (propsOf(layer).clippingMask === 1) stats.clippingCount++

  const layerCanvas = await getLayerCanvas(layer)
  if (!layerCanvas) return false

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.globalCompositeOperation = BLEND_TO_OP[blendMode] ?? 'source-over'
  ctx.drawImage(layerCanvas, layer.left ?? 0, layer.top ?? 0)
  ctx.restore()
  return true
}

/** 按图层重建整幅合成（无内嵌合成图 / 切换可见性时使用） */
async function reconstruct(
  psd: Psd,
  visibility: Record<number, boolean> | null,
): Promise<{
  data: Uint8ClampedArray
  width: number
  height: number
  stats: ComposeStats
  hasContent: boolean
}> {
  const stats = newStats()
  const canvas = new OffscreenCanvas(psd.width, psd.height)
  const ctx = canvas.getContext('2d')!

  const children = psd.children ?? []
  let hasContent = false
  // children[0] 为最顶层，需倒序自底向上绘制
  for (let i = children.length - 1; i >= 0; i--) {
    if (await compositeNode(children[i], ctx, stats, visibility)) hasContent = true
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return { data: imageData.data, width: canvas.width, height: canvas.height, stats, hasContent }
}

/**
 * 取得最终合成像素
 * 默认可见性且存在内嵌合成图时直接复用（最高保真），否则按图层重建
 */
async function composeFinal(visibility: Record<number, boolean> | null) {
  const psd = currentPsd
  if (!psd) throw new Error('尚未解析 PSD')

  const useEmbedded = !visibility || isDefaultVisibility(visibility)
  if (useEmbedded) {
    try {
      const px = await psd.composite()
      if (px && px.length === psd.width * psd.height * 4 && hasVisiblePixels(px)) {
        return {
          data: px,
          width: psd.width,
          height: psd.height,
          fidelity: 'original' as const,
          stats: newStats(),
        }
      }
    } catch {
      /* 无内嵌合成图，走重建 */
    }
  }

  const { data, width, height, stats } = await reconstruct(psd, visibility)
  const fidelity: PsdCompositeMessage['fidelity'] =
    stats.fallbackCount > 0 ? 'fallback' : 'approximated'
  return { data, width, height, fidelity, stats }
}

/** 可见性映射是否全部等于文件里的默认状态 */
function isDefaultVisibility(visibility: Record<number, boolean>): boolean {
  for (const key of Object.keys(visibility)) {
    const node = nodeRefs.get(Number(key))
    if (!node) continue
    if (visibility[key] === isNodeHidden(node)) return false
  }
  return true
}

/** 把任意抛出的值格式化为可读信息（含错误栈，便于定位） */
function errorText(e: unknown): string {
  if (e instanceof Error) return e.message || e.name || '解析失败'
  if (typeof e === 'string') return e
  try {
    return JSON.stringify(e)
  } catch {
    return String(e)
  }
}

/** 回传合成结果（转移缓冲区，避免大图拷贝） */
function postComposite(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  fidelity: PsdCompositeMessage['fidelity'],
  stats: ComposeStats,
) {
  scope.postMessage(
    {
      type: 'composite',
      data: data.buffer as ArrayBuffer,
      width,
      height,
      fidelity,
      fallbackCount: stats.fallbackCount,
      clippingCount: stats.clippingCount,
      adjustmentCount: stats.adjustmentCount,
    } satisfies PsdCompositeMessage,
    [data.buffer as ArrayBuffer],
  )
}

/* ------------------------------------------------------------------ *
 * 请求处理
 * ------------------------------------------------------------------ */

async function handleParse(buffer: ArrayBuffer) {
  try {
    scope.postMessage({ type: 'progress', stage: 'parse-tree', message: '解析图层结构…' })

    // 快通道：同步解析结构（不解码像素），立刻回传图层树
    const psd = Psd.parse(buffer)
    resetState()
    currentPsd = psd

    const layers = (psd.children ?? []).map(buildNode)
    scope.postMessage({
      type: 'tree',
      width: psd.width,
      height: psd.height,
      colorMode: psd.colorMode,
      layers,
    } satisfies PsdTreeMessage)

    // 完整通道：解码像素并合成
    scope.postMessage({ type: 'progress', stage: 'parse-data', message: '解码图像数据…' })
    const { data, width, height, fidelity, stats } = await composeFinal(null)
    postComposite(data, width, height, fidelity, stats)

    scope.postMessage({ type: 'progress', stage: 'done', message: '完成' })
  } catch (e: any) {
    scope.postMessage({ type: 'error', message: errorText(e) })
  }
}

async function handleRecomposite(visibility: Record<number, boolean>) {
  if (!currentPsd) {
    scope.postMessage({ type: 'error', message: '尚未解析 PSD' })
    return
  }
  try {
    scope.postMessage({ type: 'progress', stage: 'composite', message: '重合成图像…' })
    const { data, width, height, fidelity, stats } = await composeFinal(visibility)
    postComposite(data, width, height, fidelity, stats)
    scope.postMessage({ type: 'progress', stage: 'done', message: '完成' })
  } catch (e: any) {
    scope.postMessage({ type: 'error', message: errorText(e) })
  }
}

async function handleExportThumbnail(maxSize: number, type = 'image/png', quality = 0.92) {
  if (!currentPsd) {
    scope.postMessage({ type: 'error', message: '尚未解析 PSD' })
    return
  }
  try {
    scope.postMessage({ type: 'progress', stage: 'composite', message: '导出图像…' })
    const { data, width, height } = await composeFinal(null)

    const src = pixelsToCanvas(data, width, height)
    const scale = Math.min(1, maxSize / Math.max(src.width, src.height))
    const w = Math.max(1, Math.round(src.width * scale))
    const h = Math.max(1, Math.round(src.height * scale))

    const thumb = new OffscreenCanvas(w, h)
    const tctx = thumb.getContext('2d')!
    tctx.imageSmoothingEnabled = true
    tctx.imageSmoothingQuality = 'high'
    tctx.drawImage(src, 0, 0, w, h)

    const blob = await thumb.convertToBlob({ type, quality })
    scope.postMessage({ type: 'thumbnail', blob, width: w, height: h } satisfies PsdThumbnailMessage)
    scope.postMessage({ type: 'progress', stage: 'done', message: '完成' })
  } catch (e: any) {
    scope.postMessage({ type: 'error', message: errorText(e) })
  }
}

self.onmessage = (e: MessageEvent<PsdWorkerRequest>) => {
  const req = e.data
  switch (req.type) {
    case 'parse':
      handleParse(req.buffer)
      break
    case 'recomposite':
      handleRecomposite(req.visibility)
      break
    case 'export-thumbnail':
      handleExportThumbnail(req.maxSize, req.type2, req.quality)
      break
  }
}
