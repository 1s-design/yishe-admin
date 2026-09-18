import request from '@/config/axios'

export interface NodeExecutionItem {
  id: string
  nodeKey: string
  nodeType: string
  triggerSource: string
  clientId: string | null
  status: 'running' | 'success' | 'failed' | 'timeout'
  durationMs: number | null
  errorMessage: string | null
  data: Record<string, any> | null
  createdAt: string
}

export interface NodeExecutionListResult {
  items: NodeExecutionItem[]
  total: number
  page: number
  limit: number
}

export interface NodeExecutionStats {
  total: number
  today: number
  successRate: number
  avgDurationMs: number
  activeNodes: number
}

export interface NodeStatByNode {
  nodeKey: string
  nodeType: string
  totalCount: string
  successCount: string
  avgDuration: string
  lastExecutedAt: Date
}

enum Api {
  Report = '/node-execution/report',
  List = '/node-execution/list',
  Detail = '/node-execution',
  Delete = '/node-execution',
  StatsOverview = '/node-execution/stats/overview',
  StatsByNode = '/node-execution/stats/by-node',
}

/**
 * 客户端上报节点执行记录
 */
export function reportNodeExecution(params: {
  nodeKey: string
  nodeType: string
  triggerSource: string
  clientId?: string
  status: string
  durationMs?: number
  errorMessage?: string
  triggerId?: string
  data?: Record<string, any>
}) {
  return request.post<{ data: { id: string } }>({ url: Api.Report, params })
}

/**
 * 查询当前用户的执行记录列表
 */
export function getNodeExecutionList(params: {
  nodeType?: string
  nodeKey?: string
  status?: string
  triggerSource?: string
  clientId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}) {
  return request.get<NodeExecutionListResult>({ url: Api.List, params })
}

/**
 * 获取单条执行记录详情
 */
export function getNodeExecutionDetail(id: string) {
  return request.get<{ success: boolean; data: NodeExecutionItem | null }>({
    url: `${Api.Detail}/${id}`,
  })
}

/**
 * 统计概览
 */
export function getNodeExecutionStats() {
  return request.get<NodeExecutionStats>({ url: Api.StatsOverview })
}

/**
 * 按节点统计
 */
export function getNodeExecutionStatsByNode() {
  return request.get<NodeStatByNode[]>({ url: Api.StatsByNode })
}

/**
 * 删除单条执行记录
 */
export function deleteNodeExecution(id: string) {
  return request.delete<{ success: boolean }>({ url: `${Api.Delete}/${id}` })
}
