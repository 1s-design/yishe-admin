import request from "@/config/axios";

const MY_CONNECTION_VIEW_REFRESH_INTERVAL_MS = 3_000;

interface ConnectionViewRequestOptions {
  force?: boolean;
  summary?: boolean;
  compact?: boolean;
}

function cloneConnectionViewResponse<T>(payload: T): T {
  if (Array.isArray(payload)) {
    return [...payload] as T;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, any>;
    if (Array.isArray(record.data)) {
      return {
        ...record,
        data: [...record.data],
      } as T;
    }
  }

  return payload;
}

function createDedupedPostRequest<T>(
  requester: (options: ConnectionViewRequestOptions) => Promise<T>,
  intervalMs: number,
) {
  const stateMap = new Map<
    string,
    {
      lastResolvedAt: number;
      lastResolvedValue: T | null;
      inFlightRequest: Promise<T> | null;
    }
  >();

  return async (options: ConnectionViewRequestOptions = {}): Promise<T> => {
    const forceRefresh = options.force === true;
    const cacheKey = options.summary === true ? "summary" : "full";
    const now = Date.now();
    const state =
      stateMap.get(cacheKey) ||
      ({
        lastResolvedAt: 0,
        lastResolvedValue: null,
        inFlightRequest: null,
      } as {
        lastResolvedAt: number;
        lastResolvedValue: T | null;
        inFlightRequest: Promise<T> | null;
      });
    stateMap.set(cacheKey, state);

    if (!forceRefresh && state.inFlightRequest) {
      return state.inFlightRequest;
    }

    if (
      !forceRefresh &&
      state.lastResolvedValue !== null &&
      now - state.lastResolvedAt < intervalMs
    ) {
      return cloneConnectionViewResponse(state.lastResolvedValue);
    }

    state.inFlightRequest = requester(options)
      .then((response) => {
        state.lastResolvedValue = response;
        state.lastResolvedAt = Date.now();
        return cloneConnectionViewResponse(response);
      })
      .finally(() => {
        state.inFlightRequest = null;
      });

    return state.inFlightRequest;
  };
}

export interface TokenUserInfo {
  id?: number | string;
  account?: string;
  name?: string;
  nickname?: string;
  email?: string;
  phone?: string;
  companyId?: string | number | null;
  company?: {
    id?: string | number;
    name?: string;
  } | null;
}

export interface WebsocketClientInfo {
  clientId?: string;
  machineCode?: string;
  source?: string;
  launch?: {
    source?: string;
    clientId?: string;
    profileId?: string;
    profileName?: string;
    machineCode?: string;
    workspaceId?: string;
    launchedAt?: string;
  };
  designWorker?: {
    workerId?: string;
    workspaceId?: string;
    capacity?: number;
    activeRequestId?: string | null;
    state?: "idle" | "busy" | "cancelling" | string;
    batch?: Record<string, any> | null;
    updatedAt?: string;
  };
  workspaceDirectory?: string;
  app?: {
    name?: string;
    version?: string;
    mode?: string;
  };
  appVersion?: string;
  machine?: {
    code?: string;
    platform?: string;
    createdAt?: string;
  };
  screen?: {
    width?: number;
    height?: number;
    availWidth?: number;
    availHeight?: number;
    pixelRatio?: number;
    colorDepth?: number;
  };
  page?: {
    title?: string;
    href?: string;
    origin?: string;
    path?: string;
    visibilityState?: string;
  };
  services?: Record<
    string,
    {
      key?: string;
      pluginKey?: string;
      label?: string;
      connected?: boolean;
      available?: boolean;
      status?: "connected" | "disconnected" | "error" | "unknown";
      state?: "idle" | "busy" | "offline" | "error";
      busy?: boolean;
      message?: string;
      version?: string;
      endpoint?: string;
      lastCheckedAt?: string;
      currentTaskId?: string | null;
      lastError?: string | null;
      debugAvailable?: boolean;
      supportedCommands?: string[];
      supportedTaskTypes?: string[];
      autoDispatchEnabled?: boolean;
      details?: Record<string, any>;
    }
  >;
  timestamp?: string;
  extension?: {
    name?: string;
    version?: string;
    manifestVersion?: number;
  };
  browser?: {
    name?: string;
    version?: string;
  };
  os?: {
    name?: string;
    version?: string;
  };
  platform?: {
    os?: string;
    arch?: string;
    nacl_arch?: string;
  };
  language?: string;
  uiLanguage?: string;
  timeZone?: string;
  userAgent?: string;
  device?: {
    memory?: number;
    hardwareConcurrency?: number;
    model?: string;
    touchPoints?: number;
  };
  location?: {
    ip?: string;
    city?: string;
    region?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    org?: string;
    timeZone?: string;
    fetchedAt?: string;
    source?: string;
  };
  user?: TokenUserInfo | null;
  psAutomation?: {
    enabled?: boolean;
    autoDispatchEnabled?: boolean;
    running?: boolean;
    queueCount?: number;
    currentPsSetId?: string | null;
    currentPsSetName?: string | null;
    currentStep?: string | null;
    progress?: number | null;
    dispatchToken?: string | null;
    lastError?: string | null;
    lastHeartbeatAt?: string | null;
    updatedAt?: string | null;
    memory?: PsMemorySnapshot | null;
  };
}

