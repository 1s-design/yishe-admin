<template>
  <teleport to="body">
    <div v-if="visible" class="qr">
      <!-- ================= 左侧：负责图片展示与舞台交互 ================= -->
      <section class="qr__stage-wrap">
        <!-- 极简悬浮顶条：无实体头栏，浮动毛玻璃轻量控件 -->
        <header class="qr__floating-bar">
          <div class="qr__floating-left">
            <span class="qr__floating-progress">
              {{ processedCount }}<template v-if="total"> / {{ total }}</template>
            </span>
            <span class="qr__floating-badge">自定义贴纸</span>

            <!-- 撤销删除胶囊 -->
            <button
              v-if="canUndoDelete"
              type="button"
              class="qr__undo-top-btn"
              :title="`撤销删除（还有 ${deleteQueue.length} 张待删，快捷键：Z 或 Ctrl+Z）`"
              @click="undoLastDelete"
            >
              <span class="qr__undo-top-icon">↺</span>
              <span class="qr__undo-top-text">撤销删除</span>
              <span class="qr__undo-top-badge">{{ deleteQueue.length }}</span>
            </button>

            <button
              v-if="skippedCount"
              type="button"
              class="qr__text-btn"
              title="把本次忽略的贴纸重新放回队列末尾"
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
                <i class="qr__stat-dot qr__stat-dot--copy"></i>
                <span class="qr__stat-name">已复制</span>
                <span class="qr__stat-val">{{ copiedCount }}</span>
              </span>
              <span class="qr__stat-divider">/</span>
              <span class="qr__stat-item">
                <i class="qr__stat-dot qr__stat-dot--delete"></i>
                <span class="qr__stat-name">已删除</span>
                <span class="qr__stat-val">{{ deletedCount }}</span>
              </span>
              <span class="qr__stat-divider">/</span>
              <span class="qr__stat-item">
                <i class="qr__stat-dot qr__stat-dot--rework"></i>
                <span class="qr__stat-name">已返工</span>
                <span class="qr__stat-val">{{ reworkedCount }}</span>
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
          v-if="current"
          class="qr__stage"
          :class="{ 'qr__stage--settle': !dragging }"
          :style="stageStyle"
          title="双击查看原图"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
          @dblclick="openOriginal"
        >
          <img v-if="displayUrl" :src="displayUrl" :alt="current.name || '自定义贴纸'" draggable="false" />

          <!-- 新图还在解码：轻量角标提示 -->
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
          <p class="qr__state-title">正在加载自定义贴纸…</p>
        </div>

        <div v-else-if="loadError" class="qr__state">
          <p class="qr__state-title">加载失败</p>
          <p class="qr__state-desc">{{ loadError }}</p>
          <button type="button" class="qr__state-btn" @click="retry">重试</button>
        </div>

        <div v-else class="qr__state">
          <p class="qr__state-title">已审核完全部自定义贴纸</p>
          <p class="qr__state-desc">
            本次共处理 {{ processedCount }} 张（复制到素材库 {{ copiedCount }} · 彻底删除 {{ deletedCount }} · 返工 {{ reworkedCount }} · 忽略 {{ skippedCount }}）
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
              class="qr__dock-btn qr__dock-btn--skip"
              :disabled="!current"
              title="忽略该贴纸并看下一张（快捷键：← 或 A）"
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
              title="彻底删除该贴纸（快捷键：↓ 或 S）"
              @click="actDelete"
            >
              <span class="qr__dock-arrow">↓</span>
              <span class="qr__dock-text">彻底删除</span>
              <kbd class="qr__dock-kbd">S</kbd>
            </button>

            <div class="qr__dock-sep"></div>

            <button
              type="button"
              class="qr__dock-btn qr__dock-btn--rework"
              :disabled="!current"
              title="对该贴纸提出微调意见并派发返工任务（快捷键：R）"
              @click="openReworkDialog"
            >
              <span class="qr__dock-arrow">↺</span>
              <span class="qr__dock-text">返工微调</span>
              <kbd class="qr__dock-kbd">R</kbd>
            </button>

            <div class="qr__dock-sep"></div>

            <button
              type="button"
              class="qr__dock-btn qr__dock-btn--copy"
              :disabled="!current"
              title="复制该贴纸到素材库（快捷键：→ 或 D）"
              @click="actCopy"
            >
              <span class="qr__dock-arrow">→</span>
              <span class="qr__dock-text">复制到素材库</span>
              <kbd class="qr__dock-kbd">D</kbd>
            </button>
          </div>
        </footer>
      </section>

      <!-- ================= 右侧：负责详情与操作面板 ================= -->
      <aside v-if="current" class="qr__side">
        <!-- 顶栏：极简标题 + 右上角专属关闭按钮 -->
        <div class="qr__side-header">
          <span class="qr__side-title">贴纸详情</span>
          <button type="button" class="qr__side-close" title="退出审核 (Esc)" @click="close">
            <el-icon><Close /></el-icon>
          </button>
        </div>

        <!-- 详情滚动体：自上而下顺畅流式布局，轻背景，无多余边框 -->
        <div ref="sideRef" class="qr__side-body">
          <!-- 1. 贴纸标题与标识行 -->
          <div class="qr__meta-section">
            <h3 class="qr__main-title" :title="current.name || ''">
              {{ current.name || `贴纸 #${current.id}` }}
            </h3>

            <div class="qr__sub-meta">
              <span class="qr__mono-id">#{{ current.id }}</span>
              <span class="qr__meta-dot">·</span>
              <span class="qr__meta-text">{{ creatorText }}</span>
              <span class="qr__meta-dot">·</span>
              <span class="qr__meta-text">{{ createTimeText }}</span>
            </div>

            <!-- 状态标签行：极简轻底色 Pill 胶囊 -->
            <div class="qr__pills-group">
              <span class="qr__pill" :class="current.imported ? 'qr__pill--success' : 'qr__pill--neutral'">
                {{ current.imported ? "已复制到素材库" : "未复制入库" }}{{ current.imported && current.importedSticker?.code ? ` (${current.importedSticker.code})` : "" }}
              </span>
              <span class="qr__pill" :class="current.isShared ? 'qr__pill--info' : 'qr__pill--neutral'">
                {{ current.isShared ? "已发布" : "未发布" }}
              </span>
              <span v-if="current.folder" class="qr__pill qr__pill--neutral">
                {{ current.folder }}
              </span>
            </div>
          </div>

          <!-- 2. 规格参数：轻背景通栏指标条，无边框格子 -->
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
              <span class="qr__spec-label">格式</span>
              <span class="qr__spec-val">{{ current.suffix ? current.suffix.toUpperCase() : "PNG" }}</span>
            </div>
          </div>

          <!-- 3. 提示词 Prompt：轻背景流式卡片，无生硬边框 -->
          <div v-if="promptText && promptText !== '-'" class="qr__prompt-panel">
            <div class="qr__panel-head">
              <span class="qr__panel-title">提示词 Prompt</span>
              <button
                type="button"
                class="qr__copy-action"
                title="一键复制提示词"
                @click="copyPromptToClipboard(promptText)"
              >
                <el-icon><CopyDocument /></el-icon>
                <span>复制</span>
              </button>
            </div>
            <p class="qr__prompt-text select-text">{{ promptText }}</p>
          </div>

          <!-- 4. 负向提示词 Negative Prompt（若有） -->
          <div v-if="negativePromptText" class="qr__prompt-panel qr__prompt-panel--neg">
            <div class="qr__panel-head">
              <span class="qr__panel-title">负向提示词 Negative</span>
              <button
                type="button"
                class="qr__copy-action"
                title="一键复制负向词"
                @click="copyPromptToClipboard(negativePromptText)"
              >
                <el-icon><CopyDocument /></el-icon>
                <span>复制</span>
              </button>
            </div>
            <p class="qr__prompt-text select-text">{{ negativePromptText }}</p>
          </div>

          <!-- 5. 关键词与描述（若有） -->
          <div v-if="current.keywords || current.description" class="qr__extra-panel">
            <div v-if="current.keywords" class="qr__extra-row">
              <span class="qr__extra-k">关键词</span>
              <span class="qr__extra-v select-text">{{ current.keywords }}</span>
            </div>
            <div v-if="current.description" class="qr__extra-row">
              <span class="qr__extra-k">描述</span>
              <span class="qr__extra-v select-text">{{ current.description }}</span>
            </div>
          </div>
        </div>

        <!-- 侧边栏贴底操作栏 -->
        <div class="qr__side-footer">
          <button
            type="button"
            class="qr__submit-btn"
            title="一键复制贴纸到素材库（快捷键：D 或 →）"
            @click="actCopy"
          >
            <span>复制到素材库</span>
            <kbd class="qr__kbd-hint">D / →</kbd>
          </button>
          <button
            type="button"
            class="qr__rework-side-btn"
            title="返工微调（快捷键：R）"
            @click="openReworkDialog"
          >
            <span>返工</span>
            <kbd class="qr__kbd-hint qr__kbd-hint--purple">R</kbd>
          </button>
          <button
            type="button"
            class="qr__delete-btn"
            title="彻底删除该贴纸（快捷键：S 或 ↓）"
            @click="actDelete"
          >
            <span>删除</span>
            <kbd class="qr__kbd-hint qr__kbd-hint--danger">S / ↓</kbd>
          </button>
        </div>
      </aside>

      <!-- 返工微调弹窗 -->
      <el-dialog
        v-model="reworkDialogVisible"
        title="返工微调 · 派发给工位"
        width="480px"
        append-to-body
        align-center
        destroy-on-close
        class="qr__rework-dialog"
      >
        <div class="qr__rework-content">
          <div class="qr__rework-preview">
            <img v-if="current" :src="current.url" class="qr__rework-thumb" alt="原稿" />
            <div class="qr__rework-info">
              <div class="font-bold text-sm truncate">{{ current?.name || '贴纸原稿' }}</div>
              <div class="text-xs text-muted-foreground mt-1">版本代次：v{{ current?.revision || 1 }}</div>
            </div>
          </div>

          <div class="qr__rework-chips">
            <span class="text-xs font-semibold mb-1.5 block">快捷反馈标签（可多选）：</span>
            <div class="flex flex-wrap gap-1.5">
              <el-check-tag
                v-for="tag in REWORK_QUICK_TAGS"
                :key="tag"
                :checked="selectedReworkTags.includes(tag)"
                class="qr__rework-tag"
                @change="toggleReworkTag(tag)"
              >
                {{ tag }}
              </el-check-tag>
            </div>
          </div>

          <div class="qr__rework-input">
            <span class="text-xs font-semibold mb-1.5 block">微调指示要求：</span>
            <el-input
              v-model="reworkFeedbackInput"
              type="textarea"
              :rows="3"
              placeholder="例如：主标题放大一点并居中，背景增加细微暗纹，颜色换成暖黄调..."
              maxlength="300"
              show-word-limit
            />
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <el-button @click="reworkDialogVisible = false">取消</el-button>
            <el-button
              type="primary"
              color="#7c3aed"
              :loading="submittingRework"
              @click="submitRework"
            >
              确认派发返工
            </el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { Close, CopyDocument } from "@element-plus/icons-vue";
