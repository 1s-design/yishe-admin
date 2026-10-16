<template>
  <teleport to="body">
    <div v-if="visible" class="qr">
      <!-- 顶栏：窄屏时统计与按钮换到第二行，关闭键始终在第一行右侧 -->
      <header class="qr__bar">
        <div class="qr__bar-lead">
          <span class="qr__title">快捷审核</span>
          <span class="qr__progress">
            已处理 {{ processedCount }}<template v-if="total"> / {{ total }}</template>
          </span>
        </div>

        <div class="qr__bar-ops">
          <span class="qr__stat qr__stat--import">入库 {{ importedCount }}</span>
          <span class="qr__stat qr__stat--delete">删除 {{ deletedCount }}</span>
          <span class="qr__stat qr__stat--skip">忽略 {{ skippedCount }}</span>

          <button
            v-if="canUndoDelete"
            type="button"
            class="qr__ghost"
            title="撤销最近一次删除（仅对尚未提交的删除有效）"
            @click="undoLastDelete"
          >
            撤销删除
          </button>
          <button
            v-if="skippedCount"
            type="button"
            class="qr__ghost"
            title="把本次忽略的素材重新放回队列末尾"
            @click="resetSkipped"
          >
            重置忽略
          </button>
          <button
            type="button"
            class="qr__ghost"
            title="重新从第一页加载（用于审核期间有新采集数据）"
            @click="reload"
          >
            重新加载
          </button>
          <button
            type="button"
            class="qr__ghost"
            :title="sideCollapsed ? '显示素材信息' : '隐藏素材信息，图片区更大'"
            @click="sideCollapsed = !sideCollapsed"
          >
            {{ sideCollapsed ? "显示信息" : "隐藏信息" }}
          </button>
        </div>

        <button type="button" class="qr__close" title="关闭（Esc）" @click="close">
          <el-icon><Close /></el-icon>
        </button>
      </header>

      <!-- 层内轻提示（Element Plus 的 ElMessage 会被本层盖住，故自带一套） -->
      <div class="qr__toasts">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="qr__toast"
          :class="`qr__toast--${toast.tone}`"
        >
          {{ toast.text }}
        </div>
      </div>

      <!-- 主体：图片居中在上，信息在下方 -->
      <main class="qr__main">
        <div
          v-if="current"
          class="qr__stage"
          :class="{ 'qr__stage--settle': !dragging }"
          :style="stageStyle"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
        >
          <img :src="current.url" :alt="current.name || '素材图片'" draggable="false" />

          <div class="qr__chips">
            <span v-if="current.suffix" class="qr__chip">{{ current.suffix }}</span>
            <span v-if="current.isCutout" class="qr__chip qr__chip--ok">已抠图</span>
            <span v-if="dimensionText" class="qr__chip">{{ dimensionText }}</span>
            <span v-if="current.fileSize" class="qr__chip">{{ formatFileSize(current.fileSize) }}</span>
          </div>

          <div v-if="swipeHint" class="qr__hint" :class="`qr__hint--${swipeHint}`">
            {{ SWIPE_HINT_TEXT[swipeHint] }}
          </div>
        </div>

        <div v-else-if="loading" class="qr__state">
          <span class="qr__spinner"></span>
          <p class="qr__state-title">正在加载素材…</p>
        </div>

        <div v-else-if="loadError" class="qr__state">
          <p class="qr__state-title">加载失败</p>
          <p class="qr__state-desc">{{ loadError }}</p>
          <button type="button" class="qr__state-btn" @click="retry">重试</button>
        </div>

        <div v-else class="qr__state">
          <p class="qr__state-title">已审核完全部素材</p>
          <p class="qr__state-desc">
            本次共处理 {{ processedCount }} 张（入库 {{ importedCount }} · 删除 {{ deletedCount }} · 忽略 {{ skippedCount }}）
          </p>
          <button type="button" class="qr__state-btn" @click="reload">重新加载</button>
        </div>

        <aside
          v-if="current && !sideCollapsed"
          ref="sideRef"
          class="qr__side"
          :class="{ 'qr__side--expanded': sheetExpanded }"
        >
          <div class="qr__side-head">
            <h3 class="qr__name" :title="current.name">
              {{ current.name || `素材 ${current.id}` }}
            </h3>
            <button
              type="button"
              class="qr__side-toggle"
              :title="sheetExpanded ? '收起详情' : '展开全部字段'"
              @click="sheetExpanded = !sheetExpanded"
            >
              {{ sheetExpanded ? "收起" : "全部字段" }}
            </button>
          </div>

          <dl class="qr__fields">
            <div class="qr__field">
              <dt>来源</dt>
              <dd :title="current.source || '-'">{{ current.source || "-" }}</dd>
            </div>
            <div class="qr__field">
              <dt>比例</dt>
              <dd :title="aspectText">{{ aspectText }}</dd>
            </div>
            <div class="qr__field">
              <dt>尺寸</dt>
              <dd :title="dimensionText || '-'">{{ dimensionText || "-" }}</dd>
            </div>
            <div class="qr__field">
              <dt>大小</dt>
              <dd :title="fileSizeText">{{ fileSizeText }}</dd>
            </div>
            <div class="qr__field">
              <dt>后缀</dt>
              <dd :title="current.suffix || '-'">{{ current.suffix || "-" }}</dd>
            </div>
            <div class="qr__field">
              <dt>是否抠图</dt>
              <dd>{{ current.isCutout ? "是" : "否" }}</dd>
            </div>
            <div class="qr__field">
              <dt>创建时间</dt>
              <dd :title="createTimeText">{{ createTimeText }}</dd>
            </div>
            <div class="qr__field">
              <dt>关键词</dt>
              <dd :title="current.keywords || '-'">{{ current.keywords || "-" }}</dd>
            </div>

            <div class="qr__field qr__field--full qr__field--more">
              <dt>描述</dt>
              <dd>{{ current.description || "-" }}</dd>
            </div>
            <div class="qr__field qr__field--full qr__field--more">
              <dt>原始地址</dt>
              <dd>
                <a
                  v-if="current.originUrl"
                  :href="current.originUrl"
                  target="_blank"
                  rel="noreferrer"
                  :title="current.originUrl"
                >{{ current.originUrl }}</a>
                <span v-else>-</span>
              </dd>
            </div>
            <div class="qr__field qr__field--more">
              <dt>ID</dt>
              <dd class="qr__id">{{ current.id }}</dd>
            </div>
          </dl>
        </aside>
      </main>

      <!-- 底部动作 -->
      <footer class="qr__actions">
        <button
          type="button"
          class="qr__action qr__action--skip"
          :disabled="!current"
          @click="actSkip"
        >
          <span>忽略</span>
          <kbd class="qr__kbd">←</kbd>
        </button>
        <button
          type="button"
          class="qr__action qr__action--delete"
          :disabled="!current"
          @click="actDelete"
        >
          <span>删除</span>
          <kbd class="qr__kbd">↓</kbd>
        </button>
        <button
          type="button"
          class="qr__action qr__action--import"
          :disabled="!current"
          @click="actImport"
        >
          <span>入库</span>
          <kbd class="qr__kbd">→</kbd>
        </button>
      </footer>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { Close } from "@element-plus/icons-vue";
