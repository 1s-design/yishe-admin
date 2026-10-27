<template>
  <teleport to="body">
    <div v-if="visible" class="pqr" :class="{ 'is-dark': isDark }">
      <!-- 顶栏：标题、进度、统计与退出 -->
      <header class="pqr__bar">
        <div class="pqr__bar-lead">
          <el-icon :size="18" class="pqr__bar-icon"><Shop /></el-icon>
          <span class="pqr__title">商品快速审核</span>
          <span class="pqr__badge">素材库</span>
          <span v-if="queue.length" class="pqr__progress">
            {{ currentIndex + 1 }} / {{ queue.length }}
          </span>
        </div>

        <div class="pqr__bar-ops">
          <div class="pqr__stats">
            <span class="pqr__stat-item">
              <i class="pqr__stat-dot pqr__stat-dot--create"></i>
              <span class="pqr__stat-name">已创建</span>
              <span class="pqr__stat-val">{{ createdMaterialCount }} 张</span>
              <span v-if="createdTaskCount" class="pqr__stat-sub">({{ createdTaskCount }}任务)</span>
            </span>
            <span class="pqr__stat-divider">/</span>
            <span class="pqr__stat-item">
              <i class="pqr__stat-dot pqr__stat-dot--skip"></i>
              <span class="pqr__stat-name">已忽略</span>
              <span class="pqr__stat-val">{{ skippedCount }}</span>
            </span>
          </div>

          <div class="pqr__ops-divider"></div>

          <button
            v-if="skippedQueue.length"
            type="button"
            class="pqr__text-btn"
            title="把已跳过的素材重新追加回队列末尾"
            @click="restoreSkipped"
          >
            重置忽略 ({{ skippedQueue.length }})
          </button>
          <button
            type="button"
            class="pqr__text-btn"
            title="重新从第一张开始审核"
            @click="reloadQueue"
          >
            重新开始
          </button>
        </div>

        <button type="button" class="pqr__close" title="退出审核 (Esc)" @click="close">
          <el-icon><Close /></el-icon>
        </button>
      </header>

      <!-- 主体：居中大图与底部图片信息 + 右侧完整配置面板 -->
      <main class="pqr__main">
        <!-- 中央图片舞台 -->
        <section class="pqr__stage-wrap">
          <!-- 左右翻页按钮：固定在舞台两侧安全区域，绝不超出屏幕，绝不遮挡右侧面板 -->
          <button
            v-if="current && currentIndex > 0"
            type="button"
            class="pqr__nav-arrow pqr__nav-arrow--prev"
            title="上一张 (快捷键：W 或 ↑)"
            @click.stop="actPrev"
          >
            <el-icon><ArrowLeft /></el-icon>
          </button>
          <button
            v-if="current && currentIndex < queue.length - 1"
            type="button"
            class="pqr__nav-arrow pqr__nav-arrow--next"
            title="下一张 (快捷键：D 或 →)"
            @click.stop="actNext"
          >
            <el-icon><ArrowRight /></el-icon>
          </button>

          <div
            v-if="current"
            class="pqr__stage-container"
          >
            <!-- 图片区域 -->
            <div
              class="pqr__stage"
              title="双击在新标签查看原图"
              @dblclick="openOriginal"
            >
              <img
                v-if="displayUrl || current.url"
                :src="displayUrl || current.url"
                :alt="current.name || '素材图片'"
                draggable="false"
                class="pqr__image"
              />
            </div>

            <!-- 图片中间偏下位置：图片规格与素材信息条 -->
            <div class="pqr__image-info-bar">
              <span class="pqr__info-name" :title="current.name || ''">
                {{ current.name || `素材 #${current.id}` }}
              </span>
              <span class="pqr__info-pill pqr__info-pill--highlight">
                <el-icon :size="12" class="mr-0.5"><Aim /></el-icon>
                <span>{{ dimensionText }}</span>
              </span>
              <span class="pqr__info-pill">
                <span>{{ ratioText }}</span>
              </span>
              <span v-if="current.suffix" class="pqr__info-pill">
                <span>{{ String(current.suffix).toUpperCase() }}</span>
              </span>
              <span v-if="current.folderName" class="pqr__info-pill pqr__info-pill--folder" :title="current.folderName">
                <span>{{ current.folderName }}</span>
              </span>
              <span class="pqr__info-hint">双击查看原图</span>
            </div>
          </div>

          <div v-else class="pqr__empty">
            <el-icon :size="48" class="text-success mb-3"><CircleCheckFilled /></el-icon>
            <p class="pqr__empty-title">队列中的素材已全部审核完毕！</p>
            <p class="pqr__empty-desc">
              本次共完成 {{ createdMaterialCount }} 张素材的商品任务制作（共派发 {{ createdTaskCount }} 个发布任务），忽略 {{ skippedCount }} 张素材。
            </p>
            <div class="mt-4 flex gap-3 justify-center">
              <el-button type="primary" @click="reloadQueue">重新开始审核</el-button>
              <el-button @click="close">返回素材列表</el-button>
            </div>
          </div>
        </section>

        <!-- 右侧纯配置面板：展示所有配置，匹配的排在前并默认勾选，不匹配的按近似比例从上到下排序 -->
        <aside v-if="current" class="pqr__side">
          <div class="pqr__side-header">
            <div class="pqr__side-title-row">
              <span class="pqr__side-title">发布任务配置</span>
              <span class="pqr__count-badge">{{ displayConfigs.length }} 项</span>
              <span v-if="matchedCount" class="pqr__count-badge pqr__count-badge--success">
                推荐匹配 {{ matchedCount }}
              </span>
            </div>
            <div class="pqr__side-actions">
              <button
                v-if="matchedCount > 0"
                type="button"
                class="pqr__action-link"
                title="一键重置为仅勾选推荐匹配项"
                @click="selectOnlyMatched"
              >
                仅选匹配
              </button>
              <button
                type="button"
                class="pqr__action-link"
                @click="toggleSelectAll"
              >
                {{ isAllSelected ? '取消全选' : '全选' }}
              </button>
            </div>
          </div>

          <!-- 配置列表：按契合度与近似比例从高到低从上到下排序 -->
          <div class="pqr__config-scroll">
            <template v-for="(item, index) in displayConfigs" :key="item.id">
              <!-- 当进入不匹配区域时展示分隔提示 -->
              <div
                v-if="!item.isMatched && (index === 0 || displayConfigs[index - 1]?.isMatched)"
                class="pqr__config-divider"
              >
                <span class="pqr__config-divider-line"></span>
                <span class="pqr__config-divider-text">其他配置 · 按近似比例排序</span>
                <span class="pqr__config-divider-line"></span>
              </div>

              <div
                class="pqr__config-card"
                :class="{
                  'is-selected': selectedConfigIds.includes(item.id),
                  'is-published': isItemPublished(item.id),
                  'is-mismatch': !item.isMatched && !isItemPublished(item.id)
                }"
                @click="handleCardClick(item)"
              >
                <!-- 勾选指示器：未选=空心圈 / 选中=蓝色实心勾 / 已发布=绿色实心勾 -->
                <span class="pqr__check">
                  <el-icon
                    v-if="isItemPublished(item.id) || selectedConfigIds.includes(item.id)"
                    :size="11"
                  >
                    <Check />
                  </el-icon>
                </span>

                <div class="pqr__config-main">
                  <!-- 第一行：配置名称 + 醒目的独立比例徽章 -->
                  <div class="pqr__config-head">
                    <span class="pqr__config-name" :title="item.name">
                      <em v-if="platformPrefix(item)" class="pqr__config-platform">{{ platformPrefix(item) }}</em>
                      {{ item.name }}
                    </span>

                    <!-- ⚡ 醒目的比例徽章：直观对比，一眼看清所需尺寸比例 -->
                    <span
                      class="pqr__ratio-badge"
                      :class="{
                        'pqr__ratio-badge--matched': item.isMatched,
                        'pqr__ratio-badge--mismatch': !item.isMatched
                      }"
                      :title="item.targetAspectRatio ? `目标宽高比：${item.targetAspectRatio}:1` : '不限比例'"
                    >
                      {{ item.aspectRatioLabel }}
                    </span>
                  </div>

                  <!-- 第二行：分辨率要求 + 匹配/发布状态徽标 -->
                  <div class="pqr__config-meta">
                    <span v-if="item.minWidth && item.minHeight" class="pqr__spec-text">
                      ≥{{ item.minWidth }}×{{ item.minHeight }}
                    </span>
                    <span v-else class="pqr__spec-text">通用分辨率</span>

                    <i class="pqr__meta-dot"></i>

                    <span v-if="isItemPublished(item.id)" class="pqr__score-pill pqr__score-pill--published">
                      已发布
                    </span>
                    <span
                      v-else
                      class="pqr__score-pill"
                      :class="`pqr__score-pill--${item.matchStatus}`"
                      :title="!item.isMatched && item.mismatchReason ? item.mismatchReason : ''"
                    >
                      {{ getMatchStatusBadgeText(item) }}
                    </span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- 侧边栏底部提交栏（贴底） -->
          <div class="pqr__side-footer">
            <el-button
              type="primary"
              class="pqr__submit"
              :disabled="!selectedConfigIds.length || creating"
              :loading="creating"
              title="一键创建选中的发布任务并看下一张 (快捷键：↵ Enter)"
              @click="actCreateAndNext"
            >
              <el-icon class="mr-1"><Shop /></el-icon>
              <span>{{ selectedConfigIds.length ? `一键创建并看下一张 (${selectedConfigIds.length})` : `请勾选配置` }}</span>
              <kbd v-if="selectedConfigIds.length" class="pqr__kbd-hint">↵ Enter</kbd>
            </el-button>
          </div>
        </aside>
      </main>

      <!-- 底部简洁浮动 Dock 快捷键操作栏 -->
      <footer class="pqr__dock">
        <div class="pqr__dock-capsule">
          <button
            type="button"
            class="pqr__dock-btn"
            :disabled="!current"
            title="忽略该素材并看下一张（快捷键：A 或 ←）"
            @click="actSkip"
          >
            <span class="pqr__dock-text">忽略</span>
            <kbd class="pqr__dock-kbd">A</kbd>
          </button>

          <div class="pqr__dock-sep"></div>

          <button
            type="button"
            class="pqr__dock-btn"
            :disabled="currentIndex <= 0"
            title="查看上一张（快捷键：W 或 ↑）"
            @click="actPrev"
          >
            <span class="pqr__dock-text">上一张</span>
            <kbd class="pqr__dock-kbd">W</kbd>
          </button>

          <div class="pqr__dock-sep"></div>

          <button
            type="button"
            class="pqr__dock-btn pqr__dock-btn--primary"
            :disabled="!current || !selectedConfigIds.length || creating"
            title="一键直接创建任务并自动切换下一张（快捷键：↵ Enter）"
            @click="actCreateAndNext"
          >
            <el-icon :size="14"><Shop /></el-icon>
            <span class="pqr__dock-text">
              一键创建
              <template v-if="selectedConfigIds.length">({{ selectedConfigIds.length }})</template>
            </span>
            <kbd class="pqr__dock-kbd pqr__dock-kbd--primary">Enter ↵</kbd>
          </button>
        </div>
      </footer>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  Aim,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheckFilled,
  Close,
  Shop,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { stickerPsdSetApi } from '@/api/stickerPsdSet'
