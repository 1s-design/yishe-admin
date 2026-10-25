import { reactive } from "vue";
import { getCodeScriptSandboxHealth } from "@/api/codeScript";
import { getImageProcessingHealth } from "@/api/image-processing-record";
import { McpApi } from "@/api/mcp";
import { getVideoTemplateHealth } from "@/api/video-record";
import { getModelServiceHealth } from "@/api/vector-search";

export type ServiceHealthKey = "sandbox" | "videoTemplate" | "images" | "modelService" | "mcp";
export type ServiceHealthTone = "available" | "offline";

export interface ServiceHealthSnapshot {
  key: ServiceHealthKey;
  label: string;
  loading: boolean;
  checked: boolean;
  available: boolean;
  baseUrl: string;
  message: string;
  timestamp: string;
  updatedAt: string;
}

interface ServiceHealthDefinition {
  label: string;
  pollIntervalMs?: number;
  request: () => Promise<any>;
  mapSuccess?: (payload: any) => Partial<ServiceHealthSnapshot>;
  mapError?: (error: any, current: ServiceHealthSnapshot) => Partial<ServiceHealthSnapshot>;
}

const DEFAULT_POLL_INTERVAL_MS = 30_000;

const createDefaultSnapshot = (key: ServiceHealthKey, label: string): ServiceHealthSnapshot => ({
  key,
  label,
  loading: false,
  checked: false,
  available: false,
  baseUrl: "",
  message: "",
  timestamp: "",
  updatedAt: "",
});

const normalizeGenericErrorMessage = (error: any, fallback: string) => {
  const message = String(error?.message || error || "").trim();
  return message || fallback;
};

const normalizeVideoTemplateHealthMessage = (message: string, available: boolean) => {
  const normalized = String(message || "").trim();
  if (!normalized) {
    return available ? "服务健康检查通过" : "服务健康检查未通过";
  }
  return normalized;
};

const normalizeVideoTemplateErrorMessage = (error: any, fallback: string) => {
  const raw = String(error?.message || error || "").trim();
  const lower = raw.toLowerCase();

  if (!raw) return fallback;
  if (lower.includes("connection refused") || lower.includes("econnrefused")) {
    return "服务未启动";
  }
  if (lower.includes("network error")) {
    return "网络异常";
  }
  if (lower.includes("timeout")) {
    return "请求超时";
  }
  if (lower.includes("not found")) {
    return "接口不存在";
  }
  if (lower.includes("remotion") || lower.includes("video-template")) {
    return "Video Template 服务异常";
  }
  return raw;
};

const normalizeImagesHealthMessage = (message: string, available: boolean) => {
  const normalized = String(message || "").trim();
  if (!normalized) {
    return available ? "图片处理能力可执行" : "图片处理当前不可执行";
  }
  return normalized;
};

const normalizeImagesErrorMessage = (error: any, fallback: string) => {
  const raw = String(error?.message || error || "").trim();
  const lower = raw.toLowerCase();

  if (!raw) return fallback;
  if (lower.includes("connection refused") || lower.includes("econnrefused")) {
    return "图片处理客户端未启动";
  }
  if (lower.includes("network error")) {
    return "与图片处理客户端通信异常";
  }
  if (lower.includes("timeout")) {
    return "图片处理状态检测超时";
  }
  if (lower.includes("not found")) {
    return "接口不存在";
  }
  if (
    lower.includes("images") ||
    lower.includes("image-tool") ||
    lower.includes("image processing")
  ) {
    return "图片处理能力异常";
  }
  return raw;
};

const normalizeStandardSuccess = (payload: any) => ({
  available: !!payload?.available,
  baseUrl: String(payload?.baseUrl || ""),
  message: String(payload?.message || ""),
  timestamp: String(payload?.timestamp || ""),
});