import { CrawlerMaterialApi } from "@/api/crawler-material";
import { formatTimestamp } from "@/common/date";
import { useUserStore } from "@/store/modules/user";

defineOptions({ name: "CrawlerQuickReview" });

const props = withDefaults(
  defineProps<{
    visible: boolean;
    /** 复用列表页的筛选条件（不含 currentPage / pageSize） */
    query?: Record<string, any>;
  }>(),
  { query: () => ({}) },
);

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "reviewed"): void;
}>();

/** 每次向接口取多少条（一次多拿，避免频繁补货造成断流） */
const PAGE_SIZE = 50;
/** 队列剩余多少条就后台补货：留足缓冲，用户感觉不到加载 */
const PREFETCH_THRESHOLD = 20;
/** 提前解码后面几张图，滑动时不出白 */
const PRELOAD_AHEAD = 8;
/** 入库攒够多少条立刻提交 */
const IMPORT_BATCH = 20;
/** 删除攒够多少条立刻提交 */
const DELETE_BATCH = 30;
const IMPORT_DEBOUNCE = 1500;
const DELETE_DEBOUNCE = 5000;
/** 判定为滑动的位移阈值（px） */
const SWIPE_THRESHOLD = 70;

const SWIPE_HINT_TEXT: Record<string, string> = {
  import: "入库",
  delete: "删除",
  skip: "忽略",
};

