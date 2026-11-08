<template>
  <teleport to="body">
    <div v-if="visible" class="sqr">
      <!-- ================= 左侧：文案舞台 ================= -->
      <section class="sqr__stage-wrap" :class="{ 'sqr__stage-wrap--undo': canUndoDelete }">
        <!-- 极简悬浮顶条 -->
        <header class="sqr__floating-bar">
          <div class="sqr__floating-left">
            <span class="sqr__floating-progress">
              {{ processedCount }}<template v-if="total"> / {{ total }}</template>
            </span>
            <span class="sqr__floating-badge">文案库</span>

            <button
              v-if="skippedCount"
              type="button"
              class="sqr__text-btn"
              title="把本次忽略的文案重新放回队列末尾"
              @click="resetSkipped"
            >
              重置忽略
            </button>
            <button
              type="button"
              class="sqr__text-btn"
              title="重新从第一页加载"
              @click="reload"
            >
              重新加载
            </button>
          </div>

          <div class="sqr__floating-right">
            <div class="sqr__stats">
              <span class="sqr__stat-item">
                <i class="sqr__stat-dot sqr__stat-dot--approve"></i>
                <span class="sqr__stat-name">已通过</span>
                <span class="sqr__stat-val">{{ approvedCount }}</span>
              </span>
              <span class="sqr__stat-divider">/</span>
              <span class="sqr__stat-item">
                <i class="sqr__stat-dot sqr__stat-dot--delete"></i>
                <span class="sqr__stat-name">已删除</span>
                <span class="sqr__stat-val">{{ deletedCount }}</span>
              </span>
              <span class="sqr__stat-divider">/</span>
              <span class="sqr__stat-item">
                <i class="sqr__stat-dot sqr__stat-dot--skip"></i>
                <span class="sqr__stat-name">已忽略</span>
                <span class="sqr__stat-val">{{ skippedCount }}</span>
              </span>
            </div>

            <button
              v-if="!current"
              type="button"
              class="sqr__floating-close"
              title="退出审核 (Esc)"
              @click="close"
            >
              <el-icon><Close /></el-icon>
            </button>
          </div>
        </header>

        <!-- 撤销删除胶囊 -->
        <transition name="sqr-undo-rise">
          <div v-if="canUndoDelete" class="sqr__undo" role="status">
            <span class="sqr__undo-dot" aria-hidden="true"></span>
            <span class="sqr__undo-text">待删 <b>{{ deleteQueue.length }}</b> 条</span>
            <span class="sqr__undo-sec">{{ deleteCountdown }}s</span>
            <span class="sqr__undo-split" aria-hidden="true"></span>
            <button
              type="button"
              class="sqr__undo-act"
              title="撤销最近一条误删文案（快捷键：Z 或 Ctrl+Z）"
              @click="undoLastDelete"
            >
              <span class="sqr__undo-icon" aria-hidden="true">↺</span>撤回<kbd class="sqr__undo-kbd">Z</kbd>
            </button>
            <button
              v-if="deleteQueue.length > 1"
              type="button"
              class="sqr__undo-all"
              title="全部恢复回待审队列"
              @click="undoAllDeletes"
            >
              全部
            </button>
            <span
              :key="deleteCountdownKey"
              class="sqr__undo-progress"
              :style="{ animationDuration: `${DELETE_DEBOUNCE}ms` }"
              aria-hidden="true"
            ></span>
          </div>
        </transition>

        <!-- 层内轻提示 -->
        <div class="sqr__toasts">
          <div
            v-for="toast in toasts"
            :key="toast.id"
            class="sqr__toast"
            :class="`sqr__toast--${toast.tone}`"
          >
            {{ toast.text }}
          </div>
        </div>

        <!-- 舞台：大字排版展示当前文案 -->
        <div
          v-if="current"
          class="sqr__stage"
          :class="{ 'sqr__stage--settle': !dragging }"
          :style="stageStyle"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
        >
          <div class="sqr__quote" :style="quoteStyle">
            <p class="sqr__quote-text">{{ current.content }}</p>
            <p v-if="current.description" class="sqr__quote-desc">{{ current.description }}</p>
          </div>

          <div v-if="swipeHint" class="sqr__hint" :class="`sqr__hint--${swipeHint}`">
            {{ SWIPE_HINT_TEXT[swipeHint] }}
          </div>
        </div>

        <div v-else-if="loading" class="sqr__state">
          <span class="sqr__spinner"></span>
          <p class="sqr__state-title">正在加载文案…</p>
        </div>

        <div v-else-if="loadError" class="sqr__state">
          <p class="sqr__state-title">加载失败</p>
          <p class="sqr__state-desc">{{ loadError }}</p>
          <button type="button" class="sqr__state-btn" @click="retry">重试</button>
        </div>

        <div v-else class="sqr__state">
          <p class="sqr__state-title">已审核完全部文案</p>
          <p class="sqr__state-desc">
            本次共处理 {{ processedCount }} 条（通过 {{ approvedCount }} · 删除 {{ deletedCount }} · 忽略 {{ skippedCount }}）
          </p>
          <div class="mt-4 flex gap-3 justify-center">
            <button type="button" class="sqr__state-btn" @click="reload">重新加载</button>
            <button type="button" class="sqr__state-btn sqr__state-btn--sub" @click="close">关闭退出</button>
          </div>
        </div>

        <!-- 底部动作 Dock -->
        <footer class="sqr__dock">
          <div class="sqr__dock-capsule">
            <button
              type="button"
              class="sqr__dock-btn sqr__dock-btn--skip"
              :disabled="!canReview"
              title="忽略该文案并看下一条（快捷键：← 或 A）"
              @click="actSkip"
            >
              <span class="sqr__dock-arrow">←</span>
              <span class="sqr__dock-text">忽略</span>
              <kbd class="sqr__dock-kbd">A</kbd>
            </button>

            <div class="sqr__dock-sep"></div>

            <button
              type="button"
              class="sqr__dock-btn sqr__dock-btn--delete"
              :disabled="!canReview"
              title="不要，删除该文案（快捷键：↓ 或 S）"
              @click="actDelete"
            >
              <span class="sqr__dock-arrow">↓</span>
              <span class="sqr__dock-text">删除</span>
              <kbd class="sqr__dock-kbd">S</kbd>
            </button>

            <div class="sqr__dock-sep"></div>

            <button
              type="button"
              class="sqr__dock-btn sqr__dock-btn--approve"
              :disabled="!canReview"
              title="通过审核，标记为可用（快捷键：→ 或 D）"
              @click="actApprove"
            >
              <span class="sqr__dock-arrow">→</span>
              <span class="sqr__dock-text">通过</span>
              <kbd class="sqr__dock-kbd">D</kbd>
            </button>
          </div>
        </footer>
      </section>

      <!-- ================= 右侧：详情面板 ================= -->
      <aside class="sqr__side">
        <div class="sqr__side-header">
          <span class="sqr__side-title">文案详情</span>
          <button type="button" class="sqr__side-close" title="退出审核 (Esc)" @click="close">
            <el-icon><Close /></el-icon>
          </button>
        </div>

        <div ref="sideRef" class="sqr__side-body">
          <template v-if="current">
            <!-- 1. 内容全文 -->
            <div class="sqr__meta-section">
              <p class="sqr__full-content">{{ current.content }}</p>

              <div class="sqr__sub-meta">
                <span class="sqr__mono-id">#{{ current.id }}</span>
                <span class="sqr__meta-dot">·</span>
                <span class="sqr__meta-text">{{ sourceText }}</span>
                <span class="sqr__meta-dot">·</span>
                <span class="sqr__meta-text">{{ createTimeText }}</span>
              </div>

              <div class="sqr__pills-group">
                <span class="sqr__pill sqr__pill--warning">待审核</span>
                <span class="sqr__pill sqr__pill--info">{{ languageLabel }}</span>
                <span
                  v-if="typeof current.meta?.copyrightFree === 'boolean'"
                  class="sqr__pill"
                  :class="current.meta.copyrightFree ? 'sqr__pill--success' : 'sqr__pill--danger'"
                >
                  {{ current.meta.copyrightFree ? "可商用" : "注意版权" }}
                </span>
              </div>
            </div>

            <!-- 2. 指标行 -->
            <div class="sqr__specs-banner">
              <div class="sqr__spec-col">
                <span class="sqr__spec-label">字数</span>
                <span class="sqr__spec-val">{{ contentLength }}</span>
              </div>
              <div class="sqr__spec-divider"></div>
              <div class="sqr__spec-col">
                <span class="sqr__spec-label">作者</span>
                <span class="sqr__spec-val sqr__spec-val--ellipsis" :title="current.meta?.author || ''">
                  {{ current.meta?.author || "-" }}
                </span>
              </div>
              <div class="sqr__spec-divider"></div>
              <div class="sqr__spec-col">
                <span class="sqr__spec-label">发布状态</span>
                <span class="sqr__spec-val">{{ current.isPublish ? "已发布" : "未发布" }}</span>
              </div>
              <div class="sqr__spec-divider"></div>
              <div class="sqr__spec-col">
                <span class="sqr__spec-label">文件夹</span>
                <span class="sqr__spec-val sqr__spec-val--ellipsis" :title="current.folder || ''">
                  {{ current.folder || "未分类" }}
                </span>
              </div>
            </div>

            <!-- 3. 描述与关键词 -->
            <div v-if="current.description || current.keywords" class="sqr__extra-panel">
              <div v-if="current.keywords" class="sqr__extra-row">
                <span class="sqr__extra-k">关键词</span>
                <span class="sqr__extra-v select-text">{{ current.keywords }}</span>
              </div>
              <div v-if="current.description" class="sqr__extra-row">
                <span class="sqr__extra-k">描述</span>
                <span class="sqr__extra-v select-text">{{ current.description }}</span>
              </div>
            </div>
          </template>

          <div v-else class="sqr__side-placeholder">
            <div v-if="loading" class="sqr__ph" aria-hidden="true">
              <span class="sqr__ph-line sqr__ph-line--title"></span>
              <span class="sqr__ph-line sqr__ph-line--meta"></span>
              <div class="sqr__ph-specs">
                <span v-for="i in 4" :key="i" class="sqr__ph-cell"></span>
              </div>
              <span class="sqr__ph-line"></span>
              <span class="sqr__ph-line qr__ph-line--short sqr__ph-line--short"></span>
            </div>
            <p v-else class="sqr__side-hint">{{ loadError ? "文案加载失败" : "暂无待审核文案" }}</p>
          </div>
        </div>

        <!-- 侧边栏贴底操作栏 -->
        <div class="sqr__side-footer">
          <button
            type="button"
            class="sqr__submit-btn"
            :disabled="!canReview"
            title="通过审核（快捷键：D 或 →）"
            @click="actApprove"
          >
            <span>通过审核</span>
            <kbd class="sqr__kbd-hint">D / →</kbd>
          </button>
          <button
            type="button"
            class="sqr__delete-btn"
            :disabled="!canReview"
            title="不要，删除该文案（快捷键：S 或 ↓）"
            @click="actDelete"
          >
            <span>删除</span>
            <kbd class="sqr__kbd-hint">S / ↓</kbd>
          </button>
        </div>
      </aside>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { Close } from "@element-plus/icons-vue";
