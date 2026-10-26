<template>
  <div class="psd-preview">
    <!-- 左侧图层树 -->
    <aside class="psd-preview__sidebar">
      <div class="psd-preview__sidebar-head">
        <span class="psd-preview__sidebar-title">图层</span>
        <span class="psd-preview__layer-count">{{ layerCount }}</span>
      </div>
      <div class="psd-preview__sidebar-tools">
        <button class="icon-btn" :disabled="!layers.length" @click="showAll" title="全部显示">
          <el-icon><View /></el-icon>
        </button>
        <button class="icon-btn" :disabled="!layers.length" @click="hideAll" title="全部隐藏">
          <el-icon><Hide /></el-icon>
        </button>
      </div>
      <div class="psd-preview__layer-tree" v-loading="treeLoading">
        <el-empty v-if="!treeLoading && !layers.length" description="无图层" :image-size="60" />
        <div v-else class="layer-tree">
          <div
            v-for="node in flattenedLayers"
            :key="node.id"
            class="layer-tree__node"
            :class="{ 'is-active': selectedId === node.id }"
            :style="{ paddingLeft: node.depth * 14 + 10 + 'px' }"
            @click="selectedId = node.id"
          >
            <button
              class="layer-tree__eye"
              :class="{ 'is-off': !node.visible }"
              @click.stop="toggleVisibility(node.id)"
            >
              <el-icon v-if="node.visible"><View /></el-icon>
              <el-icon v-else><Hide /></el-icon>
            </button>
            <el-icon class="layer-tree__type" :class="`type-${node.kind}`">
              <component :is="layerIcon(node.kind)" />
            </el-icon>
            <el-tooltip :content="layerTip(node)" placement="top" :show-after="400">
              <span class="layer-tree__name" :class="{ 'is-off': !node.visible }">
                {{ node.name }}
              </span>
            </el-tooltip>
            <span v-if="node.blendModeFallback" class="layer-tree__dot" title="混合模式已回退"></span>
          </div>
        </div>
      </div>
    </aside>

    <!-- 右侧画布区 -->
    <section class="psd-preview__main">
      <header class="psd-preview__topbar">
        <div class="psd-preview__meta">
          <span class="psd-preview__name" :title="props.name || ''">{{ props.name || '未命名.psd' }}</span>
          <span v-if="canvasSize.width" class="psd-preview__dim">
            {{ canvasSize.width }} × {{ canvasSize.height }}
          </span>
          <span v-if="fidelity" class="psd-preview__fidelity" :class="`fidelity-${fidelity}`">
            <i class="psd-preview__fidelity-dot"></i>
            {{ fidelityText }}
          </span>
          <span v-if="isNonRgb" class="psd-preview__warn">
            <el-icon><WarningFilled /></el-icon>
            <span>{{ colorModeLabel }} 色彩模式</span>
          </span>
        </div>
        <div class="psd-preview__spacer"></div>
        <div class="psd-preview__tools">
          <button class="icon-btn" :disabled="!parsed" @click="zoomOut" title="缩小">
            <el-icon><ZoomOut /></el-icon>
          </button>
          <button class="icon-btn icon-btn--text" :disabled="!parsed" @click="resetZoom" title="原始大小">
            {{ Math.round(zoom * 100) }}%
          </button>
          <button class="icon-btn" :disabled="!parsed" @click="zoomIn" title="放大">
            <el-icon><ZoomIn /></el-icon>
          </button>
          <button class="icon-btn" :disabled="!parsed" @click="fitToScreen" title="适应屏幕">
            <el-icon><FullScreen /></el-icon>
          </button>
          <span class="psd-preview__divider"></span>
          <button
            class="icon-btn"
            :disabled="!parsed || exporting || saving"
            @click="handleDownload"
            title="下载当前合成图到本地"
          >
            <el-icon><Download /></el-icon>
            <span>下载图片</span>
          </button>
          <button
            v-if="canSetThumbnail"
            class="icon-btn icon-btn--primary"
            :disabled="!parsed || exporting || saving"
            @click="handleSetThumbnail"
            title="导出当前合成图，并设为该模板的缩略图"
          >
            <el-icon v-if="saving" class="is-loading"><Loading /></el-icon>
            <span>{{ saving ? '保存中…' : '设为缩略图' }}</span>
          </button>
        </div>
      </header>

      <div class="psd-preview__stage" ref="stageRef">
        <!-- 画布：拿到文档尺寸后就挂载（先被覆盖层遮住，画完再揭幕） -->
        <canvas
          v-if="canvasSize.width"
          ref="canvasRef"
          class="psd-preview__canvas"
          :class="{ 'is-panning': panning }"
          :style="canvasStyle"
          @mousedown="startPan"
        />

        <!-- 合成中：始终盖住画布，避免空白闪烁 -->
        <div v-if="compositing" class="psd-preview__loading">
          <div class="psd-preview__loading-card">
            <div class="psd-preview__loading-icon">
              <el-icon class="is-loading" :size="28"><Loading /></el-icon>
            </div>
            <p class="psd-preview__loading-text">{{ loadingText }}</p>
            <div class="psd-preview__progress">
              <div class="psd-preview__progress-bar" :style="{ width: progress + '%' }"></div>
            </div>
            <span class="psd-preview__progress-text">{{ progress }}%</span>
          </div>
        </div>

        <!-- 错误 -->
        <div v-else-if="error" class="psd-preview__state">
          <el-icon :size="28" color="var(--el-color-danger)"><WarningFilled /></el-icon>
          <p>{{ error }}</p>
        </div>

        <!-- 尚未开始 -->
        <div v-else-if="!canvasSize.width" class="psd-preview__state">
          <el-icon :size="36" color="var(--el-text-color-placeholder)"><Picture /></el-icon>
          <p>等待解析</p>
        </div>

        <!-- 重合成中：保留旧图，仅角落提示，不遮挡画面 -->
        <div v-if="recompositing" class="psd-preview__recomp">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>重合成中…</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {
  View, Hide, ZoomIn, ZoomOut, FullScreen, Picture, WarningFilled, Loading,
  Download, Files, Document, Operation, Aim, MagicStick,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { PsdParser } from '@/psd/usePsdParser'
import type { PsdLayerNode, PsdFidelity } from '@/psd/types'

const props = defineProps<{
  file?: File | null
  url?: string | null
  name?: string
  /** 是否显示「设为缩略图」（仅在上传/编辑弹窗场景下有本地文件时有意义） */
  canSetThumbnail?: boolean
}>()

const emit = defineEmits<{
  (e: 'parsed', meta: { width: number; height: number; layerCount: number; fidelity: PsdFidelity }): void
  /**
   * 导出图已就绪，交给父组件上传/保存。
   * 父组件必须在上传与保存接口都成功后调用 `done(true)`，
   * 失败调用 `done(false, 失败原因)` —— 子组件据此才结束 loading，
   * 避免「接口还在跑，按钮就已恢复可点击」的假成功。
   */
  (
    e: 'thumbnail',
    payload: {
      blob: Blob
      width: number
      height: number
      done: (success: boolean, message?: string) => void
    }
  ): void
}>()

/** 加载阶段：fetch 下载 -> parse 解析结构 -> composite 合成像素 -> ready 已绘制 */
type Phase = 'idle' | 'fetch' | 'parse' | 'composite' | 'ready' | 'error'

const phase = ref<Phase>('idle')
const loadingText = ref('正在解析 PSD…')
const progress = ref(0)
const error = ref('')
const parsed = ref(false)
const colorMode = ref(3)
/** 画布区“合成中”覆盖层：像素真正画上去之前一直遮住画布，杜绝空白闪烁 */
const compositing = ref(false)
/** 切换图层可见性后的重合成：保留旧图，仅在角落显示轻量提示 */
const recompositing = ref(false)
// 必须用 shallowRef：ref() 会把 ImageData 包装成 reactive Proxy，
// 传入 ctx.putImageData() 时会因类型检查失败抛 TypeError，导致画布空白
const imageData = shallowRef<ImageData | null>(null)
const layers = ref<PsdLayerNode[]>([])
const canvasSize = ref({ width: 0, height: 0 })
const fidelity = ref<PsdFidelity | ''>('')
const fallbackCount = ref(0)
const clippingCount = ref(0)
const adjustmentCount = ref(0)
const zoom = ref(1)
const panOffset = ref({ x: 0, y: 0 })
const panning = ref(false)
const panStart = ref({ x: 0, y: 0, ox: 0, oy: 0 })
/** 正在导出图片用于下载 */
const exporting = ref(false)
/** 正在导出 + 上传 + 保存为缩略图（与下载分开，避免互相串状态） */
const saving = ref(false)
const canvasRef = ref<HTMLCanvasElement>()
const stageRef = ref<HTMLElement>()
const selectedId = ref<number | null>(null)

/** 扁平化后的图层列表（带深度和可见性） */
interface FlatLayer extends PsdLayerNode {
  depth: number
  visible: boolean
}
const flattenedLayers = ref<FlatLayer[]>([])
const visibilityMap = ref<Record<number, boolean>>({})

let parser: PsdParser | null = null
/** 加载令牌：切换文件时丢弃过期结果 */
let loadToken = 0

const layerCount = computed(() => flattenedLayers.value.length)

/** PSD 混合模式编码 -> 可读名称 */
const BLEND_LABEL: Record<string, string> = {
  norm: '正常', pass: '直通', diss: '溶解', 'mul ': '正片叠底', scrn: '滤色',
  over: '叠加', dark: '变暗', lite: '变亮', 'div ': '颜色减淡', idiv: '颜色加深',
  hLit: '强光', sLit: '柔光', vLit: '亮光', lLit: '线性光', pLit: '点光',
  hMix: '实色混合', diff: '差值', smud: '排除', fsub: '减去', fdiv: '划分',
  'hue ': '色相', 'sat ': '饱和度', colr: '颜色', 'lum ': '明度',
  lbrn: '线性加深', lddg: '线性减淡', dkCl: '深色', lgCl: '浅色',
}

const COLOR_MODE_LABEL: Record<number, string> = {
  0: '位图', 1: '灰度', 2: '索引色', 3: 'RGB', 4: 'CMYK',
  7: '多通道', 8: '双色调', 9: 'Lab',
}
const colorModeLabel = computed(() => COLOR_MODE_LABEL[colorMode.value] || '未知')
/** RGB(3) 与灰度(1) 可无损预览，其余（CMYK 等）通道未做色彩空间转换，会有色偏 */
const isNonRgb = computed(() => colorMode.value !== 3 && colorMode.value !== 1)

const treeLoading = computed(() => !parsed.value && phase.value !== 'error')

const fidelityText = computed(() => {
  switch (fidelity.value) {
    case 'original': return '原始合成'
    case 'approximated': return '近似合成'
    case 'fallback': return '近似合成'
    default: return ''
  }
})

const canvasStyle = computed(() => ({
  width: (canvasSize.value.width * zoom.value) + 'px',
  height: (canvasSize.value.height * zoom.value) + 'px',
  transform: `translate(${panOffset.value.x}px, ${panOffset.value.y}px)`,
}))

function layerTip(node: PsdLayerNode) {
  const parts: string[] = []
  parts.push(`尺寸：${node.width} × ${node.height}`)
  if (node.blendMode) parts.push(`混合：${BLEND_LABEL[node.blendMode] || node.blendMode}`)
  parts.push(`不透明度：${Math.round((node.opacity / 255) * 100)}%`)
  if (node.text) parts.push(`文本：${node.text}`)
  return parts.join(' | ')
}

function showAll() {
  flattenedLayers.value.forEach((f) => (f.visible = true))
  rebuildVisibilityMap()
  recomposite()
}

function hideAll() {
  flattenedLayers.value.forEach((f) => (f.visible = false))
  rebuildVisibilityMap()
  recomposite()
}

function layerIcon(kind: PsdLayerNode['kind']) {
  switch (kind) {
    case 'group': return Files
    case 'text': return Document
    case 'adjustment': return Operation
    case 'shape': return Aim
    case 'smart': return MagicStick
    default: return Picture
  }
}

function flatten(nodes: PsdLayerNode[], depth = 0): FlatLayer[] {
  const result: FlatLayer[] = []
  for (const n of nodes) {
    result.push({ ...n, depth, visible: !n.hidden })
    if (n.children?.length) result.push(...flatten(n.children, depth + 1))
  }
  return result
}

function rebuildVisibilityMap() {
  const map: Record<number, boolean> = {}
  for (const f of flattenedLayers.value) map[f.id] = f.visible
  visibilityMap.value = map
}

async function toggleVisibility(id: number) {
  const target = flattenedLayers.value.find((f) => f.id === id)
  if (!target) return
  target.visible = !target.visible
  rebuildVisibilityMap()
  await recomposite()
}

async function recomposite() {
  if (!parser) return
  const token = loadToken
  // 已有图像：不遮挡，保留旧图 + 角标提示，避免闪烁
  const isFirst = !imageData.value
  if (isFirst) compositing.value = true
  else recompositing.value = true
  try {
    const res = await parser.recomposite(visibilityMap.value)
    if (token !== loadToken) return // 已切换到新文件，丢弃过期结果
    imageData.value = res.imageData
    fidelity.value = res.fidelity
    fallbackCount.value = res.fallbackCount
    clippingCount.value = res.clippingCount
    adjustmentCount.value = res.adjustmentCount
    await drawCanvas()
  } catch (e: any) {
    if (token === loadToken) ElMessage.error('重合成失败：' + (e?.message || e))
  } finally {
    if (token === loadToken) {
      recompositing.value = false
      if (isFirst) compositing.value = false
    }
  }
}

/** 把像素画到 canvas；返回是否绘制成功（只有成功才允许揭幕，避免空白闪烁） */
async function drawCanvas(): Promise<boolean> {
  const img = imageData.value
  if (!img) return false
  let canvas = canvasRef.value
  if (!canvas) {
    await nextTick()
    canvas = canvasRef.value
  }
  if (!canvas) return false
  try {
    canvas.width = img.width
    canvas.height = img.height
    canvasSize.value = { width: img.width, height: img.height }
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, img.width, img.height)
    ctx.putImageData(img, 0, 0)
    return true
  } catch (e: any) {
    error.value = '画布绘制失败：' + (e?.message || e)
    return false
  }
}

