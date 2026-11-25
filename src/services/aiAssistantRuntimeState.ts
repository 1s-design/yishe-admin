import { reactive } from "vue";
import { AiAssistantApi } from "@/api/aiAssistant";

export type AiAssistantRuntimeTone = "checking" | "available" | "running" | "offline";

interface AiAssistantRuntimeSnapshot {
  initialized: boolean;
  loading: boolean;
  configured: boolean;
  available: boolean;
  runningCount: number;
  message: string;
  updatedAt: string;
}

const POLL_INTERVAL_MS = 15_000;

export const aiAssistantRuntimeState = reactive<AiAssistantRuntimeSnapshot>({
  initialized: false,
  loading: false,
  configured: false,
  available: false,
  runningCount: 0,
  message: "等待检测 Agent 状态",
  updatedAt: "",
});

let pendingRefresh: Promise<void> | null = null;
let pollingTimer: number | null = null;
let visibilityListenerInitialized = false;
let initializationStarted = false;
let localRequestRunning = false;

const normalizeErrorMessage = (error: any) => {
  const message = String(error?.message || error || "").trim();
  return message && message !== "error" ? message : "Agent 服务连接失败";
};

export const refreshAiAssistantRuntimeState = async () => {
  if (pendingRefresh) {
    return pendingRefresh;
  }

  pendingRefresh = (async () => {
    if (!aiAssistantRuntimeState.initialized) {
      aiAssistantRuntimeState.loading = true;
    }

    try {
      const status = await AiAssistantApi.getStatus();
      const serverRunningCount = Math.max(0, Number(status?.runningCount || 0));

      aiAssistantRuntimeState.configured = status?.configured === true;
      aiAssistantRuntimeState.available = status?.available === true || localRequestRunning;
      aiAssistantRuntimeState.runningCount = localRequestRunning
        ? Math.max(1, serverRunningCount)
        : serverRunningCount;
      aiAssistantRuntimeState.message = localRequestRunning
        ? "Agent 正在思考或执行任务"
        : String(status?.message || "Agent 服务可用");
    } catch (error) {
      aiAssistantRuntimeState.configured = false;
      aiAssistantRuntimeState.available = localRequestRunning;
      aiAssistantRuntimeState.runningCount = localRequestRunning ? 1 : 0;
      aiAssistantRuntimeState.message = localRequestRunning
        ? "Agent 正在思考或执行任务"
        : normalizeErrorMessage(error);
    } finally {
      aiAssistantRuntimeState.initialized = true;
      aiAssistantRuntimeState.loading = false;
      aiAssistantRuntimeState.updatedAt = new Date().toISOString();
      pendingRefresh = null;
    }
  })();

  return pendingRefresh;
};

const refreshWhenVisible = () => {
  if (typeof document !== "undefined" && document.hidden) {
    return;
  }
  void refreshAiAssistantRuntimeState();
};

const startPolling = () => {
  if (typeof window === "undefined" || pollingTimer !== null) {
    return;
  }

  pollingTimer = window.setInterval(refreshWhenVisible, POLL_INTERVAL_MS);
  if (!visibilityListenerInitialized && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", refreshWhenVisible);
    visibilityListenerInitialized = true;
  }
};

export const ensureAiAssistantRuntimeInitialized = () => {
  if (!initializationStarted) {
    initializationStarted = true;
    void refreshAiAssistantRuntimeState();
  }
  startPolling();
};

export const markAiAssistantRuntimeRunning = () => {
  localRequestRunning = true;
  aiAssistantRuntimeState.initialized = true;
  aiAssistantRuntimeState.available = true;
  aiAssistantRuntimeState.runningCount = Math.max(1, aiAssistantRuntimeState.runningCount);
  aiAssistantRuntimeState.message = "Agent 正在思考或执行任务";
  aiAssistantRuntimeState.updatedAt = new Date().toISOString();
};

export const markAiAssistantRuntimeIdle = () => {
  localRequestRunning = false;
  if (typeof window === "undefined") {
    return;
  }
  window.setTimeout(() => {
    void refreshAiAssistantRuntimeState();
  }, 500);
};

export const resolveAiAssistantRuntimeTone = (): AiAssistantRuntimeTone => {
  if (
    !aiAssistantRuntimeState.initialized ||
    (aiAssistantRuntimeState.loading && !aiAssistantRuntimeState.updatedAt)
  ) {
    return "checking";
  }
  if (aiAssistantRuntimeState.runningCount > 0) {
    return "running";
  }
  if (aiAssistantRuntimeState.available) {
    return "available";
  }
  return "offline";
};

export const resolveAiAssistantRuntimeTooltip = () => aiAssistantRuntimeState.message;
