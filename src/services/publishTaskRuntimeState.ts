import { computed, readonly, ref } from "vue";
import {
  getPublishTaskCapabilityCatalog,
  getPublishTaskRuntimeSummary,
  type PublishTaskRuntimeSummary,
  type PublishTaskRuntimeSummaryItem,
} from "@/api/system/queue";
import { loadPublishTaskAutoDispatchSetting } from "@/services/publishTaskAutoDispatch";
import { useClientNodeStore } from "@/store/modules/clientNode";
import { websocketClient, type PublishTaskRuntimeEvent } from "@/services/websocketClient";

type MenuStatusTone = "available" | "offline";

interface NormalizedPublishTaskRuntimeItem extends PublishTaskRuntimeSummaryItem {
  id: string;
  taskType: string;
  label: string | null;
  status: string | null;
  dispatchStatus: string | null;
  currentStep: string | null;
  lastError: string | null;
  assignedClientId: string | null;
  assignedMachineCode: string | null;
  profileId: string | null;
  updatedAt: string | null;
}

type RealtimePublishTaskRuntimeItem = NormalizedPublishTaskRuntimeItem & {
  runtimeExpiresAt: number;
};

const ACTIVE_PUBLISH_TASK_POLLING_MS = 30000;
const PUBLISH_TASK_RUNTIME_EVENT_REFRESH_DELAY_MS = 8000;
const REALTIME_PUBLISH_TASK_TTL_MS = 45 * 1000;

const createDefaultSummary = (): PublishTaskRuntimeSummary => ({
  typePrefix: "publish-product-",
  pending: 0,
  waiting: 0,
  processing: 0,
  delayed: 0,
  completed: 0,
  failed: 0,
  total: 0,
  active: 0,
  items: [],
  fetchedAt: null,
});

const summary = ref<PublishTaskRuntimeSummary>(createDefaultSummary());
const loading = ref(false);
const hasServerDirectExecutableTypes = ref(false);
const autoSchedulingEnabled = ref(false);
const autoSchedulingSettingLoaded = ref(false);
const serverActiveTasks = ref<NormalizedPublishTaskRuntimeItem[]>([]);
const realtimeActiveTaskMap = ref<Record<string, RealtimePublishTaskRuntimeItem>>({});
const activeTasks = ref<NormalizedPublishTaskRuntimeItem[]>([]);

let initialized = false;
let summaryRefreshPromise: Promise<void> | null = null;
let activeSummaryPollingTimer: ReturnType<typeof setInterval> | null = null;
let activeSummaryRefreshTimer: ReturnType<typeof setTimeout> | null = null;

const normalizeTaskId = (value: unknown) => String(value || "").trim();

const isRunningRuntimeStatus = (status?: string | null) =>
  ["assigned", "running", "processing"].includes(
    String(status || "")
      .trim()
      .toLowerCase(),
  );

const isRunningRuntimeItem = (item?: NormalizedPublishTaskRuntimeItem | null) =>
  !!item &&
  (isRunningRuntimeStatus(item.status) || isRunningRuntimeStatus(item.dispatchStatus));

const normalizeRuntimeItem = (item: any): NormalizedPublishTaskRuntimeItem | null => {
  const id = normalizeTaskId(item?.id);
  const taskType = String(item?.taskType || "").trim();
  if (!id || !taskType) {
    return null;
  }

  return {
    id,
    taskType,
    label: String(item?.label || "").trim() || null,
    status: String(item?.status || "").trim() || null,
    dispatchStatus: String(item?.dispatchStatus || "").trim() || null,
    currentStep: String(item?.currentStep || "").trim() || null,
    lastError: String(item?.lastError || "").trim() || null,
    assignedClientId: String(item?.assignedClientId || "").trim() || null,
    assignedMachineCode: String(item?.assignedMachineCode || "").trim() || null,
    profileId: String(item?.profileId || "").trim() || null,
    updatedAt: String(item?.updatedAt || "").trim() || null,
  };
};

let visibilityRefreshBound = false;
const bindVisibilityRefresh = () => {
  if (visibilityRefreshBound || typeof document === "undefined") return;
  visibilityRefreshBound = true;
  document.addEventListener("visibilitychange", () => {
    // 后台不轮询，回到前台立刻补一次，避免用户看到过期进度
    if (document.hidden) return;
    if (activeSummaryPollingTimer) void refreshSummary(true);
  });
};