/** 兜底：canvas 元素挂载后若已有像素数据则自动补绘 */
watch(canvasRef, (el) => {
  if (el && imageData.value) {
    drawCanvas().then((ok) => {
      if (ok && phase.value === 'composite') {
        phase.value = 'ready'
      }
    })
  }
})

function zoomIn() { zoom.value = Math.min(8, zoom.value * 1.25) }
function zoomOut() { zoom.value = Math.max(0.05, zoom.value / 1.25) }
function resetZoom() {
  zoom.value = 1
  panOffset.value = { x: 0, y: 0 }
}
function fitToScreen() {
  panOffset.value = { x: 0, y: 0 }
  const stage = stageRef.value
  if (!stage || !canvasSize.value.width) { zoom.value = 0.5; return }
  const maxW = stage.clientWidth - 48
  const maxH = stage.clientHeight - 48
  const scale = Math.min(maxW / canvasSize.value.width, maxH / canvasSize.value.height, 1)
  if (scale > 0) zoom.value = scale
}

function startPan(e: MouseEvent) {
  if (e.button !== 0) return
  panning.value = true
  panStart.value = { x: e.clientX, y: e.clientY, ox: panOffset.value.x, oy: panOffset.value.y }
  window.addEventListener('mousemove', onPanMove)
  window.addEventListener('mouseup', stopPan)
  e.preventDefault()
}