import { searchSentences, getSentence, batchReviewSentences, deleteSentence } from "@/api/sentence";
import { formatTimestamp } from "@/common/date";

defineOptions({ name: "SentenceQuickReview" });

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

const PAGE_SIZE = 50;
const PREFETCH_THRESHOLD = 40;
/** 攒批提交：批越大单次接口越慢，审核手感取决于单次往返时间 */
/** 通过攒够多少条立刻提交 */
const APPROVE_BATCH = 20;
/** 删除攒够多少条立刻提交（留足撤销空间） */
const DELETE_BATCH = 50;
const APPROVE_DEBOUNCE = 800;
/** 删除提交防抖倒计时：给用户充裕的反悔窗口 */
const DELETE_DEBOUNCE = 8000;
/** 判定为滑动的位移阈值（px） */
const SWIPE_THRESHOLD = 70;

const SWIPE_HINT_TEXT: Record<string, string> = {
  approve: "通过",
  delete: "删除",
  skip: "忽略",
};

// ── 队列与游标 ──────────────────────────────────────────────
/** 待审核队列，队首即当前文案 */
const queue = ref<any[]>([]);
const loading = ref(false);
const loadError = ref("");
const finished = ref(false);
const total = ref(0);
/**
 * 下一条待取数据在「库中的偏移量」。
 * 通过（reviewStatus 0→1）与删除都会让 reviewStatus=0 的筛选结果整体前移，
 * 因此每次提交成功后同步回退。
 */
