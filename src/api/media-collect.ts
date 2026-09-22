import request from '@/config/axios'

/** 采集源信息 */
export interface MediaCollectProvider {
  key: string
  name: string
  supportedTypes: string[]
}

/** 媒体资源 */
export interface MediaAsset {
  id: string
  source: string
  title: string
  description?: string
  mediaType: 'image' | 'video' | 'audio'
  mimeType?: string
  thumbnailUrl?: string
  previewUrl?: string
  fileUrl?: string
  fileSize?: number
  width?: number
  height?: number
  duration?: number
  license?: string
  creator?: string
  tags?: string[]
  rawMeta?: Record<string, any>
}

/** 搜索结果 */
export interface MediaSearchResult {
  total: number
  page: number
  pageSize: number
  items: MediaAsset[]
}

/** 列出所有采集源 */
export function getMediaCollectProviders() {
  return request.get<{ code: number; data: MediaCollectProvider[] }>({
    url: '/media-collect/providers',
  })
}

/** 搜索媒体资源 */
export function searchMediaCollect(params: {
  source: string
  query: string
  mediaType?: string
  page?: number
  pageSize?: number
  license?: string
  sort?: string
}) {
  return request.get<{ code: number; data: MediaSearchResult }>({
    url: '/media-collect/search',
    params,
  })
}

/** 获取单个资源详情 */
export function getMediaCollectAsset(source: string, id: string) {
  return request.get<{ code: number; data: MediaAsset | null }>({
    url: '/media-collect/asset',
    params: { source, id },
  })
}

/** 导入媒体到文件库 */
export function importMediaCollect(items: Partial<MediaAsset>[]) {
  return request.post<{ code: number; data: any }>({
    url: '/media-collect/import',
    data: { items },
  })
}