// 新服务接入时，优先在这里注册健康检查逻辑；
// 菜单是否显示状态点只需要在对应路由 meta 上声明 serviceStatusKey。
const serviceHealthDefinitions: Record<ServiceHealthKey, ServiceHealthDefinition> = {
  sandbox: {
    label: "沙盒服务",
    request: getCodeScriptSandboxHealth,
    mapSuccess: (payload) => normalizeStandardSuccess(payload),
    mapError: (error) => ({
      available: false,
      message: normalizeGenericErrorMessage(error, "沙盒服务检测失败"),
      timestamp: new Date().toISOString(),
    }),
  },
  videoTemplate: {
    label: "Video Template 服务",
    request: getVideoTemplateHealth,
    mapSuccess: (payload) => {
      const normalized = normalizeStandardSuccess(payload);
      return {
        ...normalized,
        message: normalizeVideoTemplateHealthMessage(
          String(payload?.message || ""),
          !!normalized.available,
        ),
      };
    },
    mapError: (error, current) => ({
      available: false,
      baseUrl: current.baseUrl || "未知地址",
      message: normalizeVideoTemplateErrorMessage(error, "Video Template 服务检测失败"),
      timestamp: new Date().toISOString(),
    }),
  },
  images: {
    label: "图片处理服务",
    request: getImageProcessingHealth,
    mapSuccess: (payload) => {
      const normalized = normalizeStandardSuccess(payload);
      return {
        ...normalized,
        message: normalizeImagesHealthMessage(
          String(payload?.message || ""),
          !!normalized.available,
        ),
      };
    },
    mapError: (error, current) => ({
      available: false,
      baseUrl: current.baseUrl || "未知地址",
      message: normalizeImagesErrorMessage(error, "图片处理服务检测失败"),
      timestamp: new Date().toISOString(),
    }),
  },
  modelService: {
    label: "模型服务",
    request: getModelServiceHealth,
    mapSuccess: (payload) => ({
      available: !!payload?.available,
      baseUrl: String(payload?.baseUrl || ""),
      message: String(payload?.message || ""),
      timestamp: String(payload?.timestamp || ""),
    }),
    mapError: (error) => ({
      available: false,
      message: normalizeGenericErrorMessage(error, "模型服务检测失败"),
      timestamp: new Date().toISOString(),
    }),
  },
  mcp: {
    label: "MCP 管理服务",
    pollIntervalMs: 60_000,
    request: McpApi.getSessions,
    mapSuccess: (payload) => ({
      available: payload?.success === true,
      baseUrl: "/system/mcp",
      message: payload?.success === true ? "MCP 管理服务可用" : "MCP 管理服务不可用",
      timestamp: new Date().toISOString(),
    }),
    mapError: (error) => ({
      available: false,
      baseUrl: "/system/mcp",
      message: normalizeGenericErrorMessage(error, "MCP 管理服务检测失败"),
      timestamp: new Date().toISOString(),
    }),
  },
};

export const serviceHealthStates = reactive<Record<ServiceHealthKey, ServiceHealthSnapshot>>({
  sandbox: createDefaultSnapshot("sandbox", serviceHealthDefinitions.sandbox.label),
  videoTemplate: createDefaultSnapshot(
    "videoTemplate",
    serviceHealthDefinitions.videoTemplate.label,
  ),
  images: createDefaultSnapshot("images", serviceHealthDefinitions.images.label),
  modelService: createDefaultSnapshot("modelService", serviceHealthDefinitions.modelService.label),
  mcp: createDefaultSnapshot("mcp", serviceHealthDefinitions.mcp.label),
});

const initializedKeys = new Set<ServiceHealthKey>();
const pollingTimers = new Map<ServiceHealthKey, number>();
const inflightRequests = new Map<ServiceHealthKey, Promise<ServiceHealthSnapshot>>();

const serviceHealthKeySet = new Set<ServiceHealthKey>(
  Object.keys(serviceHealthDefinitions) as ServiceHealthKey[],
);

