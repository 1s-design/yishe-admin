import request from '@/config/axios'

export interface HotsearchItem {
  title?: string
  hot?: string | number
  note?: string
  label?: string
  icon?: string
  icon_desc?: string
  rank?: number
  topic_flag?: number
  flag?: string
  word_scheme?: string
  // 其他可能的字段
  word?: string
  name?: string
  songName?: string
  artist?: string
  subtitle?: string
  [key: string]: any
}

export interface HotsearchData {
  key: string
  data: HotsearchItem[]
  timestamp: string
  expireAt: string
  category?: string
  platform: string
  platformIndex: string
  name?: string
  success?: boolean
  error?: string
}

export interface HotsearchResponse {
  success: boolean
  data: Record<string, HotsearchData> | HotsearchData | string[]
  timestamp?: string
  message?: string
  count?: number
  summary?: Record<string, any>
}

/**
 * 获取当前热搜数据
 */
export const getAllHotsearch = () => {
  return request.get<HotsearchResponse>({ url: '/hotsearch/current' })
}

/**
 * 刷新热搜缓存
 */
export const refreshHotsearch = () => {
  return request.post<HotsearchResponse>({ url: '/hotsearch/refresh' })
}

// ── 采集快照（历史数据） ──────────────────────────────

export interface HotsearchSnapshot {
  id: string
  module: string
  platformKey: string
  platformName: string
  collectedAt: string
  items: Record<string, any>[]
  itemCount: number
  createdBy: number | null
  createdAt: string
}

export interface HotsearchPlatformInfo {
  platformKey: string
  platformName: string
  module: string
  snapshotCount: number
  lastCollectedAt: string
}

export interface HotsearchStats {
  snapshotCount: number
  platforms: { module: string; platformCount: number; snapshotCount: number }[]
  latestSnapshotAt: string | null
}

export interface HotsearchSnapshotPage {
  list: HotsearchSnapshot[]
  total: number
  currentPage: number
  pageSize: number
}

/**
 * 查询采集快照列表（分页）
 */
export const getSnapshots = (params?: {
  module?: string
  platform?: string
  page?: number
  pageSize?: number
  startTime?: string
  endTime?: string
}) => {
  return request.get<HotsearchSnapshotPage>({ url: '/hotsearch/snapshots', params })
}

/**
 * 获取各平台最新快照
 */
export const getLatestSnapshots = (params?: { module?: string; sinceMinutes?: number }) => {
  return request.get<HotsearchSnapshot[]>({ url: '/hotsearch/snapshots/latest', params })
}

/**
 * 获取已采集的平台列表
 */
export const getPlatforms = (module?: string) => {
  return request.get<HotsearchPlatformInfo[]>({ url: '/hotsearch/platforms', params: { module } })
}

/**
 * 获取统计信息
 */
export const getHotsearchStats = () => {
  return request.get<HotsearchStats>({ url: '/hotsearch/stats' })
}

export interface HotsearchModuleInfo {
  module: string
  label: string
  snapshotCount: number
}

/**
 * 获取模块类型列表（动态）
 */
export const getModules = () => {
  return request.get<HotsearchModuleInfo[]>({ url: '/hotsearch/modules' })
}

/**
 * 删除单条快照
 */
export const deleteSnapshot = (id: string) => {
  return request.delete({ url: `/hotsearch/snapshot/${id}` })
}

/**
 * 批量删除快照
 */
export const batchDeleteSnapshots = (ids: string[]) => {
  return request.post({ url: '/hotsearch/snapshot/batch-delete', data: { ids } })
}