function onPanMove(e: MouseEvent) {
  if (!panning.value) return
  panOffset.value = {
    x: panStart.value.ox + (e.clientX - panStart.value.x),
    y: panStart.value.oy + (e.clientY - panStart.value.y),
  }
}

function stopPan() {
  panning.value = false
  window.removeEventListener('mousemove', onPanMove)
  window.removeEventListener('mouseup', stopPan)
}

/** 把 blob 下载到本地 */
function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 导出当前合成图并下载到本地（不写入表单） */
async function handleDownload() {
  if (!parser) return
  exporting.value = true
  try {
    const res = await parser.exportThumbnail(2000, 'image/png')
    const baseName = (props.name || 'psd-preview').replace(/\.psd$/i, '')
    downloadBlob(res.blob, `${baseName}-preview.png`)
    ElMessage.success(`已下载预览图（${res.width}×${res.height}）`)
  } catch (e: any) {
    ElMessage.error('下载失败：' + (e?.message || e))
  } finally {
    exporting.value = false
  }
}

/** 等待父组件完成上传/保存，超时兜底避免按钮永久卡在 loading */
function requestThumbnailSave(res: { blob: Blob; width: number; height: number }) {
  return new Promise<{ success: boolean; message?: string }>((resolve) => {
    let settled = false
    const finish = (success: boolean, message?: string) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ success, message })
    }
    const timer = setTimeout(() => finish(false, '保存超时，请重试'), 120_000)
    emit('thumbnail', { ...res, done: finish })
  })
}

