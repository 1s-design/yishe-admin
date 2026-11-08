import { reactive, watch } from "vue";
import {
  getMyOnlineRuntimeConnectionViews,
  type WebsocketConnectionVO,
} from "@/api/system/websocket";
import {
  websocketClient,
  type RemoteResultEvent,
  type RuntimeConnectionChangedEvent,
} from "@/services/websocketClient";

export type DesignToolRuntimeTone = "checking" | "available" | "running" | "offline";

interface DesignToolRuntimeSnapshot {
  initialized: boolean;
  loading: boolean;
  onlineCount: number;
  runningCount: number;
  updatedAt: string;
}

const DESIGN_TOOL_SOURCES = new Set(["设计工具", "设计端"]);
const FALLBACK_REFRESH_INTERVAL_MS = 60_000;

export const designToolRuntimeState = reactive<DesignToolRuntimeSnapshot>({
  initialized: false,
  loading: false,
  onlineCount: 0,
  runningCount: 0,
  updatedAt: "",
});

const connections = new Map<string, WebsocketConnectionVO>();
let initializationStarted = false;
let eventListenerBound = false;
let remoteResultListenerBound = false;
let visibilityListenerBound = false;
let websocketStatusWatcherBound = false;
let fallbackTimer: number | null = null;
let pendingRefresh: Promise<void> | null = null;

const isDesignToolConnection = (connection?: WebsocketConnectionVO | null) => {
  const rawSource = connection?.clientSource || connection?.query?.clientSource;
  const source = Array.isArray(rawSource) ? rawSource[0] : rawSource || "";
  return (
    DESIGN_TOOL_SOURCES.has(String(source).trim()) ||
    String(connection?.clientInfo?.app?.name || "").trim() === "yishe-tool" ||
    String(connection?.id || "").trim().startsWith("designtool-")
  );
};

const ACTIVE_BATCH_STATES = new Set(["preparing", "running", "paused"]);
const TERMINAL_BATCH_STATES = new Set(["done", "stopped"]);
const TERMINAL_REMOTE_PHASES = new Set(["completed", "failed", "cancelled"]);

const parseTimestamp = (value: unknown) => {
  const timestamp = Date.parse(String(value || ""));
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const isDesignToolConnectionRunning = (
  connection: WebsocketConnectionVO,
) => {
  const designWorker = connection.clientInfo?.designWorker;
  const workerState = String(designWorker?.state || "").trim();
  const activeRequestId = String(designWorker?.activeRequestId || "").trim();
  const batch = designWorker?.batch as
    | Record<string, any>
    | null
    | undefined;
  const batchStatus = String(batch?.status || "").trim();

  if (ACTIVE_BATCH_STATES.has(batchStatus)) {
    return (
      workerState === "busy" || workerState === "cancelling" || !!activeRequestId
    );
  }
  if (TERMINAL_BATCH_STATES.has(batchStatus)) {
    const workerUpdatedAt = parseTimestamp(designWorker?.updatedAt);
    const batchUpdatedAt = parseTimestamp(batch?.updatedAt);
    const workerStartedAfterBatch =
      !!activeRequestId &&
      (workerState === "busy" || workerState === "cancelling") &&
      !!batchUpdatedAt &&
      workerUpdatedAt > batchUpdatedAt;
    return workerStartedAfterBatch;
  }

  return (
    (workerState === "busy" || workerState === "cancelling") &&
    !!activeRequestId
  );
};

const normalizeRows = (payload: unknown): WebsocketConnectionVO[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray((payload as any).data)) {
    return (payload as any).data;
  }
  return [];
};

const syncSnapshot = () => {
  const onlineConnections = Array.from(connections.values()).filter(
    (connection) => connection.isOnline !== false,
  );
  designToolRuntimeState.onlineCount = onlineConnections.length;
  designToolRuntimeState.runningCount = onlineConnections.filter(
    isDesignToolConnectionRunning,
  ).length;
  designToolRuntimeState.initialized = true;
  designToolRuntimeState.updatedAt = new Date().toISOString();
};

const replaceConnections = (rows: WebsocketConnectionVO[]) => {
  connections.clear();
  rows.forEach((connection) => {
    if (connection?.id && connection.isOnline !== false && isDesignToolConnection(connection)) {
      connections.set(connection.id, connection);
    }
  });
  syncSnapshot();
};

const handleRuntimeConnectionChanged = (event: RuntimeConnectionChangedEvent) => {
  const connection = event?.connection;
  if (!connection?.id) return;

  if (event.action === "removed" || connection.isOnline === false) {
    if (connections.delete(connection.id)) syncSnapshot();
    return;
  }

  if (!isDesignToolConnection(connection)) return;
  connections.set(connection.id, connection);
  syncSnapshot();
};

