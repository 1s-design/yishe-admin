/**
 * 直发 API
 * 调用设计服务器 REST API → 设计服务器通过 WebSocket → 客户端执行
 */
import request from '@/config/axios'

export interface DirectPublishParams {
  platform: string
  images: string[]
  content: string
  title?: string
  tags?: string[]
  video?: string
  clientId?: string
  profileId?: string
}

export interface DirectPublishResult {
  success: boolean
  commandId: string
  platform: string
  message: string
}

/**
 * 直发内容到社交媒体平台
 * POST /direct-publish/publish
 */
export function directPublish(data: DirectPublishParams) {
  return request.post<DirectPublishResult>({
    url: '/direct-publish/publish',
    data,
  })
}