export interface PsMemorySnapshot {
  available?: boolean | null;
  psCommitGb?: number | null;
  systemCommit?: {
    used_gb?: number | null;
    limit_gb?: number | null;
    free_gb?: number | null;
    pct?: number | null;
  } | null;
  watchdogEnabled?: boolean | null;
  capturedAt?: string | null;
}

export interface WebsocketConnectionVO {
  id: string;
  namespace: string;
  connectedAt: string | null;
  ip?: string;
  userAgent?: string;
  query?: Record<string, string | string[]>;
  clientInfo?: WebsocketClientInfo;
  clientSource?: string;
  // 可选的用户信息，由服务端在解析 token 后附加
  userId?: string | number;
  username?: string;
  nickname?: string;
  email?: string;
  tokenUser?: TokenUserInfo | null;
  isOnline?: boolean;
  lastOnlineAt?: string | null;
  lastOfflineAt?: string | null;
  nodeStatus?: string | null;
}

export const getWebsocketConnections = () => {
  return request.post<WebsocketConnectionVO[]>({ url: "/websocket/connections" });
};

export const getMyWebsocketConnections = () => {
  return request.post<WebsocketConnectionVO[]>({ url: "/websocket/my-connections" });
};

export const getWebsocketConnectionViews = () => {
  return request.post<WebsocketConnectionVO[]>({ url: "/websocket/connections-view" });
};

export const getRuntimeWebsocketConnectionViews = () => {
  return request.post<WebsocketConnectionVO[]>({ url: "/websocket/runtime-connections-view" });
};

const fetchMyWebsocketConnectionViews = createDedupedPostRequest(
  (options) =>
    request.post<WebsocketConnectionVO[]>({
      url: "/websocket/my-client-node-views",
      data: {
        summary: options.summary !== false,
        compact: options.compact !== false,
      },
    }),
  MY_CONNECTION_VIEW_REFRESH_INTERVAL_MS,
);

export const getMyClientNodeViews = (options?: ConnectionViewRequestOptions) => {
  return fetchMyWebsocketConnectionViews(options);
};

export const getMyOnlineRuntimeConnectionViews = (
  options: ConnectionViewRequestOptions = { summary: true, compact: true },
) => {
  return request.post<WebsocketConnectionVO[]>({
    url: "/websocket/my-online-runtime-connection-views",
    data: {
      summary: options.summary !== false,
      compact: options.compact !== false,
    },
  });
};

export const sendMessageToConnection = (connectionId: string, data: any, event?: string) => {
  return request.post({ url: "/websocket/send-message", data: { id: connectionId, event, data } });
};

export const disconnectWebsocketConnection = (clientId: string) => {
  return request.post<{ success: boolean; message: string; data?: { clientId: string } }>({
    url: `/websocket/disconnect/${clientId}`,
  });
};

export const removeWebsocketClientNode = (clientId: string) => {
  return request.post<{ success: boolean; message: string; data?: { clientId: string } }>({
    url: `/websocket/node/cleanup/${clientId}`,
  });
};

export interface ServiceCommandDTO {
  clientId?: string;
  service?: string;
  pluginKey?: string;
  action?: string;
  target?: {
    clientId?: string;
    pluginKey?: string;
  };
  command?: {
    name?: string;
    payload?: any;
  };
  mode?: "production" | "debug" | "maintenance";
  payload?: any;
}

export interface DispatchPublishTaskDTO {
  clientId?: string;
  profileId?: string;
}

export const sendServiceCommand = (data: ServiceCommandDTO) => {
  return request.post<{ success: boolean; message: string; data?: any }>({
    url: "/websocket/service-command",
    data,
  });
};

