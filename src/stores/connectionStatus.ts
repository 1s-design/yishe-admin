import { computed, ref } from "vue";
import {
  websocketClient,
  type ClientConnectionChangedEvent,
  type RuntimeConnectionChangedEvent,
} from "@/services/websocketClient";
import { getAccessToken } from "@/utils/auth";
import { isClientAuthorized as checkClientAuthApi } from "@/api/user";
import {
  getMyClientNodeViews,
  type WebsocketConnectionVO,
} from "@/api/system/websocket";

const CLIENT_SOURCE = "客户端";
const CLIENT_REFRESH_POLL_INTERVAL_MS = 15_000;
const CLIENT_REFRESH_EVENT_BACKFILL_DELAY_MS = 1_000;

export const myClients = ref<WebsocketConnectionVO[]>([]);
export const clientRefreshLoading = ref(false);
export const lastClientRefreshAt = ref<string | null>(null);

export const isLocalConnected = computed(() => myClients.value.some((client) => client.isOnline));

const compareMyClients = (a: WebsocketConnectionVO, b: WebsocketConnectionVO) => {
  if (!!a.isOnline !== !!b.isOnline) {
    return a.isOnline ? -1 : 1;
  }

  const aTime = a.lastOnlineAt || a.lastOfflineAt || a.connectedAt || "";
  const bTime = b.lastOnlineAt || b.lastOfflineAt || b.connectedAt || "";
  if (aTime !== bTime) {
    return aTime > bTime ? -1 : 1;
  }

  return String(a.id || "").localeCompare(String(b.id || ""));
};

const normalizeClientView = (client: WebsocketConnectionVO): WebsocketConnectionVO => {
  const clientSource =
    client.clientSource ||
    (typeof client.query?.clientSource === "string" ? client.query.clientSource : undefined) ||
    (typeof client.clientInfo?.source === "string" ? client.clientInfo.source : undefined) ||
    null;
  const isOnline = client.isOnline === false || client.nodeStatus === "offline" ? false : true;

  return {
    ...client,
    clientSource,
    isOnline,
    nodeStatus: client.nodeStatus || (isOnline ? "online" : "offline"),
  };
};

const resolveConnectionViews = (response: unknown): WebsocketConnectionVO[] => {
  if (Array.isArray(response)) {
    return response;
  }

  if (response && typeof response === "object" && Array.isArray((response as any).data)) {
    return (response as any).data;
  }

  return [];
};

export const setMyClients = (clients: WebsocketConnectionVO[]) => {
  myClients.value = clients.map(normalizeClientView).sort(compareMyClients);
  lastClientRefreshAt.value = new Date().toISOString();
};

export const isRemoteConnected = computed(() => websocketClient.state.status === "connected");

export const isClientAuthorized = ref(false);
export const setClientAuthorized = (val: boolean) => {
  isClientAuthorized.value = val;
};

export const checkClientAuthorized = async () => {
  try {
    const authorized = await checkClientAuthApi();
    setClientAuthorized(authorized);
  } catch {
    setClientAuthorized(false);
  }
};

export const refreshMyClients = async () => {
  if (websocketClient.state.status !== "connected") {
    setMyClients([]);
    return [];
  }

  clientRefreshLoading.value = true;
  try {
    const response = await getMyClientNodeViews({ summary: true });
    const clients = resolveConnectionViews(response);
    setMyClients(clients);
    return clients;
  } catch {
    return myClients.value;
  } finally {
    clientRefreshLoading.value = false;
  }
};

let checkClientConnectionTimer: ReturnType<typeof setInterval> | null = null;
let statusWatcher: ReturnType<typeof setInterval> | null = null;
let refreshByEventTimer: ReturnType<typeof setTimeout> | null = null;
let realtimeListenersBound = false;

