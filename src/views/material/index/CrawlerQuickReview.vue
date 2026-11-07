<template>
  <teleport to="body">
    <div v-if="visible" class="qr">
      <!-- ================= 左侧：负责图片展示与舞台交互 ================= -->
      <section class="qr__stage-wrap" :class="{ 'qr__stage-wrap--undo': canUndoDelete }">
        <!-- 极简悬浮顶条：无多余实底头栏，浮动毛玻璃轻量控件 -->
        <header class="qr__floating-bar">
          <div class="qr__floating-left">
            <span class="qr__floating-progress">
              {{ processedCount }}<template v-if="total"> / {{ total }}</template>
            </span>
            <span class="qr__floating-badge">采集素材</span>

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
          </div>

          <div class="qr__floating-right">
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

            <!-- 当没有当前卡片时（已审核完毕或加载失败），左侧浮动条提供退出按钮 -->
            <button
              v-if="!current"
              type="button"
              class="qr__floating-close"
              title="退出审核 (Esc)"
              @click="close"
            >
              <el-icon><Close /></el-icon>
            </button>
          </div>
        </header>

        <!-- 撤销删除：贴 Dock 上方居中的单枚胶囊，拇指可达且不压顶栏与素材中心 -->
        <transition name="qr-undo-rise">
          <div v-if="canUndoDelete" class="qr__undo" role="status">
            <span class="qr__undo-dot" aria-hidden="true"></span>
            <span class="qr__undo-text">待删 <b>{{ deleteQueue.length }}</b> 张</span>
            <span class="qr__undo-sec">{{ deleteCountdown }}s</span>
            <span class="qr__undo-split" aria-hidden="true"></span>
            <button
              type="button"
              class="qr__undo-act"
              title="撤销最近一张误删素材（快捷键：Z 或 Ctrl+Z）"
              @click="undoLastDelete"
            >
              <span class="qr__undo-icon" aria-hidden="true">↺</span>撤回<kbd class="qr__undo-kbd">Z</kbd>
            </button>
            <button
              v-if="deleteQueue.length > 1"
              type="button"
              class="qr__undo-all"
              title="全部恢复回待审队列"
              @click="undoAllDeletes"
            >
              全部
            </button>
            <span
              :key="deleteCountdownKey"
              class="qr__undo-progress"
              :style="{ animationDuration: `${DELETE_DEBOUNCE}ms` }"
              aria-hidden="true"
            ></span>
          </div>
        </transition>

        <!-- 层内轻提示 -->
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

        <!-- 舞台展示区 -->
        <div
          v-if="shownItem"
          class="qr__stage"
          :class="{ 'qr__stage--settle': !dragging, 'qr__stage--quarter': isQuarterTurn }"
          :style="stageStyle"
          title="双击查看原图"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
          @dblclick="openOriginal"
        >
          <img
            v-if="displayUrl"
            :src="displayUrl"
            :alt="shownItem.name || '素材图片'"
            :style="imageStyle"
            decoding="async"
            draggable="false"
          />
          <div v-if="imageError" class="qr__image-error" role="status">
            <span>图片加载失败</span>
            <button type="button" class="qr__state-btn" @click.stop="syncDeck">重试</button>
            <button type="button" class="qr__state-btn qr__state-btn--sub" @click.stop="actSkip">忽略</button>
          </div>

          <!-- 补货/解码中：只留一条顶部细光线，不遮画面也不闪白字 -->
          <div v-if="stageBusy" class="qr__stage-busy" aria-hidden="true">
            <span></span>
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
          <div class="mt-4 flex gap-3 justify-center">
            <button type="button" class="qr__state-btn" @click="reload">重新加载</button>
            <button type="button" class="qr__state-btn qr__state-btn--sub" @click="close">关闭退出</button>
          </div>
        </div>

        <!-- 底部动作：悬浮毛玻璃胶囊 Dock 风格 -->
        <footer class="qr__dock">
          <div class="qr__dock-capsule">
            <button
              type="button"
              class="qr__dock-btn qr__dock-btn--rotate"
              :class="{ 'is-active': currentRotation > 0 }"
              :disabled="!canReview || !canRotate"
              :title="rotateTitle"
              @click="rotateCurrent"
            >
              <span class="qr__dock-arrow">⟳</span>
              <span class="qr__dock-text">旋转</span>
              <span v-if="currentRotation > 0" class="qr__dock-badge">{{ currentRotation }}°</span>
              <kbd class="qr__dock-kbd">R</kbd>
            </button>

            <div class="qr__dock-sep"></div>

            <button
              type="button"
              class="qr__dock-btn qr__dock-btn--skip"
              :disabled="!canSkip"
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
              :disabled="!canReview"
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
              :disabled="!canReview"
              title="入库该素材（快捷键：→ 或 D）"
              @click="actImport"
            >
              <span class="qr__dock-arrow">→</span>
              <span class="qr__dock-text">入库</span>
              <kbd class="qr__dock-kbd">D</kbd>
            </button>
          </div>
        </footer>
      </section>

      <!-- ================= 右侧：负责详情与操作面板（常驻占位，不随数据出现） ================= -->
      <aside class="qr__side">
        <!-- 顶栏：极简标题 + 右上角专属关闭按钮 -->
        <div class="qr__side-header">
          <span class="qr__side-title">素材详情</span>
          <button type="button" class="qr__side-close" title="退出审核 (Esc)" @click="close">
            <el-icon><Close /></el-icon>
          </button>
        </div>

        <!-- 详情滚动体：自上而下顺畅流式布局，轻背景，无多余边框 -->
        <div ref="sideRef" class="qr__side-body">
          <template v-if="shownItem">
            <!-- 1. 素材标题与标识行 -->
            <div class="qr__meta-section">
              <h3 class="qr__main-title" :title="shownItem.name || ''">
                {{ shownItem.name || `素材 #${shownItem.id}` }}
              </h3>

              <div class="qr__sub-meta">
                <span class="qr__mono-id">#{{ shownItem.id }}</span>
                <span class="qr__meta-dot">·</span>
                <span class="qr__meta-text">{{ shownItem.source || '采集素材' }}</span>
                <span class="qr__meta-dot">·</span>
                <span class="qr__meta-text">{{ createTimeText }}</span>
              </div>

              <!-- 状态标签行：纯文字，无底色 -->
              <div class="qr__pills-group">
                <span class="qr__pill" :class="shownItem.isCutout ? 'qr__pill--success' : 'qr__pill--neutral'">
                  {{ shownItem.isCutout ? "已抠图" : "未抠图" }}
                </span>
                <span v-if="shownItem.suffix" class="qr__pill" :class="isTransparent ? 'qr__pill--info' : 'qr__pill--neutral'">
                  {{ isTransparent ? "透明通道" : "常规底色" }}
                </span>
                <span v-if="shownItem.shareType" class="qr__pill qr__pill--neutral">
                  {{ shownItem.shareType === 'shared' ? '共享' : '私有' }}
                </span>
              </div>
            </div>

            <!-- 2. 规格参数：纯文字指标行 -->
            <div class="qr__specs-banner">
              <div class="qr__spec-col">
                <span class="qr__spec-label">尺寸</span>
                <span class="qr__spec-val">{{ dimensionText || "-" }}</span>
              </div>
              <div class="qr__spec-divider"></div>
              <div class="qr__spec-col">
                <span class="qr__spec-label">比例</span>
                <span class="qr__spec-val">{{ aspectText }}</span>
              </div>
              <div class="qr__spec-divider"></div>
              <div class="qr__spec-col">
                <span class="qr__spec-label">文件大小</span>
                <span class="qr__spec-val">{{ fileSizeText }}</span>
              </div>
              <div class="qr__spec-divider"></div>
              <div class="qr__spec-col">
                <span class="qr__spec-label">格式</span>
                <span class="qr__spec-val">{{ shownItem.suffix ? shownItem.suffix.toUpperCase() : "PNG" }}</span>
              </div>
            </div>

            <!-- 3. 关键词与描述（若有） -->
            <div v-if="shownItem.keywords || shownItem.description" class="qr__extra-panel">
              <div v-if="shownItem.keywords" class="qr__extra-row">
                <span class="qr__extra-k">关键词</span>
                <span class="qr__extra-v select-text">{{ shownItem.keywords }}</span>
              </div>
              <div v-if="shownItem.description" class="qr__extra-row">
                <span class="qr__extra-k">描述</span>
                <span class="qr__extra-v select-text">{{ shownItem.description }}</span>
              </div>
            </div>

            <!-- 4. 来源链接（若有） -->
            <div v-if="shownItem.originUrl" class="qr__link-panel">
              <span class="qr__link-label">原始来源链接</span>
              <a
                class="qr__link-url"
                :href="shownItem.originUrl"
                target="_blank"
                rel="noreferrer"
                :title="shownItem.originUrl"
              >
                {{ shownItem.originUrl }}
              </a>
            </div>
          </template>

          <!-- 无当前素材：面板保持占位，避免整块右侧后出现挤压画面 -->
          <div v-else class="qr__side-placeholder">
            <div v-if="loading" class="qr__ph" aria-hidden="true">
              <span class="qr__ph-line qr__ph-line--title"></span>
              <span class="qr__ph-line qr__ph-line--meta"></span>
              <div class="qr__ph-specs">
                <span v-for="i in 4" :key="i" class="qr__ph-cell"></span>
              </div>
              <span class="qr__ph-line"></span>
              <span class="qr__ph-line qr__ph-line--short"></span>
            </div>
            <p v-else class="qr__side-hint">{{ loadError ? '素材加载失败' : '暂无待审核素材' }}</p>
          </div>
        </div>

        <!-- 侧边栏贴底操作栏 -->
        <div class="qr__side-footer">
          <button
            type="button"
            class="qr__submit-btn"
            :disabled="!canReview"
            title="一键将该素材入库（快捷键：D 或 →）"
            @click="actImport"
          >
            <span>入库素材</span>
            <kbd class="qr__kbd-hint">D / →</kbd>
          </button>
          <button
            type="button"
            class="qr__delete-btn"
            :disabled="!canReview"
            title="删除该素材（快捷键：S 或 ↓）"
            @click="actDelete"
          >
            <span>删除</span>
            <kbd class="qr__kbd-hint">S / ↓</kbd>
          </button>
        </div>
      </aside>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { ElMessage } from "element-plus";
