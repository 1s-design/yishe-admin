import { getPublishConfigPageApi } from '@/api/product/publishConfig'
import { stickerPsdSetApi } from '@/api/stickerPsdSet'

export interface PublishBindingRecord {
  id: string
  publishConfigId: string
  publishConfig?: {
    id: string
    name: string
    platform?: string
  }
  status?: string
  taskId?: string
  createTime?: string
  updateTime?: string
  [key: string]: any
}

export interface ParsedPublishConfig {
  id: string
  name: string
  platform: string
  taskType?: string
  isGeneric: boolean
  targetAspectRatio: number
  aspectRatioTolerance: number
  aspectRatioLabel: string
  minRatio: number
  maxRatio: number
  minWidth?: number
  minHeight?: number
  rawConfig: any
}

export interface MatchedPublishConfigItem {
  id: string
  name: string
  platform: string
  taskType?: string
  targetAspectRatio: number
  tolerance: number
  aspectRatioLabel: string
  minWidth?: number
  minHeight?: number
  ratioDiff: number
  score: number
  matchStatus: 'perfect' | 'qualified' | 'warning' | 'generic' | 'mismatch'
  isMatched: boolean
  mismatchReason?: string
  isPublished: boolean
  bindingRecord?: PublishBindingRecord
  rawConfig: any
}

export interface QuickPublishMatchResult {
  imageWidth: number
  imageHeight: number
  targetRatio: number
  ratioLabel: string
  allConfigs: MatchedPublishConfigItem[]
  unpublishedMatches: MatchedPublishConfigItem[]
  publishedMatches: MatchedPublishConfigItem[]
  otherBindings: PublishBindingRecord[]
  errors: string[]
  isBindingChecking?: boolean
}

/** 5 分钟配置内存缓存 */
const CONFIGS_CACHE_TTL = 5 * 60 * 1000
let parsedConfigsCache: ParsedPublishConfig[] | null = null
let cachedConfigsAt = 0
let configsLoadPromise: Promise<ParsedPublishConfig[]> | null = null

/** 30 秒绑定记录内存缓存 */
const BINDINGS_CACHE_TTL = 30 * 1000
const bindingsCache = new Map<string, { at: number; data: PublishBindingRecord[] }>()
const bindingLoadPromises = new Map<string, Promise<PublishBindingRecord[]>>()

/** 尺寸找配置结果记忆化缓存（以尺寸与宽高比为 key，0ms 极速复用） */
const dimensionMatchMemo = new Map<string, MatchedPublishConfigItem[]>()

export function invalidatePublishBindingsCache(stickerId?: string) {
  if (stickerId) {
    bindingsCache.delete(String(stickerId))
    bindingLoadPromises.delete(String(stickerId))
  } else {
    bindingsCache.clear()
    bindingLoadPromises.clear()
  }
}

export function invalidatePublishConfigsCache() {
  parsedConfigsCache = null
  cachedConfigsAt = 0
  configsLoadPromise = null
  dimensionMatchMemo.clear()
}

/** 安全 JSON 解析 */
function safeJsonParse(val: string): any {
  try {
    return JSON.parse(val)
  } catch {
    return null
  }
}

