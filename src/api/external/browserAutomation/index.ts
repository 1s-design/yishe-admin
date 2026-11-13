import request from "@/config/axios";

export interface BrowserAutomationServiceStatus {
  key?: string;
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
  supportedCommands?: string[];
  supportedTaskTypes?: string[];
  autoDispatchEnabled?: boolean;
  details?: Record<string, any>;
}

export interface BrowserAutomationProfileSummary {
  id: string;
  name: string;
  remark?: string;
  account?: string;
  platforms?: string[];
  debugPort?: number | null;
  browserVersion?: string;
  loginSummary?: Record<string, any>;
  /** 采集系统托管环境：true 表示已标记保护、不可删除 */
  protected?: boolean;
  nonDeletable?: boolean;
  managedBy?: string;
  kind?: "collect-shared" | "collect-legacy" | string;
  protectedReason?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastUsedAt?: string | null;
  userDataDir?: string;
  exists?: boolean;
  isActive?: boolean;
}

export interface BrowserAutomationProfileInstanceSummary {
  profileId: string;
  profileName?: string;
  port?: number | null;
  connected?: boolean;
  available?: boolean;
  busy?: boolean;
  currentTaskId?: string | null;
  taskType?: string | null;
  currentStep?: string | null;
  pageCount?: number;
  lastActivity?: string | null;
  lastError?: string | null;
  browserVersion?: string;
  headless?: boolean | null;
  hasInstance?: boolean;
  connecting?: boolean;
  userDataDir?: string | null;
  pages?: Array<Record<string, any>>;
  isActiveProfile?: boolean;
}

export interface BrowserAutomationClientVO {
  clientId: string;
  isOnline?: boolean;
  nodeStatus?: string | null;
  connectedAt?: string | null;
  lastOnlineAt?: string | null;
  lastOfflineAt?: string | null;
  appVersion?: string | null;
  workspaceDirectory?: string | null;
  machine?: {
    code?: string;
    platform?: string;
    createdAt?: string;
  } | null;
  location?: {
    ip?: string;
    city?: string;
    region?: string;
    country?: string;
    org?: string;
    fetchedAt?: string;
    source?: string;
  } | null;
  uploader?: BrowserAutomationServiceStatus | null;
}

export interface BrowserAutomationCapabilityItem {
  taskType: string;
  label: string;
}

export interface BrowserAutomationCapabilityClient {
  clientId: string;
  isOnline: boolean;
  available: boolean;
  connected: boolean;
  busy: boolean;
  autoDispatchEnabled: boolean;
  machineCode?: string | null;
  location?: string | null;
  reportedTaskTypes: string[];
  capabilities: BrowserAutomationCapabilityItem[];
}

export interface BrowserAutomationCapabilityTaskType {
  taskType: string;
  label: string;
  declared: boolean;
  onlineClientIds: string[];
  availableClientIds: string[];
  autoDispatchClientIds: string[];
}

export interface BrowserAutomationCapabilityCatalogResponse {
  success: boolean;
  data: {
    declaredCapabilities: BrowserAutomationCapabilityItem[];
    clients: BrowserAutomationCapabilityClient[];
    taskTypes: BrowserAutomationCapabilityTaskType[];
  };
}

export interface BrowserAutomationCommandResponse {
  success: boolean;
  message: string;
  data?: {
    commandId?: string;
    clientId?: string;
    service?: string;
    action?: string;
    payload?: Record<string, any>;
    createdAt?: string;
  };
}

export interface BrowserAutomationSnapshotResponse {
  success: boolean;
  data: BrowserAutomationClientVO;
}

export interface BrowserAutomationProfilesPayload {
  activeProfileId?: string | null;
  workspaceDir?: string;
  profilesRootDir?: string;
  items: BrowserAutomationProfileSummary[];
}

export interface BrowserAutomationSmallFeatureFieldOption {
  label?: string;
  value?: string | number | boolean;
}

export interface BrowserAutomationSmallFeatureFieldSchema {
  key: string;
  label: string;
  type?: string;
  component?: string;
  inputType?: string;
  rows?: number;
  switchLabel?: string;
  required?: boolean;
  requiredWhen?: Record<string, string | number | boolean>;
  placeholder?: string;
  description?: string;
  defaultValue?: unknown;
  options?: BrowserAutomationSmallFeatureFieldOption[];
  visibleWhen?: Record<string, string | number | boolean>;
}

