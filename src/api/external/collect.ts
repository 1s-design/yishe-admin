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
  /** 数字输入的最小/最大值 */
  min?: number
  max?: number
  required?: boolean
  /** 仅对这些工具/子场景显示；缺省=全部 */
  tools?: string[]
}

/** 采集方法定义：key 即 collect_run 的 action，由源自己声明 */
export interface CollectMethodDef {
  key: string
  label: string
  description?: string
  params?: CollectSearchParam[]
  paginated?: boolean
  write?: boolean
  requiresItem?: boolean
  default?: boolean
  /** 别名方法（同一能力的另一入口），不作为独立 tab，MCP/agent 仍可调用 */
  aliasOf?: string
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
  /** 榜单/分类浏览表单 schema（search 之外的旧式语法糖） */
  listParams?: CollectSearchParam[]
  /** 源自己声明的采集方法清单（新契约，优先使用） */
  methods?: CollectMethodDef[]
  /** 源实际支持的方法 key 列表（服务端按导出的 hooks 附加） */
  modes?: string[]
  /** 方法展示标签（服务端按 methods 生成） */
  modeLabels?: Record<string, string>
  output: CollectSourceField[]
  view?: 'rows' | 'cards' | 'table'
  actions?: string[]
  ratelimit?: { qps?: number; concurrent?: number }
  domains: string[]
  timeoutMs?: number
  available?: boolean
  unavailableReason?: string
  useCases?: string[]
  website?: string
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

/** AI 采集站点指南 */
export const listSiteGuides = (module?: string, includePending?: boolean) => {
  return request.get({
    url: '/collect/site-guides',
    params: {
      ...(module ? { module } : {}),
      ...(includePending ? { includePending: 'true' } : {})
    }
  })
}

/** 创建并执行采集任务（同步等待客户端执行完成） */
export const createCollectTask = (data: {
  sourceId: string
  action: string
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
