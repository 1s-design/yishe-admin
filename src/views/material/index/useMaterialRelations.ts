import { getRelatedImages } from '@/api/material'
import { stickerPsdSetApi } from '@/api/stickerPsdSet'

export interface MaterialRelations {
  related: any[]
  bindings: any[]
  errors: string[]
}

export const PUBLISH_BINDING_STATUS_LABELS: Record<string, string> = {
  pending: '待发布',
  success: '已发布',
  failed: '失败',
  expired: '已过期',
  deleted: '已删除'
}

export const PUBLISH_BINDING_STATUS_TAGS: Record<string, 'info' | 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  success: 'success',
  failed: 'danger',
  expired: 'info',
  deleted: 'info'
}

const CACHE_TTL = 30 * 1000
const cache = new Map<string, { at: number; data: MaterialRelations }>()

export function invalidateMaterialRelations(id?: string) {
  if (id) cache.delete(String(id))
  else cache.clear()
}

function pickRows(res: any): any[] {
  const data = res?.data ?? res
  if (Array.isArray(data)) return data
  return Array.isArray(data?.list) ? data.list : []
}

/** 关联图数量列表接口已随 row.relatedImageIds 返回，这里只在 hover 时解析缩略图与发布绑定 */
export async function loadMaterialRelations(id: string): Promise<MaterialRelations> {
  const key = String(id || '')
  if (!key) return { related: [], bindings: [], errors: [] }

  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data

  const [relatedResult, bindingResult] = await Promise.allSettled([
    getRelatedImages(key),
    stickerPsdSetApi.getPublishUsageRecords({ stickerId: key })
  ])

  const errors: string[] = []
  let related: any[] = []
  let bindings: any[] = []

  if (relatedResult.status === 'fulfilled') {
    related = pickRows(relatedResult.value)
  } else {
    errors.push('关联图加载失败')
  }

  if (bindingResult.status === 'fulfilled') {
    bindings = pickRows(bindingResult.value)
  } else {
    errors.push('发布绑定加载失败')
  }

  const data: MaterialRelations = { related, bindings, errors }
  if (!errors.length) cache.set(key, { at: Date.now(), data })
  return data
}
