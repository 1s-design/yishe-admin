<template>
  <teleport to="body">
    <div v-if="visible" class="qr">
      <!-- 顶栏：窄屏时统计与按钮换到第二行，关闭键始终在第一行右侧 -->
      <!-- 顶栏：简洁信息与极简计数 -->
      <header class="qr__bar">
        <div class="qr__bar-lead">
          <span class="qr__title">快捷审核</span>
          <span class="qr__badge">采集素材</span>
          <span class="qr__progress">
            {{ processedCount }}<template v-if="total"> / {{ total }}</template>
          </span>
        </div>

        <div class="qr__bar-ops">
          <div class="qr__stats">
            <span class="qr__stat-item">
              <i class="qr__stat-dot qr__stat-dot--import"></i>
              <span class="qr__stat-name">已入库</span>
              <span class="qr__stat-val">{{ importedCount }}</span>
            </span>
            <span class="qr__stat-divider">/</span>
            <span class="qr__stat-item">
              <i class="qr__stat-dot qr__stat-dot--delete"></i>
              <span class="qr__stat-name">已删除</span>
              <span class="qr__stat-val">{{ deletedCount }}</span>
            </span>
            <span class="qr__stat-divider">/</span>
            <span class="qr__stat-item">
              <i class="qr__stat-dot qr__stat-dot--skip"></i>
              <span class="qr__stat-name">已忽略</span>
              <span class="qr__stat-val">{{ skippedCount }}</span>
            </span>
          </div>

          <div class="qr__ops-divider"></div>

          <button
            v-if="canUndoDelete"
            type="button"
            class="qr__text-btn"
            title="撤销最近一次删除"
            @click="undoLastDelete"
          >
            撤销删除
          </button>
          <button
            v-if="skippedCount"
            type="button"
            class="qr__text-btn"
            title="把本次忽略的素材重新放回队列末尾"
            @click="resetSkipped"
          >
            重置忽略
          </button>
          <button
            type="button"
            class="qr__text-btn"
            title="重新从第一页加载"
            @click="reload"
          >
            重新加载
          </button>
          <button
            type="button"
            class="qr__text-btn"
            :title="sideCollapsed ? '显示素材信息' : '隐藏信息面板'"
            @click="sideCollapsed = !sideCollapsed"
          >
            {{ sideCollapsed ? "显示信息" : "隐藏信息" }}
          </button>
        </div>

        <button type="button" class="qr__close" title="关闭 (Esc)" @click="close">
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

          <!-- 极简元信息指示（去边框tag化，统一轻量背景） -->
          <div class="qr__meta-strip">
            <span v-if="dimensionText" class="qr__meta-item">{{ dimensionText }}</span>
            <span v-if="current.suffix" class="qr__meta-item">{{ current.suffix.toUpperCase() }}</span>
            <span v-if="current.fileSize" class="qr__meta-item">{{ formatFileSize(current.fileSize) }}</span>
            <span v-if="current.isCutout" class="qr__meta-badge is-ok">已抠图</span>
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

      <!-- 底部动作：悬浮毛玻璃胶囊 Dock 风格 -->
      <footer class="qr__dock">
        <div class="qr__dock-capsule">
          <button
            type="button"
            class="qr__dock-btn qr__dock-btn--skip"
            :disabled="!current"
            title="忽略该素材并看下一张（快捷键：← 或 A）"
            @click="actSkip"
          >
            <span class="qr__dock-arrow">←</span>
            <span class="qr__dock-text">忽略</span>
            <kbd class="qr__dock-kbd">A</kbd>
          </button>

          <div class="qr__dock-sep"></div>

          <button
            type="button"
            class="qr__dock-btn qr__dock-btn--delete"
            :disabled="!current"
            title="删除该素材（快捷键：↓ 或 S）"
            @click="actDelete"
          >
            <span class="qr__dock-arrow">↓</span>
            <span class="qr__dock-text">删除</span>
            <kbd class="qr__dock-kbd">S</kbd>
          </button>

          <div class="qr__dock-sep"></div>

          <button
            type="button"
            class="qr__dock-btn qr__dock-btn--import"
            :disabled="!current"
            title="入库该素材（快捷键：→ 或 D）"
            @click="actImport"
          >
            <span class="qr__dock-arrow">→</span>
            <span class="qr__dock-text">入库</span>
            <kbd class="qr__dock-kbd">D</kbd>
          </button>
        </div>
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