import { CustomStickerApi, type CustomSticker } from "@/api/custom-sticker";
import { formatTimestamp } from "@/common/date";
import { useImageDeck } from "@/composables/useImageDeck";
import { getReviewImageUrl } from "@/utils/image";

defineOptions({ name: "CustomStickerQuickReview" });

const props = withDefaults(
  defineProps<{
    visible: boolean;
    /** 复用列表页的筛选条件（searchText, folderId, shareState, importState 等） */
    query?: Record<string, any>;
  }>(),
  { query: () => ({}) },
);

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "reviewed"): void;
}>();

/** 每次向后台拉取多少条数据 */
const PAGE_SIZE = 50;
/** 队列剩余多少条时在后台自动补货（留足缓冲，用户感觉不到加载） */
const PREFETCH_THRESHOLD = 32;
/** 空闲帧里最多预热后面几张图（紧挨着的两张走立即通道） */
const PRELOAD_AHEAD = 6;
/**
 * 切换到下一张时，最多愿意等它解码多久。
 * 超时就照切不误 —— 宁可极偶尔白一下，也不能让用户点了没反应。
 * 现在上屏的是按视口出图的 webp，几百毫秒足够下载 + 解码完。
 */
const DECK_WAIT_TIMEOUT = 500;
/** 出图宽度上限：再宽对「要不要复制到素材库」的判断没有增益，只多花带宽和解码时间 */
const DECK_MAX_WIDTH = 2000;
/**
 * 攒批提交的参数刻意调小了。
 * 批越大单次接口越慢（后台要处理几十条），返回前一直占着连接，
 * 「审核手感」取决于单次提交的往返时间，而不是请求数量。
 */
