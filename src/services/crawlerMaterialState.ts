import { reactive } from "vue";
import { CrawlerMaterialApi } from "@/api/crawler-material";

/**
 * 采集素材菜单徽标状态。
 *
 * 「有没有新的」= latestAt 比用户上次访问该页面更晚；
 * 「多还是少」= 今日新增计数（来自通用的 ResourceStats 接口）。
 */
const LAST_VISIT_KEY = "crawler-material-last-visit";
const NEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export const crawlerMaterialState = reactive({
  initialized: false,
  loading: false,
  total: 0,
  todayCount: 0,
  d7Count: 0,
  d30Count: 0,
  latestAt: null as string | null,
  /** 有比上次访问更新的素材 */
  hasNew: false,
  /** 0~1，越接近 1 表示越新，用于徽标颜色深浅 */
  intensity: 0,
});

let pendingRefresh: Promise<void> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

function readLastVisit(): number {
  try {
    const raw = localStorage.getItem(LAST_VISIT_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

/** 用户进入采集素材页面时调用，用于消除「新」提示 */
export function markCrawlerMaterialVisited() {
  try {
    localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  crawlerMaterialState.hasNew = false;
  crawlerMaterialState.intensity = 0;
}

function computeFreshness(latestAt: string | null) {
  if (!latestAt) {
    return { hasNew: false, intensity: 0 };
  }
  const latestTime = new Date(latestAt).getTime();
  if (!Number.isFinite(latestTime)) {
    return { hasNew: false, intensity: 0 };
  }
  const now = Date.now();
  if (now - latestTime > NEW_THRESHOLD_MS) {
    return { hasNew: false, intensity: 0 };
  }

  const lastVisit = readLastVisit();
  const hasNew = !lastVisit || latestTime > lastVisit;
  // 线性衰减：刚采集 = 1，7 天前 = 0
  const intensity = Math.max(0, Math.min(1, 1 - (now - latestTime) / NEW_THRESHOLD_MS));
  return { hasNew, intensity: hasNew ? intensity : 0 };
}

export async function refreshCrawlerMaterialState() {
  if (pendingRefresh) return pendingRefresh;

  pendingRefresh = (async () => {
    crawlerMaterialState.loading = true;
    try {
      const stats: any = await CrawlerMaterialApi.getStats({ days: 30 });
      const data = stats?.data || stats || {};
      const windows = Array.isArray(data.windows) ? data.windows : [];
      const byKey = new Map<string, number>(
        windows.map((w: any) => [String(w?.key || ""), Number(w?.count || 0)] as [string, number]),
      );

      const latestAt = data.latestAt ? String(data.latestAt) : null;
      const { hasNew, intensity } = computeFreshness(latestAt);

      crawlerMaterialState.total = Number(data.total || 0);
      crawlerMaterialState.todayCount = byKey.get("today") || 0;
      crawlerMaterialState.d7Count = byKey.get("d7") || 0;
      crawlerMaterialState.d30Count = byKey.get("d30") || 0;
      crawlerMaterialState.latestAt = latestAt;
      crawlerMaterialState.hasNew = hasNew;
      crawlerMaterialState.intensity = intensity;
      crawlerMaterialState.initialized = true;
    } catch (error) {
      // 菜单徽标是辅助信息，失败不影响页面
      console.warn("[crawler-material-state] refresh failed", error);
      crawlerMaterialState.initialized = true;
    } finally {
      crawlerMaterialState.loading = false;
      pendingRefresh = null;
    }
  })();

  return pendingRefresh;
}

/** 仅在菜单可见时轮询，避免无谓请求 */
export function startCrawlerMaterialPolling(intervalMs = 60_000) {
  if (pollTimer) return;
  void refreshCrawlerMaterialState();
  pollTimer = setInterval(() => void refreshCrawlerMaterialState(), intervalMs);
}

export function stopCrawlerMaterialPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
