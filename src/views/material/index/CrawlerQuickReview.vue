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
          :class="{ 'qr__stage--settle': !dragging, 'qr__stage--quarter': isQuarterTurn }"
          :style="stageStyle"
          title="双击查看原图"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
          @dblclick="openOriginal"
        >
          <!-- 渲染的是 displayUrl 而不是 current.url：
               它只在图片真正解码完成后才更新，避免上屏瞬间在主线程同步解码大图 -->
          <!-- 旋转只走 CSS transform：点一次转 90°，不动网络也不动文件，
               真正的改写等到入库时由服务端在同一张 COS 对象上就地完成 -->
          <img
            v-if="displayUrl"
            :src="displayUrl"
            :alt="current.name || '素材图片'"
            :style="imageStyle"
            draggable="false"
          />

          <!-- 新图还在解码：保留旧图 + 轻提示，绝不给一块白画布 -->
          <div v-if="deckPending" class="qr__deck-pending">
            <span class="qr__deck-spinner"></span>
            <span class="qr__deck-text">加载下一张…</span>
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

        <aside v-if="current" ref="sideRef" class="qr__side">
          <div class="qr__side-head">
            <h3 class="qr__name" :title="current.name">
              {{ current.name || `素材 ${current.id}` }}
            </h3>
            <div class="qr__specs">
              <span class="qr__spec">
                <span class="qr__spec-k">尺寸</span>
                <span class="qr__spec-v">{{ dimensionText || "-" }}</span>
              </span>
              <span class="qr__spec">
                <span class="qr__spec-k">比例</span>
                <span class="qr__spec-v">{{ aspectText }}</span>
              </span>
              <span class="qr__spec">
                <span class="qr__spec-k">大小</span>
                <span class="qr__spec-v">{{ fileSizeText }}</span>
              </span>
            </div>

            <div class="qr__meta">
              <span class="qr__meta-item" :title="`来源：${current.source || '-'}`">
                {{ current.source || "未知来源" }}
              </span>
              <span v-if="current.suffix" class="qr__meta-item">
                <span class="qr__chip" :class="isTransparent ? 'qr__chip--info' : 'qr__chip--muted'">
                  {{ current.suffix.toUpperCase() }}
                </span>
              </span>
              <span class="qr__meta-item">
                <span class="qr__chip" :class="current.isCutout ? 'qr__chip--ok' : 'qr__chip--muted'">
                  {{ current.isCutout ? "已抠图" : "未抠图" }}
                </span>
              </span>
              <span class="qr__meta-item qr__meta-item--faint">{{ createTimeText }}</span>
            </div>
          </div>

          <p v-if="current.keywords" class="qr__note">
            <span class="qr__note-k">关键词</span>{{ current.keywords }}
          </p>
          <p v-if="current.description" class="qr__note">
            <span class="qr__note-k">描述</span>{{ current.description }}
          </p>

          <div class="qr__tail">
            <a
              v-if="current.originUrl"
              class="qr__link"
              :href="current.originUrl"
              target="_blank"
              rel="noreferrer"
              :title="current.originUrl"
              >{{ current.originUrl }}</a
            >
            <span class="qr__id" :title="current.id">{{ current.id }}</span>
          </div>
        </aside>
      </main>

      <!-- 底部动作：悬浮毛玻璃胶囊 Dock 风格 -->
      <footer class="qr__dock">
        <div class="qr__dock-capsule">
          <button
            type="button"
            class="qr__dock-btn qr__dock-btn--rotate"
            :class="{ 'is-active': currentRotation > 0 }"
            :disabled="!current || !canRotate"
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
import { computed, markRaw, onBeforeUnmount, onMounted, ref, watch } from "vue";
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

/** 每次向接口取多少条（一次多拿，避免频繁补货造成断流） */
const PAGE_SIZE = 50;
/** 队列剩余多少条就后台补货：留足缓冲，用户感觉不到加载 */
const PREFETCH_THRESHOLD = 32;
/** 空闲帧里最多预热后面几张图（紧挨着的两张走立即通道） */
const PRELOAD_AHEAD = 6;
/**
 * 切换到下一张时，最多愿意等它解码多久。
 * 超时就照切不误 —— 宁可极偶尔白一下，也不能让用户点了没反应。
 * 现在上屏的是按视口出图的 webp，几百毫秒足够下载 + 解码完。
 */
