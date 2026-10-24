import request from '@/config/axios'

/** 媒体发布字段规则，key 为 CanonicalPublishPayload 内的点分路径 */
export interface MediaPublishFieldRule {
  key: string
  label: string
  type: 'string' | 'string[]' | 'mediaItems' | 'boolean' | 'number' | 'object'
  required?: boolean
  minItems?: number
  maxItems?: number
  maxLength?: number
  description?: string
}

/** 媒体发布变体声明 */
export interface MediaPublishVariant {
  variant: string
  label: string
  description?: string
  fields: MediaPublishFieldRule[]
}

/** 单个媒体平台的发布规范 */
export interface MediaPublishPlatformSchema {
  platform: string
  platformLabel: string
  taskType: string
  variants: MediaPublishVariant[]
}

/**
 * 查询媒体发布平台的变体与字段规则。
 * 与 Agent 直投校验使用同一份声明，platform 为空时返回全部媒体平台。
 */
export async function getMediaPublishSchemas(platform?: string): Promise<MediaPublishPlatformSchema[]> {
  const res: any = await request.get({
    url: '/media-publish/schemas',
    params: platform ? { platform } : undefined
  })
  const payload = res?.data ?? res
  return Array.isArray(payload) ? payload : []
}