import { useImageDeck } from '@/composables/useImageDeck'
import { getReviewImageUrl } from '@/utils/image'
import { useAppStore } from '@/store/modules/app'
import {
  extractDimensions,
  findMatchingConfigsSync,
  evaluatePublishConfigsForSticker,
  invalidatePublishBindingsCache,
  type QuickPublishMatchResult,
  type MatchedPublishConfigItem
} from './useMaterialPublishQuick'
import { invalidateMaterialRelations } from './useMaterialRelations'

defineOptions({ name: 'MaterialPublishQuickReview' })

const appStore = useAppStore()
const isDark = computed(() => appStore.getIsDark)

const props = withDefaults(
  defineProps<{
    visible: boolean
    items?: any[]
    startIndex?: number
  }>(),
  {
    items: () => [],
    startIndex: 0
  }
)

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'reviewed'): void
}>()

// ==================== 队列与索引状态 ====================
const queue = ref<any[]>([])
const currentIndex = ref(0)
const skippedQueue = ref<any[]>([])

const createdMaterialCount = ref(0)
const createdTaskCount = ref(0)
const skippedCount = ref(0)
const creating = ref(false)

/** 已经由本审核流程创建过任务的素材ID与配置ID组合 */
const optimisticRecordKeys = ref<Set<string>>(new Set())

