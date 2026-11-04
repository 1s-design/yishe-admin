import { computed, readonly, ref } from 'vue'
import {
  stickerPsdSetApi,
  type ActivePsdSetSummaryItem,
  type ActivePsdSetSummaryResponse,
} from '@/api/stickerPsdSet'
import { getUserSetting } from '@/api/user'
import { websocketClient, type PsAutomationStatusEvent } from '@/services/websocketClient'

type RealtimeActivePsdSetSummaryItem = ActivePsdSetSummaryItem & {
  runtimeExpiresAt: number
}

const userAutoSchedulingEnabled = ref(false)
const userAutoDispatchClientId = ref('')
const userAutoDispatchFilters = ref<Record<string, any>>({})
const settingLoaded = ref(false)
const activeSummaryLoaded = ref(false)
const serverActivePsdSets = ref<ActivePsdSetSummaryItem[]>([])
const realtimeActivePsdSetMap = ref<Record<string, RealtimeActivePsdSetSummaryItem>>({})
const activePsdSets = ref<ActivePsdSetSummaryItem[]>([])
const activePsdSetIds = ref<string[]>([])
let initialized = false
let activeSummaryRefreshPromise: Promise<void> | null = null
let activeSummaryPollingTimer: ReturnType<typeof setInterval> | null = null
let activeSummaryPollingMs = 0
let activeSummaryRefreshTimer: ReturnType<typeof setTimeout> | null = null

const ACTIVE_PSD_SET_POLLING_MS = 30000
const IDLE_PSD_SET_POLLING_MS = 60000
const PSD_SET_RUNTIME_EVENT_REFRESH_DELAY_MS = 8000
const REALTIME_ACTIVE_PSD_SET_TTL_MS = 45 * 1000

const normalizePsdSetId = (value: unknown) => String(value || '').trim()

const isActiveRuntimeItem = (item: ActivePsdSetSummaryItem | null | undefined) => {
  const status = String(item?.status || '').trim().toLowerCase()
  const schedulerStatus = String(item?.schedulerStatus || '').trim().toLowerCase()
  return (
    status === 'processing' ||
    status === 'running' ||
    status === 'assigned' ||
    schedulerStatus === 'running' ||
    schedulerStatus === 'assigned'
  )
}

const getResponseData = <T = any>(response: any): T => {
  return response?.data?.data || response?.data || response || ({} as T)
}

const normalizeActivePsdSetItem = (item: any): ActivePsdSetSummaryItem | null => {
  const id = normalizePsdSetId(item?.id)
  if (!id) {
    return null
  }

  return {
    id,
    name: String(item?.name || '').trim() || null,
    status: String(item?.status || '').trim() || null,
    schedulerStatus: String(item?.schedulerStatus || '').trim() || null,
    statusMessage: String(item?.statusMessage || '').trim() || null,
    currentStep: String(item?.currentStep || '').trim() || null,
    progress: typeof item?.progress === 'number' ? item.progress : null,
    assignedClientId: String(item?.assignedClientId || '').trim() || null,
    assignedMachineCode: String(item?.assignedMachineCode || '').trim() || null,
    updateTime: item?.updateTime || null,
  }
}

let visibilityRefreshBound = false
const bindVisibilityRefresh = () => {
  if (visibilityRefreshBound || typeof document === 'undefined') return
  visibilityRefreshBound = true
  document.addEventListener('visibilitychange', () => {
    // 后台不轮询，回到前台立刻补一次，避免用户看到过期进度
    if (document.hidden) return
    if (activeSummaryPollingTimer) void refreshActiveSummary(true)
  })
}

const syncActiveSummaryPolling = () => {
  const nextPollingMs =
    activePsdSetIds.value.length > 0 || activePsdSets.value.length > 0
      ? ACTIVE_PSD_SET_POLLING_MS
      : IDLE_PSD_SET_POLLING_MS

  if (activeSummaryPollingTimer && activeSummaryPollingMs === nextPollingMs) {
    return
  }

  if (activeSummaryPollingTimer) {
    clearInterval(activeSummaryPollingTimer)
    activeSummaryPollingTimer = null
  }

  activeSummaryPollingMs = nextPollingMs
  activeSummaryPollingTimer = setInterval(() => {
    // 后台标签页不轮询：切回来时由 visibilitychange 补一次
    if (typeof document !== "undefined" && document.hidden) return
    void refreshActiveSummary(true)
  }, nextPollingMs)
  bindVisibilityRefresh()
}