export interface OpenDesignToolDTO {
  clientId: string;
  token: string;
  profileId: string;
  profileName?: string;
  machineCode?: string;
  toolUrl?: string;
  prompt?: string;
  workspaceId?: string;
}

const createDesignWorkspaceId = () => {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `workspace-${random}`;
};

export const openDesignToolOnClient = (data: OpenDesignToolDTO) => {
  const url = new URL(data.toolUrl || window.location.origin);
  url.searchParams.set("token", String(data.token || "").replace(/^Bearer\s+/i, "").trim());
  url.searchParams.set("embed", "admin-launch");
  url.searchParams.set("launchSource", "admin-design-tool");
  url.searchParams.set("launchClientId", data.clientId);
  url.searchParams.set("launchProfileId", data.profileId);
  url.searchParams.set("workspaceId", data.workspaceId || createDesignWorkspaceId());
  if (data.profileName) url.searchParams.set("launchProfileName", data.profileName);
  if (data.machineCode) url.searchParams.set("launchMachineCode", data.machineCode);
  if (data.prompt) url.searchParams.set("prompt", data.prompt);

  return request.post<{ success: boolean; message: string; data?: { commandId?: string } }>({
    url: `/external/browser-automation/${encodeURIComponent(data.clientId)}/open-link`,
    data: {
      url: url.toString(),
      profileId: data.profileId,
    },
  });
};

export interface ClientLogQueryDTO {
  clientId: string;
  action?: "list" | "tail" | "search" | "delete";
  file?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  module?: string;
  level?: string;
  lines?: number;
  page?: number;
  pageSize?: number;
}

export const queryClientLog = (data: ClientLogQueryDTO) => {
  return request.post<{ success: boolean; message: string; data?: any; commandId?: string }>({
    url: "/websocket/client-log/query",
    data,
  });
};