const current = computed(() => queue.value[currentIndex.value] || null)

// ==================== 图片大图预热调度 ====================
const deck = useImageDeck({ maxCache: 16, warmTimeout: 5000 })
const displayUrl = ref('')

// ==================== 当前素材的配置匹配与勾选 ====================
const selectedConfigIds = ref<string[]>([])
const matchResult = ref<QuickPublishMatchResult>({
  imageWidth: 0,
  imageHeight: 0,
  targetRatio: 0,
  ratioLabel: '',
  allConfigs: [],
  unpublishedMatches: [],
  publishedMatches: [],
  otherBindings: [],
  errors: []
})

/** 展示全部配置项：匹配项排在最前并默认勾选，不匹配项按近似比例从上到下排序（支持随时手动勾选） */
const displayConfigs = computed<MatchedPublishConfigItem[]>(() => {
  return matchResult.value?.allConfigs || []
})

/** 推荐匹配的数量（排除已发布的） */
const matchedCount = computed(() => {
  const all = matchResult.value?.allConfigs || []
  return all.filter((item) => item.isMatched && !isItemPublished(item.id)).length
})

function isItemPublished(configId: string): boolean {
  const stickerId = String(current.value?.id || '')
  if (optimisticRecordKeys.value.has(`${stickerId}:${configId}`)) return true
  return Boolean(matchResult.value?.publishedMatches?.some((m) => m.id === configId))
}