const replaceMyClient = (
  clientId: string,
  updater: (previous?: WebsocketConnectionVO) => WebsocketConnectionVO,
) => {
  const index = myClients.value.findIndex((item) => item.id === clientId);
  const next = [...myClients.value];
  const previous = index >= 0 ? next[index] : undefined;
  const resolved = normalizeClientView(updater(previous));

  if (index >= 0) {
    next[index] = resolved;
  } else {
    next.unshift(resolved);
  }

  myClients.value = next.sort(compareMyClients);
  lastClientRefreshAt.value = new Date().toISOString();
};

const scheduleRefreshMyClients = (delay = CLIENT_REFRESH_EVENT_BACKFILL_DELAY_MS) => {
  if (websocketClient.state.status !== "connected") {
    return;
  }

  if (refreshByEventTimer) {
    clearTimeout(refreshByEventTimer);
  }

  refreshByEventTimer = setTimeout(() => {
    refreshByEventTimer = null;
    void refreshMyClients();
  }, delay);
};

const handleClientConnectionChanged = (event: ClientConnectionChangedEvent) => {
  const clientId = String(event.client?.clientId || "").trim();
  if (!clientId) {
    return;
  }

  if (event.action === "removed") {
    const eventClient = event.client as any;
    replaceMyClient(clientId, (previous) => ({
      ...(previous || {
        id: clientId,
        namespace: "/ws",
        clientSource: CLIENT_SOURCE,
        connectedAt: event.client?.connectedAt || null,
      }),
      connectedAt: previous?.connectedAt || event.client?.connectedAt || null,
      lastOnlineAt:
        previous?.lastOnlineAt || event.client?.connectedAt || previous?.connectedAt || null,
      lastOfflineAt: event.reportedAt || previous?.lastOfflineAt || null,
      isOnline: false,
      nodeStatus: "offline",
      clientInfo: {
        ...(previous?.clientInfo || {}),
        appVersion: event.client?.appVersion ?? previous?.clientInfo?.appVersion,
        workspaceDirectory:
          eventClient?.workspaceDirectory ?? previous?.clientInfo?.workspaceDirectory,
        machine: event.client?.machine ?? previous?.clientInfo?.machine,
        location: event.client?.location ?? previous?.clientInfo?.location,
        services: {
          ...(previous?.clientInfo?.services || {}),
          ...(event.client?.services || {}),
        },
        psAutomation: event.client?.psAutomation ?? previous?.clientInfo?.psAutomation,
      },
    }));
    scheduleRefreshMyClients();
    return;
  }

  const eventClient = event.client as any;
  replaceMyClient(clientId, (previous) => ({
    ...(previous || {
      id: clientId,
      namespace: "/ws",
      clientSource: CLIENT_SOURCE,
      connectedAt: event.client?.connectedAt || event.reportedAt || null,
    }),
    connectedAt: event.client?.connectedAt || previous?.connectedAt || null,
    lastOnlineAt: event.client?.connectedAt || event.reportedAt || previous?.lastOnlineAt || null,
    lastOfflineAt: previous?.lastOfflineAt || null,
    isOnline: true,
    nodeStatus: "online",
    clientInfo: {
      ...(previous?.clientInfo || {}),
      appVersion: event.client?.appVersion ?? previous?.clientInfo?.appVersion,
      workspaceDirectory:
        eventClient?.workspaceDirectory ?? previous?.clientInfo?.workspaceDirectory,
      machine: event.client?.machine ?? previous?.clientInfo?.machine,
      location: event.client?.location ?? previous?.clientInfo?.location,
      services: {
        ...(previous?.clientInfo?.services || {}),
        ...(event.client?.services || {}),
      },
      psAutomation: event.client?.psAutomation ?? previous?.clientInfo?.psAutomation,
    },
  }));
  scheduleRefreshMyClients();
};

