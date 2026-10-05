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

/** 源清单全局缓存（按 id 合并，多模块共用；切换无空窗） */
const metasById = new Map<string, any>()
export function saveSourceMetas(metas: any[]) {
  // 合并而非覆盖：各模块只拉自己那份清单，整体缓存要并集，
  // 否则后加载的模块会把先加载的挤掉，导致切页时 tab 消失
  for (const m of metas || []) {
    if (m && m.id) metasById.set(m.id, m)
  }
}
export function loadSourceMetas(): any[] | null {
  return metasById.size > 0 ? Array.from(metasById.values()) : null
}

/** 按模块过滤源清单（module 支持字符串或数组） */
export function filterModuleMetas(metas: any[], module: string): any[] {
  return (metas || []).filter((m: any) => {
    const mods = Array.isArray(m.module) ? m.module : [m.module]
    return mods.includes(module)
  })
}