const isAllSelected = computed(() => {
  const unpubList = displayConfigs.value.filter((c) => !isItemPublished(c.id))
  if (!unpubList.length) return false
  return unpubList.every((item) => selectedConfigIds.value.includes(item.id))
})

const dimensionText = computed(() => {
  const w = matchResult.value?.imageWidth || Number(current.value?.width || 0)
  const h = matchResult.value?.imageHeight || Number(current.value?.height || 0)
  return w && h ? `${w} × ${h}` : '-'
})

const ratioText = computed(() => {
  return matchResult.value?.ratioLabel || (matchResult.value?.targetRatio ? `${matchResult.value.targetRatio}` : '-')
})

// ==================== 初始化与切换监听 ====================
watch(
  () => props.visible,
  (val) => {
    if (val) {
      initQueue()
      window.addEventListener('keydown', handleKeydown, true)
    } else {
      window.removeEventListener('keydown', handleKeydown, true)
    }
  },
  { immediate: true }
)

function initQueue() {
  queue.value = Array.isArray(props.items) ? [...props.items] : []
  currentIndex.value = Math.min(Math.max(props.startIndex || 0, 0), Math.max(queue.value.length - 1, 0))
  skippedQueue.value = []
  createdMaterialCount.value = 0
  createdTaskCount.value = 0
  skippedCount.value = 0
  syncCurrentMaterial()
}

function syncCurrentMaterial() {
  const sticker = current.value
  if (!sticker) {
    displayUrl.value = ''
    selectedConfigIds.value = []
    matchResult.value = {
      imageWidth: 0,
      imageHeight: 0,
      targetRatio: 0,
      ratioLabel: '',
      allConfigs: [],
      unpublishedMatches: [],
      publishedMatches: [],
      otherBindings: [],
      errors: []
    }
    return
  }

  // 1. 同步进行尺寸解析与全部配置排序初筛
  const { width, height, targetRatio, ratioLabel } = extractDimensions(sticker)
  const allInitialConfigs = findMatchingConfigsSync(width, height, targetRatio)
  matchResult.value = {
    imageWidth: width,
    imageHeight: height,
    targetRatio,
    ratioLabel,
    allConfigs: allInitialConfigs,
    unpublishedMatches: allInitialConfigs.filter((c) => c.isMatched),
    publishedMatches: [],
    otherBindings: [],
    errors: []
  }

  // 核心逻辑：默认只勾选「匹配」的配置
  const initialMatchedIds = allInitialConfigs
    .filter((item) => item.isMatched && !optimisticRecordKeys.value.has(`${sticker.id}:${item.id}`))
    .map((item) => item.id)
  selectedConfigIds.value = initialMatchedIds

  // 2. 图片高清预解码调度
  const targetUrl = getReviewImageUrl(sticker.url, 1600)
  displayUrl.value = targetUrl
  if (targetUrl) {
    deck.ensure(targetUrl)
  }

  // 预热下一张图片
  const nextItem = queue.value[currentIndex.value + 1]
  if (nextItem?.url) {
    deck.warmIdle(getReviewImageUrl(nextItem.url, 1600))
  }

  // 3. 异步拉取已发布历史记录，标记已发布排重项
  const stickerId = String(sticker.id || '')
  if (stickerId) {
    evaluatePublishConfigsForSticker(sticker, false)
      .then((res) => {
        if (String(current.value?.id || '') === stickerId && res) {
          matchResult.value = {
            imageWidth: res.imageWidth || width,
            imageHeight: res.imageHeight || height,
            targetRatio: res.targetRatio || targetRatio,
            ratioLabel: res.ratioLabel || ratioLabel,
            allConfigs: Array.isArray(res.allConfigs) ? res.allConfigs : allInitialConfigs,
            unpublishedMatches: Array.isArray(res.unpublishedMatches) ? res.unpublishedMatches : [],
            publishedMatches: Array.isArray(res.publishedMatches) ? res.publishedMatches : [],
            otherBindings: Array.isArray(res.otherBindings) ? res.otherBindings : [],
            errors: Array.isArray(res.errors) ? res.errors : []
          }

          // 重新根据最新发布历史，确保默认只勾选「匹配且未发布」的配置
          const boundIdSet = new Set((res.publishedMatches || []).map((m) => m.id))
          const autoCheckIds = (res.allConfigs || [])
            .filter((m) => m.isMatched && !boundIdSet.has(m.id) && !optimisticRecordKeys.value.has(`${stickerId}:${m.id}`))
            .map((m) => m.id)
          selectedConfigIds.value = autoCheckIds
        }
      })
      .catch((err) => {
        console.warn('拉取素材发布绑定记录失败:', err)
      })
  }
}

