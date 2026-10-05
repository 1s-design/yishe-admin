import request from '@/config/axios'

export interface CollectSourceField {
  key: string
  type: 'image' | 'text' | 'link' | 'number'
  download?: boolean
}

export interface CollectSearchParam {
  key: string
  label: string
  type: 'text' | 'select' | 'color' | 'number'
  options?: Array<{ label: string; value: string | number }>
  placeholder?: string
  default?: string | number
  required?: boolean
  /** 仅对这些工具/子场景显示；缺省=全部 */
  tools?: string[]
}

export interface CollectSourceMeta {
  id: string
  module: string
  name: string
  engine: {
    minVersion: number
    capabilities: string[]
  }
  searchParams?: CollectSearchParam[]
  output: CollectSourceField[]
  view?: 'rows' | 'cards' | 'table'
  actions?: string[]
  ratelimit?: { qps?: number; concurrent?: number }
  domains: string[]
  timeoutMs?: number
  available?: boolean
  unavailableReason?: string
}

export interface CollectTaskResult {
  id: string
  sourceId: string
  sourceVersion: string
  action: string
  status: 'pending' | 'processing' | 'success' | 'failed'
  message?: string | null
  errorMessage?: string | null
  elapsedMs?: number | null
  resultCount?: number | null
  items: Array<Record<string, any>>
}

/** 采集源清单 */
export const listCollectSources = (module?: string) => {
  return request.get({
    url: '/collect/sources',
    params: module ? { module } : {}
  })
}

/** 创建并执行采集任务（同步等待客户端执行完成） */
export const createCollectTask = (data: {
  sourceId: string
  action: 'search' | 'list' | 'download'
  params?: Record<string, any>
  /** 指定执行客户端连接 ID */
  clientId?: string
}) => {
  return request.post({
    url: '/collect/tasks',
    data
  })
}

/** 查询采集任务及结果 */
export const getCollectTask = (id: string) => {
  return request.get({
    url: `/collect/tasks/${id}`
  })
}