const userStore = useUserStore();

// ── 队列与游标 ──────────────────────────────────────────────
/** 待审核队列，队首即当前卡片 */
const queue = ref<any[]>([]);
const loading = ref(false);
const loadError = ref("");
const finished = ref(false);
const total = ref(0);
/**
 * 下一条待取数据在「库中的偏移量」。
 * 删除会整体前移后续行的偏移，因此每次删除提交成功后同步回退。
 */
const nextOffset = ref(0);
/** 已取过的 id，防止分页错位时重复出现 */
const seenIds = ref<Set<string>>(new Set());

// ── 计数 ────────────────────────────────────────────────────
const importedCount = ref(0);
const deletedCount = ref(0);
const skippedCount = ref(0);
const processedCount = computed(
  () => importedCount.value + deletedCount.value + skippedCount.value,
);

// ── 忽略（仅本次页面会话，不落库）──────────────────────────
const skippedItems = ref<any[]>([]);

// ── 待提交队列 ──────────────────────────────────────────────
const importQueue = ref<any[]>([]);
const deleteQueue = ref<any[]>([]);

// ── 信息面板折叠（折叠后图片区独占全屏）────────────────────
const sideCollapsed = ref(false);
/** 移动端：详情面板展开为全高，便于一次读完所有字段 */
const sheetExpanded = ref(false);

// ── 层内轻提示 ──────────────────────────────────────────────
const TOAST_DURATION = 1600;
const toasts = ref<Array<{ id: number; text: string; tone: string }>>([]);
let toastSeq = 0;

function pushToast(text: string, tone: "info" | "success" | "warning" | "error" = "info"): void {
  const id = ++toastSeq;
  toasts.value.push({ id, text, tone });
  if (toasts.value.length > 3) toasts.value.shift();
  setTimeout(() => {
    const index = toasts.value.findIndex((item) => item.id === id);
    if (index >= 0) toasts.value.splice(index, 1);
  }, TOAST_DURATION);
}

/** 面板开着走层内提示，面板已关闭（提交落尾）才用全局提示 */
function notify(text: string, tone: "info" | "success" | "warning" | "error" = "info"): void {
  if (props.visible) pushToast(text, tone);
  else ElMessage({ message: text, type: tone, duration: 2600 });
}

const current = computed(() => queue.value[0] ?? null);
const canUndoDelete = computed(() => deleteQueue.value.length > 0);

/** 详情面板：换图后把滚动位置复位，否则新素材的字段会停在中间、前几项被顶出可视区 */
const sideRef = ref<HTMLElement | null>(null);

watch(
  () => current.value?.id,
  () => {
    if (sideRef.value) sideRef.value.scrollTop = 0;
  },
  { flush: "post" },
);

const dimensionText = computed(() => {
  const row = current.value;
  if (!row?.width || !row?.height) return "";
  return `${row.width}×${row.height}`;
});

const aspectText = computed(() => {
  const row = current.value;
  if (!row?.aspectRatio) return "-";
  return Number(row.aspectRatio).toFixed(2);
});