const nextOffset = ref(0);
/** 已提交（通过/删除）、但接口还在飞行中的条数 */
const pendingFlushOffset = ref(0);
let settledFlushCount = 0;
/** 已取过的 id，防止分页错位时重复出现 */
const seenIds = ref<Set<string>>(new Set());

// ── 计数 ────────────────────────────────────────────────────
const approvedCount = ref(0);
const deletedCount = ref(0);
const skippedCount = ref(0);
const processedCount = computed(
  () => approvedCount.value + deletedCount.value + skippedCount.value,
);

// ── 忽略（仅本次页面会话，不落库）──────────────────────────
const skippedItems = ref<any[]>([]);

// ── 待提交队列 ──────────────────────────────────────────────
const approveQueue = ref<any[]>([]);
const deleteQueue = ref<any[]>([]);

// ── 层内轻提示 ──────────────────────────────────────────────
const TOAST_DURATION = 1600;
const toasts = ref<Array<{ id: number; text: string; tone: string }>>([]);
let toastSeq = 0;
const toastTimers = new Map<number, ReturnType<typeof setTimeout>>();

function pushToast(text: string, tone: "info" | "success" | "warning" | "error" = "info"): void {
  const last = toasts.value[toasts.value.length - 1];
  const id = last && last.text === text ? last.id : ++toastSeq;
  if (id !== last?.id) {
    toasts.value.push({ id, text, tone });
    if (toasts.value.length > 3) {
      const dropped = toasts.value.shift();
      if (dropped) {
        clearTimeout(toastTimers.get(dropped.id));
        toastTimers.delete(dropped.id);
      }
    }
  }
  clearTimeout(toastTimers.get(id));
  toastTimers.set(
    id,
    setTimeout(() => {
      toastTimers.delete(id);
      const index = toasts.value.findIndex((item) => item.id === id);
      if (index >= 0) toasts.value.splice(index, 1);
    }, TOAST_DURATION),
  );
}

/** 面板开着走层内提示，面板已关闭（提交落尾）才用全局提示 */
function notify(text: string, tone: "info" | "success" | "warning" | "error" = "info"): void {
  if (props.visible) pushToast(text, tone);
  else ElMessage({ message: text, type: tone, duration: 2600 });
}