const syncActiveSummaryPolling = () => {
  const shouldPoll =
    activeTasks.value.length > 0 ||
    Number(summary.value.waiting || 0) > 0 ||
    Number(summary.value.processing || 0) > 0;
  if (!shouldPoll) {
    if (activeSummaryPollingTimer) {
      clearInterval(activeSummaryPollingTimer);
      activeSummaryPollingTimer = null;
    }
    return;
  }

  if (activeSummaryPollingTimer) {
    return;
  }

  activeSummaryPollingTimer = setInterval(() => {
    // 后台标签页不轮询：切回来时由 visibilitychange 补一次
    if (typeof document !== "undefined" && document.hidden) return;
    void refreshSummary(true);
  }, ACTIVE_PUBLISH_TASK_POLLING_MS);
  bindVisibilityRefresh();
};

const syncMergedActiveTasks = () => {
  const now = Date.now();
  const realtimeItems = Object.values(realtimeActiveTaskMap.value).filter(
    (item) => item.runtimeExpiresAt > now,
  );
  if (realtimeItems.length !== Object.keys(realtimeActiveTaskMap.value).length) {
    realtimeActiveTaskMap.value = realtimeItems.reduce(
      (result, item) => {
        result[item.id] = item;
        return result;
      },
      {} as Record<string, RealtimePublishTaskRuntimeItem>,
    );
  }

  const mergedMap = new Map<string, NormalizedPublishTaskRuntimeItem>();
  serverActiveTasks.value.forEach((item) => {
    if (item?.id && isRunningRuntimeItem(item)) {
      mergedMap.set(item.id, item);
    }
  });
  realtimeItems.forEach((item) => {
    if (item?.id && isRunningRuntimeItem(item)) {
      const { runtimeExpiresAt: _runtimeExpiresAt, ...runtimeItem } = item;
      mergedMap.set(item.id, {
        ...(mergedMap.get(item.id) || {}),
        ...runtimeItem,
      });
    }
  });

  activeTasks.value = Array.from(mergedMap.values()).filter(isRunningRuntimeItem);
  syncActiveSummaryPolling();
};

const applySummary = (payload?: Partial<PublishTaskRuntimeSummary> | null) => {
  const next = payload || {};
  const items = Array.isArray(next.items)
    ? next.items
        .map((item) => normalizeRuntimeItem(item))
        .filter((item): item is NormalizedPublishTaskRuntimeItem => !!item)
    : [];

  serverActiveTasks.value = items.filter(isRunningRuntimeItem);
  summary.value = {
    typePrefix: String(next.typePrefix || "publish-product-"),
    pending: Number(next.pending) || 0,
    waiting: Number(next.waiting) || 0,
    processing: Number(next.processing) || 0,
    delayed: Number(next.delayed) || 0,
    completed: Number(next.completed) || 0,
    failed: Number(next.failed) || 0,
    total: Number(next.total) || 0,
    active:
      Number(next.active) ||
      items.length ||
      (Number(next.processing) || 0),
    items,
    fetchedAt: String(next.fetchedAt || "").trim() || null,
  };
  syncMergedActiveTasks();
};

const upsertRealtimeActiveTask = (
  taskId: string,
  patch: Partial<NormalizedPublishTaskRuntimeItem> = {},
) => {
  const id = normalizeTaskId(taskId);
  if (!id) return;
  const previous = realtimeActiveTaskMap.value[id];
  const status = String(patch.status || previous?.status || "processing").trim() || "processing";
  realtimeActiveTaskMap.value = {
    ...realtimeActiveTaskMap.value,
    [id]: {
      id,
      taskType:
        String(patch.taskType || previous?.taskType || "").trim() || "publish-product-runtime",
      label: patch.label ?? previous?.label ?? null,
      status,
      dispatchStatus: patch.dispatchStatus ?? previous?.dispatchStatus ?? status,
      currentStep: patch.currentStep ?? previous?.currentStep ?? null,
      lastError: patch.lastError ?? previous?.lastError ?? null,
      assignedClientId: patch.assignedClientId ?? previous?.assignedClientId ?? null,
      assignedMachineCode: patch.assignedMachineCode ?? previous?.assignedMachineCode ?? null,
      profileId: patch.profileId ?? previous?.profileId ?? null,
      updatedAt: patch.updatedAt ?? previous?.updatedAt ?? new Date().toISOString(),
      runtimeExpiresAt: Date.now() + REALTIME_PUBLISH_TASK_TTL_MS,
    },
  };
  const realtimeProcessingCount = Object.values(realtimeActiveTaskMap.value).filter(
    isRunningRuntimeItem,
  ).length;
  if (realtimeProcessingCount > Number(summary.value.processing || 0)) {
    summary.value = {
      ...summary.value,
      processing: realtimeProcessingCount,
      active: Math.max(Number(summary.value.active || 0), realtimeProcessingCount),
    };
  }
  syncMergedActiveTasks();
};

