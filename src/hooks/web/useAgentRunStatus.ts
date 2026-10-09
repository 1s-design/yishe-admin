import { computed, ref } from 'vue'
import { AgentAdminApi, type AgentTask } from '@/api/agent'

export interface AgentRunSummary {
  running: number
  waiting: number
  dutyOn: number
  tasks: Array<{
    id: string
    agentName: string
    title: string
    status: string
    statusLabel: string
  }>
}

const state = ref<AgentRunSummary>({
  running: 0,
  waiting: 0,
  dutyOn: 0,
  tasks: []
})
const loading = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

function statusLabel(st: string) {
  const map: Record<string, string> = {
    pending: '排队中',
    running: '执行中',
    waiting_approval: '待审批',
    waiting_input: '待输入',
    completed: '已完成',
    failed: '失败',
    cancelled: '已中止'
  }
  return map[st] || st
}

async function refresh() {
  if (loading.value) return
  loading.value = true
  try {
    const [counts, running, waiting, defs] = await Promise.all([
      AgentAdminApi.taskStatusCounts().catch(() => ({} as Record<string, number>)),
      AgentAdminApi.tasks({ status: 'running', pageSize: 5 }).catch(() => ({ items: [] as AgentTask[] })),
      AgentAdminApi.tasks({ status: 'waiting_approval', pageSize: 5 }).catch(() => ({ items: [] as AgentTask[] })),
      AgentAdminApi.definitions().catch(() => [])
    ])
    const runItems = ((running as any)?.items || []) as AgentTask[]
    const waitItems = ((waiting as any)?.items || []) as AgentTask[]
    const defList = ((defs as any)?.data ?? defs) as any[]
    const dutyOn = Array.isArray(defList)
      ? defList.filter((a) => a.dutyMode === 'duty' && a.enabled !== false).length
      : 0

    const tasks = [...runItems, ...waitItems].slice(0, 6).map((t) => ({
      id: t.id,
      agentName: t.agentName || '智能体',
      title: t.title || t.prompt?.slice(0, 24) || '',
      status: t.status,
      statusLabel: statusLabel(t.status)
    }))

    state.value = {
      running: Number(counts?.running || 0) || runItems.length,
      waiting:
        Number(counts?.waiting_approval || 0) + Number(counts?.waiting_input || 0) ||
        waitItems.length,
      dutyOn,
      tasks
    }
  } catch {
    /* keep last */
  } finally {
    loading.value = false
  }
}

function ensurePolling() {
  if (timer) return
  void refresh()
  timer = setInterval(() => void refresh(), 10_000)
}

/**
 * 全局智能体运行状态（菜单角标用）。
 * 可在非组件上下文调用；首次使用时自动开始轮询。
 */
export function useAgentRunStatus() {
  ensurePolling()
  return {
    agentRun: state,
    refreshAgentRun: refresh,
    hasActivity: computed(() => state.value.running + state.value.waiting > 0),
    badgeText: computed(() => {
      const n = state.value.running + state.value.waiting
      return n > 99 ? '99+' : String(n)
    })
  }
}