const current = computed(() => queue.value[0] ?? null);
const canReview = computed(() => props.visible && !!current.value);
const canUndoDelete = computed(() => deleteQueue.value.length > 0);

// ── 删除倒计时与进度管理 ────────────────────────────────────
const deleteCountdown = ref(Math.round(DELETE_DEBOUNCE / 1000));
const deleteCountdownKey = ref(0);
let deleteInterval: ReturnType<typeof setInterval> | null = null;
let deleteStartTime = 0;

function clearDeleteCountdown(): void {
  if (deleteInterval) {
    clearInterval(deleteInterval);
    deleteInterval = null;
  }
  deleteCountdown.value = Math.round(DELETE_DEBOUNCE / 1000);
}

function startDeleteCountdown(): void {
  clearDeleteCountdown();
  deleteStartTime = Date.now();
  deleteCountdownKey.value += 1;

  deleteInterval = setInterval(() => {
    const elapsed = Date.now() - deleteStartTime;
    const remaining = Math.max(0, DELETE_DEBOUNCE - elapsed);
    deleteCountdown.value = Math.max(1, Math.ceil(remaining / 1000));
    if (remaining <= 0) clearDeleteCountdown();
  }, 1000);
}

/** 详情面板：换文案后把滚动位置复位 */
const sideRef = ref<HTMLElement | null>(null);

watch(
  () => current.value?.id,
  () => {
    onPointerCancel();
    if (sideRef.value) sideRef.value.scrollTop = 0;
    void loadCurrentDetail();
  },
  { flush: "post" },
);

/** basic 列表没有 description/keywords，为当前条拉全量并就地合并 */
async function loadCurrentDetail(): Promise<void> {
  const row = current.value;
  if (!row || row.description !== undefined) return;
  try {
    const res = await getSentence(row.id);
    if (res && current.value && String(current.value.id) === String(res.id)) {
      queue.value[0] = { ...row, ...res };
    }
  } catch {
    /* 拉取失败就用 basic 数据展示，不阻塞审核 */
  }
}

const contentLength = computed(() =>
  current.value?.content ? Array.from(current.value.content).length : 0,
);

const languageLabel = computed(() => {
  const map: Record<string, string> = {
    zh: "中文", en: "英文", ja: "日文", ko: "韩文", mixed: "中英混合",
  };
  return map[current.value?.language] || current.value?.language || "-";
});

const sourceText = computed(() => current.value?.meta?.source || "文案库");
const createTimeText = computed(() => formatTimestamp(current.value?.updatedAt) || "-");

/** 舞台字号随文案长度自适应：短句大字冲击力，长文自动缩小 */
const quoteStyle = computed(() => {
  const len = contentLength.value;
  let size = 40;
  if (len > 120) size = 20;
  else if (len > 60) size = 26;
  else if (len > 30) size = 32;
  return { fontSize: `${size}px` };
});

// ── 取数 ────────────────────────────────────────────────────
let inflightFetch: Promise<void> | null = null;
let fetchEpoch = 0;

