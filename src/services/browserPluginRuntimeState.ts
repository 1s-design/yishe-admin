import { reactive } from "vue";
import {
  getMyOnlineRuntimeConnectionViews,
  type WebsocketConnectionVO,
} from "@/api/system/websocket";
import {
  websocketClient,
  type RuntimeConnectionChangedEvent,
} from "@/services/websocketClient";

export type BrowserPluginRuntimeTone = "checking" | "available" | "offline";

interface BrowserPluginRuntimeSnapshot {
  initialized: boolean;
  loading: boolean;
  onlineCount: number;
  updatedAt: string;
}

const PLUGIN_CLIENT_SOURCE = "yishe-extension";
const FALLBACK_REFRESH_INTERVAL_MS = 60_000;

export const browserPluginRuntimeState = reactive<BrowserPluginRuntimeSnapshot>({
  initialized: false,
  loading: false,
  onlineCount: 0,
  updatedAt: "",
});

const connections = new Map<string, WebsocketConnectionVO>();
let initializationStarted = false;
let eventListenerBound = false;
let visibilityListenerBound = false;
let fallbackTimer: number | null = null;
let pendingRefresh: Promise<void> | null = null;

const isPluginConnection = (connection?: WebsocketConnectionVO | null) => {
  const rawSource = connection?.clientSource || connection?.query?.clientSource;
  const source = Array.isArray(rawSource) ? rawSource[0] : rawSource || "";
  return String(source).trim() === PLUGIN_CLIENT_SOURCE;
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
  browserPluginRuntimeState.onlineCount = onlineConnections.length;
  browserPluginRuntimeState.initialized = true;
  browserPluginRuntimeState.updatedAt = new Date().toISOString();
};

const replaceConnections = (rows: WebsocketConnectionVO[]) => {
  connections.clear();
  rows.forEach((connection) => {
    if (connection?.id && connection.isOnline !== false && isPluginConnection(connection)) {
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

  if (!isPluginConnection(connection)) return;
  connections.set(connection.id, connection);
  syncSnapshot();
};

export const refreshBrowserPluginRuntimeState = async () => {
  if (pendingRefresh) return pendingRefresh;

  pendingRefresh = (async () => {
    browserPluginRuntimeState.loading = true;
    try {
      const response = await getMyOnlineRuntimeConnectionViews({
        summary: true,
        compact: true,
      });
      replaceConnections(normalizeRows(response));
    } catch {
      if (!browserPluginRuntimeState.initialized) {
        browserPluginRuntimeState.initialized = true;
        browserPluginRuntimeState.onlineCount = 0;
        browserPluginRuntimeState.updatedAt = new Date().toISOString();
      }
    } finally {
      browserPluginRuntimeState.loading = false;
      pendingRefresh = null;
    }
  })();

  return pendingRefresh;
};

const refreshWhenVisible = () => {
  if (typeof document !== "undefined" && document.hidden) return;
  void refreshBrowserPluginRuntimeState();
};

const bindRuntimeUpdates = () => {
  if (!eventListenerBound) {
    eventListenerBound = true;
    websocketClient.events.on("runtimeConnectionChanged", handleRuntimeConnectionChanged);
  }

  if (typeof window !== "undefined" && fallbackTimer === null) {
    fallbackTimer = window.setInterval(refreshWhenVisible, FALLBACK_REFRESH_INTERVAL_MS);
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
};

export const ensureBrowserPluginRuntimeInitialized = () => {
  bindRuntimeUpdates();
  if (!initializationStarted) {
    initializationStarted = true;
    void refreshBrowserPluginRuntimeState();
  }
};

export const resolveBrowserPluginRuntimeTone = (): BrowserPluginRuntimeTone => {
  if (
    !browserPluginRuntimeState.initialized ||
    (browserPluginRuntimeState.loading && !browserPluginRuntimeState.updatedAt)
  ) {
    return "checking";
  }
  if (browserPluginRuntimeState.onlineCount > 0) return "available";
  return "offline";
};

export const resolveBrowserPluginRuntimeTooltip = () => {
  if (!browserPluginRuntimeState.initialized) return "正在读取浏览器插件状态";
  if (browserPluginRuntimeState.onlineCount === 0) return "当前没有已连接的浏览器插件";
  return `已连接 ${browserPluginRuntimeState.onlineCount} 个浏览器插件`;
};