/** 复制到素材库累积条数立即批量提交 */
const COPY_BATCH = 10;
/** 删除累积条数立即批量提交 */
const DELETE_BATCH = 10;
const COPY_DEBOUNCE = 800;
const DELETE_DEBOUNCE = 1000;
/** 判定手势滑动的像素位移阈值 */
const SWIPE_THRESHOLD = 70;

const SWIPE_HINT_TEXT: Record<string, string> = {
  copy: "复制到素材库",
  delete: "彻底删除",
  skip: "忽略",
};

// ── 待审核队列与状态 ──────────────────────────────────────────
const queue = ref<CustomSticker[]>([]);
const loading = ref(false);
const loadError = ref("");
const finished = ref(false);
const total = ref(0);
const nextOffset = ref(0);
/**
 * 已提交删除、但接口还在飞行中的条数。
 * 删除会让库内数据整体前移，所以取数时必须把它从偏移里扣掉，否则会跳过素材。
 *
 * 这里用「计数补偿」而不是原来的 `await inflightDelete`：
 * await 会把后台补货整个堵住，用户连续删除时补货全部排队 → 队列耗尽 → 卡在「正在加载」。
 */
const pendingDeleteOffset = ref(0);
const seenIds = ref<Set<string>>(new Set());

// ── 统计计数 ──────────────────────────────────────────────────
const copiedCount = ref(0);
const deletedCount = ref(0);
const reworkedCount = ref(0);
const skippedCount = ref(0);
const processedCount = computed(
  () => copiedCount.value + deletedCount.value + reworkedCount.value + skippedCount.value,
);