async function fetchNext(): Promise<void> {
  if (inflightFetch) return inflightFetch;
  if (!props.visible || finished.value || loadError.value || queue.value.length > PREFETCH_THRESHOLD) return;
  const epoch = fetchEpoch;

  inflightFetch = (async () => {
    loading.value = true;
    try {
      while (props.visible && queue.value.length <= PREFETCH_THRESHOLD) {
        const pending = pendingFlushOffset.value;
        const settled = settledFlushCount;
        const offset = Math.max(0, nextOffset.value - pending);
        const pageNo = Math.floor(offset / PAGE_SIZE) + 1;
        const drop = offset % PAGE_SIZE;
        const res: any = await searchSentences({
          ...props.query,
          reviewStatus: 0,
          fields: "basic",
          currentPage: pageNo,
          pageSize: PAGE_SIZE,
        });
        if (epoch !== fetchEpoch) return;

        const list = Array.isArray(res?.list) ? res.list : [];
        if (res?.total !== undefined) total.value = Number(res.total) || 0;
        const rows = list.slice(drop);
        const fresh = rows.filter((item: any) => {
          const id = String(item?.id ?? "");
          if (!id || seenIds.value.has(id)) return false;
          seenIds.value.add(id);
          return true;
        });

        nextOffset.value = Math.max(0, offset + rows.length + pending - (settledFlushCount - settled));
        if (!rows.length) {
          finished.value = true;
          break;
        }
        queue.value.push(...fresh.map((item: any) => markRaw(item)));
      }
      loadError.value = "";
      autoRetryLeft = 2;
    } catch (error: any) {
      if (epoch !== fetchEpoch) return;
      loadError.value = error?.message || "网络异常，请重试";
      scheduleAutoRetry();
    } finally {
      if (epoch === fetchEpoch) {
        loading.value = false;
        inflightFetch = null;
      }
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

function afterAdvance(): void {
  if (queue.value.length <= PREFETCH_THRESHOLD) void fetchNext();
}

function retry(): void {
  loadError.value = "";
  autoRetryLeft = 2;
  void fetchNext();
}

function reload(): void {
  fetchEpoch += 1;
  inflightFetch = null;
  queue.value = [];
  seenIds.value = new Set();
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
  if (!canReview.value) return;
  const item = queue.value.shift();
  if (!item) return;
  skippedItems.value.push(item);
  skippedCount.value += 1;
  pushToast("已忽略");
  afterAdvance();
}

function actApprove(): void {
  if (!canReview.value) return;
  const item = queue.value.shift();
  if (!item) return;
  approveQueue.value.push(item);
  approvedCount.value += 1;
  pushToast("已通过", "success");
  scheduleApproveFlush();
  afterAdvance();
}

function actDelete(): void {
  if (!canReview.value) return;
  const item = queue.value.shift();
  if (!item) return;
  deleteQueue.value.push(item);
  deletedCount.value += 1;
  scheduleDeleteFlush();
  afterAdvance();
}

function resetSkipped(): void {
  if (!skippedItems.value.length) return;
  const items = skippedItems.value.splice(0, skippedItems.value.length);
  skippedCount.value = 0;
  queue.value.push(...items);
  pushToast(`已把 ${items.length} 条忽略的文案放回队列`, "success");
  afterAdvance();
}

// ── 通过提交（攒批）────────────────────────────────────────
let approveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleApproveFlush(): void {
  if (approveTimer) clearTimeout(approveTimer);
  if (approveQueue.value.length >= APPROVE_BATCH) {
    void flushApproves();
    return;
  }
  approveTimer = setTimeout(() => {
    approveTimer = null;
    void flushApproves();
  }, APPROVE_DEBOUNCE);
}

async function flushApproves(): Promise<void> {
  if (approveTimer) {
    clearTimeout(approveTimer);
    approveTimer = null;
  }
  if (!approveQueue.value.length) return;

  const items = approveQueue.value.splice(0, approveQueue.value.length);
  const count = items.length;
  pendingFlushOffset.value += count;
  try {
    await batchReviewSentences({ ids: items.map((item: any) => Number(item.id)), reviewStatus: 1 });
    settledFlushCount += count;
    pendingFlushOffset.value = Math.max(0, pendingFlushOffset.value - count);
    nextOffset.value = Math.max(0, nextOffset.value - count);
  } catch (error: any) {
    approvedCount.value = Math.max(0, approvedCount.value - count);
    settledFlushCount += count;
    pendingFlushOffset.value = Math.max(0, pendingFlushOffset.value - count);
    nextOffset.value = Math.max(0, nextOffset.value - count);
    notify(`通过提交失败：${error?.message || "未知错误"}`, "error");
  }
}

// ── 删除提交（攒批；提交成功才回退偏移量）──────────────────
let deleteTimer: ReturnType<typeof setTimeout> | null = null;
let inflightDelete: Promise<void> | null = null;

function scheduleDeleteFlush(): void {
  if (deleteTimer) clearTimeout(deleteTimer);
  if (deleteQueue.value.length >= DELETE_BATCH) {
    clearDeleteCountdown();
    void flushDeletes();
    return;
  }
  startDeleteCountdown();
  deleteTimer = setTimeout(() => {
    deleteTimer = null;
    clearDeleteCountdown();
    void flushDeletes();
  }, DELETE_DEBOUNCE);
}

async function flushDeletes(): Promise<void> {
  if (deleteTimer) {
    clearTimeout(deleteTimer);
    deleteTimer = null;
  }
  clearDeleteCountdown();
  if (inflightDelete) await inflightDelete;
  if (!deleteQueue.value.length) return;

  const items = deleteQueue.value.splice(0, deleteQueue.value.length);
  const count = items.length;
  pendingFlushOffset.value += count;

  inflightDelete = (async () => {
    const results = await Promise.allSettled(items.map((item: any) => deleteSentence(item.id)));
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) {
      deletedCount.value = Math.max(0, deletedCount.value - (count - failed));
      notify(`删除提交：成功 ${count - failed} 条，失败 ${failed} 条`, "warning");
    }
    settledFlushCount += count;
    pendingFlushOffset.value = Math.max(0, pendingFlushOffset.value - count);
    nextOffset.value = Math.max(0, nextOffset.value - count);
  })();

  try {
    await inflightDelete;
  } finally {
    inflightDelete = null;
  }
}

/** 撤销单条删除（在倒计时内随时放回待审队列首位） */
function undoLastDelete(): void {
  const item = deleteQueue.value.pop();
  if (!item) return;
  deletedCount.value = Math.max(0, deletedCount.value - 1);
  queue.value.unshift(item);
  pushToast("已撤销删除，文案已放回待审队列", "success");

  if (!deleteQueue.value.length) {
    if (deleteTimer) {
      clearTimeout(deleteTimer);
      deleteTimer = null;
    }
    clearDeleteCountdown();
  } else {
    scheduleDeleteFlush();
  }
}

/** 批量全部撤回当前所有待删除文案 */
function undoAllDeletes(): void {
  if (!deleteQueue.value.length) return;
  const count = deleteQueue.value.length;
  const items = deleteQueue.value.splice(0, count);
  deletedCount.value = Math.max(0, deletedCount.value - count);
  queue.value.unshift(...items.reverse());
  if (deleteTimer) {
    clearTimeout(deleteTimer);
    deleteTimer = null;
  }
  clearDeleteCountdown();
  pushToast(`已全部撤回 ${count} 条待删除文案`, "success");
}

// ── 滑动交互 ────────────────────────────────────────────────
const dragging = ref(false);
const swipe = ref({ x: 0, y: 0 });
let pointerStart = { x: 0, y: 0 };

const stageStyle = computed(() => {
  if (!dragging.value) return {};
  return {
    transform: `translate3d(${swipe.value.x}px, ${swipe.value.y}px, 0) rotate(${swipe.value.x * 0.02}deg)`,
    opacity: `${Math.max(0.5, 1 - Math.abs(swipe.value.x) / 400)}`,
  };
});

const swipeHint = computed(() => {
  if (!dragging.value) return "";
  const { x, y } = swipe.value;
  if (Math.abs(x) < 40 && Math.abs(y) < 40) return "";
  if (Math.abs(x) >= Math.abs(y)) return x > 0 ? "approve" : "skip";
  return y > 0 ? "delete" : "";
});

function onPointerDown(event: PointerEvent): void {
  if (!canReview.value) return;
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
    if (x > 0) actApprove();
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
  if (!props.visible || event.repeat) return;

  if (event.key === "Escape") {
    close();
    return;
  }

  if (
    event.key === "z" ||
    event.key === "Z" ||
    ((event.ctrlKey || event.metaKey) && (event.key === "z" || event.key === "Z"))
  ) {
    if (canUndoDelete.value) {
      event.preventDefault();
      undoLastDelete();
      return;
    }
  }

  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    event.preventDefault();
    actSkip();
  } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    event.preventDefault();
    actApprove();
  } else if (
    event.key === "ArrowDown" ||
    event.key === "s" ||
    event.key === "S" ||
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

/** 关闭时把攒着的通过/删除一次性提交，避免留下未落地的操作 */
async function teardown(): Promise<void> {
  fetchEpoch += 1;
  inflightFetch = null;
  loading.value = false;
  clearDeleteCountdown();
  if (approveTimer) {
    clearTimeout(approveTimer);
    approveTimer = null;
  }
  if (deleteTimer) {
    clearTimeout(deleteTimer);
    deleteTimer = null;
  }
  await Promise.all([flushApproves(), flushDeletes()]);
  emit("reviewed");
}

let wasVisible = false;

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      wasVisible = true;
      if (queue.value.length <= PREFETCH_THRESHOLD) void fetchNext();
      return;
    }
    if (!wasVisible) return;
    wasVisible = false;
    void teardown();
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  fetchEpoch += 1;
  if (approveTimer) clearTimeout(approveTimer);
  if (deleteTimer) clearTimeout(deleteTimer);
  if (autoRetryTimer) clearTimeout(autoRetryTimer);
  toastTimers.forEach((timer) => clearTimeout(timer));
  toastTimers.clear();
  clearDeleteCountdown();
  void flushApproves();
  void flushDeletes();
});
</script>