watch(currentIndex, () => {
  syncCurrentMaterial()
})

// ==================== 交互动作与状态变更 ====================
function handleCardClick(item: MatchedPublishConfigItem) {
  if (isItemPublished(item.id)) return
  toggleConfig(item.id)
}

function toggleConfig(id: string) {
  const idx = selectedConfigIds.value.indexOf(id)
  if (idx > -1) {
    selectedConfigIds.value.splice(idx, 1)
  } else {
    selectedConfigIds.value.push(id)
  }
}

/** 快捷按钮：仅勾选推荐匹配项（清空不匹配项） */
function selectOnlyMatched() {
  const matchedIds = displayConfigs.value
    .filter((item) => item.isMatched && !isItemPublished(item.id))
    .map((item) => item.id)
  selectedConfigIds.value = matchedIds
  ElMessage.info(`已选 ${matchedIds.length} 项推荐匹配配置`)
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedConfigIds.value = []
  } else {
    selectedConfigIds.value = displayConfigs.value
      .filter((item) => !isItemPublished(item.id))
      .map((item) => item.id)
  }
}

function openOriginal() {
  if (current.value?.url) {
    window.open(current.value.url, '_blank')
  }
}

function actPrev() {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

function actNext() {
  if (currentIndex.value < queue.value.length - 1) {
    currentIndex.value++
  }
}

function actSkip() {
  if (!current.value) return
  skippedCount.value++
  skippedQueue.value.push(current.value)
  currentIndex.value++
}

/** 一键创建选中的发布任务并看下一张 */
function actCreateAndNext() {
  if (!current.value) return
  if (!selectedConfigIds.value.length || creating.value) {
    actSkip()
    return
  }

  const sticker = current.value
  const stickerId = String(sticker.id || '')
  const targetConfigIds = [...selectedConfigIds.value]
  const count = targetConfigIds.length

  // 1. 乐观更新
  targetConfigIds.forEach((cfgId) => {
    optimisticRecordKeys.value.add(`${stickerId}:${cfgId}`)
  })
  createdMaterialCount.value++
  createdTaskCount.value += count

  ElMessage.success({
    message: `已为「${sticker.name || stickerId}」创建 ${count} 个发布任务`,
    duration: 1600,
    grouping: true
  })

  // 2. 秒切下一张
  currentIndex.value++

  // 3. 后台静默派发
  creating.value = true
  stickerPsdSetApi
    .batchCreateByPublishConfig({
      stickerIds: [stickerId],
      publishConfigIds: targetConfigIds
    })
    .then(() => {
      invalidatePublishBindingsCache(stickerId)
      invalidateMaterialRelations(stickerId)
    })
    .catch((err: any) => {
      targetConfigIds.forEach((cfgId) => {
        optimisticRecordKeys.value.delete(`${stickerId}:${cfgId}`)
      })
      createdMaterialCount.value = Math.max(0, createdMaterialCount.value - 1)
      createdTaskCount.value = Math.max(0, createdTaskCount.value - count)
      ElMessage.error(err?.message || '发布任务创建失败，已回滚')
    })
    .finally(() => {
      creating.value = false
    })
}

function restoreSkipped() {
  if (!skippedQueue.value.length) return
  queue.value.push(...skippedQueue.value)
  skippedQueue.value = []
  ElMessage.info('已将跳过的素材重新追加至队列末尾')
}

function reloadQueue() {
  initQueue()
}

function close() {
  emit('update:visible', false)
  emit('reviewed')
}

// ==================== 快捷键分发 ====================
function handleKeydown(e: KeyboardEvent) {
  if (!props.visible) return

  const activeEl = document.activeElement
  if (
    activeEl &&
    (activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      (activeEl as HTMLElement).isContentEditable)
  ) {
    return
  }

  if (e.key === 'Escape' || e.code === 'Escape') {
    e.preventDefault()
    close()
    return
  }

  if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter') {
    e.preventDefault()
    actCreateAndNext()
    return
  }

  if (e.key === 'a' || e.key === 'A' || e.code === 'ArrowLeft') {
    e.preventDefault()
    actSkip()
    return
  }

  if (e.key === 'w' || e.key === 'W' || e.code === 'ArrowUp') {
    e.preventDefault()
    actPrev()
    return
  }

  if (e.key === 'd' || e.key === 'D' || e.code === 'ArrowRight') {
    e.preventDefault()
    actNext()
    return
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown, true)
})