const handleRemoteResult = (event: RemoteResultEvent) => {
  const connectionId = String(event?.connectionId || "").trim();
  const requestId = String(event?.requestId || "").trim();
  const batch = event?.batch as Record<string, any> | null | undefined;
  const batchStatus = String(batch?.status || "").trim();
  const phase = String(event?.phase || "").trim();
  const isTerminal =
    TERMINAL_BATCH_STATES.has(batchStatus) || TERMINAL_REMOTE_PHASES.has(phase);
  if (!connectionId || !isTerminal) return;

  const connection = connections.get(connectionId);
  if (!connection?.clientInfo?.designWorker) return;

  const activeRequestId = String(
    connection.clientInfo.designWorker.activeRequestId || "",
  ).trim();
  if (activeRequestId && requestId && activeRequestId !== requestId) return;

  Object.assign(connection.clientInfo.designWorker, {
    state: "idle",
    activeRequestId: null,
    ...(batch ? { batch } : {}),
    updatedAt: new Date().toISOString(),
  });
  syncSnapshot();
};

export const refreshDesignToolRuntimeState = async (
  options: { polling?: boolean } = {},
) => {
  if (pendingRefresh) return pendingRefresh;

  pendingRefresh = (async () => {
    designToolRuntimeState.loading = true;
    try {
      const response = await getMyOnlineRuntimeConnectionViews({
        summary: true,
        compact: true,
        polling: options.polling === true,
      });
      replaceConnections(normalizeRows(response));
    } catch {
      if (!designToolRuntimeState.initialized) {
        designToolRuntimeState.initialized = true;
        designToolRuntimeState.onlineCount = 0;
        designToolRuntimeState.runningCount = 0;
        designToolRuntimeState.updatedAt = new Date().toISOString();
      }
    } finally {
      designToolRuntimeState.loading = false;
      pendingRefresh = null;
    }
  })();

  return pendingRefresh;
};

const refreshWhenVisible = () => {
  if (typeof document !== "undefined" && document.hidden) return;
  // 切回标签页 / 获得焦点、WS 重连：走即时档
  void refreshDesignToolRuntimeState();
};

const refreshFallback = () => {
  if (typeof document !== "undefined" && document.hidden) return;
  // 60s 兜底轮询：与其它自动刷新共享窗口
  void refreshDesignToolRuntimeState({ polling: true });
};

const bindRuntimeUpdates = () => {
  if (!eventListenerBound) {
    eventListenerBound = true;
    websocketClient.events.on("runtimeConnectionChanged", handleRuntimeConnectionChanged);
  }

  if (!remoteResultListenerBound) {
    remoteResultListenerBound = true;
    websocketClient.events.on("remote-result", handleRemoteResult);
  }

  if (typeof window !== "undefined" && fallbackTimer === null) {
    fallbackTimer = window.setInterval(refreshFallback, FALLBACK_REFRESH_INTERVAL_MS);
  }

  if (
    !visibilityListenerBound &&
    typeof document !== "undefined" &&
    typeof window !== "undefined"
  ) {
    visibilityListenerBound = true;
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
  }

  if (!websocketStatusWatcherBound) {
    websocketStatusWatcherBound = true;
    watch(
      () => websocketClient.state.status,
      (status) => {
        if (status === "connected") refreshWhenVisible();
      },
    );
  }
};

export const ensureDesignToolRuntimeInitialized = () => {
  bindRuntimeUpdates();
  if (!initializationStarted) {
    initializationStarted = true;
    void refreshDesignToolRuntimeState();
  }
};

export const resolveDesignToolRuntimeTone = (): DesignToolRuntimeTone => {
  if (
    !designToolRuntimeState.initialized ||
    (designToolRuntimeState.loading && !designToolRuntimeState.updatedAt)
  ) {
    return "checking";
  }
  if (designToolRuntimeState.runningCount > 0) return "running";
  if (designToolRuntimeState.onlineCount > 0) return "available";
  return "offline";
};

export const resolveDesignToolRuntimeTooltip = () => {
  if (!designToolRuntimeState.initialized) return "正在读取设计工具状态";
  if (designToolRuntimeState.onlineCount === 0) return "当前没有在线设计工具";
  if (designToolRuntimeState.runningCount > 0) {
    return `${designToolRuntimeState.onlineCount} 个在线，${designToolRuntimeState.runningCount} 个正在制作`;
  }
  return `${designToolRuntimeState.onlineCount} 个在线，当前均为空闲状态`;
};