/** 解析单个发布配置，提取 imageSpecConfig 规则并预热计算比率区间 */
export function parsePublishConfig(item: any): ParsedPublishConfig {
  // 1. 全面兼容 configData 与 config，支持对象或 JSON 字符串
  let cfgRaw: any = item?.configData !== undefined ? item.configData : item?.config
  if (typeof cfgRaw === 'string') {
    cfgRaw = safeJsonParse(cfgRaw) || {}
  } else if (!cfgRaw || typeof cfgRaw !== 'object') {
    cfgRaw = {}
  }

  // 2. 提取 imageSpecConfig（兼容嵌入在 configData 中，或直接挂在 item 上）
  const imageSpec = cfgRaw?.imageSpecConfig || item?.imageSpecConfig || {}

  // 3. 提取目标比例（只要 aspectRatio > 0 且有效，即为有限制比例的配置）
  const rawRatio = imageSpec?.aspectRatio
  const targetRatio =
    rawRatio !== undefined && rawRatio !== null && !isNaN(Number(rawRatio))
      ? Number(Number(rawRatio).toFixed(4))
      : 0

  // 容差，默认 0.08 (±8%)
  const rawTolerance = imageSpec?.aspectRatioTolerance
  const tolerance =
    rawTolerance !== undefined && rawTolerance !== null && !isNaN(Number(rawTolerance))
      ? Number(rawTolerance)
      : 0.08

  // 最小分辨率 (兼容 minResolution.minWidth 和 minWidth)
  const minWidthRaw = imageSpec?.minResolution?.minWidth ?? imageSpec?.minWidth
  const minHeightRaw = imageSpec?.minResolution?.minHeight ?? imageSpec?.minHeight
  const minWidth =
    minWidthRaw !== undefined && !isNaN(Number(minWidthRaw)) && Number(minWidthRaw) > 0
      ? Number(minWidthRaw)
      : undefined
  const minHeight =
    minHeightRaw !== undefined && !isNaN(Number(minHeightRaw)) && Number(minHeightRaw) > 0
      ? Number(minHeightRaw)
      : undefined

  // 友好比例标签
  const userLabel = imageSpec?.aspectRatioLabel?.trim()
  const derivedLabel = targetRatio > 0 ? getFriendlyRatioLabel(targetRatio) : ''
  const aspectRatioLabel = userLabel || derivedLabel || (targetRatio > 0 ? `${targetRatio}:1` : '通用')

  // 判断是否为通用（不限比例）：
  // 只有当没有指定 aspectRatio (<= 0) 时，才是不限比例的通用配置！
  const isGeneric = targetRatio <= 0

  const minRatio = targetRatio > 0 ? targetRatio * (1 - tolerance) : 0
  const maxRatio = targetRatio > 0 ? targetRatio * (1 + tolerance) : 0

  return {
    id: String(item.id),
    name: item.name || `配置 #${item.id}`,
    platform: item.platform || '',
    taskType: item.taskType,
    isGeneric,
    targetAspectRatio: targetRatio,
    aspectRatioTolerance: tolerance,
    aspectRatioLabel,
    minRatio,
    maxRatio,
    minWidth,
    minHeight,
    rawConfig: item
  }
}

/** 获取启用的发布配置列表（带内存缓存与并发去重） */
export async function getCachedActivePublishConfigs(): Promise<ParsedPublishConfig[]> {
  if (parsedConfigsCache && Date.now() - cachedConfigsAt < CONFIGS_CACHE_TTL) {
    return parsedConfigsCache
  }

  if (configsLoadPromise) {
    return configsLoadPromise
  }

  configsLoadPromise = (async () => {
    try {
      const res: any = await getPublishConfigPageApi({
        pageNo: 1,
        pageSize: 300,
        isActive: true
      })

      let list: any[] = []
      if (Array.isArray(res)) list = res
      else if (Array.isArray(res?.data)) list = res.data
      else if (Array.isArray(res?.list)) list = res.list
      else if (Array.isArray(res?.data?.list)) list = res.data.list

      const parsed = list
        .filter((item: any) => item?.isActive === true || item?.isActive === 1 || String(item?.isActive) === 'true')
        .map(parsePublishConfig)

      parsedConfigsCache = parsed
      cachedConfigsAt = Date.now()
      dimensionMatchMemo.clear()
      return parsed
    } catch (err) {
      console.warn('加载发布配置列表失败:', err)
      return parsedConfigsCache || []
    } finally {
      configsLoadPromise = null
    }
  })()

  return configsLoadPromise
}

/** 预热加载发布配置列表（无阻塞后台执行） */
export function preloadPublishConfigs(): void {
  getCachedActivePublishConfigs().catch(() => {})
}

if (typeof window !== 'undefined') {
  if (typeof (window as any).requestIdleCallback === 'function') {
    ;(window as any).requestIdleCallback(() => preloadPublishConfigs(), { timeout: 1500 })
  } else {
    setTimeout(preloadPublishConfigs, 100)
  }
}

/** 智能推导比例简写（如 3:4、1:1、16:9） */
export function getFriendlyRatioLabel(ratio: number): string {
  if (!ratio || isNaN(ratio)) return '未知比例'
  const knownRatios = [
    { label: '1:1 正方', val: 1.0 },
    { label: '3:4 竖版', val: 0.75 },
    { label: '4:3 横版', val: 4 / 3 },
    { label: '9:16 长竖版', val: 9 / 16 },
    { label: '16:9 宽横屏', val: 16 / 9 },
    { label: '2:3 经典竖版', val: 2 / 3 },
    { label: '3:2 经典横版', val: 3 / 2 },
    { label: '1:2 细长图', val: 0.5 },
    { label: '2:1 细长横图', val: 2.0 },
  ]
  for (const item of knownRatios) {
    if (Math.abs(ratio - item.val) / item.val <= 0.035) {
      return item.label
    }
  }
  return ratio > 1 ? `${ratio.toFixed(2)}:1 横图` : `1:${(1 / ratio).toFixed(2)} 竖图`
}