const DECK_WAIT_TIMEOUT = 500;
/** 出图宽度上限：再宽对「要不要入库」的判断没有增益，只多花带宽和解码时间 */
const DECK_MAX_WIDTH = 2000;
/**
 * 攒批提交的参数刻意调小了。
 * 批越大单次接口越慢（后台要处理几十条），返回前会一直占着连接，
 * 「审核手感」取决于单次提交的往返时间而不是请求数量。
 */
/** 入库攒够多少条立刻提交 */
const IMPORT_BATCH = 10;
/** 删除攒够多少条立刻提交 */
const DELETE_BATCH = 10;
const IMPORT_DEBOUNCE = 800;
const DELETE_DEBOUNCE = 1000;
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

/** 透明底素材入库价值更高，直接用配色标出来，省掉一次「点开看格式」 */
const isTransparent = computed(() =>
  ["png", "webp", "gif"].includes(String(current.value?.suffix || "").toLowerCase()),
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

const currentRotation = computed(() => pendingRotations.value[String(current.value?.id ?? "")] || 0);

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

async function fetchNext(): Promise<void> {
  if (inflightFetch) return inflightFetch;
  if (finished.value || loadError.value) return;

  inflightFetch = (async () => {
    loading.value = true;
    try {
      // 删除会让库内数据整体前移，取到的可能全是已审过的旧行。
      // 这时不能判定「审完了」，要继续往下翻 —— 最多翻 3 页，防止极端情况死循环。
      // （用循环而非递归，是因为递归时外层 finally 会把内层刚发起的请求标记清掉，
      //   导致同一时刻能起两个 fetch，反而更乱。）
      for (let attempt = 0; attempt < 3; attempt += 1) {
        // 扣掉「已删但还没落库」的条数：删除提交期间照样能补货，不会被接口阻塞
        const offset = Math.max(0, nextOffset.value - pendingDeleteOffset.value);
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

        if (!rows.length) {
          // 接口确实没有更多数据了，才是真的审完
          finished.value = true;
          break;
        }

        if (!fresh.length) {
          // 本页有数据但全被去重过滤掉了 → 偏移落后了，继续往下翻
          finished.value = false;
          continue;
        }

        // markRaw：素材对象是纯展示数据（内含 meta/promptData 等深层字段），
        // 让它进响应式体系会递归代理几十上百个字段，
        // 一次补 50 条就能卡出肉眼可见的掉帧。
        queue.value.push(...fresh.map((item: any) => markRaw(item)));
        warmAhead();
        break;
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

/** 图片预解码调度器：负责「下一张随时可上屏」 */
const deck = useImageDeck({ maxCache: 16 });

/**
 * 实际下载/上屏的图片地址。
 * 原本直接拿原图（几 MB、动辄上千万像素）解码，连点几张就会把主线程压出掉帧；
 * 现在按视口宽度让 COS 出图，清晰度对审核没有损失，解码量小一到两个数量级。
 */
function pickDeckWidth(): number {
  if (typeof window === "undefined") return 1600;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // 画布大约占视口的 3/4，乘像素比就是这块屏真正需要多少宽
  const cssWidth = Math.min(window.innerWidth, 1920);
  return Math.max(900, Math.min(DECK_MAX_WIDTH, Math.round(cssWidth * dpr * 0.75)));
}

const deckWidth = ref(pickDeckWidth());

/** 预热与渲染必须算出同一个地址，否则缓存永远命不中 */
function deckKeyOf(item: any): string {
  return getReviewImageUrl(item?.url, deckWidth.value);
}

/**
 * 预热策略：紧挨着的两张走立即通道（手快的人 200ms 就翻过去，只备一张必然跟不上），
 * 更远的丢进空闲帧慢慢来 —— 一次性并发拉一堆还是会把带宽摊薄，
 * 反而让紧邻的下一张变慢，这是「越预载越卡」的常见误区。
 */
function warmAhead(): void {
  const list = queue.value;
  deck.warmNow(deckKeyOf(list[1]));
  deck.warmNow(deckKeyOf(list[2]));
  deck.warmIdle(list.slice(3, 3 + PRELOAD_AHEAD).map((item: any) => deckKeyOf(item)));
}

/** 数据层推进后的收尾：按需后台补货 + 预热（全异步，不阻塞点击反馈） */
function afterAdvance(): void {
  if (queue.value.length <= PREFETCH_THRESHOLD) void fetchNext();
  warmAhead();
}

// ── 视觉层：图解码就绪才上屏 ────────────────────────────────
/**
 * 真正渲染到画布上的图片地址。
 * 数据层切牌（queue.shift）是瞬时的，但这里必须等新图解码完成才替换：
 * 直接把未解码的大图交给 <img>，浏览器会在上屏那一帧同步解码几 MB 像素，
 * 表现就是「点了之后卡一下、闪一下白」。
 */
const displayUrl = ref("");
/** 新图还在解码：保留旧图 + 轻提示，绝不给用户一块白画布 */
const deckPending = ref(false);
let deckSeq = 0;

async function syncDeck(): Promise<void> {
  const target = deckKeyOf(current.value);
  const seq = ++deckSeq;

  if (!target) {
    displayUrl.value = "";
    deckPending.value = false;
    return;
  }

  // 绝大多数情况下下一张早已在后台解码好，这里零延迟直接上屏
  if (deck.isReady(target)) {
    displayUrl.value = target;
    deckPending.value = false;
    return;
  }

  deckPending.value = true;
  await deck.awaitReady(target, DECK_WAIT_TIMEOUT);
  if (seq !== deckSeq) return; // 期间用户又翻了，丢弃过期结果
  displayUrl.value = target;
  deckPending.value = false;
}

watch(() => current.value?.url, syncDeck, { immediate: true });

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
  const url = current.value?.url;
  if (url) window.open(url, "_blank", "noreferrer");
}

function retry(): void {
  loadError.value = "";
  autoRetryLeft = 2;
  void fetchNext();
}

function reload(): void {
  queue.value = [];
  seenIds.value = new Set();
  deck.reset();
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
      // 删除已落库：把临时预判固化成永久偏移修正，
      // 之后新发起的补货用不到预判量了，一并释放。
      pendingDeleteOffset.value = Math.max(0, pendingDeleteOffset.value - count);
      nextOffset.value = Math.max(0, nextOffset.value - count);
    } catch (error: any) {
      deletedCount.value = Math.max(0, deletedCount.value - count);
      notify(`删除提交失败：${error?.message || "未知错误"}`, "error");
      // 删除失败 = 数据还在库里，把预判的偏移还回去，避免跳过素材
      pendingDeleteOffset.value = Math.max(0, pendingDeleteOffset.value - count);
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

  if (event.key === "ArrowUp" || event.key === "r" || event.key === "R") {
    event.preventDefault();
    rotateCurrent();
  } else if (event.key === "ArrowLeft") {
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

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("resize", onViewportResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("resize", onViewportResize);
  if (deckResizeTimer) clearTimeout(deckResizeTimer);
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
  flex: 1 1 0;
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
    filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.35));
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

/* 等待下一张解码：轻量角标，不遮挡画面 */
.qr__deck-pending {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(8px);
  pointer-events: none;
  user-select: none;
}

.qr__deck-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(226, 232, 240, 0.35);
  border-top-color: #e2e8f0;
  border-radius: 50%;
  animation: qr-deck-spin 0.7s linear infinite;
}

.qr__deck-text {
  letter-spacing: 0.3px;
}

@keyframes qr-deck-spin {
  to {
    transform: rotate(360deg);
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

/* ── 信息面板：整宽铺开，不再居中限宽 ── */
.qr__side {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 5px;
  max-height: 100%;
  min-width: 0;
  min-height: 0;
  padding: 11px 20px 12px;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  background: var(--app-content-surface-color, #ffffff);
  border-top: 1px solid var(--app-content-border-color, rgba(148, 163, 184, 0.22));
}

/* 标题 + 关键数值 + 次要信息排在同一行，按内容自然铺满 */
.qr__side-head {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 2px 26px;
  align-items: baseline;
}

.qr__name {
  flex: 0 1 auto;
  max-width: 55%;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 关键数值：11px 标签 + 17px 等宽数字 */
.qr__specs {
  display: flex;
  flex: 0 0 auto;
  gap: 22px;
  align-items: baseline;
}

.qr__spec {
  display: inline-flex;
  gap: 6px;
  align-items: baseline;
}

.qr__spec-k {
  font-size: 11px;
  color: var(--el-text-color-secondary, #64748b);
}

.qr__spec-v {
  font-size: 17px;
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
  font-variant-numeric: tabular-nums;
}

/* 次要信息：吃掉标题与数值之后的剩余宽度，项间用细竖线 */
.qr__meta {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 2px 16px;
  align-items: baseline;
  min-width: 0;
  font-size: 12px;
  color: var(--el-text-color-regular, #334155);
}

.qr__meta-item {
  position: relative;
  max-width: 45%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  & + &::before {
    position: absolute;
    top: 0;
    left: -8px;
    width: 1px;
    height: 13px;
    background: var(--el-border-color, #cbd5e1);
    content: "";
    opacity: 0.7;
  }
}

.qr__note {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--el-text-color-regular, #334155);
  overflow-wrap: anywhere;
}

.qr__meta-item--faint {
  color: var(--el-text-color-secondary, #64748b);
}

/* 状态色块：绿=已处理，蓝=有透明通道，灰=未处理/普通格式 */
.qr__chip {
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 500;
  line-height: 16px;
  border: 1px solid transparent;
  border-radius: 5px;
}

.qr__chip--ok {
  color: #047857;
  background: color-mix(in srgb, #10b981 13%, transparent);
  border-color: color-mix(in srgb, #10b981 24%, transparent);
}

.qr__chip--info {
  color: #1d4ed8;
  background: color-mix(in srgb, #3b82f6 13%, transparent);
  border-color: color-mix(in srgb, #3b82f6 24%, transparent);
}

.qr__chip--muted {
  color: var(--el-text-color-secondary, #64748b);
  background: var(--el-fill-color-light, #f1f5f9);
  border-color: var(--el-border-color-lighter, rgb(148 163 184 / 24%));
}

.qr__note-k {
  display: inline-block;
  margin-right: 7px;
  padding: 1px 6px;
  font-size: 11px;
  color: var(--el-text-color-secondary, #64748b);
  background: var(--el-fill-color-light, #f1f5f9);
  border-radius: 4px;
}

/* 末行：地址靠左长开，ID 靠右锚定，整行拉满 */
.qr__tail {
  display: flex;
  gap: 18px;
  align-items: baseline;
  font-size: 11px;
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

/* 旋转按钮 (Light mode)：只是预览，所以保持幽灵态，转了角度才点亮 */
.qr__dock-btn--rotate {
  &:hover:not(:disabled) {
    color: var(--el-text-color-primary, #0f172a);
    background: rgb(15 23 42 / 6%);

    .qr__dock-arrow {
      opacity: 1;
      transform: rotate(90deg);
    }
  }

  &.is-active {
    color: #4338ca;
    background: rgb(99 102 241 / 10%);

    .qr__dock-arrow {
      opacity: 1;
    }
  }
}

.qr__dock-badge {
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  color: #4338ca;
  background: rgb(99 102 241 / 12%);
  border-radius: 999px;
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

  .qr__spec-k,
  .qr__note-k {
    color: #94a3b8;
  }

  .qr__spec-v {
    color: #f0f2f5;
  }

  .qr__meta,
  .qr__note {
    color: #cbd5e1;
  }

  .qr__meta-item + .qr__meta-item::before {
    background: rgb(255 255 255 / 18%);
  }

  .qr__link {
    color: #60a5fa;
  }

  .qr__chip--ok {
    color: #34d399;
    border-color: color-mix(in srgb, #10b981 30%, transparent);
  }

  .qr__chip--info {
    color: #60a5fa;
    border-color: color-mix(in srgb, #3b82f6 30%, transparent);
  }

  .qr__chip--muted {
    color: #94a3b8;
    background: rgb(255 255 255 / 6%);
    border-color: rgb(255 255 255 / 10%);
  }

  .qr__note-k {
    color: #94a3b8;
    background: rgb(255 255 255 / 6%);
  }

  .qr__id {
    color: #94a3b8;
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

  .qr__dock-btn--rotate {
    &:hover:not(:disabled) {
      color: #fff;
      background: rgb(255 255 255 / 8%);
    }

    &.is-active {
      color: #a5b4fc;
      background: rgb(99 102 241 / 18%);
    }
  }

  .qr__dock-badge {
    color: #c7d2fe;
    background: rgb(99 102 241 / 24%);
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
    padding: 10px 14px 12px;
  }

  .qr__side-head {
    gap: 2px 14px;
  }

  .qr__name {
    max-width: 100%;
  }

  .qr__specs {
    gap: 14px;
  }

  .qr__spec-v {
    font-size: 15px;
  }

  .qr__meta-item {
    max-width: 100%;
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

  /* 多了一个按钮，窄屏把旋转按钮收紧一点，别让角度徽章把胶囊顶宽 */
  .qr__dock-btn--rotate {
    gap: 3px;
    padding: 0 6px;
  }

  .qr__dock-badge {
    padding: 0 4px;
    font-size: 10px;
  }
}
</style>