const reworkDialogVisible = ref(false);
const submittingRework = ref(false);
const reworkFeedbackInput = ref("");
const selectedReworkTags = ref<string[]>([]);

const REWORK_QUICK_TAGS = [
  "排版过密",
  "排版过空",
  "文字重叠",
  "主标题太小",
  "主标不明显",
  "配色过于单调",
  "缺少背景层次",
  "元素溢出边缘",
  "增加装饰细节",
  "替换字体风格",
  "对比度过弱",
  "换一个文案侧重",
];

// ── 队列与暂存 ────────────────────────────────────────────────
const skippedItems = ref<CustomSticker[]>([]);
const copyQueue = ref<CustomSticker[]>([]);
const deleteQueue = ref<CustomSticker[]>([]);

// ── 模态层内轻提示 ────────────────────────────────────────────
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

function notify(text: string, tone: "info" | "success" | "warning" | "error" = "info"): void {
  if (props.visible) pushToast(text, tone);
  else ElMessage({ message: text, type: tone, duration: 2600 });
}

const current = computed(() => queue.value[0] ?? null);
const canUndoDelete = computed(() => deleteQueue.value.length > 0);

const sideRef = ref<HTMLElement | null>(null);

watch(
  () => current.value?.id,
  async (id) => {
    if (sideRef.value) sideRef.value.scrollTop = 0;
    if (id && current.value && !current.value.meta) {
      try {
        const detail = await CustomStickerApi.getDetail(id);
        if (detail && current.value && current.value.id === id) {
          Object.assign(current.value, detail);
        }
      } catch {}
    }
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

const creatorText = computed(() => {
  const row = current.value;
  if (!row) return "-";
  if (row.user?.name) return row.user.name;
  if (row.user?.account) return row.user.account;
  if (row.userId) return `用户 #${row.userId}`;
  return "-";
});

const promptText = computed(() => {
  const row = current.value;
  if (!row) return "-";
  const prompt = row.meta?.prompt || row.meta?.promptData?.prompt || row.description || "";
  return String(prompt).trim() || "-";
});

const negativePromptText = computed(() => {
  const row = current.value;
  if (!row) return "";
  const neg = row.meta?.negativePrompt || row.meta?.promptData?.negativePrompt || "";
  return String(neg).trim();
});

async function copyPromptToClipboard(text: string) {
  if (!text || text === "-") return;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      throw new Error("fallback");
    }
    pushToast("提示词已复制到剪贴板", "success");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    pushToast("提示词已复制到剪贴板", "success");
  }
}

const createTimeText = computed(() => {
  const row = current.value;
  if (!row?.createTime) return "-";
  return formatTimestamp(row.createTime) || row.createTime;
});