const fileSizeText = computed(() => {
  const row = current.value;
  return row?.fileSize ? formatFileSize(row.fileSize) : "-";
});

const createTimeText = computed(() => formatTimestamp(current.value?.createTime) || "-");

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "-";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

// ── 取数 ────────────────────────────────────────────────────
let inflightFetch: Promise<void> | null = null;
let inflightDelete: Promise<void> | null = null;

async function fetchNext(): Promise<void> {
  if (inflightFetch) return inflightFetch;
  if (finished.value || loadError.value) return;

  inflightFetch = (async () => {
    loading.value = true;
    try {
      // 删除提交会改变库内偏移，等它落定再取，避免算错位置
      if (inflightDelete) await inflightDelete;

      const offset = Math.max(0, nextOffset.value);
      const pageNo = Math.floor(offset / PAGE_SIZE) + 1;
      const drop = offset % PAGE_SIZE;

      const res: any = await CrawlerMaterialApi.getCrawlerMaterialPage({
        ...props.query,
        currentPage: pageNo,
        pageSize: PAGE_SIZE,
      });

      const list = Array.isArray(res?.list) ? res.list : [];
      if (res?.total !== undefined) total.value = Number(res.total) || 0;

      // drop 掉本次页内属于「已消费区间」的前几行
      const rows = list.slice(drop);
      const fresh = rows.filter((item: any) => {
        const id = String(item?.id ?? "");
        if (!id || seenIds.value.has(id)) return false;
        seenIds.value.add(id);
        return true;
      });

      nextOffset.value = offset + rows.length;

      if (!fresh.length) {
        finished.value = true;
      } else {
        queue.value.push(...fresh);
        preloadAhead();
      }
      loadError.value = "";
      autoRetryLeft = 2;
    } catch (error: any) {
      loadError.value = error?.message || "网络异常，请重试";
      scheduleAutoRetry();
    } finally {
      loading.value = false;
      inflightFetch = null;
    }
  })();

  return inflightFetch;
}

/** 偶发失败静默重试，尽量别让用户看到错误态 */
let autoRetryLeft = 2;
let autoRetryTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleAutoRetry(): void {
  if (!props.visible || autoRetryLeft <= 0 || autoRetryTimer) return;
  autoRetryLeft -= 1;
  autoRetryTimer = setTimeout(() => {
    autoRetryTimer = null;
    if (!props.visible) return;
    loadError.value = "";
    void fetchNext();
  }, 1500);
}

/** 已预解码过的图片地址，避免每滑一张都重复 new Image() */
const preloadedUrls = new Set<string>();

function preloadAhead(): void {
  queue.value.slice(0, PRELOAD_AHEAD + 1).forEach((item: any) => {
    const url = item?.url;
    if (!url || preloadedUrls.has(url)) return;
    preloadedUrls.add(url);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  });
}

/** 每滑一张都顺手预解码后面几张，并检查是否需要后台补货 */
function afterAdvance(): void {
  preloadAhead();
  if (queue.value.length <= PREFETCH_THRESHOLD) void fetchNext();
}

function retry(): void {
  loadError.value = "";
  autoRetryLeft = 2;
  void fetchNext();
}

function reload(): void {
  queue.value = [];
  seenIds.value = new Set();
  preloadedUrls.clear();
  skippedItems.value = [];
  skippedCount.value = 0;
  nextOffset.value = 0;
  total.value = 0;
  finished.value = false;
  loadError.value = "";
  autoRetryLeft = 2;
  if (autoRetryTimer) {
    clearTimeout(autoRetryTimer);
    autoRetryTimer = null;
  }
  void fetchNext();
}

// ── 三个动作 ────────────────────────────────────────────────
function actSkip(): void {
  const item = queue.value.shift();
  if (!item) return;
  skippedItems.value.push(item);
  skippedCount.value += 1;
  pushToast("已忽略");
  afterAdvance();
}

