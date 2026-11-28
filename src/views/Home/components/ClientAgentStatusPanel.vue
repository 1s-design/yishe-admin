<template>
  <section class="home-section client-agent-panel">
    <div class="section-title-bar">
      <div class="section-title-bar__left">
        <div class="section-title-bar__icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
          </svg>
        </div>
        <h2 class="section-title-bar__title">客户端 Agent</h2>
        <span
          class="agent-pill"
          :class="summary.activeCount > 0 ? 'agent-pill--running' : 'agent-pill--idle'"
        >
          <span
            class="agent-dot"
            :class="summary.activeCount > 0 ? 'agent-dot--running' : 'agent-dot--idle'"
          />
          运行 {{ summary.activeCount }}/{{ summary.totalCapacity }}
        </span>
        <span v-if="summary.queuedCount > 0" class="agent-pill agent-pill--queued">
          排队 {{ summary.queuedCount }}
        </span>
      </div>
      <div class="section-title-bar__right">
        <ElButton plain size="small" :loading="store.loading" @click="manualRefresh">
          刷新
        </ElButton>
      </div>
    </div>

    <div class="agent-card">
      <div v-if="agentNodes.length === 0" class="agent-muted">
        暂无在线客户端 Agent
      </div>

      <template v-else>
        <div class="agent-nodes-bar">
          <div
            v-for="node in agentNodes"
            :key="node.clientId"
            class="agent-node-chip"
            :class="{ 'agent-node-chip--busy': node.activeCount > 0 }"
          >
            <span
              class="agent-dot"
              :class="
                node.activeCount > 0
                  ? 'agent-dot--running'
                  : node.available
                    ? 'agent-dot--idle'
                    : 'agent-dot--off'
              "
            />
            <span class="agent-node-chip__name">{{ node.displayName }}</span>
            <span class="agent-node-chip__slots">
              {{ node.activeCount }}/{{ node.maxConcurrency }}
            </span>
          </div>
          <span v-if="activeRuns.length === 0" class="agent-muted agent-muted--inline">
            全部空闲
          </span>
        </div>

        <div v-if="activeRuns.length > 0" class="agent-run-list">
          <div
            v-for="run in activeRuns"
            :key="`${run.clientId}:${run.runId}`"
            class="agent-run-row"
          >
            <span class="agent-dot agent-dot--running" />
            <span class="agent-run-row__client">{{ run.clientName }}</span>
            <span class="agent-run-row__profile">{{ profileLabel(run.profileId) }}</span>
            <span class="agent-run-row__title" :title="run.title">
              {{ run.title || "执行中" }}
            </span>
            <span class="agent-run-row__stage">
              {{
                run.currentTool
                  ? run.currentTool
                  : run.status === "queued"
                    ? "排队中"
                    : `第 ${run.iteration || 1} 轮`
              }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { getClientServiceRuntime, useClientNodeStore } from "@/store/modules/clientNode";

defineOptions({ name: "ClientAgentStatusPanel" });

const store = useClientNodeStore();

interface AgentNodeBrief {
  clientId: string;
  displayName: string;
  available: boolean;
  activeCount: number;
  queuedCount: number;
  maxConcurrency: number;
  activeRuns: any[];
}

interface ActiveAgentRun {
  clientId: string;
  clientName: string;
  runId: string;
  profileId: string;
  title: string;
  status: string;
  currentTool: string | null;
  iteration: number;
  startedAt: number;
}

const agentNodes = computed<AgentNodeBrief[]>(() => {
  const list: AgentNodeBrief[] = [];
  for (const node of store.onlineClients) {
    const svc = getClientServiceRuntime(node, "client-agent");
    if (!svc) continue;
    const details = (svc.details || {}) as Record<string, any>;
    const displayName =
      node.alias ||
      node.displayName ||
      node.clientInfo?.machine?.code ||
      node.id.slice(0, 8);
    list.push({
      clientId: node.id,
      displayName,
      available: svc.available !== false,
      activeCount: Number(details.activeCount || 0),
      queuedCount: Number(details.queuedCount || 0),
      maxConcurrency: Number(details.maxConcurrency || 4),
      activeRuns: Array.isArray(details.activeRuns) ? details.activeRuns : [],
    });
  }
  return list;
});

const summary = computed(() => {
  let activeCount = 0;
  let queuedCount = 0;
  let totalCapacity = 0;
  for (const node of agentNodes.value) {
    activeCount += node.activeCount;
    queuedCount += node.queuedCount;
    totalCapacity += node.maxConcurrency;
  }
  return { activeCount, queuedCount, totalCapacity };
});

const activeRuns = computed<ActiveAgentRun[]>(() => {
  const list: ActiveAgentRun[] = [];
  for (const node of agentNodes.value) {
    if (node.activeCount <= 0 && node.queuedCount <= 0) continue;
    for (const run of node.activeRuns) {
      const status = String(run.status || "running");
      if (status !== "running" && status !== "queued") continue;
      list.push({
        clientId: node.clientId,
        clientName: node.displayName,
        runId: String(run.runId || ""),
        profileId: String(run.profileId || "default"),
        title: String(run.title || ""),
        status,
        currentTool: run.currentTool ? String(run.currentTool) : null,
        iteration: Number(run.iteration || 1),
        startedAt: Number(run.startedAt || 0),
      });
    }
  }
  return list.sort((a, b) => b.startedAt - a.startedAt);
});

const profileLabel = (id: string) => {
  if (id === "media_ops") return "媒体运营";
  if (id === "google_art") return "Google Arts";
  return "通用";
};

const manualRefresh = () => {
  void store.refresh({ summary: true });
};

onMounted(() => {
  // 复用全局 clientNode store：已初始化时 0 HTTP 请求，后续完全依赖 WebSocket service-runtime 推送
  store.ensureInitialized({ summary: true });
});
</script>

<style scoped lang="scss">
.section-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;
  height: 32px;
}