const removeRealtimeActiveTask = (taskId: string) => {
  const id = normalizeTaskId(taskId);
  if (!id) return;
  serverActiveTasks.value = serverActiveTasks.value.filter((item) => item.id !== id);
  if (realtimeActiveTaskMap.value[id]) {
    const nextMap = { ...realtimeActiveTaskMap.value };
    delete nextMap[id];
    realtimeActiveTaskMap.value = nextMap;
  }
  summary.value = {
    ...summary.value,
    processing: Math.max(0, Number(summary.value.processing || 0) - 1),
    active: Math.max(0, Number(summary.value.active || 0) - 1),
  };
  syncMergedActiveTasks();
};

const refreshSummary = async (silent = false) => {
  if (summaryRefreshPromise) {
    return summaryRefreshPromise;
  }

  if (!silent) {
    loading.value = true;
  }

  summaryRefreshPromise = (async () => {
    try {
      const response: any = await getPublishTaskRuntimeSummary();
      const data = response?.data?.data || response?.data || response || {};
      applySummary(data);
    } catch {
      if (!silent) {
        applySummary(createDefaultSummary());
      }
    } finally {
      if (!silent) {
        loading.value = false;
      }
      summaryRefreshPromise = null;
    }
  })();

  return summaryRefreshPromise;
};

const scheduleActiveSummaryRefresh = (delay = 160) => {
  if (activeSummaryRefreshTimer) {
    clearTimeout(activeSummaryRefreshTimer);
  }

  activeSummaryRefreshTimer = setTimeout(() => {
    activeSummaryRefreshTimer = null;
    void refreshSummary(true);
  }, delay);
};

const handlePublishTaskRuntime = (event: PublishTaskRuntimeEvent) => {
  const taskId = normalizeTaskId(event?.taskId);
  const eventStatus = String(event?.status || "")
    .trim()
    .toLowerCase();

  if (!taskId && !eventStatus) {
    return;
  }

  if (
    eventStatus === "assigned" ||
    eventStatus === "running" ||
    eventStatus === "processing"
  ) {
    if (taskId) {
      const currentStep =
        String(event?.currentStep || "").trim() || String(event?.message || "").trim() || null;
      upsertRealtimeActiveTask(taskId, {
        taskType: String(event?.taskType || event?.queue || "").trim() || undefined,
        label: null,
        status: "processing",
        dispatchStatus: eventStatus,
        currentStep,
        lastError: null,
        assignedClientId: String(event?.clientId || "").trim() || null,
        assignedMachineCode: String(event?.machineCode || "").trim() || null,
        profileId: String(event?.profileId || "").trim() || null,
        updatedAt: event?.reportedAt || new Date().toISOString(),
      });
    }
    scheduleActiveSummaryRefresh(PUBLISH_TASK_RUNTIME_EVENT_REFRESH_DELAY_MS);
    return;
  }

  if (eventStatus === "waiting") {
    scheduleActiveSummaryRefresh(PUBLISH_TASK_RUNTIME_EVENT_REFRESH_DELAY_MS);
    return;
  }

  if (
    eventStatus === "completed" ||
    eventStatus === "failed" ||
    eventStatus === "pending" ||
    eventStatus === "timeout"
  ) {
    if (taskId) {
      removeRealtimeActiveTask(taskId);
    }
    scheduleActiveSummaryRefresh(PUBLISH_TASK_RUNTIME_EVENT_REFRESH_DELAY_MS);
    return;
  }

  scheduleActiveSummaryRefresh(PUBLISH_TASK_RUNTIME_EVENT_REFRESH_DELAY_MS);
};