function actImport(): void {
  const item = queue.value.shift();
  if (!item) return;
  importQueue.value.push(item);
  importedCount.value += 1;
  pushToast("已入库", "success");
  scheduleImportFlush();
  afterAdvance();
}

function actDelete(): void {
  const item = queue.value.shift();
  if (!item) return;
  deleteQueue.value.push(item);
  deletedCount.value += 1;
  pushToast("已删除，可在顶部撤销", "warning");
  scheduleDeleteFlush();
  afterAdvance();
}

function resetSkipped(): void {
  if (!skippedItems.value.length) return;
  const items = skippedItems.value.splice(0, skippedItems.value.length);
  skippedCount.value = 0;
  queue.value.push(...items);
  pushToast(`已把 ${items.length} 张忽略的素材放回队列`, "success");
  afterAdvance();
}

// ── 入库提交（攒批，避免每次入库都起一个后台任务）──────────
let importTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleImportFlush(): void {
  if (importTimer) clearTimeout(importTimer);
  if (importQueue.value.length >= IMPORT_BATCH) {
    void flushImports();
    return;
  }
  importTimer = setTimeout(() => {
    importTimer = null;
    void flushImports();
  }, IMPORT_DEBOUNCE);
}

async function flushImports(): Promise<void> {
  if (importTimer) {
    clearTimeout(importTimer);
    importTimer = null;
  }
  if (!importQueue.value.length) return;

  const items = importQueue.value.splice(0, importQueue.value.length);
  try {
    await CrawlerMaterialApi.batchImportToSticker({
      ids: items.map((item: any) => String(item.id)),
      userId: String(userStore.user?.id ?? ""),
    });
  } catch (error: any) {
    importedCount.value = Math.max(0, importedCount.value - items.length);
    notify(`入库提交失败：${error?.message || "未知错误"}`, "error");
  }
}

// ── 删除提交（攒批；提交成功才回退偏移量）──────────────────
let deleteTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleDeleteFlush(): void {
  if (deleteTimer) clearTimeout(deleteTimer);
  if (deleteQueue.value.length >= DELETE_BATCH) {
    void flushDeletes();
    return;
  }
  deleteTimer = setTimeout(() => {
    deleteTimer = null;
    void flushDeletes();
  }, DELETE_DEBOUNCE);
}

async function flushDeletes(): Promise<void> {
  if (deleteTimer) {
    clearTimeout(deleteTimer);
    deleteTimer = null;
  }
  if (inflightDelete) await inflightDelete;
  if (!deleteQueue.value.length) return;

  const items = deleteQueue.value.splice(0, deleteQueue.value.length);
  inflightDelete = (async () => {
    try {
      await CrawlerMaterialApi.deleteCrawlerMaterial({
        ids: items.map((item: any) => String(item.id)),
      });
      nextOffset.value = Math.max(0, nextOffset.value - items.length);
    } catch (error: any) {
      deletedCount.value = Math.max(0, deletedCount.value - items.length);
      notify(`删除提交失败：${error?.message || "未知错误"}`, "error");
    }
  })();

  try {
    await inflightDelete;
  } finally {
    inflightDelete = null;
  }
}

/** 撤销只对「还没提交」的删除生效（COS 文件一旦真删无法恢复） */
function undoLastDelete(): void {
  const item = deleteQueue.value.pop();
  if (!item) return;
  deletedCount.value = Math.max(0, deletedCount.value - 1);
  queue.value.unshift(item);
  pushToast("已撤销删除", "success");
}

// ── 滑动交互 ────────────────────────────────────────────────
const dragging = ref(false);
const swipe = ref({ x: 0, y: 0 });
let pointerStart = { x: 0, y: 0 };

const stageStyle = computed(() => {
  if (!dragging.value) return {};
  return {
    transform: `translate3d(${swipe.value.x}px, ${swipe.value.y}px, 0) rotate(${swipe.value.x * 0.03}deg)`,
  };
});

