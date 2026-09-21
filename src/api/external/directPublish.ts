/**
 * 直发 API
 * 两种模式：
 * 1. 直接发布（立即执行，不建任务记录）
 * 2. 创建发布任务（只建记录，不执行，等待调度）
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
  commandId?: string
  taskId?: string
  mode: 'direct' | 'task'
  platform: string
  status?: string
  message: string
}

/**
 * 直接发布（立即执行，不建任务记录）
 * POST /direct-publish/publish
 */
export function directPublish(data: DirectPublishParams) {
  return request.post<DirectPublishResult>({
    url: '/direct-publish/publish',
    data,
  })
}

/**
 * 创建发布任务（只建记录，不执行）
 * POST /direct-publish/task
 */
export function createPublishTask(data: DirectPublishParams) {
  return request.post<DirectPublishResult>({
    url: '/direct-publish/task',
    data,
  })
}