.section-title-bar__left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.section-title-bar__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--el-text-color-secondary);
  background: color-mix(in srgb, var(--el-text-color-secondary) 8%, transparent);
  border-radius: 6px;
  flex-shrink: 0;
}

.section-title-bar__title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 32px;
}

.section-title-bar__right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.section-title-bar :deep(.el-button) {
  height: 24px;
  min-height: 24px;
}

.agent-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.agent-pill--running {
  border-color: rgba(59, 130, 246, 0.35);
  color: #2563eb;
}

.agent-pill--queued {
  border-color: rgba(245, 158, 11, 0.35);
  color: #d97706;
}

.agent-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.agent-dot--running {
  background: #3b82f6;
}

.agent-dot--idle {
  background: #10b981;
}

.agent-dot--off {
  background: #9ca3af;
}

.agent-card {
  background: var(--el-bg-color);
  border-radius: 9px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.agent-muted {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.agent-muted--inline {
  margin-left: 2px;
}

.agent-nodes-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.agent-node-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--el-text-color-secondary) 6%, transparent);
  font-size: 12px;
}

.agent-node-chip--busy {
  background: rgba(59, 130, 246, 0.08);
}

.agent-node-chip__name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.agent-node-chip__slots {
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
  font-size: 11px;
}

.agent-run-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 6px;
  border-top: 1px solid var(--el-border-color-extra-light);
}

.agent-run-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 4px;
  font-size: 12px;
}

.agent-run-row__client {
  font-weight: 600;
  color: var(--el-text-color-primary);
  flex-shrink: 0;
}

.agent-run-row__profile {
  padding: 0 5px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 11px;
  flex-shrink: 0;
}

.agent-run-row__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-regular);
}

.agent-run-row__stage {
  font-size: 11px;
  color: #2563eb;
  flex-shrink: 0;
}
</style>