const swipeHint = computed(() => {
  if (!dragging.value) return "";
  const { x, y } = swipe.value;
  if (Math.abs(x) < 40 && Math.abs(y) < 40) return "";
  if (Math.abs(x) >= Math.abs(y)) return x > 0 ? "import" : "skip";
  return y > 0 ? "delete" : "";
});

function onPointerDown(event: PointerEvent): void {
  if (!current.value) return;
  dragging.value = true;
  pointerStart = { x: event.clientX, y: event.clientY };
  swipe.value = { x: 0, y: 0 };
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging.value) return;
  swipe.value = {
    x: event.clientX - pointerStart.x,
    y: event.clientY - pointerStart.y,
  };
}

function onPointerUp(): void {
  if (!dragging.value) return;
  dragging.value = false;
  const { x, y } = swipe.value;
  swipe.value = { x: 0, y: 0 };

  if (Math.abs(x) < SWIPE_THRESHOLD && Math.abs(y) < SWIPE_THRESHOLD) return;

  if (Math.abs(x) >= Math.abs(y)) {
    if (x > 0) actImport();
    else actSkip();
    return;
  }
  if (y > 0) actDelete();
}

function onPointerCancel(): void {
  dragging.value = false;
  swipe.value = { x: 0, y: 0 };
}

// ── 键盘 ────────────────────────────────────────────────────
function onKeydown(event: KeyboardEvent): void {
  if (!props.visible) return;

  if (event.key === "Escape") {
    close();
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    actSkip();
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    actImport();
  } else if (
    event.key === "ArrowDown" ||
    event.key === "Delete" ||
    event.key === "Backspace"
  ) {
    event.preventDefault();
    actDelete();
  }
}

// ── 开关 ────────────────────────────────────────────────────
function close(): void {
  emit("update:visible", false);
}

/** 关闭时把攒着的入库/删除一次性提交，避免留下未落地的操作 */
async function teardown(): Promise<void> {
  if (importTimer) {
    clearTimeout(importTimer);
    importTimer = null;
  }
  if (deleteTimer) {
    clearTimeout(deleteTimer);
    deleteTimer = null;
  }
  await Promise.all([flushImports(), flushDeletes()]);
  emit("reviewed");
}

let wasVisible = false;

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      wasVisible = true;
      if (!queue.value.length && !finished.value && !inflightFetch) void fetchNext();
      return;
    }
    // 首次挂载时 visible=false，不该触发一次多余的刷新回调
    if (!wasVisible) return;
    wasVisible = false;
    void teardown();
  },
  { immediate: true },
);

onMounted(() => window.addEventListener("keydown", onKeydown));

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  if (importTimer) clearTimeout(importTimer);
  if (deleteTimer) clearTimeout(deleteTimer);
  if (autoRetryTimer) clearTimeout(autoRetryTimer);
  void flushImports();
  void flushDeletes();
});
</script>

<style scoped>
/* 全部取项目默认主题变量，明暗模式自动跟随 */
.qr {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  background: var(--app-content-bg-color);
}

/* ── 顶栏 ── */
.qr__bar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  padding: 6px 12px;
  background: var(--app-content-surface-color);
  border-bottom: 1px solid var(--app-content-border-color);
}