function getMatchStatusBadgeText(item: MatchedPublishConfigItem): string {
  if (item.matchStatus === 'perfect') return '完美契合'
  if (item.matchStatus === 'qualified') return `${item.score}% 契合`
  if (item.matchStatus === 'warning') return '尺寸偏小'
  if (item.matchStatus === 'generic') return '通用'
  const diffPct = Math.round((item.ratioDiff || 0) * 100)
  return diffPct > 0 ? `偏离 ${diffPct}%` : '比例不符'
}

function formatPlatform(platform?: string): string {
  const map: Record<string, string> = {
    xiaohongshu: '小红书',
    douyin: '抖音',
    doudian: '抖店',
    kuaishou: '快手',
    taobao: '淘宝',
    pdd: '拼多多',
    temu: 'Temu',
    wechat: '微信视频号'
  }
  return platform ? map[platform] || platform : '通用'
}

/** 配置名已包含平台名时不再重复展示平台前缀，保持简洁 */
function platformPrefix(item: MatchedPublishConfigItem): string {
  if (!item.platform) return ''
  const label = formatPlatform(item.platform)
  return String(item.name || '').includes(label) ? '' : label
}
</script>

<style lang="scss" scoped>
.pqr {
  position: fixed;
  inset: 0;
  z-index: 2500;
  display: flex;
  flex-direction: column;
  background: var(--app-content-bg-color, var(--el-bg-color-page));
  color: var(--el-text-color-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  user-select: none;
  overflow: hidden;
  border: none;
  outline: none;

  /* 自适应方格棋盘背景变量：日间浅色 */
  --pqr-checker-color-1: #edf1f7;
  --pqr-checker-color-2: #ffffff;

  /* 黑夜模式变量覆盖 */
  &.is-dark {
    --pqr-checker-color-1: #1a1a1c;
    --pqr-checker-color-2: #111112;
  }
}

/* 全局 html.dark / body.dark 兜底覆盖 */
:global(html.dark) .pqr,
:global(html[class*="dark"]) .pqr,
:global(body.dark) .pqr {
  --pqr-checker-color-1: #1a1a1c;
  --pqr-checker-color-2: #111112;
}

@media (prefers-color-scheme: dark) {
  :global(html:not(.light)) .pqr {
    --pqr-checker-color-1: #1a1a1c;
    --pqr-checker-color-2: #111112;
  }
}

/* ================= 顶栏 ================= */
.pqr__bar {
  height: 50px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--app-content-border-color, var(--el-border-color-lighter));
  background: var(--app-content-surface-color, var(--el-bg-color));
}

.pqr__bar-lead {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pqr__bar-icon {
  color: var(--el-color-primary);
}

.pqr__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.pqr__badge {
  font-size: 12px;
  padding: 1px 7px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
}

.pqr__progress {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  padding: 2px 10px;
  border-radius: 12px;
  margin-left: 4px;
}

.pqr__bar-ops {
  display: flex;
  align-items: center;
  gap: 14px;
}

.pqr__stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.pqr__stat-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.pqr__stat-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;

  &--create {
    background: var(--el-color-success);
  }

  &--skip {
    background: var(--el-text-color-placeholder);
  }
}

.pqr__stat-name {
  color: var(--el-text-color-secondary);
}