import { Close } from "@element-plus/icons-vue";
import { CrawlerMaterialApi } from "@/api/crawler-material";
import { formatTimestamp } from "@/common/date";
import { useUserStore } from "@/store/modules/user";
import { useImageDeck } from "@/composables/useImageDeck";
import { getReviewImageUrl } from "@/utils/image";

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

const PAGE_SIZE = 50;
const PREFETCH_THRESHOLD = 40;
const PRELOAD_AHEAD = 12;
/**
 * 攒批提交的参数刻意调小了。
 * 批越大单次接口越慢（后台要处理几十条），返回前会一直占着连接，
 * 「审核手感」取决于单次提交的往返时间而不是请求数量。
 */
/** 入库攒够多少条立刻提交 */
const IMPORT_BATCH = 10;
/** 删除攒够多少条立刻提交（调高阈值，避免连续误删时直接被批次强行提交，留足撤销空间） */
const DELETE_BATCH = 50;
const IMPORT_DEBOUNCE = 800;
/** 删除提交防抖倒计时：从 1 秒大幅延长至 8 秒，为用户提供充裕的安全反悔窗口 */
const DELETE_DEBOUNCE = 8000;
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
/**
 * 已提交删除、但接口还在飞行中的条数。
 * 删除会让库内数据整体前移，所以取数时必须把它从偏移里扣掉，否则会跳过素材。
 *
 * 这里用「计数补偿」而不是原来的 `await inflightDelete`：
 * await 会把后台补货整个堵住，用户连续删除时补货全部排队 → 队列耗尽 → 卡在「正在加载」。
 */