/** 导出当前合成图并上传为模板缩略图（写入表单 / 直接更新模板） */
async function handleSetThumbnail() {
  if (!parser || saving.value) return
  saving.value = true
  try {
    const res = await parser.exportThumbnail(1200, 'image/png')
    // 关键：不在这里结束 loading，等父组件上传并完成保存后再结束
    const result = await requestThumbnailSave(res)
    if (!result.success) {
      ElMessage.error(result.message || '设为缩略图失败，请重试')
    }
  } catch (e: any) {
    ElMessage.error('导出失败：' + (e?.message || e))
  } finally {
    saving.value = false
  }
}

async function parseFromBuffer(buffer: ArrayBuffer) {
  const token = ++loadToken
  phase.value = 'parse'
  error.value = ''
  parsed.value = false
  fidelity.value = ''
  imageData.value = null
  canvasSize.value = { width: 0, height: 0 }
  progress.value = 35
  // 关键：从解析一开始就遮住画布区。
  // 快通道（onTree）会提前把 canvasSize 填上文档尺寸，若此时不遮罩，
  // 用户会先看到一个「已挂载但没像素」的空白画布，
  // 直到后台合成完成才突然出图 —— 即「加载结束了却什么都没有，过一会才出现」。
  compositing.value = true
  try {
    parser = new PsdParser()
    const offProgress = parser.onProgress((stage, message) => {
      const map: Record<string, number> = {
        'parse-tree': 35,
        'parse-data': 55,
        'composite': 80,
        'done': 100,
      }
      const next = map[stage]
      if (next !== undefined) progress.value = next
      if (stage !== 'done') loadingText.value = message
    })

    const res = await parser.parse(buffer, {
      // 快通道：结构就绪后立即渲染侧边栏，合成在后台继续
      onTree: (tree) => {
        if (token !== loadToken) return
        layers.value = tree.layers
        flattenedLayers.value = flatten(tree.layers)
        rebuildVisibilityMap()
        colorMode.value = tree.colorMode
        // 先按文档尺寸占位，画布区不会出现 0×0 空白
        canvasSize.value = { width: tree.width, height: tree.height }
        parsed.value = true
        loadingText.value = '正在合成图像…'
        nextTick(() => fitToScreen())
      },
    })
    offProgress()

    if (token !== loadToken) return

    imageData.value = res.imageData
    fidelity.value = res.fidelity
    fallbackCount.value = res.fallbackCount
    clippingCount.value = res.clippingCount
    adjustmentCount.value = res.adjustmentCount

    // 关键：先把像素画上 canvas（覆盖层仍遮着画布），画完再揭幕，
    // 这样就不会出现「加载结束但画布空白」的空窗期
    const ok = await drawCanvas()
    if (ok) {
      progress.value = 100
      phase.value = 'ready'
    } else if (!error.value) {
      error.value = '画布绘制失败'
      phase.value = 'error'
    }
    // 无论成败都要撤下遮罩，否则失败时错误提示会被遮住
    compositing.value = false

    emit('parsed', {
      width: res.width,
      height: res.height,
      layerCount: flattenedLayers.value.length,
      fidelity: res.fidelity,
    })
  } catch (e: any) {
    if (token === loadToken) {
      error.value = e?.message || '解析失败'
      phase.value = 'error'
      compositing.value = false
    }
  }
}

