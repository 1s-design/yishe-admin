import { reactive } from "vue";
import { AgentAdminApi, type AgentTask } from "@/api/agent";

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

const POLL_INTERVAL_MS = 10_000;

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
let pollingTimer: ReturnType<typeof setInterval> | null = null;
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
      const [counts, running, waiting, defs] = await Promise.all([
        AgentAdminApi.taskStatusCounts().catch(() => ({} as Record<string, number>)),
        AgentAdminApi.tasks({ status: "running", pageSize: 8 }).catch(() => ({
          items: [] as AgentTask[],
        })),
        AgentAdminApi.tasks({ status: "waiting_approval", pageSize: 8 }).catch(() => ({
          items: [] as AgentTask[],
        })),
        AgentAdminApi.definitions().catch(() => []),
      ]);
      const runItems = ((running as any)?.items || []) as AgentTask[];
      const waitItems = ((waiting as any)?.items || []) as AgentTask[];
      const defList = ((defs as any)?.data ?? defs) as any[];
      const dutyOn = Array.isArray(defList)
        ? defList.filter((a) => a?.dutyMode === "duty" && a?.enabled !== false).length
        : 0;

      agentRunState.running = Number(counts?.running || 0) || runItems.length;
      agentRunState.waiting =
        Number(counts?.waiting_approval || 0) +
          Number(counts?.waiting_input || 0) ||
        waitItems.length;
      agentRunState.dutyOn = dutyOn;
      agentRunState.tasks = [...runItems, ...waitItems].slice(0, 8).map((t) => ({
        id: t.id,
        agentName: t.agentName || "智能体",
        title: t.title || String(t.prompt || "").slice(0, 28),
        status: t.status,
        statusLabel: statusLabel(t.status),
      }));
    } catch {
      /* keep last snapshot */
    } finally {
      agentRunState.initialized = true;
      agentRunState.loading = false;
      agentRunState.updatedAt = new Date().toISOString();
      pendingRefresh = null;
    }
  })();
  return pendingRefresh;
};

export const ensureAgentRunStateInitialized = () => {
  if (initializationStarted) return;
  initializationStarted = true;
  void refreshAgentRunState();
  pollingTimer = setInterval(() => {
    if (typeof document !== "undefined" && document.hidden) return;
    void refreshAgentRunState();
  }, POLL_INTERVAL_MS);
};

export const resolveAgentRunTooltip = () => {
  const { running, waiting, dutyOn, tasks } = agentRunState;
  const head = `运行 ${running} · 等待 ${waiting} · 开启值守 ${dutyOn}`;
  if (!tasks.length) return `智能体状态：${head}\n暂无运行中任务`;
  const lines = tasks
    .slice(0, 5)
    .map((t) => `• ${t.agentName}（${t.statusLabel}）${t.title ? " · " + t.title : ""}`);
  return `智能体状态：${head}\n${lines.join("\n")}`;
};