<style lang="scss" scoped>
@keyframes sqr-busy {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(320%);
  }
}

@keyframes sqr-undo-countdown {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

.sqr {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  background: var(--app-content-bg-color, #f7f9fc);
  --sqr-primary-on-tint: var(--el-color-primary, #3b82f6);
}

/* ── 左侧舞台 ── */
.sqr__stage-wrap {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 30%, rgba(59, 130, 246, 0.04), transparent 55%),
    var(--app-content-bg-color, #f7f9fc);
}

.sqr__floating-bar {
  position: absolute;
  top: 14px;
  left: 14px;
  right: 14px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
  pointer-events: none;
}

.sqr__floating-left,
.sqr__floating-right {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.sqr__floating-left {
  flex-wrap: wrap;
  row-gap: 6px;
}

.sqr__floating-right {
  flex-shrink: 0;
  margin-left: auto;
}

.sqr__floating-progress,
.sqr__floating-badge,
.sqr__text-btn,
.sqr__stat-item {
  white-space: nowrap;
}

.sqr__floating-progress {
  font-size: 13px;
  font-weight: 700;
  color: var(--sqr-primary-on-tint);
  font-variant-numeric: tabular-nums;
}

.sqr__floating-badge {
  font-size: 11px;
  color: var(--el-text-color-secondary, #64748b);
}

.sqr__floating-close {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--el-text-color-secondary, #64748b);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: color 0.15s ease;

  &:hover {
    color: var(--el-text-color-primary, #0f172a);
  }
}

.sqr__stats {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.sqr__stat-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--el-text-color-secondary, #64748b);
}

.sqr__stat-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.sqr__stat-dot--approve {
  background: #10b981;
}

.sqr__stat-dot--delete {
  background: #f87171;
}

.sqr__stat-dot--skip {
  background: #94a3b8;
}

.sqr__stat-val {
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
}

.sqr__stat-divider {
  color: var(--el-border-color-lighter, rgba(148, 163, 184, 0.4));
  font-size: 11px;
}

.sqr__text-btn {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--el-text-color-regular, #475569);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
  transition: color 0.15s ease;

  &:hover {
    color: var(--sqr-primary-on-tint);
  }
}

/* ── 层内轻提示 ── */
.sqr__toasts {
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

.sqr__toast {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  color: #f1f5f9;
  white-space: nowrap;
  background: rgba(24, 24, 24, 0.94);
  border: none;
  border-radius: 4px;
  animation: sqr-toast-in 0.15s ease-out;

  &--success {
    color: #34d399;
  }

  &--warning {
    color: #fbbf24;
  }

  &--error {
    color: #f87171;
  }
}

@keyframes sqr-toast-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── 文案舞台 ── */
.sqr__stage {
  position: relative;
  z-index: 0;
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  padding: 72px 48px var(--sqr-stage-bottom, 96px);
  overflow: hidden;
  cursor: grab;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }

  &--settle {
    transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s ease;
  }
}

.sqr__quote {
  max-width: 860px;
  max-height: 100%;
  overflow-y: auto;
  text-align: center;
  user-select: none;
}

.sqr__quote-text {
  margin: 0;
  font-weight: 600;
  line-height: 1.7;
  letter-spacing: 0.02em;
  color: var(--el-text-color-primary, #0f172a);
  word-break: break-word;
}

.sqr__quote-desc {
  margin: 20px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--el-text-color-secondary, #64748b);
}

.sqr__stage-wrap--undo {
  --sqr-stage-bottom: 110px;
}

.sqr__hint {
  position: absolute;
  top: 50%;
  left: 50%;
  padding: 10px 24px;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 2px;
  border-radius: 6px;
  transform: translate(-50%, -50%);
  pointer-events: none;

  &--approve {
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

/* ── 撤销删除胶囊 ── */
.sqr__undo {
  position: absolute;
  bottom: 96px;
  left: 50%;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 12px;
  color: var(--el-text-color-regular, #334155);
  white-space: nowrap;
  background: var(--app-content-surface-color, #ffffff);
  border: 1px solid var(--app-content-border-color, rgba(148, 163, 184, 0.25));
  border-radius: 999px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  transform: translateX(-50%);
  overflow: hidden;
}

.sqr__undo-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  background: #f87171;
  border-radius: 50%;
}

.sqr__undo-text b {
  color: var(--el-color-danger, #ef4444);
}

.sqr__undo-sec {
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary, #64748b);
}

.sqr__undo-split {
  width: 1px;
  height: 14px;
  background: var(--el-border-color-lighter, rgba(148, 163, 184, 0.35));
}

.sqr__undo-act,
.sqr__undo-all {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--sqr-primary-on-tint);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;

  &:hover {
    background: var(--el-fill-color-light, rgba(0, 0, 0, 0.05));
  }
}

.sqr__undo-kbd {
  padding: 0 4px;
  font-size: 10px;
  line-height: 14px;
  border: 1px solid currentColor;
  border-radius: 3px;
  opacity: 0.7;
}

.sqr__undo-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--el-color-danger, #ef4444);
  transform-origin: left;
  animation: sqr-undo-countdown linear forwards;
}

.sqr-undo-rise-enter-active,
.sqr-undo-rise-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.sqr-undo-rise-enter-from,
.sqr-undo-rise-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

/* ── 右侧详情面板 ── */
.sqr__side {
  width: 390px;
  flex-shrink: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--app-content-surface-color, #ffffff);
  border-left: 1px solid var(--app-content-border-color, rgba(148, 163, 184, 0.22));
  overflow: hidden;
  z-index: 10;
}

.sqr__side-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px 2px;
}

.sqr__side-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
}

.sqr__side-close {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--el-text-color-secondary, #64748b);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 15px;
  transition: color 0.15s ease;

  &:hover {
    color: var(--el-color-danger, #ef4444);
  }
}

.sqr__side-body {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 14px 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sqr__meta-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sqr__full-content {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.8;
  color: var(--el-text-color-primary, #0f172a);
  word-break: break-word;
  white-space: pre-wrap;
}

.sqr__sub-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #64748b);
}

.sqr__mono-id {
  font-family: var(--el-font-family-mono, monospace);
  font-weight: 600;
  color: var(--sqr-primary-on-tint);
}

.sqr__meta-dot {
  color: var(--el-border-color, #cbd5e1);
}

.sqr__meta-text {
  color: var(--el-text-color-secondary, #64748b);
}

.sqr__pills-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 2px;
}

.sqr__pill {
  font-size: 11px;
  font-weight: 500;
  line-height: 16px;

  &--success {
    color: var(--el-color-success, #10b981);
  }

  &--warning {
    color: var(--el-color-warning, #f59e0b);
  }

  &--danger {
    color: var(--el-color-danger, #ef4444);
  }

  &--info {
    color: var(--sqr-primary-on-tint);
  }
}

.sqr__specs-banner {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 4px 0;
}

.sqr__spec-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  max-width: 86px;
}

.sqr__spec-label {
  font-size: 11px;
  color: var(--el-text-color-secondary, #64748b);
}

.sqr__spec-val {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
  font-variant-numeric: tabular-nums;

  &--ellipsis {
    max-width: 86px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.sqr__spec-divider {
  width: 1px;
  height: 20px;
  background: var(--app-content-border-color, rgba(148, 163, 184, 0.2));
}

.sqr__extra-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sqr__extra-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
}

.sqr__extra-k {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--el-text-color-secondary, #64748b);
  font-weight: 500;
}

.sqr__extra-v {
  color: var(--el-text-color-regular, #334155);
  line-height: 1.5;
  word-break: break-word;
}

.sqr__side-footer {
  padding: 10px 14px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.sqr__submit-btn {
  flex: 1;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 6px;
  border: none;
  background: #10b981;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.16s ease, opacity 0.16s ease;

  &:hover:not(:disabled) {
    background: #059669;
  }

  &:disabled {
    color: var(--el-text-color-placeholder, #a8abb2);
    background: var(--el-fill-color, rgba(0, 0, 0, 0.06));
    opacity: 1;
    cursor: not-allowed;

    .sqr__kbd-hint {
      color: inherit;
    }
  }
}

.sqr__delete-btn {
  height: 40px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--el-color-danger, #ef4444);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.16s ease, opacity 0.16s ease;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--el-color-danger, #ef4444) 10%, transparent);
  }

  &:disabled {
    color: var(--el-text-color-placeholder, #a8abb2);
    cursor: not-allowed;
  }
}

.sqr__kbd-hint {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.75);
  font-family: inherit;
  font-weight: 600;

  .sqr__delete-btn & {
    color: var(--el-text-color-placeholder, #94a3b8);
  }
}

/* ── 面板占位骨架 ── */
.sqr__side-placeholder {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 6px;
}

.sqr__ph {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sqr__ph-line {
  display: block;
  height: 12px;
  border-radius: 3px;
  background: var(--el-fill-color-light, rgba(0, 0, 0, 0.04));

  &--title {
    width: 78%;
    height: 16px;
  }

  &--meta {
    width: 52%;
    height: 10px;
  }

  &--short {
    width: 40%;
  }
}

.sqr__ph-specs {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
}

.sqr__ph-cell {
  flex: 1;
  height: 30px;
  border-radius: 3px;
  background: var(--el-fill-color-light, rgba(0, 0, 0, 0.04));
}

.sqr__side-hint {
  margin: 0;
  padding-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-placeholder, #94a3b8);
}

/* ── 空/加载态 ── */
.sqr__state {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.sqr__state-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
}

.sqr__state-desc {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary, #64748b);
}

.sqr__state-btn {
  padding: 6px 18px;
  font-size: 13px;
  font-weight: 600;
  color: var(--sqr-primary-on-tint);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--sqr-primary-on-tint);
  border-radius: 6px;
  transition: background-color 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--sqr-primary-on-tint) 10%, transparent);
  }

  &--sub {
    color: var(--el-text-color-secondary, #64748b);
    border-color: var(--el-border-color, #cbd5e1);

    &:hover {
      background: var(--el-fill-color-light, rgba(0, 0, 0, 0.05));
    }
  }
}

.sqr__spinner {
  width: 26px;
  height: 26px;
  border: 3px solid var(--el-border-color-lighter, rgba(148, 163, 184, 0.35));
  border-top-color: var(--sqr-primary-on-tint);
  border-radius: 50%;
  animation: sqr-spin 0.8s linear infinite;
}

@keyframes sqr-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── 底部 Dock ── */
.sqr__dock {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.sqr__dock-capsule {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  pointer-events: auto;
  background: color-mix(in srgb, var(--app-content-surface-color, #ffffff) 88%, transparent);
  backdrop-filter: blur(12px);
  border: 1px solid var(--app-content-border-color, rgba(148, 163, 184, 0.25));
  border-radius: 999px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.14);
}

.sqr__dock-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular, #475569);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 999px;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--el-fill-color-light, rgba(0, 0, 0, 0.05));
  }

  &:disabled {
    color: var(--el-text-color-placeholder, #a8abb2);
    cursor: not-allowed;
  }
}

.sqr__dock-btn--approve:hover:not(:disabled) {
  color: #059669;
}

.sqr__dock-btn--delete:hover:not(:disabled) {
  color: var(--el-color-danger, #ef4444);
}

.sqr__dock-btn--skip:hover:not(:disabled) {
  color: var(--sqr-primary-on-tint);
}

.sqr__dock-arrow {
  font-size: 14px;
}

.sqr__dock-kbd {
  padding: 0 5px;
  font-size: 10px;
  line-height: 16px;
  color: var(--el-text-color-secondary, #64748b);
  border: 1px solid var(--el-border-color, #cbd5e1);
  border-radius: 4px;
}

.sqr__dock-sep {
  width: 1px;
  height: 18px;
  background: var(--el-border-color-lighter, rgba(148, 163, 184, 0.35));
}
</style>
