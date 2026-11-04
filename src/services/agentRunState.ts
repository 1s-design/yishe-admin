import { reactive } from "vue";
import { AgentAdminApi } from "@/api/agent";

export interface AgentRunTaskInfo {
  id: string;
  agentName: string;
  title: string;
  status: string;
  statusLabel: string;
}

interface AgentRunSnapshot {
  initialized: boolean;
  loading: boolean;
  running: number;
  waiting: number;
  dutyOn: number;
  tasks: AgentRunTaskInfo[];
  updatedAt: string;
}

/**
 * 轮询节奏：有任务在跑时 10s（要跟进度），空闲时 30s（只看角标）。
 * 页面隐藏时不请求，回到前台由下一次 tick 自动补上。
 */
const POLL_INTERVAL_ACTIVE_MS = 10_000;
const POLL_INTERVAL_IDLE_MS = 30_000;

export const agentRunState = reactive<AgentRunSnapshot>({
  initialized: false,
  loading: false,
  running: 0,
  waiting: 0,
  dutyOn: 0,
  tasks: [],
  updatedAt: "",
});

let pendingRefresh: Promise<void> | null = null;
let pollingTimer: ReturnType<typeof setTimeout> | null = null;
let initializationStarted = false;

function statusLabel(st: string) {
  const map: Record<string, string> = {
    pending: "排队中",
    running: "执行中",
    waiting_approval: "待审批",
    waiting_input: "待输入",
  };
  return map[st] || st;
}

export const refreshAgentRunState = async () => {
  if (pendingRefresh) return pendingRefresh;
  pendingRefresh = (async () => {
    agentRunState.loading = true;
    try {
      // 单请求取齐：计数 + 在跑任务 + 待审批 + 值守数（服务端聚合，约 200B）
      const summary = await AgentAdminApi.runtimeSummary(8);
      const counts = summary?.counts || {};
      const running = summary?.running || [];
      const waiting = summary?.waiting || [];

      agentRunState.running = Number(counts.running || 0) || running.length;
      agentRunState.waiting =
        Number(counts.waiting_approval || 0) + Number(counts.waiting_input || 0) ||
        waiting.length;
      agentRunState.dutyOn = Number(summary?.dutyOn || 0);
      agentRunState.tasks = [...running, ...waiting].slice(0, 8).map((t) => ({
        id: t.id,
        agentName: t.agentName || "智能体",
        title: t.title || "",
        status: t.status,
        statusLabel: statusLabel(t.status),
      }));
    } catch {
      /* 保留上次快照，网络抖动不打断轮询 */
    } finally {
      agentRunState.initialized = true;
      agentRunState.loading = false;
      agentRunState.updatedAt = new Date().toISOString();
      pendingRefresh = null;
    }
  })();
  return pendingRefresh;
};

function scheduleNextPoll() {
  if (pollingTimer) clearTimeout(pollingTimer);
  const busy = agentRunState.running + agentRunState.waiting > 0;
  const delay = busy ? POLL_INTERVAL_ACTIVE_MS : POLL_INTERVAL_IDLE_MS;
  pollingTimer = setTimeout(async () => {
    if (!(typeof document !== "undefined" && document.hidden)) {
      await refreshAgentRunState();
    }
    scheduleNextPoll();
  }, delay);
}

/**
 * 回到前台时立即补一次并重置节奏。
 * 后台标签页不发请求（省流量），但用户切回来时数据不能是陈旧的。
 */
function bindVisibilityRefresh() {
  if (typeof document === "undefined") return;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    void refreshAgentRunState();
    scheduleNextPoll();
  });
}

export const ensureAgentRunStateInitialized = () => {
  if (initializationStarted) return;
  initializationStarted = true;
  bindVisibilityRefresh();
  void refreshAgentRunState();
  scheduleNextPoll();
};

export const stopAgentRunStatePolling = () => {
  if (pollingTimer) clearTimeout(pollingTimer);
  pollingTimer = null;
  initializationStarted = false;
};

export const resolveAgentRunTooltip = () => {
  const { running, waiting, dutyOn, tasks } = agentRunState;
  const total = running + waiting + dutyOn;
  if (total === 0) return "智能体状态：暂无运行中的智能体";
  const head = `运行 ${running} · 等待 ${waiting} · 值守 ${dutyOn}`;
  if (!tasks.length) {
    return dutyOn > 0
      ? `智能体状态：${head}\n${dutyOn} 个智能体值守中，按计划自动执行采集任务`
      : `智能体状态：${head}`;
  }
  const lines = tasks
    .slice(0, 5)
    .map((t) => `• ${t.agentName}（${t.statusLabel}）${t.title ? " · " + t.title : ""}`);
  return `智能体状态：${head}\n${lines.join("\n")}`;
};