async function load() {
  if (!props.file && !props.url) return
  const token = ++loadToken
  compositing.value = true
  // 重复加载时先销毁旧 Worker，避免泄漏
  parser?.terminate()
  parser = null
  try {
    phase.value = 'fetch'
    progress.value = 0
    let buffer: ArrayBuffer
    if (props.file) {
      loadingText.value = '读取本地文件…'
      progress.value = 10
      buffer = await props.file.arrayBuffer()
    } else {
      loadingText.value = '下载 PSD 文件…'
      const resp = await fetch(props.url!)
      if (!resp.ok) throw new Error(`下载失败：${resp.status}`)
      const total = Number(resp.headers.get('content-length')) || 0
      if (resp.body && total > 0) {
        const reader = resp.body.getReader()
        const chunks: BlobPart[] = []
        let received = 0
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) {
            chunks.push(value)
            received += value.length
            // 下载阶段占总进度的 0~30%
            if (token === loadToken) {
              progress.value = Math.round((received / total) * 30)
            }
          }
        }
        buffer = await new Blob(chunks).arrayBuffer()
      } else {
        buffer = await resp.arrayBuffer()
      }
    }
    if (token !== loadToken) return
    await parseFromBuffer(buffer)
  } catch (e: any) {
    if (token === loadToken) {
      error.value = e?.message || String(e)
      phase.value = 'error'
      compositing.value = false
    }
  }
}

