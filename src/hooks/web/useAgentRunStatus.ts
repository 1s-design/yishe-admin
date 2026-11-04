import { computed } from 'vue'
import {
  agentRunState,
  ensureAgentRunStateInitialized,
  refreshAgentRunState
} from '@/services/agentRunState'

/**
 * 菜单角标用的智能体运行状态。
 *
 * 注意：这里**不再单独起轮询**。此前本 hook 与 services/agentRunState.ts
 * 各起一个 10s 定时器、每轮各打 4 个接口（含 15KB 的 definitions），
 * 一天近 2 万次请求。现在统一复用 agentRunState 的单一定时器与聚合接口。
 */
export function useAgentRunStatus() {
  ensureAgentRunStateInitialized()

  return {
    agentRun: computed(() => agentRunState),
    refreshAgentRun: refreshAgentRunState,
    hasActivity: computed(() => agentRunState.running + agentRunState.waiting > 0),
    badgeText: computed(() => {
      const n = agentRunState.running + agentRunState.waiting
      return n > 99 ? '99+' : String(n)
    })
  }
}
