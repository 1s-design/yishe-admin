import request from '@/config/axios'

export interface MediaAccountExecutionProfile {
  profileId: string
  profileName?: string
  clientId?: string | null
  machineCode?: string | null
  online?: boolean
}

export interface MediaAccountExecutionEnvironment {
  clientId: string | null
  machineCode: string | null
  clientLabel: string
  clientOnline: boolean
  lastOnlineAt?: string | null
  environmentKey: string
  profileId: string
  profileName: string
  profileExists?: boolean
  isActiveProfile?: boolean
  instanceRunning?: boolean
  busy?: boolean
  currentTaskId?: string | null
}

export interface MediaAccountOperationStrategy {
  direction?: string
  style?: string
  forbidden?: string
}

export interface MediaAccountItem {
  id: number
  name: string
  platform: string
  platformLabel?: string
  platformAccountId?: string | null
  remark?: string | null
  operationStrategy?: MediaAccountOperationStrategy | null
  enabled: boolean
  executionProfiles?: MediaAccountExecutionProfile[]
  onlineProfileCount?: number
  createTime?: string
  updateTime?: string
}

export const MEDIA_PLATFORM_OPTIONS = [
  { label: '抖音', value: 'douyin' },
  { label: '小红书', value: 'xiaohongshu' },
  { label: '微博', value: 'weibo' },
  { label: '快手', value: 'kuaishou' },
  { label: 'TikTok', value: 'tiktok' },
  { label: 'YouTube', value: 'youtube' },
]

export const getMediaAccountList = (params?: { platform?: string; enabledOnly?: boolean }) => {
  return request.get({ url: '/media-account', params })
}

export const getMediaAccountDetail = (id: number) => {
  return request.get({ url: `/media-account/${id}` })
}

export const createMediaAccount = (data: Partial<MediaAccountItem>) => {
  return request.post({ url: '/media-account', data })
}

export const updateMediaAccount = (id: number, data: Partial<MediaAccountItem>) => {
  return request.patch({ url: `/media-account/${id}`, data })
}

export const deleteMediaAccount = (id: number) => {
  return request.delete({ url: `/media-account/${id}` })
}

export const batchDeleteMediaAccount = (ids: number[]) => {
  return request.post({ url: '/media-account/batch-delete', data: { ids } })
}

export const getMediaAccountExecutionEnvironments = (platform?: string) => {
  return request.get({
    url: '/media-account/execution-environments',
    params: platform ? { platform } : undefined,
  })
}