/** 从行对象中极速抽取尺寸和宽高比 */
export function extractDimensions(row: any): { width: number; height: number; targetRatio: number; ratioLabel: string } {
  const width = Number(row?.width || row?.resolutionWidth || row?.originWidth || 0)
  const height = Number(row?.height || row?.resolutionHeight || row?.originHeight || 0)
  let targetRatio = 0

  if (row?.aspectRatio && !isNaN(Number(row.aspectRatio)) && Number(row.aspectRatio) > 0) {
    targetRatio = Number(Number(row.aspectRatio).toFixed(4))
  } else if (width > 0 && height > 0) {
    targetRatio = Number((width / height).toFixed(4))
  }

  const ratioLabel = getFriendlyRatioLabel(targetRatio)
  return { width, height, targetRatio, ratioLabel }
}

/**
 * ⚡【核心极速匹配与全量排序算法】
 * 查出所有启用的发布配置（包含匹配的和不匹配的），
 * 从最匹配的向下排序，同时标明匹配状态与不匹配原因。
 */
export function findMatchingConfigsSync(
  width: number,
  height: number,
  targetRatio: number,
  configs: ParsedPublishConfig[] = parsedConfigsCache || []
): MatchedPublishConfigItem[] {
  if (!configs.length) return []

  const memoKey = `${Math.round(targetRatio * 1000)}_${width}_${height}_${configs.length}`
  const cachedResult = dimensionMatchMemo.get(memoKey)
  if (cachedResult) {
    return cachedResult
  }

  const list: MatchedPublishConfigItem[] = []

  for (let i = 0; i < configs.length; i++) {
    const cfg = configs[i]

    // 1. 通用不限制尺寸比例的配置
    if (cfg.isGeneric) {
      list.push({
        id: cfg.id,
        name: cfg.name,
        platform: cfg.platform,
        taskType: cfg.taskType,
        targetAspectRatio: 0,
        tolerance: 0,
        aspectRatioLabel: cfg.aspectRatioLabel || '通用',
        ratioDiff: 0,
        score: 70,
        matchStatus: 'generic',
        isMatched: true,
        isPublished: false,
        rawConfig: cfg.rawConfig
      })
      continue
    }

    // 2. 严格比例校验：必须在配置要求的目标比例 ± 容差范围内
    let ratioDiff = 1
    let ratioPassed = false

    if (targetRatio > 0 && cfg.targetAspectRatio > 0) {
      ratioDiff = Math.abs(targetRatio - cfg.targetAspectRatio) / cfg.targetAspectRatio
      // 容差判断：小于等于配置指定的容差（默认 0.08 即 ±8%）
      ratioPassed = ratioDiff <= (cfg.aspectRatioTolerance + 0.0001)
    } else {
      // 若素材无有效宽高比或配置限定了比例，坚决不通过
      ratioPassed = false
      ratioDiff = 1
    }

    // 3. 最小分辨率校验
    const widthPassed = cfg.minWidth !== undefined && width > 0 ? width >= cfg.minWidth : true
    const heightPassed = cfg.minHeight !== undefined && height > 0 ? height >= cfg.minHeight : true
    const resolutionPassed = widthPassed && heightPassed

    let matchStatus: 'perfect' | 'qualified' | 'warning' | 'generic' | 'mismatch' = 'qualified'
    let isMatched = false
    let mismatchReason = ''

    if (!ratioPassed) {
      matchStatus = 'mismatch'
      isMatched = false
      mismatchReason = `比例不符 (需 ${cfg.aspectRatioLabel})`
    } else if (!resolutionPassed) {
      matchStatus = 'warning'
      isMatched = true
      mismatchReason = `尺寸偏小 (最小 ${cfg.minWidth || 0}×${cfg.minHeight || 0})`
    } else if (ratioDiff <= 0.02) {
      matchStatus = 'perfect'
      isMatched = true
    } else {
      matchStatus = 'qualified'
      isMatched = true
    }

    let score = 0
    if (isMatched) {
      score = Math.max(50, Math.round((1 - ratioDiff) * 100))
      if (!resolutionPassed) score = Math.max(40, score - 20)
    } else {
      // 不匹配项的分数按比例接近度降序排列
      score = Math.max(0, Math.round((1 - Math.min(ratioDiff, 1)) * 30))
    }

    list.push({
      id: cfg.id,
      name: cfg.name,
      platform: cfg.platform,
      taskType: cfg.taskType,
      targetAspectRatio: cfg.targetAspectRatio,
      tolerance: cfg.aspectRatioTolerance,
      aspectRatioLabel: cfg.aspectRatioLabel,
      minWidth: cfg.minWidth,
      minHeight: cfg.minHeight,
      ratioDiff,
      score,
      matchStatus,
      isMatched,
      mismatchReason,
      isPublished: false,
      rawConfig: cfg.rawConfig
    })
  }

  // 排序：从最匹配的向下排序
  // perfect (5) > qualified (4) > generic (3) > warning (2) > mismatch (1)
  list.sort((a, b) => {
    const statusWeight: Record<string, number> = {
      perfect: 5,
      qualified: 4,
      generic: 3,
      warning: 2,
      mismatch: 1
    }
    const wA = statusWeight[a.matchStatus] || 0
    const wB = statusWeight[b.matchStatus] || 0
    if (wB !== wA) return wB - wA
    return b.score - a.score
  })

  if (dimensionMatchMemo.size > 200) {
    dimensionMatchMemo.clear()
  }
  dimensionMatchMemo.set(memoKey, list)

  return list
}