.qr__bar-lead {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.qr__bar-ops {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
}

.qr__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.qr__progress {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.qr__stat {
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 999px;
  white-space: nowrap;
}

.qr__stat--import {
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.qr__stat--delete {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.qr__stat--skip {
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color);
}

.qr__ghost {
  padding: 4px 10px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  transition: color 0.16s, border-color 0.16s, background-color 0.16s;
}

.qr__ghost:hover {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
}

.qr__close {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  font-size: 15px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 8px;
}

.qr__close:hover {
  color: var(--el-text-color-primary);
  background: var(--el-fill-color-light);
}

/* ── 层内轻提示 ── */
.qr__toasts {
  position: absolute;
  top: 56px;
  left: 50%;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  pointer-events: none;
  transform: translateX(-50%);
}

.qr__toast {
  padding: 7px 18px;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 999px;
  box-shadow: var(--el-box-shadow-light);
  animation: qr-toast-in 0.16s ease-out;
}

.qr__toast--success {
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
  border-color: var(--el-color-success-light-7);
}

.qr__toast--warning {
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
  border-color: var(--el-color-warning-light-7);
}

.qr__toast--error {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
  border-color: var(--el-color-danger-light-7);
}

@keyframes qr-toast-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── 主体：图片居中在上，信息在下 ── */
.qr__main {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

/* 图片区：占满剩余空间，图片居中 */
.qr__stage {
  position: relative;
  z-index: 0;
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  padding: 14px;
  overflow: hidden;
  cursor: grab;
  background: repeating-conic-gradient(
      var(--el-fill-color-light) 0% 25%,
      var(--el-bg-color) 0% 50%
    )
    50% / 20px 20px;
  /* 手势由组件接管：左右滑=忽略/入库，下滑=删除 */
  touch-action: none;
}

.qr__stage:active {
  cursor: grabbing;
}

.qr__stage--settle {
  transition: transform 0.22s ease-out;
}

.qr__stage img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

.qr__chips {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  pointer-events: none;
}

.qr__chip {
  padding: 2px 9px;
  font-size: 11px;
  color: var(--el-text-color-regular);
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 999px;
  box-shadow: var(--el-box-shadow-lighter);
}

.qr__chip--ok {
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
  border-color: var(--el-color-success-light-7);
}

.qr__hint {
  position: absolute;
  top: 50%;
  left: 50%;
  padding: 8px 22px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 2px;
  border-radius: 12px;
  transform: translate(-50%, -50%);
}

.qr__hint--import {
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
  border: 2px solid var(--el-color-success-light-5);
}

.qr__hint--delete {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
  border: 2px solid var(--el-color-danger-light-5);
}

.qr__hint--skip {
  color: var(--el-text-color-primary);
  background: var(--el-bg-color-overlay);
  border: 2px solid var(--el-border-color);
}

/* ── 信息面板：贴在图片下方 ── */
.qr__side {
  /* 抬到图片区之上：图片区是 position:relative，滑动时会画在静态元素上面 */
  position: relative;
  z-index: 1;
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  max-height: 30%;
  padding: 12px 16px 14px;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  background: var(--app-content-surface-color);
  border-top: 1px solid var(--app-content-border-color);
  border-radius: 18px 18px 0 0;
  corner-shape: squircle;
}

.qr__side-head {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto 10px;
}

.qr__name {
  margin: 0;
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 展开全部字段：紧凑态只露关键信息，点开才显示描述/原始地址/ID */
.qr__side-toggle {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  padding: 3px 10px;
  font-size: 12px;
  color: var(--el-color-primary);
  cursor: pointer;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 999px;
  corner-shape: squircle;
}

.qr__fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 8px 16px;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
}

.qr__field {
  min-width: 0;
}

.qr__field--full {
  grid-column: 1 / -1;
}

/* 紧凑态：默认只露关键字段，其余收进「全部字段」 */
.qr__field--more {
  display: none;
}

.qr__side--expanded .qr__field--more {
  display: block;
}

.qr__field dt {
  margin-bottom: 3px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

/* 紧凑态单行省略，保证面板高度稳定；展开后恢复完整多行 */
.qr__field dd {
  margin: 0;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qr__side--expanded .qr__field dd {
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
  white-space: normal;
}

.qr__field dd a {
  color: var(--el-color-primary);
  text-decoration: none;
}

.qr__field dd a:hover {
  text-decoration: underline;
}

.qr__id {
  font-family: var(--el-font-family-mono, monospace);
  font-size: 11px !important;
  color: var(--el-text-color-secondary) !important;
}

/* ── 空/加载态 ── */
.qr__state {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.qr__state-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.qr__state-desc {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.qr__state-btn {
  padding: 7px 18px;
  font-size: 13px;
  color: #fff;
  cursor: pointer;
  background: var(--el-color-primary);
  border: 0;
  border-radius: 8px;
}

.qr__state-btn:hover {
  opacity: 0.88;
}

.qr__spinner {
  width: 26px;
  height: 26px;
  border: 2px solid var(--el-border-color-lighter);
  border-top-color: var(--el-color-primary);
  border-radius: 50%;
  animation: qr-spin 0.7s linear infinite;
}

@keyframes qr-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── 底部动作 ── */
.qr__actions {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  justify-content: center;
  padding: 10px 12px max(10px, env(safe-area-inset-bottom));
  background: var(--app-content-surface-color);
  border-top: 1px solid var(--app-content-border-color);
}

.qr__action {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  min-width: 150px;
  padding: 11px 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 10px;
  transition: opacity 0.16s;
}

.qr__action:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.qr__action--skip {
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border-color: var(--el-border-color);
}

.qr__action--skip:hover:not(:disabled) {
  color: var(--el-text-color-primary);
  background: var(--el-fill-color);
}

.qr__action--delete {
  color: #fff;
  background: var(--el-color-danger);
}

.qr__action--import {
  color: #fff;
  background: var(--el-color-success);
}

.qr__action--delete:hover:not(:disabled),
.qr__action--import:hover:not(:disabled) {
  opacity: 0.86;
}

.qr__kbd {
  padding: 1px 6px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
  color: inherit;
  background: color-mix(in srgb, currentcolor 12%, transparent);
  border-radius: 4px;
}

/* ── 窄屏：信息面板移到图片下方 ── */
@media (width <= 768px) {
  .qr__bar {
    flex-wrap: wrap;
    row-gap: 6px;
    min-height: 42px;
    padding: 6px 8px;
  }

  /* 第一行：标题 + 已处理 + 关闭；统计与按钮整体换到第二行 */
  .qr__bar-lead {
    flex: 1 1 auto;
  }

  .qr__close {
    order: 2;
  }

  .qr__bar-ops {
    order: 3;
    flex: 1 1 100%;
    justify-content: flex-start;
    row-gap: 6px;
  }

  .qr__toasts {
    top: 88px;
  }

  .qr__stage {
    padding: 8px;
  }

  .qr__side {
    max-height: 34%;
    padding: 12px 12px 14px;
    border-radius: 16px 16px 0 0;
  }

  /* 展开后接近全屏，一次性读完所有字段 */
  .qr__side--expanded {
    max-height: 84%;
  }

  .qr__name {
    font-size: 14px;
  }

  .qr__fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 10px;
  }

  .qr__field dt {
    margin-bottom: 2px;
    font-size: 10px;
  }

  .qr__field dd {
    font-size: 12px;
    line-height: 1.4;
  }

  .qr__actions {
    gap: 8px;
    padding: 8px 8px max(8px, env(safe-area-inset-bottom));
  }

  .qr__action {
    min-width: 0;
    flex: 1 1 0;
    padding: 10px 6px;
    font-size: 14px;
  }
}

@media (width <= 480px) {
  .qr__bar-ops {
    gap: 6px;
  }

  .qr__stat,
  .qr__ghost {
    padding: 3px 7px;
    font-size: 11px;
  }

  .qr__progress {
    font-size: 11px;
  }

  .qr__kbd {
    display: none;
  }
}

/* ── 圆角统一走超椭圆（不支持的浏览器自动回退为普通圆角）── */
.qr__side,
.qr__side-toggle,
.qr__ghost,
.qr__close,
.qr__stat,
.qr__toast,
.qr__chip,
.qr__hint,
.qr__state-btn,
.qr__action,
.qr__kbd {
  corner-shape: squircle;
}
</style>