const pendingDeleteOffset = ref(0);
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

// ── 层内轻提示 ──────────────────────────────────────────────
const TOAST_DURATION = 1600;
const toasts = ref<Array<{ id: number; text: string; tone: string }>>([]);
let toastSeq = 0;
const toastTimers = new Map<number, ReturnType<typeof setTimeout>>();

function pushToast(text: string, tone: "info" | "success" | "warning" | "error" = "info"): void {
  // 连续快速审核时同一句提示会连发：复用最后一枚并顺延消失时间，
  // 避免每点一次就新建节点、重放入场动画（高频下这是可见的掉帧来源）
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
const frame = shallowRef<{ item: any; url: string } | null>(null);
const shownItem = computed(() => frame.value?.item ?? current.value);
const displayUrl = computed(() => frame.value?.url ?? "");
const deckPending = ref(false);
const imageError = ref(false);
const framePainted = ref(false);
const canReview = computed(() =>
  props.visible && framePainted.value && !deckPending.value &&
  !!current.value && frame.value?.item === current.value,
);
const canSkip = computed(() => canReview.value || (props.visible && !!current.value && imageError.value));
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

/** 详情面板：换图后把滚动位置复位，否则新素材的字段会停在中间、前几项被顶出可视区 */
const sideRef = ref<HTMLElement | null>(null);

watch(
  () => shownItem.value?.id,
  () => {
    onPointerCancel();
    if (sideRef.value) sideRef.value.scrollTop = 0;
  },
  { flush: "post" },
);

const dimensionText = computed(() => {
  const row = shownItem.value;
  if (!row?.width || !row?.height) return "";
  return `${row.width}×${row.height}`;
});

const aspectText = computed(() => {
  const row = shownItem.value;
  if (!row?.aspectRatio) return "-";
  return Number(row.aspectRatio).toFixed(2);
});

const fileSizeText = computed(() => {
  const row = shownItem.value;
  return row?.fileSize ? formatFileSize(row.fileSize) : "-";
});

const createTimeText = computed(() => formatTimestamp(shownItem.value?.createTime) || "-");

/** 透明底素材入库价值更高，直接用配色标出来，省掉一次「点开看格式」 */
const isTransparent = computed(() =>
  ["png", "webp", "gif"].includes(String(shownItem.value?.suffix || "").toLowerCase()),
);

// ── 旋转：点了只转预览，入库那一刻才由后端就地改写同一张 COS 对象 ──
/** 与后端的支持范围一致：gif 会丢动画、svg 是矢量，都不重编码 */
const ROTATABLE_SUFFIXES = ["jpg", "jpeg", "png", "webp"];

/** 已点过的角度，按素材 id 累计（4 张 90° 回到原样）；提交入库或删除后清掉 */
const pendingRotations = ref<Record<string, number>>({});

/** 后端只肯覆盖自家 COS 上的对象，判断口径与 isManagedCosPath 对齐 */
function isOwnCosUrl(url: unknown): boolean {
  const raw = String(url || "").trim();
  if (!raw) return false;
  if (/^https?:\/\//i.test(raw)) {
    try {
      return /\.cos\.[^.]+\.myqcloud\.com$/i.test(new URL(raw).hostname);
    } catch {
      return false;
    }
  }
  return raw.replace(/^\/+/, "").startsWith("users/");
}

/** 不能旋转的原因，空串表示可以。前端提前拦住而不是等入库任务里失败：
 *  那会儿素材已经离开队列，用户只会看到「少进了一条」，不知道为什么。 */
const rotateBlockReason = computed(() => {
  const row = current.value;
  if (!row) return "没有正在审核的素材";
  const suffix = String(row.suffix || "")
    .toLowerCase()
    .replace(/^\./, "");
  if (!ROTATABLE_SUFFIXES.includes(suffix)) {
    return suffix ? `${suffix.toUpperCase()} 不支持旋转改写` : "格式未知，不支持旋转改写";
  }
  if (!isOwnCosUrl(row.url)) return "图片不在自有存储上，不支持旋转改写";
  if (row.shareType === "shared") return "与他人共用同一张图，旋转会改到别人的素材";
  if (row.sourceUserId && row.sourceUserId !== row.userId) {
    return "来自他人分享的素材，旋转会改到源文件";
  }
  return "";
});

const canRotate = computed(() => rotateBlockReason.value === "");

const currentRotation = computed(() => pendingRotations.value[String(shownItem.value?.id ?? "")] || 0);

/** 90/270 时横向边界要看容器的高度，反之亦然，不然横图竖过来会被裁 */
const isQuarterTurn = computed(() => currentRotation.value % 180 !== 0);

const imageStyle = computed(() =>
  currentRotation.value ? { transform: `rotate(${currentRotation.value}deg)` } : {},
);

const rotateTitle = computed(() =>
  canRotate.value
    ? "旋转预览：点一次转 90°，不产生新文件，入库时才真正转过来（快捷键 R 或 ↑）"
    : `${rotateBlockReason.value}（快捷键 R 或 ↑）`,
);

/** 提交过的素材角度不再需要，别让这张表一直涨 */
function dropRotations(items: any[]): void {
  items.forEach((item: any) => {
    delete pendingRotations.value[String(item.id)];
  });
}

function rotateCurrent(): void {
  if (!canReview.value) return;
  const row = current.value;
  if (!row) return;
  if (!canRotate.value) {
    // 按钮此时是灰的，只有键盘会走到这里，得说清为什么不能转
    pushToast(rotateBlockReason.value, "warning");
    return;
  }
  const key = String(row.id);
  const previous = pendingRotations.value[key] || 0;
  const next = (previous + 90) % 360;
  if (next) {
    pendingRotations.value[key] = next;
    if (!previous) pushToast("只是预览，入库时才会真正转过来");
  } else {
    delete pendingRotations.value[key];
  }
}

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
let fetchEpoch = 0;
let settledDeleteCount = 0;

async function fetchNext(): Promise<void> {
  if (inflightFetch) return inflightFetch;
  if (!props.visible || finished.value || loadError.value || queue.value.length > PREFETCH_THRESHOLD) return;
  const epoch = fetchEpoch;

  inflightFetch = (async () => {
    loading.value = true;
    try {
      while (props.visible && queue.value.length <= PREFETCH_THRESHOLD) {
        const pending = pendingDeleteOffset.value;
        const settled = settledDeleteCount;
        const offset = Math.max(0, nextOffset.value - pending);
        const pageNo = Math.floor(offset / PAGE_SIZE) + 1;
        const drop = offset % PAGE_SIZE;
        const res: any = await CrawlerMaterialApi.getCrawlerMaterialPage({
          ...props.query,
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

        // 游标保留在途删除补偿；返回期间结算的删除不能再被旧响应覆盖。
        nextOffset.value = Math.max(0, offset + rows.length + pending - (settledDeleteCount - settled));
        if (!rows.length) {
          finished.value = true;
          break;
        }
        queue.value.push(...fresh.map((item: any) => markRaw(item)));
        warmAhead();
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

const deck = useImageDeck({ maxCache: 24, maxConcurrent: 3 });

function pickDeckWidth(): number {
  if (typeof window === "undefined") return 1600;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const stageWidth = width <= 768 ? width : width - (width <= 1100 ? 340 : 390);
  const target = stageWidth * dpr;
  return [800, 1200, 1600, 2000].find((size) => size >= target) ?? 2000;
}

const deckWidth = ref(pickDeckWidth());

function deckKeyOf(item: any): string {
  return getReviewImageUrl(item?.url, deckWidth.value);
}

function warmAhead(): void {
  if (!props.visible) return;
  deck.setWindow(queue.value.slice(0, PRELOAD_AHEAD + 1).map(deckKeyOf));
}

function afterAdvance(): void {
  if (queue.value.length <= PREFETCH_THRESHOLD) void fetchNext();
  warmAhead();
}

let deckSeq = 0;
let paintFrame = 0;
const stageBusy = computed(() => deckPending.value || (!current.value && loading.value));

function presentFrame(item: any, url: string, seq: number): void {
  frame.value = { item, url };
  deckPending.value = false;
  // 两次绘制帧之间才放行动作，防止同一帧内连按处理尚未上屏的素材。
  void nextTick().then(() => {
    if (seq !== deckSeq) return;
    paintFrame = requestAnimationFrame(() => {
      paintFrame = requestAnimationFrame(() => {
        if (seq === deckSeq) framePainted.value = true;
      });
    });
  });
}

function syncDeck(): void {
  const item = current.value;
  const target = deckKeyOf(item);
  const seq = ++deckSeq;
  cancelAnimationFrame(paintFrame);
  framePainted.value = false;
  imageError.value = false;
  deckPending.value = false;

  if (!props.visible) return;
  warmAhead();
  if (!item) {
    if (finished.value || loadError.value) frame.value = null;
    return;
  }
  if (!target) {
    frame.value = null;
    imageError.value = true;
    return;
  }
  if (deck.isReady(target)) {
    presentFrame(item, target, seq);
    return;
  }

  deckPending.value = true;
  void deck.ensure(target).then((ready) => {
    if (seq !== deckSeq) return;
    if (ready) presentFrame(item, target, seq);
    else {
      deckPending.value = false;
      frame.value = null;
      imageError.value = true;
    }
  });
}

watch([current, finished, loadError, () => props.visible], syncDeck, { immediate: true });

/** 缩放窗口后出图宽度变了，旧地址整批作废：清缓存按新宽度重来 */
let deckResizeTimer: ReturnType<typeof setTimeout> | null = null;

function onViewportResize(): void {
  if (deckResizeTimer) clearTimeout(deckResizeTimer);
  deckResizeTimer = setTimeout(() => {
    deckResizeTimer = null;
    const next = pickDeckWidth();
    if (!props.visible || next === deckWidth.value) return;
    deckWidth.value = next;
    deck.reset();
    void syncDeck();
    warmAhead();
  }, 300);
}

/** 双击看原图：出图日常够用，但要抠边缘/水印时不必退出面板去列表里翻 */
function openOriginal(): void {
  const url = shownItem.value?.url;
  if (url) window.open(url, "_blank", "noreferrer");
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
  deckSeq += 1;
  cancelAnimationFrame(paintFrame);
  deck.reset();
  frame.value = null;
  framePainted.value = false;
  deckPending.value = false;
  imageError.value = false;
  skippedItems.value = [];
  skippedCount.value = 0;
  // 重新加载是按新页取的回同一批素材，留着旧角度会在用户没察觉时改写文件
  pendingRotations.value = {};
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
  if (!canSkip.value) return;
  const item = queue.value.shift();
  if (!item) return;
  skippedItems.value.push(item);
  skippedCount.value += 1;
  pushToast("已忽略");
  afterAdvance();
}

function actImport(): void {
  if (!canReview.value) return;
  const item = queue.value.shift();
  if (!item) return;
  importQueue.value.push(item);
  importedCount.value += 1;
  pushToast("已入库", "success");
  scheduleImportFlush();
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
  const rotations = items
    .map((item: any) => ({ id: String(item.id), degrees: pendingRotations.value[String(item.id)] || 0 }))
    .filter((item) => item.degrees > 0);
  dropRotations(items);
  try {
    await CrawlerMaterialApi.batchImportToSticker({
      ids: items.map((item: any) => String(item.id)),
      userId: String(userStore.user?.id ?? ""),
      ...(rotations.length ? { rotations } : {}),
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
  dropRotations(items);
  const count = items.length;
  // 乐观预判：这批删除一旦生效，库内数据会整体前移 count 位，
  // 后台补货必须立刻按新位置取值，否则会跳过素材。
  pendingDeleteOffset.value += count;

  inflightDelete = (async () => {
    try {
      await CrawlerMaterialApi.deleteCrawlerMaterial({
        ids: items.map((item: any) => String(item.id)),
      });
    } catch (error: any) {
      deletedCount.value = Math.max(0, deletedCount.value - count);
      notify(`删除提交失败：${error?.message || "未知错误"}`, "error");
    } finally {
      // 失败同样回退已预判的区间，多取的旧行由 seenIds 去重。
      settledDeleteCount += count;
      pendingDeleteOffset.value = Math.max(0, pendingDeleteOffset.value - count);
      nextOffset.value = Math.max(0, nextOffset.value - count);
    }
  })();

  try {
    await inflightDelete;
  } finally {
    inflightDelete = null;
  }
}

/** 撤销单张删除（在 8 秒倒计时内随时放回待审队列首位） */
function undoLastDelete(): void {
  const item = deleteQueue.value.pop();
  if (!item) return;
  deletedCount.value = Math.max(0, deletedCount.value - 1);
  queue.value.unshift(item);
  pushToast("已撤销删除，素材已放回待审队列", "success");

  if (!deleteQueue.value.length) {
    if (deleteTimer) {
      clearTimeout(deleteTimer);
      deleteTimer = null;
    }
    clearDeleteCountdown();
  } else {
    // 队列中还有其他待删除的素材，重新启动 8 秒倒计时，为用户继续撤回留足时间
    scheduleDeleteFlush();
  }
}

/** 批量全部撤回当前所有待删除素材 */
function undoAllDeletes(): void {
  if (!deleteQueue.value.length) return;
  const count = deleteQueue.value.length;
  const items = deleteQueue.value.splice(0, count);
  deletedCount.value = Math.max(0, deletedCount.value - count);
  // 按原顺序放回队首
  queue.value.unshift(...items.reverse());
  if (deleteTimer) {
    clearTimeout(deleteTimer);
    deleteTimer = null;
  }
  clearDeleteCountdown();
  pushToast(`已全部撤回 ${count} 张待删除素材`, "success");
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
  if (!props.visible || event.repeat) return;

  if (event.key === "Escape") {
    close();
    return;
  }

  // 快捷撤销：按 Z 或 Ctrl+Z / Cmd+Z（手滑秒级救回）
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

  if (event.key === "ArrowUp" || event.key === "r" || event.key === "R") {
    event.preventDefault();
    rotateCurrent();
  } else if (
    event.key === "ArrowLeft" ||
    event.key === "a" ||
    event.key === "A"
  ) {
    event.preventDefault();
    actSkip();
  } else if (
    event.key === "ArrowRight" ||
    event.key === "d" ||
    event.key === "D"
  ) {
    event.preventDefault();
    actImport();
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

/** 关闭时把攒着的入库/删除一次性提交，避免留下未落地的操作 */
async function teardown(): Promise<void> {
  fetchEpoch += 1;
  inflightFetch = null;
  loading.value = false;
  deckSeq += 1;
  cancelAnimationFrame(paintFrame);
  framePainted.value = false;
  deck.reset();
  clearDeleteCountdown();
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
      if (queue.value.length <= PREFETCH_THRESHOLD) void fetchNext();
      return;
    }
    // 首次挂载时 visible=false，不该触发一次多余的刷新回调
    if (!wasVisible) return;
    wasVisible = false;
    void teardown();
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("resize", onViewportResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("resize", onViewportResize);
  if (deckResizeTimer) clearTimeout(deckResizeTimer);
  fetchEpoch += 1;
  deckSeq += 1;
  cancelAnimationFrame(paintFrame);
  deck.reset();
  if (importTimer) clearTimeout(importTimer);
  if (deleteTimer) clearTimeout(deleteTimer);
  if (autoRetryTimer) clearTimeout(autoRetryTimer);
  toastTimers.forEach((timer) => clearTimeout(timer));
  toastTimers.clear();
  clearDeleteCountdown();
  void flushImports();
  void flushDeletes();
});
</script>

<style lang="scss" scoped>
@keyframes qr-busy {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(320%);
  }
}

@keyframes qr-undo-countdown {
  from {
    transform: scaleX(1);
  }

  to {
    transform: scaleX(0);
  }
}

.qr {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  background: var(--app-content-bg-color, #f7f9fc);

  /* 棋盘格：日间浅色 */
  --qr-checker-color-1: #edf1f7;
  --qr-checker-color-2: #ffffff;
  /* 主色/警示色前景：深色模式下提亮，避免深底上发灰 */
  --qr-primary-on-tint: var(--el-color-primary, #3b82f6);
}

/* ── 左侧舞台包装器 ── */
.qr__stage-wrap {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background-image: repeating-conic-gradient(
      var(--qr-checker-color-1) 0% 25%,
      var(--qr-checker-color-2) 0% 50%
    );
  background-size: 20px 20px;
  background-position: 50% 50%;
}

/* ── 极简悬浮顶条（无实体头部，悬浮毛玻璃胶囊） ── */
.qr__floating-bar {
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

.qr__floating-left,
.qr__floating-right {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.qr__floating-left {
  flex-wrap: wrap;
  row-gap: 6px;
}

.qr__floating-right {
  flex-shrink: 0;
  margin-left: auto;
}

.qr__floating-progress,
.qr__floating-badge,
.qr__text-btn,
.qr__stat-item {
  white-space: nowrap;
}

.qr__floating-progress {
  font-size: 13px;
  font-weight: 700;
  color: var(--qr-primary-on-tint);
  font-variant-numeric: tabular-nums;
}

.qr__floating-badge {
  font-size: 11px;
  color: var(--el-text-color-secondary, #64748b);
}

.qr__floating-close {
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
  transition: color 0.15s ease;

  &:hover {
    color: var(--qr-primary-on-tint);
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
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  color: #f1f5f9;
  white-space: nowrap;
  background: rgba(24, 24, 24, 0.94);
  border: none;
  border-radius: 4px;
  animation: qr-toast-in 0.15s ease-out;

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

/* 图片展示区：透明，棋盘格由外层舞台包装器提供 */
.qr__stage {
  position: relative;
  z-index: 0;
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  padding: 56px 20px var(--qr-stage-bottom, 66px);
  overflow: hidden;
  cursor: grab;
  touch-action: none;
  container-type: size;

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
    transition: transform 0.28s cubic-bezier(0.2, 0, 0, 1);
  }

  /* 转 90/270 后图片的「宽」变成屏幕上的「高」，约束得跟着交换，
     否则横图竖过来正好被画布上下裁掉。cq 单位相对的是本容器，
     不支持容器查询的浏览器会忽略这两条，退回按原尺寸裁切显示。 */
  &--quarter img {
    max-width: 100cqh;
    max-height: 100cqw;
  }
}

/* 补货/解码中：舞台顶部一条细光线，不遮画面、不闪文字 */
.qr__stage-wrap--undo {
  --qr-stage-bottom: 110px;
}

.qr__image-error {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.qr__stage-busy {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 2px;
  overflow: hidden;
  pointer-events: none;

  span {
    display: block;
    width: 35%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      var(--qr-primary-on-tint),
      transparent
    );
    animation: qr-busy 1.1s ease-in-out infinite;
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
  border-radius: 6px;
  transform: translate(-50%, -50%);
  pointer-events: none;

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

/* ── 右侧：常驻详情与操作面板 ── */
.qr__side {
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

.qr__side-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px 2px;
}

.qr__side-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
}

.qr__side-close {
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

/* 详情滚动体：自上而下，轻盈呼吸感 */
.qr__side-body {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 14px 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 1. 素材标题与标识行：纯净少边框 */
.qr__meta-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.qr__main-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--el-text-color-primary, #0f172a);
  margin: 0;
  word-break: break-all;
}

.qr__sub-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #64748b);
}

.qr__mono-id {
  font-family: var(--el-font-family-mono, monospace);
  font-weight: 600;
  color: var(--qr-primary-on-tint);
}

.qr__meta-dot {
  color: var(--el-border-color, #cbd5e1);
}

.qr__meta-text {
  color: var(--el-text-color-secondary, #64748b);
}

.qr__pills-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 2px;
}

/* 状态标签：纯文字，无底色无描边 */
.qr__pill {
  font-size: 11px;
  font-weight: 500;
  line-height: 16px;

  &--success {
    color: var(--el-color-success, #10b981);
  }

  &--info {
    color: var(--qr-primary-on-tint);
  }

  &--neutral {
    color: var(--el-text-color-secondary, #64748b);
  }
}

/* 2. 规格参数：纯文字指标行 */
.qr__specs-banner {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 4px 0;
}

.qr__spec-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.qr__spec-label {
  font-size: 11px;
  color: var(--el-text-color-secondary, #64748b);
}

.qr__spec-val {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
  font-variant-numeric: tabular-nums;
}

.qr__spec-divider {
  width: 1px;
  height: 20px;
  background: var(--app-content-border-color, rgba(148, 163, 184, 0.2));
}

/* 3. 补充信息（关键词/描述）：纯文字两列 */
.qr__extra-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
}

.qr__extra-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
}

.qr__extra-k {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--el-text-color-secondary, #64748b);
  font-weight: 500;
}

.qr__extra-v {
  color: var(--el-text-color-regular, #334155);
  line-height: 1.5;
  word-break: break-word;
}

/* 4. 原始来源链接面板 */
.qr__link-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0;
}

.qr__link-label {
  font-size: 11px;
  color: var(--el-text-color-secondary, #64748b);
  font-weight: 500;
}

.qr__link-url {
  font-size: 12px;
  color: var(--qr-primary-on-tint);
  word-break: break-all;
  line-height: 1.4;

  &:hover {
    text-decoration: underline;
  }
}

.qr__side-footer {
  padding: 10px 14px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.qr__submit-btn {
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

    .qr__kbd-hint {
      color: inherit;
    }
  }
}

.qr__delete-btn {
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

.qr__kbd-hint {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.75);
  font-family: inherit;
  font-weight: 600;

  .qr__delete-btn & {
    color: var(--el-text-color-placeholder, #94a3b8);
  }
}

/* ── 无素材时的面板占位（骨架，无闪烁动效） ── */
.qr__side-placeholder {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 6px;
}

.qr__ph {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.qr__ph-line {
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

.qr__ph-specs {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
}

.qr__ph-cell {
  flex: 1;
  height: 30px;
  border-radius: 3px;
  background: var(--el-fill-color-light, rgba(0, 0, 0, 0.04));
}

.qr__side-hint {
  margin: 0;
  padding-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-placeholder, #94a3b8);
}

.qr__link {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  color: var(--el-color-primary, #3b82f6);
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
}

.qr__id {
  flex: 0 0 auto;
  margin-left: auto;
  font-family: var(--el-font-family-mono, monospace);
  font-size: 11px;
  color: var(--el-text-color-secondary, #64748b);
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

.qr__state-btn--sub {
  color: var(--el-text-color-regular, #475569);
  background: transparent;
  border: 1px solid var(--el-border-color, rgba(0, 0, 0, 0.12));

  &:hover {
    opacity: 1;
    background: var(--el-fill-color-light, rgba(0, 0, 0, 0.04));
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

/* ── 底部动作：贴底浮动 Dock（无容器，仅按钮） ── */
.qr__dock {
  position: absolute;
  bottom: 16px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  z-index: 10;
}

/* ── 撤销删除：Dock 上方的单枚胶囊 ──
   删除语义只落在「红点 + 红色张数」，撤回是可恢复动作、用主色，不再满条琥珀色告警 */
.qr__undo {
  position: absolute;
  bottom: 64px;
  left: 50%;
  z-index: 30;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 6px 0 12px;
  overflow: hidden;
  font-size: 12px;
  color: var(--el-text-color-regular, #475569);
  white-space: nowrap;
  background: var(--app-content-surface-color, #fff);
  border: 1px solid var(--app-content-border-color, rgb(148 163 184 / 25%));
  border-radius: 999px;
  transform: translateX(-50%);
  box-shadow: 0 8px 24px rgb(15 23 42 / 14%);
}

.qr__undo-dot {
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  background: var(--el-color-danger, #ef4444);
  border-radius: 50%;
}

.qr__undo-text {
  color: var(--el-text-color-primary, #0f172a);

  b {
    font-weight: 700;
    color: var(--el-color-danger, #ef4444);
    font-variant-numeric: tabular-nums;
  }
}

.qr__undo-sec {
  min-width: 20px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary, #64748b);
}

.qr__undo-split {
  width: 1px;
  height: 12px;
  background: var(--el-border-color-lighter, rgb(148 163 184 / 30%));
}

.qr__undo-act,
.qr__undo-all {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 9px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 0;
  border-radius: 999px;
  transition: background-color 0.15s ease;
}

.qr__undo-act {
  color: var(--qr-primary-on-tint);
  background: color-mix(in srgb, var(--el-color-primary, #3b82f6) 12%, transparent);

  &:hover {
    background: color-mix(in srgb, var(--el-color-primary, #3b82f6) 20%, transparent);
  }
}

.qr__undo-icon {
  font-size: 13px;
  line-height: 1;
}

.qr__undo-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 14px;
  min-width: 14px;
  padding: 0 2px;
  margin-left: 1px;
  font-family: inherit;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  color: inherit;
  background: color-mix(in srgb, currentcolor 14%, transparent);
  border-radius: 3px;
  opacity: 0.8;
}

.qr__undo-all {
  padding: 0 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--el-text-color-secondary, #64748b);
  background: transparent;

  &:hover {
    color: var(--el-text-color-primary, #0f172a);
    background: var(--el-fill-color-light, rgb(148 163 184 / 12%));
  }
}

.qr__undo-progress {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  background: color-mix(in srgb, var(--el-color-danger, #ef4444) 65%, transparent);
  transform-origin: left center;
  animation: qr-undo-countdown linear forwards;
}

/* 动效：从 Dock 上方轻浮起 */
.qr-undo-rise-enter-active,
.qr-undo-rise-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.qr-undo-rise-enter-from,
.qr-undo-rise-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px) scale(0.96);
}

.qr__dock-capsule {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.qr__dock-sep {
  width: 1px;
  height: 16px;
  background: var(--el-border-color-lighter, rgba(148, 163, 184, 0.28));
}

.qr__dock-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--el-text-color-regular, #475569);
  transition: color 0.14s ease, background-color 0.14s ease;
  white-space: nowrap;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }
}

.qr__dock-arrow {
  font-size: 13px;
  opacity: 0.65;
  transition: transform 0.18s ease;
}

.qr__dock-kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  color: var(--el-text-color-secondary, #64748b);
}

/* 旋转：只是预览，转了角度才点亮 */
.qr__dock-btn--rotate {
  &:hover:not(:disabled) {
    color: var(--el-text-color-primary, #0f172a);

    .qr__dock-arrow {
      opacity: 1;
      transform: rotate(90deg);
    }
  }

  &.is-active {
    color: var(--qr-primary-on-tint);

    .qr__dock-arrow {
      opacity: 1;
    }
  }
}

.qr__dock-badge {
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--qr-primary-on-tint);
}

/* 忽略 */
.qr__dock-btn--skip:hover:not(:disabled) {
  color: var(--el-text-color-primary, #0f172a);

  .qr__dock-arrow {
    transform: translateX(-2px);
    opacity: 1;
  }
}

/* 删除 */
.qr__dock-btn--delete {
  color: var(--el-color-danger, #dc2626);

  .qr__dock-arrow {
    opacity: 1;
  }

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--el-color-danger, #ef4444) 10%, transparent);

    .qr__dock-arrow {
      transform: translateY(2px);
    }
  }
}

/* 入库：唯一实心 CTA */
.qr__dock-btn--import {
  color: #ffffff;
  background: #10b981;

  .qr__dock-kbd {
    color: rgba(255, 255, 255, 0.78);
  }

  &:hover:not(:disabled) {
    background: #059669;

    .qr__dock-arrow {
      transform: translateX(2px);
      opacity: 1;
    }
  }

  &:disabled {
    color: var(--el-text-color-placeholder, #a8abb2);
    background: var(--el-fill-color, rgba(0, 0, 0, 0.06));
    opacity: 1;

    .qr__dock-kbd {
      color: inherit;
    }
  }
}

/* ── 黑夜模式：棋盘格与主题色已由 CSS 变量接管，这里只补少量固定色 ── */
html.dark,
html[class*="dark"] {
  .qr {
    background: var(--app-content-bg-color, #101010);
    --qr-checker-color-1: #18191b;
    --qr-checker-color-2: #101012;
    --qr-primary-on-tint: color-mix(in srgb, var(--el-color-primary, #3b82f6) 50%, #ffffff);
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
  }

  .qr__dock-sep {
    background: rgba(255, 255, 255, 0.1);
  }
}

/* ── 平板：侧栏收窄，仍保持左右分栏 ── */
@media (width <= 1100px) {
  .qr__side {
    width: 340px;
  }

  .qr__stat-name {
    display: none;
  }
}

/* ── 移动端：上下分栏，舞台在上、详情面板贴底 ── */
@media (width <= 768px) {
  .qr {
    flex-direction: column;
  }

  .qr__stage-wrap {
    flex: 1 1 auto;
    min-height: 0;
  }

  .qr__floating-bar {
    top: 10px;
    left: 10px;
    right: 10px;
    gap: 8px;
  }

  .qr__floating-left {
    gap: 8px;
  }

  .qr__floating-badge {
    display: none;
  }

  .qr__stats {
    gap: 6px;
  }

  .qr__stat-name {
    display: none;
  }

  /* 移动端：撤销胶囊压在 Dock 正上方、拇指可达，不再顶到画面去遮挡素材 */
  .qr__undo {
    bottom: calc(max(10px, env(safe-area-inset-bottom)) + 46px);
    max-width: calc(100% - 20px);
  }

  .qr__toasts {
    top: 64px;
  }

  .qr__stage {
    padding: 72px 12px var(--qr-stage-bottom, 58px);
  }

  .qr__stage-wrap--undo {
    --qr-stage-bottom: calc(max(10px, env(safe-area-inset-bottom)) + 88px);
  }

  .qr__undo-kbd {
    display: none;
  }

  .qr__side {
    width: 100%;
    height: 46vh;
    flex: 0 0 auto;
    border-left: none;
    border-top: 1px solid var(--app-content-border-color, rgba(148, 163, 184, 0.22));
  }

  .qr__side-header {
    padding: 10px 14px 0;
  }

  .qr__side-body {
    padding: 6px 14px 0;
    gap: 12px;
  }

  .qr__side-footer {
    padding: 8px 14px max(10px, env(safe-area-inset-bottom));
  }

  .qr__dock {
    bottom: max(10px, env(safe-area-inset-bottom));
    padding: 0 10px;
    box-sizing: border-box;
  }

  .qr__dock-capsule {
    width: 100%;
    max-width: 440px;
    justify-content: space-between;
    gap: 2px;
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

  /* 多了一个按钮，窄屏把旋转按钮收紧一点，别让角度数字把整排顶宽 */
  .qr__dock-btn--rotate {
    gap: 3px;
    padding: 0 6px;
  }

  .qr__dock-badge {
    font-size: 10px;
  }
}
</style>