.pqr__stat-val {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.pqr__stat-sub {
  font-size: 11px;
  color: var(--el-color-success);
}

.pqr__stat-divider {
  color: var(--el-border-color-lighter);
}

.pqr__ops-divider {
  width: 1px;
  height: 16px;
  background: var(--app-content-border-color, var(--el-border-color-lighter));
}

.pqr__text-btn {
  background: none;
  border: none;
  font-size: 12px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s ease;

  &:hover {
    color: var(--el-color-primary);
    background: var(--el-fill-color-light);
  }
}

.pqr__close {
  background: none;
  border: none;
  color: var(--el-text-color-secondary);
  font-size: 18px;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;

  &:hover {
    color: var(--el-text-color-primary);
    background: var(--el-fill-color-light);
  }
}

/* ================= 主体 ================= */
.pqr__main {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative;
}

/* 中央图片舞台：自适应黑白天棋盘方格背景 */
.pqr__stage-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-width: 0;
  padding: 20px 24px 75px;
  background-image: repeating-conic-gradient(
      var(--pqr-checker-color-1, #edf1f7) 0% 25%,
      var(--pqr-checker-color-2, #ffffff) 0% 50%
    );
  background-size: 20px 20px;
  background-position: 50% 50%;
  transition: background-image 0.2s ease;
  overflow: hidden;
}

.pqr__stage-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 严格限制最大宽度，为左右两侧翻页按钮保留至少 140px 安全空间 */
  max-width: min(calc(100% - 130px), 860px);
  max-height: 100%;
  gap: 12px;
}

.pqr__stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-in;
}

.pqr__image {
  /* 限制图片宽度，横图不过度拉伸且绝对不挤压翻页按钮 */
  max-width: min(calc(100vw - 380px - 140px), 820px);
  max-height: calc(100vh - 220px);
  object-fit: contain;
  border-radius: 6px;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.22));
  border: none;
  background: transparent;
}

/* 图片中间偏下：轻量信息胶囊条 */
.pqr__image-info-bar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 20px;
  background: var(--el-bg-color-overlay, var(--el-bg-color));
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: var(--el-box-shadow-light);
  font-size: 12px;
}

.pqr__info-name {
  max-width: 220px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pqr__info-pill {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 11px;
  font-weight: 500;

  &--highlight {
    background: color-mix(in srgb, var(--el-color-primary) 14%, transparent);
    color: var(--el-color-primary);
    font-weight: 600;
  }

  &--folder {
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.pqr__info-hint {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  margin-left: 2px;
}

/* 翻页按钮：固定在舞台左右两侧安全距离，绝不会超出屏幕或侵入右侧面板 */
.pqr__nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--el-bg-color-overlay, var(--el-bg-color));
  border: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-regular);
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
  z-index: 15;
  transition: all 0.15s ease;

  &:hover {
    color: var(--el-color-primary);
    border-color: var(--el-color-primary);
    transform: translateY(-50%) scale(1.08);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
  }

  &--prev {
    left: 20px;
  }

  &--next {
    right: 20px;
  }
}

.pqr__empty {
  text-align: center;
  max-width: 420px;
  padding: 36px 24px;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: var(--el-box-shadow-light);
}

.pqr__empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
}

.pqr__empty-desc {
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

/* ================= 右侧面板（纯粹展示配置） ================= */
.pqr__side {
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--app-content-surface-color, var(--el-bg-color));
  border-left: 1px solid var(--app-content-border-color, var(--el-border-color-lighter));
  padding: 14px 14px 0;
  gap: 10px;
}

.pqr__side-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.pqr__side-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pqr__side-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.pqr__count-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 10px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);

  &--success {
    background: color-mix(in srgb, var(--el-color-success) 14%, transparent);
    color: var(--el-color-success);
  }
}

.pqr__side-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pqr__action-link {
  background: none;
  border: none;
  color: var(--el-color-primary);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;

  &:hover {
    background: var(--el-fill-color-light);
  }
}

.pqr__config-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0 -4px;
  padding: 2px 4px;
}

/* 分隔提示条：其他配置 · 按近似比例排序 */
.pqr__config-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 4px 4px;
  padding: 0 2px;
}

.pqr__config-divider-line {
  flex: 1;
  height: 1px;
  background: var(--el-border-color-lighter);
}

.pqr__config-divider-text {
  font-size: 11px;
  font-weight: 500;
  color: var(--el-text-color-placeholder);
  letter-spacing: 0.3px;
  white-space: nowrap;
}

/* ---------- 配置卡：未选中 ---------- */
.pqr__config-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
  user-select: none;

  &:hover {
    border-color: var(--el-color-primary-light-5);
  }

  /* ---------- 选中：蓝边 + 蓝底 + 实心勾 ---------- */
  &.is-selected {
    background: color-mix(in srgb, var(--el-color-primary) 9%, var(--el-bg-color));
    border-color: var(--el-color-primary);
    box-shadow: inset 0 0 0 1px var(--el-color-primary);

    .pqr__check {
      background: var(--el-color-primary);
      border-color: var(--el-color-primary);
      color: #fff;
    }

    .pqr__config-name {
      color: var(--el-color-primary);
      font-weight: 600;
    }

    .pqr__ratio-badge--matched {
      background: var(--el-color-primary);
      color: #ffffff;
      border-color: var(--el-color-primary);
    }
  }

  /* ---------- 已发布：不可选，弱化 + 绿勾 ---------- */
  &.is-published {
    cursor: default;
    background: var(--el-fill-color-lighter);
    border-color: transparent;
    box-shadow: none;

    .pqr__check {
      background: var(--el-color-success);
      border-color: var(--el-color-success);
      color: #fff;
    }

    .pqr__config-name {
      color: var(--el-text-color-secondary);
      font-weight: 400;
    }

    &:hover {
      border-color: transparent;
    }
  }

  /* ---------- 比例不符且未选：适度弱化，悬停清晰，支持自由勾选 ---------- */
  &.is-mismatch:not(.is-selected) {
    opacity: 0.72;

    &:hover {
      opacity: 1;
    }
  }
}