onMounted(() => {
  if (props.file || props.url) load()
})

watch(() => [props.file, props.url], () => {
  if (props.file || props.url) load()
})

onBeforeUnmount(() => {
  stopPan()
  imageData.value = null
  parser?.terminate()
})
</script>

<style scoped>
.psd-preview {
  display: flex;
  height: 100%;
  min-height: 0;
  background: var(--el-bg-color-page, #f5f7fa);
}

/* ---------- 左侧图层树 ---------- */
.psd-preview__sidebar {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color, #fff);
  border-right: 1px solid var(--el-border-color-lighter);
}

.psd-preview__sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.psd-preview__sidebar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  letter-spacing: 0.3px;
}

.psd-preview__layer-count {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  font-variant-numeric: tabular-nums;
}

.psd-preview__sidebar-tools {
  display: flex;
  gap: 2px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.psd-preview__layer-tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.layer-tree__node {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding-right: 12px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition: background 0.15s;
}

.layer-tree__node:hover {
  background: var(--el-fill-color-light);
}

.layer-tree__node.is-active {
  background: var(--el-color-primary-light-9);
}

.layer-tree__eye {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.layer-tree__eye:hover {
  background: var(--el-fill-color);
}

.layer-tree__eye.is-off {
  color: var(--el-text-color-placeholder);
  opacity: 0.6;
}

.layer-tree__type {
  font-size: 14px;
  color: var(--el-text-color-placeholder);
  flex-shrink: 0;
}

.layer-tree__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-tree__name.is-off {
  color: var(--el-text-color-placeholder);
}

.layer-tree__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-color-warning);
  flex-shrink: 0;
}