// 定时任务相关接口
export interface ScheduledTask {
  clientId: string;
  type: "cron" | "interval";
  schedule: string;
  params: any;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SetTaskDTO {
  clientId: string;
  type: "cron" | "interval";
  schedule: string;
  params: any;
  command?: string;
}

export interface ToggleTaskDTO {
  clientId: string;
  enabled: boolean;
  command?: string;
}

// 设置定时任务
export const setScheduleTask = (data: SetTaskDTO) => {
  return request.post({ url: "/websocket/schedule/set", data });
};

// 获取指定客户端的定时任务
export const getScheduleTask = (clientId: string, command?: string) => {
  return request.post<{ success: boolean; data: ScheduledTask | null }>({
    url: "/websocket/schedule/get",
    data: {
      clientId,
      ...(command ? { command } : {}),
    },
  });
};

// 获取所有定时任务
export const getAllScheduleTasks = () => {
  return request.post<{ success: boolean; data: ScheduledTask[] }>({
    url: "/websocket/schedule/list",
  });
};

// 删除定时任务
export const removeScheduleTask = (clientId: string, command?: string) => {
  return request.post<{ success: boolean; message: string }>({
    url: "/websocket/schedule/remove",
    data: {
      clientId,
      ...(command ? { command } : {}),
    },
  });
};

// 启用/禁用定时任务
export const toggleScheduleTask = (data: ToggleTaskDTO) => {
  return request.post<{ success: boolean; message: string }>({
    url: "/websocket/schedule/toggle",
    data,
  });
};

export const getUserInfoByToken = (token: string) => {
  return request.post<{ success: boolean; data: TokenUserInfo | null; message?: string }>({
    url: "/websocket/token-user",
    data: { token },
  });
};

export interface PsAutomationStatusVO {
  clientId: string;
  machineCode?: string | null;
  connectedAt?: string;
  isOnline?: boolean;
  psAutomation?: WebsocketClientInfo["psAutomation"] | null;
}

export const getMyPsAutomationStatus = () => {
  return request.get<PsAutomationStatusVO[]>({ url: "/websocket/ps-automation/status" });
};

export const enablePsAutomation = (clientId: string) => {
  return request.post<{ success: boolean; message: string; data?: any }>({
    url: `/websocket/ps-automation/${clientId}/enable`,
  });
};

export const disablePsAutomation = (clientId: string) => {
  return request.post<{ success: boolean; message: string; data?: any }>({
    url: `/websocket/ps-automation/${clientId}/disable`,
  });
};

export const togglePsAutomation = (clientId: string, enabled?: boolean) => {
  return request.post<{ success: boolean; message: string; data?: any }>({
    url: `/websocket/ps-automation/${clientId}/toggle`,
    data: typeof enabled === "boolean" ? { enabled } : undefined,
  });
};

export const togglePsAutomationAutoDispatch = (clientId: string, enabled: boolean) => {
  return request.post<{ success: boolean; message: string; data?: any }>({
    url: `/websocket/ps-automation/${clientId}/auto-dispatch`,
    data: { enabled },
  });
};

export const resetPsAutomationRuntime = (clientId: string) => {
  return request.post<{ success: boolean; message: string; data?: any }>({
    url: `/websocket/ps-automation/${clientId}/reset-runtime`,
  });
};

export const resetAllPsAutomationRuntime = () => {
  return request.post<{ success: boolean; message: string; data?: any }>({
    url: "/websocket/ps-automation/reset-runtime",
    timeout: 15000,
  });
};

export const triggerPsdSetAutoDispatch = () => {
  return request.post<{
    success: boolean;
    dispatched: boolean;
    reason?: string;
    message?: string;
    data?: any;
  }>({
    url: "/websocket/psd-set/auto-dispatch/trigger",
  });
};

export interface AutoDispatchSchedulerRuntime {
  online: boolean;
  timerActive: boolean;
  running: boolean;
  cycleInFlight?: boolean;
  cycleElapsedMs?: number;
  dispatchIntervalMs: number;
  timeoutMs: number;
  cycleTimeoutMs?: number;
  staleCycleReleaseMs?: number;
  currentCycleStage?: string | null;
  currentCycleStageStartedAt?: string | null;
  lastCycleStartedAt?: string | null;
  lastCycleFinishedAt?: string | null;
  lastHeartbeatAt?: string | null;
  lastError?: string | null;
  lastDispatchAt?: string | null;
  lastDispatchUserId?: string | null;
  lastDispatchReason?: string | null;
  lastDispatchMessage?: string | null;
  lastDispatchSuccess?: boolean | null;
  lastDispatchDispatched?: boolean | null;
  timeoutScanIntervalMs?: number;
  lastTimeoutScanAt?: string | null;
  dbCooldownUntil?: string | null;
  dbCooldownRemainingMs?: number;
  schedulerCooldownUntil?: string | null;
  schedulerCooldownRemainingMs?: number;
  lastCooldownReason?: 'db' | 'timeout' | null;
}

export const getPsdSetAutoDispatchRuntime = () => {
  return request.get<AutoDispatchSchedulerRuntime>({
    url: "/websocket/psd-set/auto-dispatch/runtime",
  });
};

export const startPublishTaskDispatch = (taskId: string, data?: DispatchPublishTaskDTO) => {
  return request.post<{ success: boolean; message: string; data?: any }>({
    url: `/websocket/publish-tasks/${taskId}/start`,
    data,
  });
};

export const stopPublishTaskDispatch = (taskId: string, data?: { reason?: string }) => {
  return request.post<{ success: boolean; message: string; data?: any }>({
    url: `/websocket/publish-tasks/${taskId}/stop`,
    data,
  });
};

export const resetPublishTaskDispatch = (taskId: string, data?: { reason?: string }) => {
  return request.post<{ success: boolean; message: string; data?: any }>({
    url: `/websocket/publish-tasks/${taskId}/reset`,
    data,
  });
};

export const triggerPublishTaskAutoDispatch = () => {
  return request.post<{
    success: boolean;
    dispatched: boolean;
    reason?: string;
    message?: string;
    data?: any;
  }>({
    url: "/websocket/publish-tasks/auto-dispatch/trigger",
  });
};

export const getPublishTaskAutoDispatchRuntime = () => {
  return request.get<AutoDispatchSchedulerRuntime>({
    url: "/websocket/publish-tasks/auto-dispatch/runtime",
  });
};

export const toggleBrowserAutomationAutoDispatch = (clientId: string, enabled: boolean) => {
  return request.post<{ success: boolean; message: string; data?: any }>({
    url: `/websocket/browser-automation/${clientId}/auto-dispatch`,
    data: { enabled },
  });
};

export interface SendGlobalNotificationDTO {
  title: string;
  message: string;
  level?: "info" | "success" | "warning" | "error";
  category?: "system" | "task" | "sync" | "client" | "queue" | "message" | "custom";
  source?: string;
  sticky?: boolean;
  durationMs?: number | null;
  progress?: number | null;
  status?: "pending" | "running" | "success" | "warning" | "error" | "done";
  metadata?: Record<string, any>;
}

export const sendGlobalNotification = (data: SendGlobalNotificationDTO) => {
  return request.post<{ success: boolean; message: string; data?: any }>({
    url: "/websocket/notifications/send",
    data,
  });
};
