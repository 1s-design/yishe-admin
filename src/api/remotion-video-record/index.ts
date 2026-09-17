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

export function getRemotionVideoHealth() {
  return request.get({
    url: '/remotion-video-record/health'
  })
}

export function generateRemotionVideoRecord(data: {
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

export function getRemotionVideoRecordPage(params: {
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

export function getRemotionVideoRecordDetail(id: string) {
  return request.get({
    url: `/remotion-video-record/${id}`
  })
}

export function deleteRemotionVideoRecord(id: string) {
  return request.delete({
    url: `/remotion-video-record/${id}`
  })
}

export function batchDeleteRemotionVideoRecord(ids: string[]) {
  return request.post({
    url: '/remotion-video-record/batch-delete',
    data: { ids }
  })
}

export function aiGenerateRemotionVideoRecord(data: {
  action?: string
  prompt: string
  params?: Record<string, any>
}) {
  return request.post({
    url: '/remotion-video-record/ai-generate',
    data
  })
}

export function retryRemotionVideoRecord(id: string) {
  return request.post({
    url: `/remotion-video-record/${id}/retry`
  })
}