.pqr__check {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid var(--el-border-color);
  background: var(--el-bg-color);
  color: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;
}

.pqr__config-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.pqr__config-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pqr__config-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 550;
  line-height: 1.4;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ⚡ 醒目的比例标签：字体清晰、颜色对比强烈、一眼可见 */
.pqr__ratio-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 4px;
  letter-spacing: 0.2px;
  line-height: 17px;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  transition: all 0.12s ease;

  /* 适配推荐：主色高亮背景 + 清晰主色文字 + 精细边框 */
  &--matched {
    background: color-mix(in srgb, var(--el-color-primary) 15%, transparent);
    color: var(--el-color-primary);
    border: 1px solid color-mix(in srgb, var(--el-color-primary) 32%, transparent);
  }

  /* 不匹配：高对比灰色胶囊，字号同样大，直观展示比例差异 */
  &--mismatch {
    background: var(--el-fill-color);
    color: var(--el-text-color-regular);
    border: 1px solid var(--el-border-color);
  }
}

:global(html.dark) .pqr__ratio-badge--mismatch,
:global(html[class*="dark"]) .pqr__ratio-badge--mismatch {
  background: rgba(255, 255, 255, 0.1);
  color: var(--el-text-color-primary);
  border-color: rgba(255, 255, 255, 0.2);
}

.pqr__config-platform {
  font-style: normal;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-right: 4px;
}

.pqr__config-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
}

.pqr__meta-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--el-text-color-placeholder);
  flex-shrink: 0;
}

.pqr__score-pill {
  font-weight: 500;
  font-size: 11px;

  &--perfect {
    color: var(--el-color-success);
  }

  &--qualified {
    color: var(--el-color-primary);
  }

  &--warning {
    color: var(--el-color-warning);
  }

  &--generic {
    color: var(--el-text-color-regular);
  }

  &--mismatch {
    color: var(--el-text-color-placeholder);
  }

  &--published {
    color: var(--el-color-success);
  }
}

.pqr__spec-text {
  color: var(--el-text-color-secondary);
}

/* 侧边栏底部操作：贴底 */
.pqr__side-footer {
  flex-shrink: 0;
  margin: 0 -14px;
  padding: 12px 14px 14px;
  border-top: 1px solid var(--app-content-border-color, var(--el-border-color-lighter));
  background: var(--app-content-surface-color, var(--el-bg-color));
}

.pqr__submit {
  width: 100%;
  height: 40px;
  font-size: 14px;
}

.pqr__kbd-hint {
  margin-left: 6px;
  padding: 1px 5px;
  font-size: 11px;
  font-family: inherit;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

/* ================= 底部极简浮动 Dock ================= */
.pqr__dock {
  position: absolute;
  bottom: 16px;
  left: 0;
  right: 380px;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
}

.pqr__dock-capsule {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 20px;
  background: var(--el-bg-color-overlay, var(--el-bg-color));
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: var(--el-box-shadow-light);
}

.pqr__dock-btn {
  background: none;
  border: none;
  height: 32px;
  padding: 0 12px;
  border-radius: 16px;
  color: var(--el-text-color-regular);
  font-size: 13px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.12s ease;

  &:hover:not(:disabled) {
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &--primary {
    background: var(--el-color-primary);
    color: #ffffff;

    &:hover:not(:disabled) {
      background: var(--el-color-primary-light-3);
      color: #ffffff;
    }
  }
}

.pqr__dock-kbd {
  font-family: inherit;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
  border: 1px solid var(--el-border-color-lighter);

  &--primary {
    background: rgba(255, 255, 255, 0.25);
    color: #ffffff;
    border-color: transparent;
  }
}

.pqr__dock-sep {
  width: 1px;
  height: 16px;
  background: var(--el-border-color-lighter);
  margin: 0 2px;
}
</style>