// ── 分页预取逻辑 ──────────────────────────────────────────────
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
      // （用循环而非递归：递归时外层 finally 会把内层刚发起的请求标记清掉，
      //   同一时刻就可能起两个 fetch，反而更乱。）
      for (let attempt = 0; attempt < 3; attempt += 1) {
        // 扣掉「已删但还没落库」的条数：删除提交期间照样能补货，不会被接口阻塞
        const offset = Math.max(0, nextOffset.value - pendingDeleteOffset.value);
        const pageNo = Math.floor(offset / PAGE_SIZE) + 1;
        const drop = offset % PAGE_SIZE;

        const res: any = await CustomStickerApi.getAdminPage({
          page: pageNo,
          pageSize: PAGE_SIZE,
          searchText: props.query?.searchText || undefined,
          folderId: props.query?.folderId,
          shareState: props.query?.shareState,
          importState: props.query?.importState,
        });

        const list: CustomSticker[] = Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res?.list)
          ? res.list
          : [];
        if (res?.total !== undefined) total.value = Number(res.total) || 0;

        const rows = list.slice(drop);
        const fresh = rows.filter((item) => {
          const id = String(item?.id ?? "");
          if (!id || seenIds.value.has(id)) return false;
          // 先占位：不满足筛选条件的也算消费过，避免下一页反复遇到同一批记录
          seenIds.value.add(id);

          // 如果外部过滤了发布状态或素材库状态，客户端同步过滤
          if (props.query?.shareState === "shared" && !item.isShared) return false;
          if (props.query?.shareState === "unshared" && item.isShared) return false;
          if (props.query?.importState === "imported" && !item.imported) return false;
          if (props.query?.importState === "not-imported" && item.imported) return false;

          return true;
        });

        nextOffset.value = offset + rows.length;

        if (!rows.length) {
          // 接口确实没有更多数据了，才是真的审完
          finished.value = true;
          break;
        }

        if (!fresh.length) {
          // 本页有数据但全被去重/筛选过滤掉了 → 偏移落后了，继续往下翻
          finished.value = false;
          continue;
        }

        // markRaw：贴纸对象是纯展示数据（内含 meta/promptData 等深层字段），
        // 让它进响应式体系会递归代理几十上百个字段，
        // 一次补 50 条就能卡出肉眼可见的掉帧。
        queue.value.push(...fresh.map((item) => markRaw(item)));
        warmAhead();
        break;
      }
      loadError.value = "";
      autoRetryLeft = 2;
    } catch (error: any) {
      loadError.value = error?.message || "网络请求异常，请重试";
      scheduleAutoRetry();
    } finally {
      loading.value = false;
      inflightFetch = null;
    }
  })();

  return inflightFetch;
}

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
const deck = useImageDeck({ maxCache: 36 });

/**
 * 实际下载/上屏的图片地址按视口宽度离散量化出图，
 * 采用 1200 / 1600 / 2000 档位消除微小视口抖动，
 * 确保预热算出的 URL 与真正渲染的 URL 100% 相同，杜绝脱靶。
 */
function pickDeckWidth(): number {
  if (typeof window === "undefined") return 1600;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssWidth = window.innerWidth || 1600;
  const target = cssWidth * dpr * 0.75;
  if (target <= 1300) return 1200;
  if (target <= 1700) return 1600;
  return 2000;
}

const deckWidth = ref(pickDeckWidth());

/** 预热与渲染必须算出同一个地址，否则缓存永远命不中 */
function deckKeyOf(item?: CustomSticker | null): string {
  return getReviewImageUrl(item?.url, deckWidth.value);
}

/**
 * 预热策略：紧挨着的 3 张走立即通道，
 * 更远的丢进空闲帧慢慢来，兼顾即时性与带宽平滑。
 */
function warmAhead(): void {
  const list = queue.value;
  if (!list.length) return;
  const cur = deckKeyOf(list[0]);
  if (cur) deck.ensure(cur);

  const nextSlice: string[] = [];
  if (list[1]) nextSlice.push(deckKeyOf(list[1]));
  if (list[2]) nextSlice.push(deckKeyOf(list[2]));
  if (list[3]) nextSlice.push(deckKeyOf(list[3]));
  if (nextSlice.length) deck.warmNow(nextSlice);

  const idleSlice = list.slice(4, 4 + PRELOAD_AHEAD);
  if (idleSlice.length) {
    deck.warmIdle(idleSlice.map((item) => deckKeyOf(item)).filter(Boolean));
  }
}

/** 数据层推进后的收尾：按需后台补货 + 预热（全异步，不阻塞点击反馈） */
function afterAdvance(): void {
  if (queue.value.length <= PREFETCH_THRESHOLD) void fetchNext();
  warmAhead();
}

// ── 视觉层：图解码就绪才上屏 ────────────────────────────────
/**
 * 真正渲染到画布上的图片地址。
 */
const displayUrl = ref("");
/** 新图还在解码：保留轻提示，绝不卡在旧图上 */
const deckPending = ref(false);
let deckSeq = 0;