const handleRuntimeConnectionChanged = (event: RuntimeConnectionChangedEvent) => {
  const connection = event.connection;
  const clientId = String(connection?.id || "").trim();
  const clientSource =
    connection?.clientSource ||
    (typeof connection?.query?.clientSource === "string"
      ? connection.query.clientSource
      : undefined) ||
    (typeof connection?.clientInfo?.source === "string"
      ? connection.clientInfo.source
      : undefined) ||
    "";

  if (!clientId || clientSource !== CLIENT_SOURCE) {
    return;
  }

  replaceMyClient(clientId, (previous) => ({
    ...(previous || {
      id: clientId,
      namespace: connection.namespace || "/ws",
      clientSource: CLIENT_SOURCE,
      connectedAt: connection.connectedAt || event.reportedAt || null,
    }),
    ...connection,
    clientSource: CLIENT_SOURCE,
    isOnline: event.action === "removed" ? false : connection.isOnline,
    nodeStatus:
      event.action === "removed"
        ? "offline"
        : connection.nodeStatus || previous?.nodeStatus || "online",
    lastOnlineAt:
      event.action === "removed"
        ? previous?.lastOnlineAt || connection.lastOnlineAt || connection.connectedAt || null
        : connection.lastOnlineAt ||
          connection.connectedAt ||
          event.reportedAt ||
          previous?.lastOnlineAt ||
          null,
    lastOfflineAt:
      event.action === "removed"
        ? event.reportedAt || connection.lastOfflineAt || previous?.lastOfflineAt || null
        : connection.lastOfflineAt || previous?.lastOfflineAt || null,
    clientInfo: {
      ...(previous?.clientInfo || {}),
      ...(connection.clientInfo || {}),
    },
  }));
  scheduleRefreshMyClients();
};

const bindRealtimeListeners = () => {
  if (realtimeListenersBound) {
    return;
  }

  realtimeListenersBound = true;
  websocketClient.events.on("clientConnectionChanged", handleClientConnectionChanged);
  websocketClient.events.on("runtimeConnectionChanged", handleRuntimeConnectionChanged);
};

const startClientConnectionCheck = () => {
  if (checkClientConnectionTimer) {
    clearInterval(checkClientConnectionTimer);
  }
  void refreshMyClients();
  checkClientConnectionTimer = setInterval(() => {
    // 后台标签页不轮询：连接状态由 websocket 事件驱动，定时器只做兜底
    if (typeof document !== "undefined" && document.hidden) return;
    void refreshMyClients();
  }, CLIENT_REFRESH_POLL_INTERVAL_MS);
};

const stopClientConnectionCheck = (options: { clearClients?: boolean } = {}) => {
  if (checkClientConnectionTimer) {
    clearInterval(checkClientConnectionTimer);
    checkClientConnectionTimer = null;
  }
  if (refreshByEventTimer) {
    clearTimeout(refreshByEventTimer);
    refreshByEventTimer = null;
  }
  if (options.clearClients) {
    setMyClients([]);
  }
};

const watchWebSocketStatus = () => {
  if (statusWatcher) {
    clearInterval(statusWatcher);
  }

  statusWatcher = setInterval(() => {
    const status = websocketClient.state.status;
    if (status === "connected") {
      if (!checkClientConnectionTimer) {
        startClientConnectionCheck();
      }
      return;
    }
    stopClientConnectionCheck({
      clearClients: status === "idle" || status === "disconnected",
    });
  }, 1000);

  if (websocketClient.state.status === "connected") {
    startClientConnectionCheck();
  } else {
    stopClientConnectionCheck({
      clearClients:
        websocketClient.state.status === "idle" || websocketClient.state.status === "disconnected",
    });
  }
};

export const startWebSocketConnection = () => {
  const token = getAccessToken();
  if (!token) {
    return;
  }

  bindRealtimeListeners();

  if (websocketClient.state.status === "idle" || websocketClient.state.status === "disconnected") {
    websocketClient.connect();
  }

  watchWebSocketStatus();
};

export const startConnectionChecks = () => {
  startWebSocketConnection();
  return {
    localTimer: 0,
    remoteTimer: 0,
  };
};

export const clearConnectionChecks = (_timers: { localTimer: number; remoteTimer: number }) => {
  stopClientConnectionCheck({ clearClients: true });
  if (statusWatcher) {
    clearInterval(statusWatcher);
    statusWatcher = null;
  }
};