const syncMergedActiveSummary = () => {
  const now = Date.now()
  const realtimeItems = Object.values(realtimeActivePsdSetMap.value).filter(
    (item) => item.runtimeExpiresAt > now,
  )
  if (realtimeItems.length !== Object.keys(realtimeActivePsdSetMap.value).length) {
    realtimeActivePsdSetMap.value = realtimeItems.reduce(
      (result, item) => {
        result[item.id] = item
        return result
      },
      {} as Record<string, RealtimeActivePsdSetSummaryItem>,
    )
  }

  const mergedMap = new Map<string, ActivePsdSetSummaryItem>()
  serverActivePsdSets.value.forEach((item) => {
    if (item?.id) {
      mergedMap.set(item.id, item)
    }
  })
  realtimeItems.forEach((item) => {
    if (item?.id && isActiveRuntimeItem(item)) {
      const runtimeItem: ActivePsdSetSummaryItem = {
        id: item.id,
        name: item.name,
        status: item.status,
        schedulerStatus: item.schedulerStatus,
        statusMessage: item.statusMessage,
        currentStep: item.currentStep,
        progress: item.progress,
        assignedClientId: item.assignedClientId,
        assignedMachineCode: item.assignedMachineCode,
        updateTime: item.updateTime,
      }
      mergedMap.set(item.id, {
        ...(mergedMap.get(item.id) || {}),
        ...runtimeItem,
      })
    }
  })

  const nextItems = Array.from(mergedMap.values()).filter(isActiveRuntimeItem)
  const nextIds = nextItems.map((item) => item.id)

  activePsdSets.value = nextItems
  activePsdSetIds.value = nextIds
  activeSummaryLoaded.value = true
  syncActiveSummaryPolling()
}

const applyActiveSummary = (payload?: Partial<ActivePsdSetSummaryResponse> | null) => {
  const hasServerItems = Array.isArray(payload?.items)
  const source = hasServerItems ? payload?.items : []
  serverActivePsdSets.value = source
    .map((item) => normalizeActivePsdSetItem(item))
    .filter((item): item is ActivePsdSetSummaryItem => !!item)
  syncMergedActiveSummary()
}

const upsertRealtimeActivePsdSet = (
  psdSetId: string,
  patch: Partial<ActivePsdSetSummaryItem> = {},
) => {
  const id = normalizePsdSetId(psdSetId)
  if (!id) return
  const previous = realtimeActivePsdSetMap.value[id]
  realtimeActivePsdSetMap.value = {
    ...realtimeActivePsdSetMap.value,
    [id]: {
      id,
      name: patch.name ?? previous?.name ?? null,
      status: patch.status ?? previous?.status ?? 'processing',
      schedulerStatus: patch.schedulerStatus ?? previous?.schedulerStatus ?? 'running',
      statusMessage: patch.statusMessage ?? previous?.statusMessage ?? null,
      currentStep: patch.currentStep ?? previous?.currentStep ?? null,
      progress: patch.progress ?? previous?.progress ?? null,
      assignedClientId: patch.assignedClientId ?? previous?.assignedClientId ?? null,
      assignedMachineCode: patch.assignedMachineCode ?? previous?.assignedMachineCode ?? null,
      updateTime: patch.updateTime ?? previous?.updateTime ?? new Date().toISOString(),
      runtimeExpiresAt: Date.now() + REALTIME_ACTIVE_PSD_SET_TTL_MS,
    },
  }
  syncMergedActiveSummary()
}

const removeRealtimeActivePsdSet = (psdSetId: string) => {
  const id = normalizePsdSetId(psdSetId)
  if (!id) return
  serverActivePsdSets.value = serverActivePsdSets.value.filter((item) => item.id !== id)
  if (!realtimeActivePsdSetMap.value[id]) {
    syncMergedActiveSummary()
    return
  }
  const nextMap = { ...realtimeActivePsdSetMap.value }
  delete nextMap[id]
  realtimeActivePsdSetMap.value = nextMap
  syncMergedActiveSummary()
}

const refreshUserAutoScheduling = async () => {
  try {
    const response: any = await getUserSetting({ key: 'psAutomation' })
    const data = getResponseData(response)
    userAutoSchedulingEnabled.value = !!data?.autoSchedulingEnabled
    userAutoDispatchClientId.value = String(data?.autoDispatchClientId || '').trim()
    userAutoDispatchFilters.value =
      data?.autoDispatchFilters && typeof data.autoDispatchFilters === 'object'
        ? data.autoDispatchFilters
        : {}
  } catch {
    userAutoSchedulingEnabled.value = false
    userAutoDispatchClientId.value = ''
    userAutoDispatchFilters.value = {}
  } finally {
    settingLoaded.value = true
  }
}

const refreshActiveSummary = async (silent = false) => {
  if (activeSummaryRefreshPromise) {
    return activeSummaryRefreshPromise
  }

  activeSummaryRefreshPromise = (async () => {
    try {
      const response = await stickerPsdSetApi.getActiveSummary()
      applyActiveSummary(getResponseData(response))
    } catch {
      if (!silent) {
        applyActiveSummary({ items: [] })
      } else {
        syncMergedActiveSummary()
      }
    } finally {
      activeSummaryLoaded.value = true
      activeSummaryRefreshPromise = null
    }
  })()

  return activeSummaryRefreshPromise
}

const scheduleActiveSummaryRefresh = (delay = 160) => {
  if (activeSummaryRefreshTimer) {
    clearTimeout(activeSummaryRefreshTimer)
  }

  activeSummaryRefreshTimer = setTimeout(() => {
    activeSummaryRefreshTimer = null
    void refreshActiveSummary(true)
  }, delay)
}