function syncDeck(): void {
  const target = deckKeyOf(current.value);
  const seq = ++deckSeq;

  if (!target) {
    displayUrl.value = "";
    deckPending.value = false;
    return;
  }

  // 1. 0ms 瞬间直显目标地址，绝不卡在旧图上
  displayUrl.value = target;

  if (deck.isReady(target)) {
    deckPending.value = false;
    return;
  }

  deckPending.value = true;
  void deck.ensure(target).then(() => {
    if (seq === deckSeq) {
      deckPending.value = false;
    }
  });
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

// ── 三大核心动作：忽略、彻底删除、复制到素材库 ─────────────────
function actSkip(): void {
  const item = queue.value.shift();
  if (!item) return;
  skippedItems.value.push(item);
  skippedCount.value += 1;
  pushToast("已忽略");
  afterAdvance();
}

function actCopy(): void {
  const item = queue.value.shift();
  if (!item) return;
  copyQueue.value.push(item);
  copiedCount.value += 1;
  item.imported = true;
  pushToast("已复制到素材库", "success");
  scheduleCopyFlush();
  afterAdvance();
}

function actDelete(): void {
  const item = queue.value.shift();
  if (!item) return;
  deleteQueue.value.push(item);
  deletedCount.value += 1;
  pushToast("已彻底删除，可在顶部撤销", "warning");
  scheduleDeleteFlush();
  afterAdvance();
}

function resetSkipped(): void {
  if (!skippedItems.value.length) return;
  const items = skippedItems.value.splice(0, skippedItems.value.length);
  skippedCount.value = 0;
  queue.value.push(...items);
  pushToast(`已把 ${items.length} 张忽略的贴纸放回队列`, "success");
  afterAdvance();
}

function openReworkDialog(): void {
  if (!current.value) return;
  selectedReworkTags.value = [];
  reworkFeedbackInput.value = "";
  reworkDialogVisible.value = true;
}

function toggleReworkTag(tag: string): void {
  const idx = selectedReworkTags.value.indexOf(tag);
  if (idx > -1) {
    selectedReworkTags.value.splice(idx, 1);
  } else {
    selectedReworkTags.value.push(tag);
  }
}

async function submitRework(): Promise<void> {
  if (!current.value) return;
  const tagsStr = selectedReworkTags.value.join("；");
  const detailStr = reworkFeedbackInput.value.trim();
  const feedback = [tagsStr, detailStr].filter(Boolean).join("。说明：");

  if (!feedback) {
    ElMessage.warning("请选择至少一个标签或输入微调说明");
    return;
  }

  submittingRework.value = true;
  try {
    const cur = current.value;
    await CustomStickerApi.triggerRework({
      sourceStickerId: cur.id,
      inspirationId: (cur as any).inspirationId || undefined,
      feedbackPrompt: feedback,
    });

    const item = queue.value.shift();
    if (item) {
      reworkedCount.value += 1;
      pushToast(`已派发返工任务给工位：${tagsStr || detailStr.slice(0, 15)}`, "warning");
      reworkDialogVisible.value = false;
      afterAdvance();
    }
  } catch (err: any) {
    ElMessage.error(err?.message || "派发返工任务失败");
  } finally {
    submittingRework.value = false;
  }
}

// ── 复制提交（积攒批量提交）───────────────────────────────────
let copyTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleCopyFlush(): void {
  if (copyTimer) clearTimeout(copyTimer);
  if (copyQueue.value.length >= COPY_BATCH) {
    void flushCopies();
    return;
  }
  copyTimer = setTimeout(() => {
    copyTimer = null;
    void flushCopies();
  }, COPY_DEBOUNCE);
}

async function flushCopies(): Promise<void> {
  if (copyTimer) {
    clearTimeout(copyTimer);
    copyTimer = null;
  }
  if (!copyQueue.value.length) return;

  const items = copyQueue.value.splice(0, copyQueue.value.length);
  try {
    const ids = items.map((item) => String(item.id));
    const res = await CustomStickerApi.batchCopyToStickerLibrary({ ids });
    if (res?.failed?.length) {
      notify(`部分贴纸复制失败：${res.failed.map((f) => f.message).join("; ")}`, "warning");
    }
  } catch (error: any) {
    copiedCount.value = Math.max(0, copiedCount.value - items.length);
    notify(`复制到素材库失败：${error?.message || "未知错误"}`, "error");
  }
}

// ── 彻底删除提交（积攒批量提交）───────────────────────────────
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
  const count = items.length;
  // 乐观预判：这批删除一旦生效，库内数据会整体前移 count 位，
  // 后台补货必须立刻按新位置取值，否则会跳过素材。
  pendingDeleteOffset.value += count;

  inflightDelete = (async () => {
    try {
      await CustomStickerApi.batchDelete({
        ids: items.map((item) => String(item.id)),
      });
      // 删除已落库：把临时预判固化成永久偏移修正，
      // 之后新发起的补货用不到预判量了，一并释放。
      pendingDeleteOffset.value = Math.max(0, pendingDeleteOffset.value - count);
      nextOffset.value = Math.max(0, nextOffset.value - count);
    } catch (error: any) {
      deletedCount.value = Math.max(0, deletedCount.value - count);
      notify(`删除失败：${error?.message || "未知错误"}`, "error");
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

function undoLastDelete(): void {
  const item = deleteQueue.value.pop();
  if (!item) return;
  deletedCount.value = Math.max(0, deletedCount.value - 1);
  queue.value.unshift(item);
  pushToast("已撤销删除", "success");
}

// ── 手势滑动交互 ──────────────────────────────────────────────
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
  if (Math.abs(x) >= Math.abs(y)) return x > 0 ? "copy" : "skip";
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
    if (x > 0) actCopy();
    else actSkip();
    return;
  }
  if (y > 0) actDelete();
}

function onPointerCancel(): void {
  dragging.value = false;
  swipe.value = { x: 0, y: 0 };
}

// ── 键盘快捷键监听 ──────────────────────────────────────────
function onKeydown(event: KeyboardEvent): void {
  if (!props.visible) return;

  // 避免在输入框中打字时误触
  const targetTag = (event.target as HTMLElement)?.tagName?.toLowerCase();
  if (targetTag === "input" || targetTag === "textarea") return;

  if (event.key === "Escape") {
    close();
    return;
  }

  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    event.preventDefault();
    actSkip();
  } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    event.preventDefault();
    actCopy();
  } else if (
    event.key === "ArrowDown" ||
    event.key === "s" ||
    event.key === "S" ||
    event.key === "Delete" ||
    event.key === "Backspace"
  ) {
    event.preventDefault();
    actDelete();
  } else if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    openReworkDialog();
  }
}

