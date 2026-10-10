import request from '@/config/axios'

/** 与持久智能助手对话 */
export interface AgentChatPayload {
  message: string
  resourceId?: string
  threadId?: string
}

export interface AgentSuspendPayload {
  question: string
  contextSummary?: string
  options?: string[]
  toolName?: string
  toolCallId?: string
  args?: Record<string, any>
  requiresApproval?: boolean
}

export interface AgentChatResult {
  threadId: string
  runId: string
  status: 'completed' | 'suspended' | 'running'
  text: string
  suspendPayload: AgentSuspendPayload | null
}

/** 收件箱条目（suspended runs，重启后仍可发现） */
export interface AgentInboxItem {
  runId: string
  threadId?: string
  toolCallId?: string
  toolName?: string
  requiresApproval?: boolean
  question: string
  options?: string[]
  contextSummary?: string
  args?: Record<string, any>
  createdAt?: string
}

export const AgentApi = {
  /** 对话推进（记忆 + 工具；需确认时返回 suspended） */
  chat(data: AgentChatPayload) {
    return request.post({ url: '/agent/chat', data }) as Promise<AgentChatResult>
  },
  /** 待用户确认列表 */
  inbox(params: { resourceId?: string; threadId?: string }) {
    return request.get({ url: '/agent/inbox', params }) as Promise<{ items: AgentInboxItem[]; total: number }>
  },
  /** 恢复暂停任务：approved=true/false 审批；否则补充数据续跑 */
  resume(data: {
    runId: string
    toolCallId?: string
    resumeData?: {
      approved?: boolean
      reason?: string
      userReply?: string
      [key: string]: any
    }
  }) {
    return request.post({ url: '/agent/resume', data }) as Promise<AgentChatResult>
  },
  /** 任务状态 */
  status(params: { runId?: string; resourceId?: string }) {
    return request.get({ url: '/agent/status', params })
  },
}

// ── 智能体管理（业务定义 + 任务） ──────────────────────────────

export interface AgentDefinition {
  id: string
  name: string
  description: string
  instructions: string
  capabilities: string[]
  enabled: boolean
  /** 头像渐变 ID，如 g1–g100 */
  avatarStyle?: string | null
  /** 值守模式：off=仅手动；duty=定时/事件唤醒 */
  dutyMode?: 'off' | 'duty'
  dutyGoal?: string
  dailyRunLimit?: number
  nextWakeAt?: string | null
  createTime?: string
  updateTime?: string
}

export interface CapabilityItem {
  id: string
  name: string
  description: string
  category?: string
  risk: 'low' | 'medium' | 'high'
  readOnly?: boolean
  /** Source-as-Capability 扩展元数据（采集源等） */
  meta?: {
    module?: string
    moduleLabel?: string
    sourceId?: string
    domains?: string[]
    searchParams?: Array<{ key: string; label: string; type: string }>
  }
}

export type AgentTaskStatus =
  | 'pending'
  | 'running'
  | 'waiting_approval'
  | 'waiting_input'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface AgentTask {
  id: string
  agentDefinitionId: string
  agentName: string
  title: string
  prompt: string
  threadId: string
  runId: string | null
  status: AgentTaskStatus
  resultText: string | null
  suspendPayload: {
    question?: string
    contextSummary?: string
    toolName?: string
    toolCallId?: string
    args?: any
    requiresApproval?: boolean
  } | null
  error: string | null
  createdAt: string
  updatedAt: string
  startedAt: string | null
  finishedAt: string | null
  messages?: any[]
  worklog?: any[]
}

export const AgentAdminApi = {
  /** 能力目录（创建智能体时的勾选项） */
  capabilities() {
    return request.get({ url: '/agent/capabilities' }) as Promise<CapabilityItem[]>
  },
  definitions() {
    return request.get({ url: '/agent/definitions' }) as Promise<AgentDefinition[]>
  },
  createDefinition(data: {
    name: string
    description?: string
    instructions?: string
    capabilities?: string[]
    avatarStyle?: string
    dutyMode?: 'off' | 'duty'
    dutyGoal?: string
    dailyRunLimit?: number
  }) {
    return request.post({ url: '/agent/definitions', data }) as Promise<AgentDefinition>
  },
  updateDefinition(
    id: string,
    data: {
      name?: string
      description?: string
      instructions?: string
      capabilities?: string[]
      enabled?: boolean
      avatarStyle?: string | null
      dutyMode?: 'off' | 'duty'
      dutyGoal?: string | null
      dailyRunLimit?: number
    }
  ) {
    return request.put({ url: `/agent/definitions/${id}`, data }) as Promise<AgentDefinition>
  },
  removeDefinition(id: string) {
    return request.delete({ url: `/agent/definitions/${id}` }) as Promise<any>
  },
  /** 追加对话微调笔记（持续优化，注入后续值守） */
  appendWorkNote(id: string, note: string) {
    return request.post({
      url: `/agent/definitions/${id}/work-notes`,
      data: { note }
    }) as Promise<AgentDefinition>
  },
  /** 自进化提示词：分析运行日志生成优化版 */
  optimizeInstructions(id: string) {
    return request.post({ url: `/agent/definitions/${id}/optimize-instructions` }) as Promise<AgentDefinition>
  },
  /** 采纳优化版提示词 */
  acceptOptimized(id: string) {
    return request.post({ url: `/agent/definitions/${id}/accept-optimized` }) as Promise<AgentDefinition>
  },
  /** 拒绝优化版提示词 */
  rejectOptimized(id: string) {
    return request.post({ url: `/agent/definitions/${id}/reject-optimized` }) as Promise<AgentDefinition>
  },
  /** 下发任务（后台异步执行） */
  dispatchTask(data: { agentDefinitionId: string; title?: string; prompt: string }) {
    return request.post({ url: '/agent/tasks', data }) as Promise<AgentTask>
  },
  tasks(params: {
    agentDefinitionId?: string
    status?: AgentTaskStatus
    page?: number
    pageSize?: number
  }) {
    return request.get({ url: '/agent/tasks', params }) as Promise<{
      items: AgentTask[]
      total: number
    }>
  },
  taskStatusCounts() {
    return request.get({ url: '/agent/tasks/status-counts' }) as Promise<Record<string, number>>
  },
  taskDetail(id: string) {
    return request.get({ url: `/agent/tasks/${id}` }) as Promise<AgentTask>
  },
  approveTask(id: string) {
    return request.post({ url: `/agent/tasks/${id}/approve` }) as Promise<AgentTask>
  },
  declineTask(id: string) {
    return request.post({ url: `/agent/tasks/${id}/decline` }) as Promise<AgentTask>
  },
  replyTask(id: string, userReply: string) {
    return request.post({ url: `/agent/tasks/${id}/reply`, data: { userReply } }) as Promise<AgentTask>
  },
  cancelTask(id: string) {
    return request.post({ url: `/agent/tasks/${id}/cancel` }) as Promise<AgentTask>
  },
  /** 清空对话并重置会话状态 */
  clearTask(id: string) {
    return request.post({ url: `/agent/tasks/${id}/clear` }) as Promise<{
      success: boolean
      id: string
      cleared: boolean
    }>
  },
  /** 多轮对话：向任务线程追加消息 */
  sendMessage(id: string, message: string) {
    return request.post({ url: `/agent/tasks/${id}/messages`, data: { message } }) as Promise<AgentTask>
  },
}