export interface BrowserAutomationSmallFeatureItem {
  key: string;
  name: string;
  platform?: string;
  category?: string;
  description?: string;
  tips?: string[];
  fields?: BrowserAutomationSmallFeatureFieldSchema[];
}

export const getBrowserAutomationClients = () => {
  return request.get<BrowserAutomationClientVO[]>({ url: "/external/browser-automation/clients" });
};

export const getBrowserAutomationCapabilities = () => {
  return request.get<BrowserAutomationCapabilityCatalogResponse>({
    url: "/external/browser-automation/capabilities",
  });
};

export const getBrowserAutomationStatus = (clientId: string) => {
  return request.get<BrowserAutomationSnapshotResponse>({
    url: `/external/browser-automation/${clientId}/status`,
  });
};

export const checkBrowserAutomationStatus = (clientId: string) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/check-status`,
  });
};

export const connectBrowserAutomation = (
  clientId: string,
  data?: {
    port?: number;
    headless?: boolean;
    profileId?: string;
    windowWidth?: number;
    windowHeight?: number;
  },
) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/connect`,
    data,
  });
};

export const closeBrowserAutomation = (clientId: string) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/close`,
    data: {},
  });
};

export const closeBrowserAutomationProfile = (
  clientId: string,
  profileId?: string,
) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/close`,
    data: String(profileId || "").trim()
      ? { profileId: String(profileId || "").trim() }
      : {},
  });
};

export const focusBrowserAutomationProfile = (
  clientId: string,
  profileId?: string,
) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/focus`,
    data: String(profileId || "").trim()
      ? { profileId: String(profileId || "").trim() }
      : {},
  });
};

export const forceCloseBrowserAutomation = (clientId: string, data?: { port?: number }) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/force-close`,
    data,
  });
};

export const fetchBrowserAutomationPages = (clientId: string, profileId?: string) => {
  return request.get<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/pages`,
    params: String(profileId || "").trim()
      ? { profileId: String(profileId || "").trim() }
      : undefined,
  });
};

export const executeBrowserAutomationDebug = (clientId: string, data: Record<string, any>) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/debug`,
    data,
  });
};

export const openBrowserAutomationPlatform = (
  clientId: string,
  data: { platform: string; profileId?: string },
) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/open-platform`,
    data,
  });
};

export const openBrowserAutomationLink = (
  clientId: string,
  data: { url: string; profileId?: string },
) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/open-link`,
    data,
  });
};

export const queryBrowserAutomationTasks = (clientId: string, data?: Record<string, any>) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/tasks/query`,
    data,
  });
};

export const getBrowserAutomationTaskDetail = (clientId: string, taskId: string) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/tasks/${encodeURIComponent(taskId)}/detail`,
  });
};

export const getBrowserAutomationTaskLogs = (clientId: string, taskId: string) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/tasks/${encodeURIComponent(taskId)}/logs`,
  });
};

export const getBrowserAutomationPlatforms = (clientId: string) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/platforms`,
  });
};

export const getBrowserAutomationLoginStatus = (clientId: string, data?: { refresh?: boolean }) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/login-status`,
    data,
  });
};

export const getBrowserAutomationSmallFeatures = (clientId: string) => {
  return request.get<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/small-features`,
  });
};

export const runBrowserAutomationSmallFeature = (
  clientId: string,
  data: Record<string, any>,
) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/small-features/run`,
    data,
  });
};

export const getBrowserAutomationProfiles = (clientId: string) => {
  return request.get<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/profiles`,
  });
};

export const getBrowserAutomationProfileDetail = (
  clientId: string,
  profileId: string,
) => {
  return request.get<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/profiles/${encodeURIComponent(profileId)}`,
  });
};

export const createBrowserAutomationProfile = (
  clientId: string,
  data: Record<string, any>,
) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/profiles`,
    data,
  });
};

export const updateBrowserAutomationProfile = (
  clientId: string,
  profileId: string,
  data: Record<string, any>,
) => {
  return request.put<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/profiles/${encodeURIComponent(profileId)}`,
    data,
  });
};

export const deleteBrowserAutomationProfile = (
  clientId: string,
  profileId: string,
) => {
  return request.delete<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/profiles/${encodeURIComponent(profileId)}`,
  });
};

export const switchBrowserAutomationProfile = (
  clientId: string,
  profileId: string,
) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/profiles/${encodeURIComponent(profileId)}/switch`,
  });
};

export const publishByBrowserAutomation = (clientId: string, data: Record<string, any>) => {
  return request.post<BrowserAutomationCommandResponse>({
    url: `/external/browser-automation/${clientId}/publish`,
    data,
  });
};