/* ---------- 右侧主区 ---------- */
.psd-preview__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--el-bg-color-page, #f5f7fa);
}

.psd-preview__topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 0 16px;
  background: var(--el-bg-color, #fff);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.psd-preview__meta {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
}

.psd-preview__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.psd-preview__dim {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.psd-preview__fidelity {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.psd-preview__fidelity-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--el-color-success);
}

.fidelity-approximated .psd-preview__fidelity-dot {
  background: var(--el-color-warning);
}

.fidelity-fallback .psd-preview__fidelity-dot {
  background: var(--el-color-danger);
}

.psd-preview__warn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-color-warning);
}

.psd-preview__spacer {
  flex: 1;
}

.psd-preview__tools {
  display: flex;
  align-items: center;
  gap: 2px;
}

.psd-preview__divider {
  width: 1px;
  height: 18px;
  margin: 0 6px;
  background: var(--el-border-color-lighter);
}

/* ---------- 通用图标按钮 ---------- */
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  min-width: 30px;
  padding: 0 8px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--el-text-color-regular);
  font-size: 13px;
  transition: all 0.15s;
  white-space: nowrap;
}

.icon-btn:hover:not(:disabled) {
  background: var(--el-fill-color-light);
}

.icon-btn:disabled {
  color: var(--el-text-color-placeholder);
  cursor: not-allowed;
}

.icon-btn--text {
  min-width: 52px;
  font-variant-numeric: tabular-nums;
}

.icon-btn--primary {
  background: var(--el-color-primary);
  color: var(--el-color-white, #fff);
  gap: 5px;
  padding: 0 12px;
}

.icon-btn--primary:hover:not(:disabled) {
  background: var(--el-color-primary-light-3);
}

.icon-btn--primary:disabled {
  background: var(--el-color-primary-light-7);
  color: var(--el-color-white, #fff);
}

/* ---------- 画布舞台 ---------- */
.psd-preview__stage {
  flex: 1;
  position: relative;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background-color: var(--el-fill-color-light);
  background-image:
    linear-gradient(45deg, var(--el-fill-color) 25%, transparent 25%),
    linear-gradient(-45deg, var(--el-fill-color) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--el-fill-color) 75%),
    linear-gradient(-45deg, transparent 75%, var(--el-fill-color) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
}

.psd-preview__canvas {
  max-width: none;
  background: var(--el-bg-color);
  box-shadow: var(--el-box-shadow-light);
  image-rendering: auto;
  cursor: grab;
  user-select: none;
}

.psd-preview__canvas.is-panning {
  cursor: grabbing;
}

/* ---------- 状态占位 ---------- */
.psd-preview__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

/* ---------- 加载进度 ---------- */
.psd-preview__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 完全不透明：合成期间绝不透出下方尚未绘制的空白画布 */
  background: var(--el-bg-color-page, #f5f7fa);
  z-index: 5;
}

.psd-preview__loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 28px 36px;
  background: var(--el-bg-color);
  border-radius: 12px;
  box-shadow: var(--el-box-shadow);
  min-width: 240px;
}

.psd-preview__loading-icon {
  color: var(--el-color-primary);
}

.psd-preview__loading-text {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.psd-preview__progress {
  width: 100%;
  height: 4px;
  background: var(--el-fill-color);
  border-radius: 2px;
  overflow: hidden;
}

.psd-preview__progress-bar {
  height: 100%;
  background: var(--el-color-primary);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.psd-preview__progress-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

/* ---------- 重合成轻量提示 ---------- */
.psd-preview__recomp {
  position: absolute;
  top: 12px;
  left: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 999px;
  box-shadow: var(--el-box-shadow-light);
  z-index: 6;
  pointer-events: none;
}
</style>
