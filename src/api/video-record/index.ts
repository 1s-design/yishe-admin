import request from '@/config/axios'

export function getRemotionTemplateList(params?: {
  keyword?: string
  category?: string
  style?: string
  useCase?: string
  durationLabel?: string
  duration?: string
  tag?: string
  orientation?: string
  currentPage?: number
  page?: number
  pageSize?: number
}) {
  return request.get({
    url: '/remotion-video-record/templates',
    params
  })
}

export function getVideoTemplateHealth() {
  return request.get({
    url: '/remotion-video-record/health'
  })
}

export function generateVideoRecord(data: {
  templateId: string
  title?: string
  timeoutMs?: number
  inputProps?: Record<string, any>
}) {
  return request.post({
    url: '/remotion-video-record/generate',
    data
  })
}

export function getVideoRecordPage(params: {
  currentPage?: number
  pageSize?: number
  keyword?: string
  status?: string
}) {
  return request.get({
    url: '/remotion-video-record/page',
    params
  })
}

export function getVideoRecordDetail(id: string) {
  return request.get({
    url: `/remotion-video-record/${id}`
  })
}

export function deleteVideoRecord(id: string) {
  return request.delete({
    url: `/remotion-video-record/${id}`
  })
}

export function batchDeleteVideoRecord(ids: string[]) {
  return request.post({
    url: '/remotion-video-record/batch-delete',
    data: { ids }
  })
}

export function aiGenerateVideoRecord(data: {
  action?: string
  prompt: string
  params?: Record<string, any>
}) {
  return request.post({
    url: '/remotion-video-record/ai-generate',
    data
  })
}

export function retryVideoRecord(id: string) {
  return request.post({
    url: `/remotion-video-record/${id}/retry`
  })
}