const handlePsAutomationStatus = (event: PsAutomationStatusEvent) => {
  if (typeof event?.autoSchedulingEnabled === 'boolean') {
    userAutoSchedulingEnabled.value = event.autoSchedulingEnabled
  }
}

const handleProductionStatus = (event: {
  psdSetId?: string
  status?: string
  clientId?: string
  machineCode?: string
  assignedClientId?: string | null
  assignedMachineCode?: string | null
  message?: string | null
  currentStep?: string | null
  name?: string | null
  progress?: number | null
  total?: number | null
}) => {
  const psdSetId = normalizePsdSetId(event?.psdSetId)
  const status = String(event?.status || '').trim().toLowerCase()

  if (status === 'processing' || status === 'running' || status === 'assigned') {
    if (psdSetId) {
      const progress =
        typeof event.progress === 'number'
          ? typeof event.total === 'number' && event.total > 0
            ? Math.max(0, Math.min(100, Math.round((event.progress / event.total) * 100)))
            : Math.max(0, Math.min(100, event.progress))
          : null
      const statusMessage =
        String(event.currentStep || '').trim() || String(event.message || '').trim() || null
      upsertRealtimeActivePsdSet(psdSetId, {
        name: String(event.name || '').trim() || null,
        status: 'processing',
        schedulerStatus: null,
        statusMessage,
        currentStep: statusMessage,
        progress,
        assignedClientId: String(event.assignedClientId || event.clientId || '').trim() || null,
        assignedMachineCode:
          String(event.assignedMachineCode || event.machineCode || '').trim() || null,
        updateTime: new Date().toISOString(),
      })
    }
    scheduleActiveSummaryRefresh(PSD_SET_RUNTIME_EVENT_REFRESH_DELAY_MS)
    return
  }

  if (
    status === 'completed' ||
    status === 'failed' ||
    status === 'pending' ||
    status === 'timeout'
  ) {
    if (psdSetId) {
      removeRealtimeActivePsdSet(psdSetId)
    }
    scheduleActiveSummaryRefresh(PSD_SET_RUNTIME_EVENT_REFRESH_DELAY_MS)
  }
}

const ensureInitialized = () => {
  if (initialized) return
  initialized = true
  websocketClient.events.on('psAutomationStatus', handlePsAutomationStatus)
  websocketClient.events.on('production-status', handleProductionStatus)
  void refreshUserAutoScheduling()
  void refreshActiveSummary(true)
  syncActiveSummaryPolling()
}

export function usePsdSetRuntimeState() {
  ensureInitialized()

  const activePsdSetNames = computed(() =>
    activePsdSets.value
      .map((item) => String(item?.name || '').trim())
      .filter((item) => !!item),
  )
  const activePsdSetCount = computed(() =>
    Math.max(activePsdSetIds.value.length, activePsdSets.value.length),
  )
  const activePsdSetClientIds = computed(() =>
    Array.from(
      new Set(
        activePsdSets.value
          .map((item) => String(item?.assignedClientId || '').trim())
          .filter((item) => !!item),
      ),
    ),
  )
  const isAnyPsdSetProcessing = computed(() => activePsdSetCount.value > 0)
  const processingTooltipText = computed(() => {
    if (!isAnyPsdSetProcessing.value) {
      return userAutoSchedulingEnabled.value ? '自动处理已开启' : '自动处理未开启'
    }

    if (activePsdSetNames.value.length > 0) {
      return `正在制作：${activePsdSetNames.value.join('，')}`
    }

    return '当前有套图正在制作'
  })

  const refresh = async () => {
    await Promise.all([refreshActiveSummary(), refreshUserAutoScheduling()])
  }

  const setUserAutoSchedulingEnabled = (enabled: boolean) => {
    userAutoSchedulingEnabled.value = enabled
  }

  const setUserAutoDispatchTarget = (target?: { clientId?: string | null }) => {
    userAutoDispatchClientId.value = String(target?.clientId || '').trim()
  }

  const setUserAutoDispatchFilters = (filters?: Record<string, any> | null) => {
    userAutoDispatchFilters.value = filters && typeof filters === 'object' ? filters : {}
  }

  return {
    userAutoSchedulingEnabled: readonly(userAutoSchedulingEnabled),
    userAutoDispatchClientId: readonly(userAutoDispatchClientId),
    userAutoDispatchFilters: readonly(userAutoDispatchFilters),
    settingLoaded: readonly(settingLoaded),
    activeSummaryLoaded: readonly(activeSummaryLoaded),
    activePsdSets: readonly(activePsdSets),
    activePsdSetNames,
    activePsdSetCount,
    activePsdSetClientIds,
    isAnyPsdSetProcessing,
    processingTooltipText,
    refresh,
    refreshActiveSummary,
    refreshUserAutoScheduling,
    setUserAutoSchedulingEnabled,
    setUserAutoDispatchTarget,
    setUserAutoDispatchFilters
  }
}