const assignSnapshot = (target: ServiceHealthSnapshot, payload: Partial<ServiceHealthSnapshot>) => {
  if (typeof payload.available === "boolean") {
    target.available = payload.available;
  }
  if (typeof payload.baseUrl === "string") {
    target.baseUrl = payload.baseUrl;
  }
  if (typeof payload.message === "string") {
    target.message = payload.message;
  }
  if (typeof payload.timestamp === "string") {
    target.timestamp = payload.timestamp;
  }
  if (typeof payload.checked === "boolean") {
    target.checked = payload.checked;
  }
};

const startServiceHealthPolling = (key: ServiceHealthKey) => {
  if (typeof window === "undefined" || pollingTimers.has(key)) {
    return;
  }

  const interval = serviceHealthDefinitions[key].pollIntervalMs || DEFAULT_POLL_INTERVAL_MS;
  const timer = window.setInterval(() => {
    void refreshServiceHealth(key, { silent: true });
  }, interval);
  pollingTimers.set(key, timer);
};

export const refreshServiceHealth = async (
  key: ServiceHealthKey,
  options: { silent?: boolean } = {},
) => {
  const existingRequest = inflightRequests.get(key);
  if (existingRequest) {
    return existingRequest;
  }

  const snapshot = serviceHealthStates[key];
  const definition = serviceHealthDefinitions[key];

  if (!options.silent) {
    snapshot.loading = true;
  }

  const request = (async () => {
    try {
      const payload = await definition.request();
      assignSnapshot(snapshot, {
        checked: true,
        ...(definition.mapSuccess
          ? definition.mapSuccess(payload)
          : normalizeStandardSuccess(payload)),
      });
    } catch (error) {
      assignSnapshot(snapshot, {
        checked: true,
        available: false,
        ...(definition.mapError
          ? definition.mapError(error, snapshot)
          : {
              message: normalizeGenericErrorMessage(error, `${snapshot.label}检测失败`),
              timestamp: new Date().toISOString(),
            }),
      });
    } finally {
      snapshot.loading = false;
      snapshot.updatedAt = new Date().toISOString();
      inflightRequests.delete(key);
    }

    return snapshot;
  })();

  inflightRequests.set(key, request);
  return request;
};

export const ensureServiceHealthInitialized = (key: ServiceHealthKey) => {
  if (initializedKeys.has(key)) {
    return;
  }

  initializedKeys.add(key);
  void refreshServiceHealth(key);
  startServiceHealthPolling(key);
};

export const isServiceHealthKey = (value: unknown): value is ServiceHealthKey => {
  return typeof value === "string" && serviceHealthKeySet.has(value as ServiceHealthKey);
};

export const useServiceHealthState = (key: ServiceHealthKey) => {
  ensureServiceHealthInitialized(key);
  return serviceHealthStates[key];
};

export const resolveServiceHealthTone = (snapshot: ServiceHealthSnapshot): ServiceHealthTone => {
  if (snapshot.available) {
    return "available";
  }
  return "offline";
};

export const resolveServiceHealthText = (snapshot: ServiceHealthSnapshot) => {
  if (snapshot.loading && !snapshot.checked) {
    return "检测中";
  }
  if (!snapshot.checked) {
    return "未检测";
  }
  return snapshot.available ? "可用" : "不可用";
};

export const resolveServiceHealthTooltip = (snapshot: ServiceHealthSnapshot) => {
  if (snapshot.loading && !snapshot.checked) {
    return `${snapshot.label}检测中`;
  }

  const message = String(snapshot.message || "").trim();
  const baseUrl = String(snapshot.baseUrl || "").trim();

  if (message && baseUrl) {
    return `${message} | ${baseUrl}`;
  }
  if (message) {
    return message;
  }
  if (baseUrl) {
    return baseUrl;
  }
  if (snapshot.checked) {
    return `${snapshot.label}${snapshot.available ? "可用" : "不可用"}`;
  }
  return "等待检测";
};

export const resolveServiceHealthMenuTooltip = (snapshot: ServiceHealthSnapshot) => {
  if (snapshot.loading && !snapshot.checked) {
    return "检测中";
  }
  return snapshot.available ? "可用" : "不可用";
};