// ── 关闭与善后 ────────────────────────────────────────────────
function close(): void {
  emit("update:visible", false);
}

async function teardown(): Promise<void> {
  if (copyTimer) {
    clearTimeout(copyTimer);
    copyTimer = null;
  }
  if (deleteTimer) {
    clearTimeout(deleteTimer);
    deleteTimer = null;
  }
  await Promise.all([flushCopies(), flushDeletes()]);
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
  if (copyTimer) clearTimeout(copyTimer);
  if (deleteTimer) clearTimeout(deleteTimer);
  if (autoRetryTimer) clearTimeout(autoRetryTimer);
  void flushCopies();
  void flushDeletes();
});
</script>

<style lang="scss" scoped>
.qr {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  background: var(--app-content-bg-color, #f7f9fc);
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
  gap: 12px;
  pointer-events: none;
}

.qr__floating-left,
.qr__floating-right {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 5px 12px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 999px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
}

.qr__floating-progress {
  font-size: 13px;
  font-weight: 700;
  color: var(--el-color-primary, #3b82f6);
  background: color-mix(in srgb, var(--el-color-primary, #3b82f6) 12%, transparent);
  padding: 2px 10px;
  border-radius: 12px;
  font-variant-numeric: tabular-nums;
}

.qr__floating-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--el-fill-color-light, rgba(0, 0, 0, 0.04));
  color: var(--el-text-color-secondary, #64748b);
}

.qr__floating-close {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--el-text-color-secondary, #64748b);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s ease;

  &:hover {
    color: var(--el-text-color-primary, #0f172a);
    background: rgba(0, 0, 0, 0.06);
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

.qr__stat-dot--copy {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
}

.qr__stat-dot--delete {
  background: #f87171;
}

.qr__stat-dot--rework {
  background: #a855f7;
  box-shadow: 0 0 6px rgba(168, 85, 247, 0.5);
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

  &--copy {
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

/* ── 右侧：负责详情与操作面板 ── */
.qr__side {
  width: 380px;
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
  padding: 14px 18px;
  border-bottom: 1px solid var(--app-content-border-color, rgba(148, 163, 184, 0.15));
}

.qr__side-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary, #0f172a);
}

.qr__side-close {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--app-content-border-color, rgba(148, 163, 184, 0.25));
  background: var(--el-fill-color-light, rgba(0, 0, 0, 0.03));
  color: var(--el-text-color-regular, #64748b);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 15px;
  transition: all 0.15s ease;

  &:hover {
    color: var(--el-color-danger, #ef4444);
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.08);
  }
}

/* 详情滚动体：自上而下，轻盈呼吸感 */
.qr__side-body {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 1. 贴纸标题与标识行：纯净少边框 */
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
  color: var(--el-color-primary, #3b82f6);
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
  gap: 6px;
  margin-top: 2px;
}

.qr__pill {
  padding: 2px 9px;
  font-size: 11px;
  font-weight: 500;
  line-height: 16px;
  border-radius: 999px;

  &--success {
    color: #059669;
    background: color-mix(in srgb, #10b981 12%, transparent);
  }

  &--info {
    color: #2563eb;
    background: color-mix(in srgb, #3b82f6 12%, transparent);
  }

  &--neutral {
    color: var(--el-text-color-secondary, #64748b);
    background: var(--el-fill-color-light, rgba(0, 0, 0, 0.04));
  }
}

/* 2. 规格参数：轻背景通栏指标条，无生硬方格边框 */
.qr__specs-banner {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 10px 14px;
  background: var(--el-fill-color-lighter, rgba(0, 0, 0, 0.025));
  border-radius: 8px;
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

/* 3. 提示词与负向提示词面板：纯粹轻背景，无外边框 */
.qr__prompt-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: var(--el-fill-color-lighter, rgba(0, 0, 0, 0.025));
  border-radius: 8px;

  &--neg {
    background: color-mix(in srgb, #f87171 6%, transparent);
  }
}

.qr__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.qr__panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary, #64748b);
  letter-spacing: 0.3px;
}

.qr__copy-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  font-size: 11px;
  color: var(--el-color-primary, #3b82f6);
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--el-color-primary, #3b82f6) 24%, transparent);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.14s ease;

  &:hover {
    color: #ffffff;
    background: var(--el-color-primary, #3b82f6);
    border-color: var(--el-color-primary, #3b82f6);
  }
}

.qr__prompt-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular, #334155);
  word-break: break-word;
}

/* 4. 补充信息（关键词/描述）：极简轻量 */
.qr__extra-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px;
  background: var(--el-fill-color-lighter, rgba(0, 0, 0, 0.02));
  border-radius: 8px;
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

.qr__side-footer {
  padding: 12px 18px;
  border-top: 1px solid var(--app-content-border-color, rgba(148, 163, 184, 0.18));
  background: var(--app-content-surface-color, #ffffff);
  display: flex;
  align-items: center;
  gap: 8px;
}

.qr__submit-btn {
  flex: 1;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 8px;
  border: none;
  background: #10b981;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.16s ease;
  box-shadow: 0 2px 10px rgba(16, 185, 129, 0.28);
  white-space: nowrap;

  &:hover {
    background: #059669;
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
  }
}

.qr__rework-side-btn {
  height: 40px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 8px;
  border: 1px solid rgba(168, 85, 247, 0.4);
  background: rgba(168, 85, 247, 0.1);
  color: #7c3aed;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.16s ease;
  white-space: nowrap;

  &:hover {
    color: #ffffff;
    background: #7c3aed;
    border-color: #7c3aed;
  }
}

.qr__delete-btn {
  height: 40px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.08);
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.16s ease;
  white-space: nowrap;

  &:hover {
    color: #ffffff;
    background: #ef4444;
    border-color: #ef4444;
  }
}

.qr__kbd-hint {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.15);
  color: #ffffff;
  font-family: inherit;
  font-weight: 600;

  &--purple {
    background: rgba(124, 58, 237, 0.25);
    color: inherit;
  }

  &--danger {
    background: rgba(239, 68, 68, 0.2);
    color: inherit;
  }
}

/* 底部 Dock 返工按钮 */
.qr__dock-btn--rework {
  color: #7c3aed;

  .qr__dock-kbd {
    color: #7c3aed;
    background: rgba(168, 85, 247, 0.08);
    border: 1px solid rgba(168, 85, 247, 0.22);
  }

  &:hover:not(:disabled) {
    color: #ffffff;
    background: #7c3aed;
    border-color: #7c3aed;
    box-shadow: 0 2px 12px rgba(124, 58, 237, 0.28);

    .qr__dock-arrow {
      transform: rotate(-90deg);
      opacity: 1;
    }

    .qr__dock-kbd {
      color: #ffffff;
      background: rgba(0, 0, 0, 0.2);
      border-color: rgba(255, 255, 255, 0.3);
    }
  }
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

/* 复制到素材库 (Light mode) */
.qr__dock-btn--copy {
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

  .qr__floating-left,
  .qr__floating-right {
    background: rgba(22, 22, 22, 0.88);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  }

  .qr__side {
    background: var(--app-content-surface-color, #151515);
    border-left-color: var(--app-content-border-color, rgba(255, 255, 255, 0.08));
  }

  .qr__side-header {
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .qr__side-footer {
    background: var(--app-content-surface-color, #151515);
    border-top-color: rgba(255, 255, 255, 0.08);
  }

  .qr__specs-banner,
  .qr__prompt-panel,
  .qr__extra-panel {
    background: rgba(255, 255, 255, 0.035);
  }

  .qr__main-title {
    color: #f0f2f5;
  }

  .qr__spec-label,
  .qr__panel-title,
  .qr__extra-k {
    color: #94a3b8;
  }

  .qr__spec-val {
    color: #f0f2f5;
  }

  .qr__prompt-text,
  .qr__extra-v {
    color: #cbd5e1;
  }

  .qr__spec-divider {
    background: rgba(255, 255, 255, 0.08);
  }

  .qr__note-k--key {
    color: var(--el-color-primary, #60a5fa);
    background: color-mix(in srgb, var(--el-color-primary, #3b82f6) 18%, transparent);
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

  .qr__dock-btn--copy {
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
}
</style>
