/**
 * 采集面板跨实例状态缓存
 * 按 sourceId 缓存搜索态（关键词/表单/结果/翻页），切换 tab 或重挂载时瞬时恢复，
 * 实现无感切换（不闪、不丢、不重复加载）。
 */
export interface CollectPanelState {
  formModel: Record<string, any>
  items: any[]
  currentPage: number
  hasNext: boolean
  hasSearched: boolean
  lastParams: Record<string, any>
  lastMode: 'search' | 'list'
}

const cache = new Map<string, CollectPanelState>()

export function saveCollectPanelState(sourceId: string, state: CollectPanelState) {
  if (!sourceId) return
  cache.set(sourceId, state)
}

export function loadCollectPanelState(sourceId: string): CollectPanelState | null {
  return cache.get(sourceId) || null
}

/** 源清单全局缓存（meta 首次拉取后复用，切换无空窗；后台静默刷新） */
let metasCache: any[] | null = null
export function saveSourceMetas(metas: any[]) { metasCache = metas }
export function loadSourceMetas(): any[] | null { return metasCache }

/** 按模块过滤源清单（module 支持字符串或数组） */
export function filterModuleMetas(metas: any[], module: string): any[] {
  return (metas || []).filter((m: any) => {
    const mods = Array.isArray(m.module) ? m.module : [m.module]
    return mods.includes(module)
  })
}