/** 加载素材历史发布绑定记录（带并发去重与 30s 缓存） */
export async function getCachedPublishBindings(stickerId: string): Promise<PublishBindingRecord[]> {
  const key = String(stickerId || '')
  if (!key) return []

  const hit = bindingsCache.get(key)
  if (hit && Date.now() - hit.at < BINDINGS_CACHE_TTL) {
    return hit.data
  }

  const pending = bindingLoadPromises.get(key)
  if (pending) {
    return pending
  }

  const promise = (async () => {
    try {
      const res: any = await stickerPsdSetApi.getPublishUsageRecords({ stickerId: key })
      const list: any[] = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : Array.isArray(res?.list) ? res.list : []
      const records = list.map((item: any) => ({
        ...item,
        id: String(item.id || ''),
        publishConfigId: String(item.publishConfigId || item.publishConfig?.id || '')
      }))
      bindingsCache.set(key, { at: Date.now(), data: records })
      return records
    } catch (err) {
      console.warn('加载素材发布绑定失败:', err)
      return []
    } finally {
      bindingLoadPromises.delete(key)
    }
  })()

  bindingLoadPromises.set(key, promise)
  return promise
}

/** 预热素材绑定记录 */
export function preloadMaterialBindings(stickerId: string): void {
  if (stickerId) {
    getCachedPublishBindings(stickerId).catch(() => {})
  }
}

/**
 * 评估素材的所有发布配置：
 * 查出全部配置，按最匹配向下排序，区分未发布与已发布。
 */
export async function evaluatePublishConfigsForSticker(row: any, useFastSyncOnly = false): Promise<QuickPublishMatchResult> {
  const stickerId = String(row?.id || '')
  const { width, height, targetRatio, ratioLabel } = extractDimensions(row)

  const [allConfigs, bindings] = await Promise.all([
    getCachedActivePublishConfigs(),
    !useFastSyncOnly && stickerId ? getCachedPublishBindings(stickerId) : Promise.resolve([])
  ])

  // 执行全量匹配与降序排序
  const evaluatedConfigs = findMatchingConfigsSync(width, height, targetRatio, allConfigs)

  const boundMap = new Map<string, PublishBindingRecord>()
  bindings.forEach((b) => {
    if (b.publishConfigId) {
      boundMap.set(String(b.publishConfigId), b)
    }
  })

  const fullConfigs: MatchedPublishConfigItem[] = []
  const unpublishedMatches: MatchedPublishConfigItem[] = []
  const publishedMatches: MatchedPublishConfigItem[] = []

  evaluatedConfigs.forEach((item) => {
    const isPublished = boundMap.has(item.id)
    const enrichedItem: MatchedPublishConfigItem = {
      ...item,
      isPublished,
      bindingRecord: boundMap.get(item.id)
    }

    fullConfigs.push(enrichedItem)

    if (isPublished) {
      publishedMatches.push(enrichedItem)
    } else if (item.isMatched) {
      unpublishedMatches.push(enrichedItem)
    }
  })

  // 找出现有绑定中不属于常规配置列表的其余历史记录
  const knownConfigIds = new Set(evaluatedConfigs.map((m) => m.id))
  const otherBindings = bindings.filter((b) => !knownConfigIds.has(String(b.publishConfigId)))

  return {
    imageWidth: width,
    imageHeight: height,
    targetRatio,
    ratioLabel,
    allConfigs: fullConfigs,
    unpublishedMatches,
    publishedMatches,
    otherBindings,
    errors: []
  }
}