<style lang="scss" scoped>
.qr {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  background: var(--app-content-bg-color, #f7f9fc);
}

/* ── 顶栏：极简大气 ── */
.qr__bar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 14px;
  min-height: 48px;
  padding: 8px 18px;
  background: var(--app-content-surface-color, #ffffff);
  border-bottom: 1px solid var(--app-content-border-color, rgba(148, 163, 184, 0.22));
}

.qr__bar-lead {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.qr__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
  letter-spacing: -0.2px;
}

.qr__badge {
  padding: 1px 7px;
  font-size: 11px;
  color: var(--el-text-color-secondary, #64748b);
  background: var(--el-fill-color-light, rgba(0, 0, 0, 0.04));
  border-radius: 4px;
}

.qr__progress {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary, #64748b);
  white-space: nowrap;
}

.qr__bar-ops {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
}

/* 极简计数行（取代笨重边框tag） */
.qr__stats {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.qr__stat-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--el-text-color-secondary, #64748b);
}

.qr__stat-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.qr__stat-dot--import {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
}

.qr__stat-dot--delete {
  background: #f87171;
}

.qr__stat-dot--skip {
  background: #94a3b8;
}

.qr__stat-val {
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
}

.qr__stat-divider {
  color: var(--el-border-color-lighter, rgba(148, 163, 184, 0.4));
  font-size: 11px;
}

.qr__ops-divider {
  width: 1px;
  height: 14px;
  background: var(--app-content-border-color, rgba(148, 163, 184, 0.25));
}

/* 顶栏轻量文字按钮 */
.qr__text-btn {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--el-text-color-regular, #475569);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
  transition: color 0.15s, background-color 0.15s;

  &:hover {
    color: var(--el-color-primary, #3b82f6);
    background: var(--el-fill-color-light, rgba(0, 0, 0, 0.04));
  }
}

.qr__close {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 16px;
  color: var(--el-text-color-regular, #64748b);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
  transition: color 0.16s, background-color 0.16s;

  &:hover {
    color: var(--el-text-color-primary, #0f172a);
    background: var(--el-fill-color-light, rgba(0, 0, 0, 0.06));
  }
}

/* ── 层内轻提示 ── */
.qr__toasts {
  position: absolute;
  top: 58px;
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
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 500;
  color: #f1f5f9;
  white-space: nowrap;
  background: rgba(24, 24, 24, 0.94);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  animation: qr-toast-in 0.15s ease-out;

  &--success {
    color: #34d399;
    border-color: rgba(52, 211, 153, 0.25);
  }

  &--warning {
    color: #fbbf24;
    border-color: rgba(251, 191, 36, 0.25);
  }

  &--error {
    color: #f87171;
    border-color: rgba(248, 113, 113, 0.25);
  }
}

@keyframes qr-toast-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── 主体 ── */
.qr__main {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

/* 图片展示区：透明交替棋盘格背景 */
.qr__stage {
  position: relative;
  z-index: 0;
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  padding: 24px;
  overflow: hidden;
  cursor: grab;
  background: repeating-conic-gradient(
      #edf1f7 0% 25%,
      #ffffff 0% 50%
    )
    50% / 20px 20px;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }

  &--settle {
    transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);
  }

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    pointer-events: none;
    user-select: none;
    filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.35));
  }
}

/* 滑动指引浮层 */
.qr__hint {
  position: absolute;
  top: 50%;
  left: 50%;
  padding: 10px 24px;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 2px;
  border-radius: 8px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  backdrop-filter: blur(12px);

  &--import {
    color: #34d399;
    background: rgba(52, 211, 153, 0.2);
    border: 1px solid #34d399;
  }

  &--delete {
    color: #f87171;
    background: rgba(248, 113, 113, 0.2);
    border: 1px solid #f87171;
  }

  &--skip {
    color: #e2e8f0;
    background: rgba(30, 34, 45, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
}

/* ── 信息面板 ── */
.qr__side {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  max-height: 28%;
  padding: 12px 20px 14px;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  background: var(--app-content-surface-color, #ffffff);
  border-top: 1px solid var(--app-content-border-color, rgba(148, 163, 184, 0.22));

  &--expanded {
    .qr__field--more {
      display: block;
    }

    .qr__field dd {
      overflow: visible;
      overflow-wrap: anywhere;
      text-overflow: clip;
      white-space: normal;
    }
  }
}

.qr__side-head {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto 8px;
}

.qr__name {
  margin: 0;
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qr__side-toggle {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  padding: 2px 6px;
  font-size: 12px;
  color: var(--el-color-primary, #3b82f6);
  cursor: pointer;
  background: transparent;
  border: 0;
  transition: opacity 0.16s;

  &:hover {
    opacity: 0.8;
    text-decoration: underline;
  }
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

  &--full {
    grid-column: 1 / -1;
  }

  &--more {
    display: none;
  }

  dt {
    margin-bottom: 2px;
    font-size: 11px;
    color: var(--el-text-color-secondary, #64748b);
  }

  dd {
    margin: 0;
    overflow: hidden;
    font-size: 13px;
    line-height: 1.5;
    color: var(--el-text-color-regular, #334155);
    text-overflow: ellipsis;
    white-space: nowrap;

    a {
      color: var(--el-color-primary, #3b82f6);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

.qr__id {
  font-family: var(--el-font-family-mono, monospace);
  font-size: 11px !important;
  color: var(--el-text-color-secondary, #64748b) !important;
}

/* ── 空/加载态 ── */
.qr__state {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.qr__state-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
}

.qr__state-desc {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary, #64748b);
}

.qr__state-btn {
  padding: 6px 18px;
  font-size: 13px;
  color: #fff;
  cursor: pointer;
  background: var(--el-color-primary, #409eff);
  border: 0;
  border-radius: 6px;
  transition: opacity 0.16s;

  &:hover {
    opacity: 0.88;
  }
}

.qr__spinner {
  width: 26px;
  height: 26px;
  border: 2px solid var(--el-border-color-lighter, rgba(0, 0, 0, 0.1));
  border-top-color: var(--el-color-primary, #409eff);
  border-radius: 50%;
  animation: qr-spin 0.7s linear infinite;
}

@keyframes qr-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── 底部动作：悬浮毛玻璃胶囊 Dock ── */
.qr__dock {
  display: flex;
  flex: 0 0 auto;
  justify-content: center;
  align-items: center;
  padding: 14px 20px max(16px, env(safe-area-inset-bottom));
  background: linear-gradient(to top, rgba(247, 249, 252, 0.96) 0%, rgba(247, 249, 252, 0.45) 60%, transparent 100%);
  pointer-events: none;
}

.qr__dock-capsule {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 6px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 999px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.04);
}

.qr__dock-sep {
  width: 1px;
  height: 18px;
  background: rgba(148, 163, 184, 0.28);
}

.qr__dock-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--el-text-color-regular, #475569);
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;

  &:active:not(:disabled) {
    transform: scale(0.96);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.35;
  }
}

.qr__dock-arrow {
  font-size: 13px;
  opacity: 0.65;
  transition: transform 0.18s ease;
}

.qr__dock-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  color: var(--el-text-color-secondary, #64748b);
  background: rgba(15, 23, 42, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

/* 忽略按钮交互 (Light mode) */
.qr__dock-btn--skip:hover:not(:disabled) {
  color: var(--el-text-color-primary, #0f172a);
  background: rgba(15, 23, 42, 0.06);

  .qr__dock-arrow {
    transform: translateX(-2px);
    opacity: 1;
  }
}

/* 删除按钮 (Light mode) */
.qr__dock-btn--delete {
  color: #dc2626;

  .qr__dock-kbd {
    color: #dc2626;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.22);
  }

  &:hover:not(:disabled) {
    color: #ffffff;
    background: #ef4444;
    border-color: #ef4444;
    box-shadow: 0 2px 12px rgba(239, 68, 68, 0.28);

    .qr__dock-arrow {
      transform: translateY(2px);
      opacity: 1;
    }

    .qr__dock-kbd {
      color: #ffffff;
      background: rgba(0, 0, 0, 0.2);
      border-color: rgba(255, 255, 255, 0.3);
    }
  }
}

/* 入库按钮 (Light mode) */
.qr__dock-btn--import {
  color: #ffffff;
  background: #10b981;
  border-color: #10b981;
  box-shadow: 0 2px 10px rgba(16, 185, 129, 0.25);

  .qr__dock-kbd {
    color: #ffffff;
    background: rgba(0, 0, 0, 0.18);
    border-color: rgba(255, 255, 255, 0.28);
  }

  &:hover:not(:disabled) {
    background: #059669;
    border-color: #059669;
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);

    .qr__dock-arrow {
      transform: translateX(2px);
      opacity: 1;
    }
  }
}

/* ── 黑夜模式 (Dark Mode) 全局自适应（使用系统默认纯正黑底，彻底去除深蓝偏色） ── */
html.dark,
html[class*="dark"] {
  .qr {
    background: var(--app-content-bg-color, #101010);
  }

  .qr__bar {
    background: var(--app-content-surface-color, #151515);
    border-bottom-color: var(--app-content-border-color, rgba(255, 255, 255, 0.08));
  }

  .qr__title {
    color: #f0f2f5;
  }

  .qr__badge {
    color: #909399;
    background: rgba(255, 255, 255, 0.06);
  }

  .qr__progress {
    color: #808695;
  }

  .qr__stat-item {
    color: #909399;
  }

  .qr__stat-val {
    color: #e2e8f0;
  }

  .qr__stat-divider {
    color: rgba(255, 255, 255, 0.15);
  }

  .qr__ops-divider {
    background: rgba(255, 255, 255, 0.12);
  }

  .qr__text-btn {
    color: #9ca3af;

    &:hover {
      color: #60a5fa;
      background: rgba(255, 255, 255, 0.06);
    }
  }

  .qr__close {
    color: #c0c4cc;

    &:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.08);
    }
  }

  .qr__stage {
    background: repeating-conic-gradient(
        #1c1c1c 0% 25%,
        #121212 0% 50%
      )
      50% / 20px 20px;
  }

  .qr__side {
    background: var(--app-content-surface-color, #151515);
    border-top-color: var(--app-content-border-color, rgba(255, 255, 255, 0.08));
  }

  .qr__name {
    color: #f0f2f5;
  }

  .qr__side-toggle {
    color: #60a5fa;
  }

  .qr__field dt {
    color: #94a3b8;
  }

  .qr__field dd {
    color: #cbd5e1;

    a {
      color: #60a5fa;
    }
  }

  .qr__id {
    color: #94a3b8 !important;
  }

  .qr__state-title {
    color: #f0f2f5;
  }

  .qr__state-desc {
    color: #94a3b8;
  }

  .qr__spinner {
    border-color: rgba(255, 255, 255, 0.15);
    border-top-color: var(--el-color-primary, #409eff);
  }

  .qr__dock {
    background: linear-gradient(
      to top,
      rgba(16, 16, 16, 0.98) 0%,
      rgba(16, 16, 16, 0.5) 60%,
      transparent 100%
    );
  }

  .qr__dock-capsule {
    background: rgba(26, 26, 26, 0.94);
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.35);
  }

  .qr__dock-sep {
    background: rgba(255, 255, 255, 0.1);
  }

  .qr__dock-btn {
    color: #cbd5e1;
  }

  .qr__dock-kbd {
    color: rgba(255, 255, 255, 0.7);
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.14);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  .qr__dock-btn--skip:hover:not(:disabled) {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.08);
  }

  .qr__dock-btn--delete {
    color: #fca5a5;

    .qr__dock-kbd {
      color: #fca5a5;
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.25);
    }

    &:hover:not(:disabled) {
      color: #ffffff;
      background: #ef4444;
      border-color: #ef4444;
      box-shadow: 0 2px 12px rgba(239, 68, 68, 0.35);

      .qr__dock-kbd {
        color: #ffffff;
        background: rgba(0, 0, 0, 0.2);
        border-color: rgba(255, 255, 255, 0.25);
      }
    }
  }

  .qr__dock-btn--import {
    box-shadow: 0 2px 10px rgba(16, 185, 129, 0.3);

    &:hover:not(:disabled) {
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.45);
    }
  }
}

/* ── 移动端 / 窄屏适配 ── */
@media (width <= 768px) {
  .qr__bar {
    flex-wrap: wrap;
    row-gap: 6px;
    min-height: 42px;
    padding: 6px 12px;
  }

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
    top: 86px;
  }

  .qr__stage {
    padding: 12px;
  }

  .qr__side {
    max-height: 35%;
    padding: 10px 14px 12px;

    &--expanded {
      max-height: 85%;
    }
  }

  .qr__fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 10px;
  }

  .qr__dock {
    padding: 10px 12px max(10px, env(safe-area-inset-bottom));
  }

  .qr__dock-capsule {
    width: 100%;
    max-width: 420px;
    justify-content: space-between;
    gap: 2px;
    padding: 4px;
  }

  .qr__dock-btn {
    flex: 1 1 0;
    min-width: 0;
    padding: 0 8px;
    justify-content: center;
    gap: 4px;
    font-size: 12px;
  }

  .qr__dock-kbd {
    display: none;
  }
}
</style>