const refreshCapabilityCatalog = async () => {
  try {
    const response: any = await getPublishTaskCapabilityCatalog();
    const data = response?.data?.data || response?.data || response || {};
    const serverTaskTypes = Array.isArray(data?.server?.taskTypes) ? data.server.taskTypes : [];
    hasServerDirectExecutableTypes.value = serverTaskTypes.some(
      (item: any) => !!item?.serverDirectExecuteSupported,
    );
  } catch {
    hasServerDirectExecutableTypes.value = false;
  }
};

const refreshAutoSchedulingSetting = async () => {
  try {
    const setting = await loadPublishTaskAutoDispatchSetting();
    autoSchedulingEnabled.value = !!setting.autoSchedulingEnabled;
  } catch {
    autoSchedulingEnabled.value = false;
  } finally {
    autoSchedulingSettingLoaded.value = true;
  }
};

const resolveTooltipLabel = (item: NormalizedPublishTaskRuntimeItem) => {
  const baseLabel = String(item?.label || "").trim();
  const targetParts = [
    String(item?.assignedMachineCode || "").trim(),
    item?.profileId ? `实例 ${item.profileId}` : "",
  ].filter(Boolean);

  if (baseLabel && targetParts.length) {
    return `${baseLabel} @ ${targetParts.join(" / ")}`;
  }
  if (baseLabel) {
    return baseLabel;
  }
  if (targetParts.length) {
    return targetParts.join(" / ");
  }
  return item.id;
};

const ensureInitialized = () => {
  if (initialized) return;
  initialized = true;
  websocketClient.events.on("publishTaskRuntime", handlePublishTaskRuntime);
  void refreshCapabilityCatalog();
  void refreshAutoSchedulingSetting();
  void refreshSummary(true);
};

export function usePublishTaskRuntimeState() {
  ensureInitialized();
  const clientNodeStore = useClientNodeStore();
  clientNodeStore.ensureInitialized({ summary: true });

  const activeTaskNames = computed(() =>
    activeTasks.value
      .filter(isRunningRuntimeItem)
      .map((item) => resolveTooltipLabel(item))
      .map((item) => String(item || "").trim())
      .filter((item) => !!item),
  );
  const activeTaskCount = computed(() =>
    activeTasks.value.filter(isRunningRuntimeItem).length,
  );
  const isAnyPublishTaskRunning = computed(() => activeTaskCount.value > 0);
  const hasBrowserAutomationExecutor = computed(
    () => clientNodeStore.pluginStatusMap["browser-automation"] === "available",
  );
  const isPublishTaskExecutable = computed(
    () => hasBrowserAutomationExecutor.value || hasServerDirectExecutableTypes.value,
  );
  const menuStatusTone = computed<MenuStatusTone>(() => {
    return isPublishTaskExecutable.value ? "available" : "offline";
  });
  const tooltipText = computed(() => {
    if (isAnyPublishTaskRunning.value) {
      if (activeTaskNames.value.length > 0) {
        const names = activeTaskNames.value.slice(0, 3);
        const remaining = Math.max(activeTaskCount.value - names.length, 0);
        return remaining > 0
          ? `正在执行：${names.join("，")} 等 ${remaining} 条`
          : `正在执行：${names.join("，")}`;
      }
      return `当前有 ${activeTaskCount.value} 条发布任务执行中`;
    }
    return isPublishTaskExecutable.value ? "发布任务可执行" : "发布任务暂不可执行";
  });
  const refresh = async () => {
    await refreshSummary();
  };
  const setAutoSchedulingEnabled = (enabled: boolean) => {
    autoSchedulingEnabled.value = enabled;
    autoSchedulingSettingLoaded.value = true;
  };

  return {
    summary: readonly(summary),
    loading: readonly(loading),
    activeTasks: readonly(activeTasks),
    activeTaskNames,
    activeTaskCount,
    hasServerDirectExecutableTypes: readonly(hasServerDirectExecutableTypes),
    autoSchedulingEnabled: readonly(autoSchedulingEnabled),
    autoSchedulingSettingLoaded: readonly(autoSchedulingSettingLoaded),
    runningCount: activeTaskCount,
    hasBrowserAutomationExecutor,
    isPublishTaskExecutable,
    isAnyPublishTaskRunning,
    menuStatusTone,
    tooltipText,
    refresh,
    refreshAutoSchedulingSetting,
    setAutoSchedulingEnabled,
  };
}
