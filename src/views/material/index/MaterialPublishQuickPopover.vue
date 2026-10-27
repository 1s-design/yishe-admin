<template>
  <el-popover
    ref="popoverRef"
    placement="right"
    trigger="hover"
    :width="500"
    :show-after="80"
    :hide-after="120"
    :disabled="isPopoverDisabled"
    popper-class="material-publish-quick-popper"
    :popper-style="{ padding: '12px 14px', borderRadius: '8px' }"
    @before-enter="ensureDataLoaded"
    @show="handlePopoverShow"
    @after-leave="handlePopoverHide"
  >
    <template #reference>
      <button
        type="button"
        class="relation-trigger relation-trigger--publish"
        :class="{ 'relation-trigger--published': hasPublished }"
        title="商品发布与快速制作"
        @mouseenter="handleTriggerMouseEnter"
        @focus="handleTriggerMouseEnter"
        @click.stop="emit('open-publish', row)"
      >
        <el-icon :size="12"><Shop /></el-icon>
      </button>
    </template>

    <div class="publish-quick-card">
      <!-- 头部：标题 + 当前图片尺寸规格 + 查看全部记录 -->
      <header class="publish-quick-card__header">
        <div class="publish-quick-card__title-wrap">
          <span class="publish-quick-card__title">商品发布</span>
          <span
            v-if="specBadge"
            class="publish-quick-card__spec-badge"
            :class="`spec-badge--${getRatioBadgeKind(matchResult.targetRatio)}`"
            :title="specTooltip"
          >
            {{ specBadge }}
          </span>
          <span v-if="isCheckingBindings" class="publish-quick-card__checking-badge" title="正在核验发布记录...">
            <span class="checking-dot"></span>
          </span>
        </div>
        <button
          type="button"
          class="publish-quick-card__action-link"
          title="打开完整发布绑定记录弹窗"
          @click.stop="emit('open-publish', row)"
        >
          全部记录
          <el-icon :size="10"><ArrowRight /></el-icon>
        </button>
      </header>

      <!-- 区块 1：适合此图但尚未发布的配置（核心待制作区，有待制作项时才展示头部） -->
      <section v-if="unpublishedMatches.length" class="publish-quick-section">
        <div class="publish-quick-section__head">
          <div class="publish-quick-section__title">
            <span>未发布 · 适配配置</span>
            <span class="publish-quick-count-badge">
              {{ unpublishedMatches.length }}
            </span>
          </div>

          <button
            v-if="unpublishedMatches.length > 1"
            type="button"
            class="publish-quick-card__action-link"
            @click.stop="toggleSelectAllUnpublished"
          >
            {{ isAllSelected ? '取消全选' : '全选' }}
          </button>
        </div>

        <!-- 待制作列表：高容纳度展示 -->
        <div class="publish-quick-list">
          <div
            v-for="item in unpublishedMatches"
            :key="item.id"
            class="publish-quick-item"
            :class="{ 'is-selected': selectedConfigIds.includes(item.id) }"
            @click.stop="toggleItemSelection(item.id)"
          >
            <el-checkbox
              :model-value="selectedConfigIds.includes(item.id)"
              class="publish-quick-checkbox"
              @click.stop
              @change="() => toggleItemSelection(item.id)"
            />

            <div class="publish-quick-item__row">
              <div class="publish-quick-item__left">
                <el-tag size="small" effect="plain" class="platform-tag" :type="getPlatformTagType(item.platform)">
                  {{ formatPlatform(item.platform) }}
                </el-tag>
                <span class="publish-quick-item__name" :title="item.name">{{ item.name }}</span>
              </div>
              <div class="publish-quick-item__right">
                <span
                  class="publish-quick-item__desc"
                  :class="`ratio-tag--${getRatioBadgeKind(item)}`"
                >
                  {{ item.aspectRatioLabel }}
                </span>
                <span
                  class="match-badge"
                  :class="`match-badge--${item.matchStatus}`"
                >
                  {{ getMatchStatusText(item) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 底部一键创建任务按钮（使用 Element Plus 默认 primary 风格） -->
          <div class="publish-quick-footer">
            <el-button
              type="primary"
              size="small"
              class="w-full"
              :loading="creating"
              :disabled="!selectedConfigIds.length"
              title="按 Enter 回车键可直接提交任务"
              @click.stop="handleQuickCreate"
            >
              <el-icon class="mr-1"><Shop /></el-icon>
              <span>一键直接创建任务</span>
              <span v-if="selectedConfigIds.length" class="publish-quick-create-btn__pill">
                已选 {{ selectedConfigIds.length }}
              </span>
              <kbd v-if="selectedConfigIds.length" class="publish-quick-create-btn__kbd">↵ Enter</kbd>
            </el-button>
          </div>
        </div>
      </section>

      <!-- 适用的配置已全部制作发布轻量微提示（小巧紧凑，极省空间） -->
      <div v-else-if="!isCheckingBindings && publishedMatches.length > 0" class="publish-quick-all-done">
        <el-icon :size="13" class="text-success mr-1 shrink-0"><CircleCheckFilled /></el-icon>
        <span>此图适用的配置已全部制作发布，无需重复提交</span>
      </div>

      <!-- 未找到适配配置空状态（小巧紧凑） -->
      <div v-else-if="!isCheckingBindings && !publishedMatches.length" class="publish-quick-empty">
        <span>暂无符合当前图片比例（{{ matchResult.ratioLabel || '未知比例' }}）的发布配置</span>
      </div>

      <!-- 区块 2：已发布的任务配置（防重复展示） -->
      <section v-if="publishedMatches.length > 0 || otherBindings.length > 0" class="publish-quick-section publish-quick-section--published">
        <div class="publish-quick-section__head">
          <div class="publish-quick-section__title text-muted">
            <span>已制作发布 ({{ publishedMatches.length + otherBindings.length }})</span>
            <span class="publish-quick-tag-done">已排重</span>
          </div>
        </div>

        <ul class="published-list">
          <!-- 命中当前比例且已发布的配置 -->
          <li
            v-for="item in publishedMatches"
            :key="item.id"
            class="published-item"
            :class="`published-item--${getStatusInfo(item.bindingRecord?.status).key}`"
          >
            <div class="published-item__left">
              <el-icon :size="12" class="published-item__icon">
                <component :is="getStatusIcon(item.bindingRecord?.status)" />
              </el-icon>
              <el-tag size="small" effect="plain" type="info">
                {{ formatPlatform(item.platform) }}
              </el-tag>
              <span class="published-item__name" :title="item.name">{{ item.name }}</span>
            </div>
            <div class="published-item__right">
              <span
                class="published-item__desc"
                :class="`ratio-tag--${getRatioBadgeKind(item)}`"
              >
                {{ item.aspectRatioLabel }}
              </span>
              <span
                class="status-badge"
                :class="`status-badge--${getStatusInfo(item.bindingRecord?.status).key}`"
              >
                {{ getStatusInfo(item.bindingRecord?.status).label }}
              </span>
            </div>
          </li>

          <!-- 不在适配尺寸范围但在该素材上绑定的其他配置 -->
          <li
            v-for="rec in otherBindings"
            :key="rec.id"
            class="published-item"
            :class="`published-item--${getStatusInfo(rec.status).key}`"
          >
            <div class="published-item__left">
              <el-icon :size="12" class="published-item__icon">
                <component :is="getStatusIcon(rec.status)" />
              </el-icon>
              <el-tag size="small" effect="plain" type="info">
                {{ formatPlatform(rec.publishConfig?.platform) }}
              </el-tag>
              <span class="published-item__name" :title="rec.publishConfig?.name || '未知配置'">
                {{ rec.publishConfig?.name || `配置 #${rec.publishConfigId}` }}
              </span>
            </div>
            <div class="published-item__right">
              <span
                class="status-badge"
                :class="`status-badge--${getStatusInfo(rec.status).key}`"
              >
                {{ getStatusInfo(rec.status).label }}
              </span>
            </div>
          </li>
        </ul>
      </section>

      <!-- 异常提示 -->
      <footer v-if="matchResult.errors.length" class="publish-quick-error">
        <span>配置检测提示：{{ matchResult.errors.join('；') }}</span>
      </footer>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  ArrowRight,
  Check,
  CircleCheckFilled,
  CircleClose,
  Clock,
  Loading,
  Shop
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { stickerPsdSetApi } from '@/api/stickerPsdSet'
import {
  evaluatePublishConfigsForSticker,
  extractDimensions,
  findMatchingConfigsSync,
  getRatioBadgeKind,
  invalidatePublishBindingsCache,
  type QuickPublishMatchResult,
  type MatchedPublishConfigItem
} from './useMaterialPublishQuick'
import { invalidateMaterialRelations } from './useMaterialRelations'

defineOptions({ name: 'MaterialPublishQuickPopover' })

const props = defineProps<{
  row: any
}>()

const emit = defineEmits<{
  (e: 'open-publish', row: any): void
  (e: 'created', row: any): void
}>()



// ==================== 响应式数据 ====================
const matchResult = ref<QuickPublishMatchResult>({
  imageWidth: 0,
  imageHeight: 0,
  targetRatio: 0,
  ratioLabel: '',
  unpublishedMatches: [],
  publishedMatches: [],
  otherBindings: [],
  errors: []
})

const selectedConfigIds = ref<string[]>([])
const isCheckingBindings = ref(false)
const creating = ref(false)

const optimisticCreatedConfigIds = ref<Set<string>>(new Set())

let fullDataLoadedStickerId = ''

watch(
  () => props.row?.id,
  (newId, oldId) => {
    if (newId !== oldId) {
      fullDataLoadedStickerId = ''
      selectedConfigIds.value = []
    }
  }
)

// ==================== 计算属性 ====================
const unpublishedMatches = computed<MatchedPublishConfigItem[]>(() => {
  const list = matchResult.value?.unpublishedMatches || []
  return list.filter((item) => !optimisticCreatedConfigIds.value.has(item.id))
})

const publishedMatches = computed<MatchedPublishConfigItem[]>(() => {
  const list = [...(matchResult.value?.publishedMatches || [])]
  const unpubList = matchResult.value?.unpublishedMatches || []
  for (const item of unpubList) {
    if (optimisticCreatedConfigIds.value.has(item.id)) {
      if (!list.some((p) => p.id === item.id)) {
        list.push({
          ...item,
          isPublished: true,
          bindingRecord: {
            id: `opt-${item.id}`,
            stickerId: String(props.row?.id || ''),
            publishConfigId: item.id,
            status: 'pending'
          }
        })
      }
    }
  }
  return list
})

const otherBindings = computed(() => matchResult.value?.otherBindings || [])

const hasPublished = computed(() => {
  return publishedMatches.value.length > 0 || otherBindings.value.length > 0
})

const isAllSelected = computed(() => {
  const list = unpublishedMatches.value || []
  if (!list.length) return false
  return list.every((item) => selectedConfigIds.value.includes(item.id))
})

const specBadge = computed(() => {
  const w = matchResult.value?.imageWidth || Number(props.row?.width || 0)
  const h = matchResult.value?.imageHeight || Number(props.row?.height || 0)
  const label = matchResult.value?.ratioLabel
  if (w && h && label) return `${w}×${h} · ${label}`
  if (w && h) return `${w}×${h}`
  return label || ''
})

const specTooltip = computed(() => {
  const r = matchResult.value?.targetRatio
  return r ? `图片比例：${r}:1` : ''
})

// ==================== 数据加载与匹配 ====================
function ensureFastSyncMatches() {
  const sticker = props.row
  if (!sticker) return
  const stickerId = String(sticker.id || '')

  // 关键修复：如果当前素材已经加载过发布绑定，绝对不能清空原有的 publishedMatches 和 otherBindings！
  const isSameStickerLoaded = fullDataLoadedStickerId === stickerId && !!matchResult.value
  const existingPublished = isSameStickerLoaded ? (matchResult.value.publishedMatches || []) : []
  const existingOther = isSameStickerLoaded ? (matchResult.value.otherBindings || []) : []

  const { width, height, targetRatio, ratioLabel } = extractDimensions(sticker)
  const baseMatches = findMatchingConfigsSync(width, height, targetRatio)

  // 严格过滤：必须是 isMatched 为 true 的配置，才能作为该尺寸的待制作配置！
  const matchedUnpublished = (Array.isArray(baseMatches) ? baseMatches : []).filter(
    (item) => item.isMatched && !existingPublished.some((p) => p.id === item.id)
  )

  matchResult.value = {
    imageWidth: width,
    imageHeight: height,
    targetRatio,
    ratioLabel,
    unpublishedMatches: matchedUnpublished,
    publishedMatches: existingPublished,
    otherBindings: existingOther,
    errors: matchResult.value?.errors || []
  }

  // 仅在当前未手动选择时默认勾选
  if (!selectedConfigIds.value.length) {
    const unpubList = matchedUnpublished.filter(
      (item) => !optimisticCreatedConfigIds.value.has(item.id)
    )
    selectedConfigIds.value = unpubList.map((item) => item.id)
  }
}

function handleTriggerMouseEnter() {
  ensureFastSyncMatches()
}

async function ensureDataLoaded() {
  ensureFastSyncMatches()
  const stickerId = String(props.row?.id || '')
  if (!stickerId) return

  // 如果已经有当前素材的绑定数据，不再展示转圈小点，后台无缝静默拉取
  const hasLoadedBefore =
    fullDataLoadedStickerId === stickerId &&
    ((matchResult.value.publishedMatches && matchResult.value.publishedMatches.length > 0) ||
      (matchResult.value.otherBindings && matchResult.value.otherBindings.length > 0))

  if (!hasLoadedBefore) {
    isCheckingBindings.value = true
  }

  try {
    const res = await evaluatePublishConfigsForSticker(props.row, false)
    if (res && String(props.row?.id || '') === stickerId) {
      matchResult.value = {
        imageWidth: res.imageWidth,
        imageHeight: res.imageHeight,
        targetRatio: res.targetRatio,
        ratioLabel: res.ratioLabel,
        unpublishedMatches: Array.isArray(res.unpublishedMatches) ? res.unpublishedMatches : [],
        publishedMatches: Array.isArray(res.publishedMatches) ? res.publishedMatches : [],
        otherBindings: Array.isArray(res.otherBindings) ? res.otherBindings : [],
        errors: Array.isArray(res.errors) ? res.errors : []
      }
      fullDataLoadedStickerId = stickerId

      const unpubList = (res.unpublishedMatches || []).filter(
        (m) => !optimisticCreatedConfigIds.value.has(m.id)
      )
      // 若当前未选择，默认勾选未发布的适配配置；若已有选择，保留合法有效项
      if (!selectedConfigIds.value.length) {
        selectedConfigIds.value = unpubList.map((m) => m.id)
      } else {
        const validIds = new Set(unpubList.map((m) => m.id))
        const remaining = selectedConfigIds.value.filter((id) => validIds.has(id))
        selectedConfigIds.value = remaining.length ? remaining : unpubList.map((m) => m.id)
      }
    }
  } catch (err) {
    console.warn('获取素材发布配置匹配详情失败:', err)
  } finally {
    isCheckingBindings.value = false
  }
}

// ==================== 勾选交互 ====================
function toggleItemSelection(id: string) {
  const idx = selectedConfigIds.value.indexOf(id)
  if (idx > -1) {
    selectedConfigIds.value.splice(idx, 1)
  } else {
    selectedConfigIds.value.push(id)
  }
}

function toggleSelectAllUnpublished() {
  if (isAllSelected.value) {
    selectedConfigIds.value = []
  } else {
    selectedConfigIds.value = (unpublishedMatches.value || []).map((item) => item.id)
  }
}

const popoverRef = ref()
const isPopoverDisabled = ref(false)

function closePopoverInstantly() {
  try {
    popoverRef.value?.hide?.()
  } catch {}
  isPopoverDisabled.value = true
  isPopoverOpen.value = false
  window.removeEventListener('keydown', handleKeydown, true)
  setTimeout(() => {
    isPopoverDisabled.value = false
  }, 250)
}

function handleQuickCreate() {
  if (!selectedConfigIds.value.length || creating.value) return
  const stickerId = String(props.row?.id || '')
  if (!stickerId) return

  const targetConfigIds = [...selectedConfigIds.value]
  const count = targetConfigIds.length

  targetConfigIds.forEach((id) => optimisticCreatedConfigIds.value.add(id))
  selectedConfigIds.value = []
  closePopoverInstantly()

  ElMessage.success({
    message: `已创建 ${count} 个发布任务`,
    duration: 1800,
    grouping: true
  })

  emit('created', props.row)

  creating.value = true
  stickerPsdSetApi
    .batchCreateByPublishConfig({
      stickerIds: [stickerId],
      publishConfigIds: targetConfigIds
    })
    .then(() => {
      invalidatePublishBindingsCache(stickerId)
      invalidateMaterialRelations(stickerId)
      fullDataLoadedStickerId = ''
    })
    .catch((err: any) => {
      targetConfigIds.forEach((id) => optimisticCreatedConfigIds.value.delete(id))
      ElMessage.error(err?.message || '一键创建发布任务失败，已回滚')
    })
    .finally(() => {
      creating.value = false
    })
}

const isPopoverOpen = ref(false)

function handlePopoverShow() {
  isPopoverOpen.value = true
  window.addEventListener('keydown', handleKeydown, true)
}

function handlePopoverHide() {
  isPopoverOpen.value = false
  window.removeEventListener('keydown', handleKeydown, true)
}

function handleKeydown(e: KeyboardEvent) {
  if (!isPopoverOpen.value) return
  if (e.key !== 'Enter' && e.code !== 'Enter' && e.code !== 'NumpadEnter') return

  const activeEl = document.activeElement
  if (
    activeEl &&
    (activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      (activeEl as HTMLElement).isContentEditable)
  ) {
    return
  }

  if (!selectedConfigIds.value.length || creating.value) return

  e.preventDefault()
  e.stopPropagation()
  handleQuickCreate()
}

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown, true)
})

function formatPlatform(platform?: string): string {
  const map: Record<string, string> = {
    xiaohongshu: '小红书',
    douyin: '抖音',
    doudian: '抖店',
    temu: 'Temu',
    taobao: '淘宝',
    ali1688: '1688',
    kuaishou: '快手',
    wechat: '视频号',
    pinduoduo: '拼多多',
    dewu: '得物'
  }
  return map[String(platform).toLowerCase()] || platform || '其他'
}

function getPlatformTagType(platform?: string): 'success' | 'warning' | 'danger' | 'info' | undefined {
  const p = String(platform).toLowerCase()
  if (p === 'xiaohongshu') return 'danger'
  if (p === 'douyin' || p === 'doudian' || p === 'kuaishou') return 'warning'
  if (p === 'temu') return 'success'
  return 'info'
}

function getMatchStatusText(item: MatchedPublishConfigItem): string {
  if (item.matchStatus === 'perfect') return '完美契合'
  if (item.matchStatus === 'qualified') return '适配'
  if (item.matchStatus === 'warning') return '尺寸偏小'
  return '通用'
}

function getStatusInfo(rawStatus?: string): { key: 'success' | 'pending' | 'processing' | 'failed' | 'expired' | 'neutral'; label: string } {
  const s = String(rawStatus || '').trim().toLowerCase()
  if (!s) return { key: 'neutral', label: '已绑定' }

  // 1. 成功 / 已发布 / 已完成
  if (
    s === 'success' ||
    s === 'completed' ||
    s === 'done' ||
    s === '已发布' ||
    s === '已完成' ||
    s === '成功'
  ) {
    return { key: 'success', label: '已发布' }
  }

  // 2. 制作中 / 处理中 / 生成中
  if (
    s === 'processing' ||
    s === 'running' ||
    s === 'generating' ||
    s === '制作中' ||
    s === '处理中' ||
    s === '生成中'
  ) {
    return { key: 'processing', label: '制作中' }
  }

  // 3. 排队中 / 待发布
  if (
    s === 'pending' ||
    s === 'queued' ||
    s === 'queue' ||
    s === 'waiting' ||
    s === '排队中' ||
    s === '待发布' ||
    s === '等待中'
  ) {
    return { key: 'pending', label: '排队中' }
  }

  // 4. 失败 / 异常
  if (
    s === 'failed' ||
    s === 'fail' ||
    s === 'error' ||
    s === 'failure' ||
    s === '失败' ||
    s === '异常'
  ) {
    return { key: 'failed', label: '失败' }
  }

  // 5. 过期 / 取消 / 删除
  if (s === 'expired' || s === '已过期') {
    return { key: 'expired', label: '已过期' }
  }
  if (s === 'deleted' || s === '已删除') {
    return { key: 'neutral', label: '已删除' }
  }
  if (s === 'cancelled' || s === 'canceled' || s === '已取消') {
    return { key: 'neutral', label: '已取消' }
  }

  return { key: 'neutral', label: rawStatus || '已绑定' }
}

function getStatusIcon(rawStatus?: string) {
  const key = getStatusInfo(rawStatus).key
  if (key === 'success') return Check
  if (key === 'pending') return Clock
  if (key === 'processing') return Loading
  if (key === 'failed') return CircleClose
  return Check
}
</script>

<style scoped>
/* 缩略图触发胶囊：圆形高级暗色磨砂小胶囊 */
.relation-trigger {
  position: relative;
  display: inline-flex;
  width: 20px;
  height: 20px;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  line-height: 1;
  color: #ffffff;
  background: rgba(18, 20, 24, 0.68);
  backdrop-filter: blur(6px) saturate(140%);
  -webkit-backdrop-filter: blur(6px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  outline: none;
  transition: all 160ms cubic-bezier(0.2, 0.8, 0.3, 1);
}

.relation-trigger:hover {
  color: #ffffff;
  background: #ea580c;
  border-color: #fb923c;
  box-shadow: 0 3px 8px rgba(234, 88, 12, 0.45);
  transform: translateY(-1px) scale(1.1);
  z-index: 2;
}

.relation-trigger:active {
  transform: translateY(0) scale(0.92);
}

.relation-trigger:focus-visible {
  outline: 2px solid #ea580c;
  outline-offset: 1px;
}

/* 已发布过：常驻清新健康绿光环 */
.relation-trigger--published {
  border-color: rgba(52, 211, 153, 0.8);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.35),
    0 0 0 1.5px rgba(52, 211, 153, 0.35);
}

/* 浮动卡片弹层全局圆角与阴影增强 */
:global(.publish-quick-popover.el-popover) {
  padding: 12px 14px !important;
  border-radius: 12px !important;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.18) !important;
}

:global(html.dark .publish-quick-popover.el-popover),
:global(html[class*="dark"] .publish-quick-popover.el-popover) {
  border-color: rgba(255, 255, 255, 0.12) !important;
  box-shadow: 0 12px 38px rgba(0, 0, 0, 0.65) !important;
}

/* 浮动卡片主体 */
.publish-quick-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 48px;
  color: var(--el-text-color-primary);
}

.publish-quick-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.publish-quick-card__title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.publish-quick-card__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.publish-quick-card__spec-badge {
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  border: 1px solid transparent;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.spec-badge--portrait {
  color: #7c3aed;
  background: #f5f3ff;
  border-color: #ddd6fe;
}
:global(html.dark) .spec-badge--portrait,
:global(html[class*="dark"]) .spec-badge--portrait {
  color: #c4b5fd;
  background: rgba(124, 58, 237, 0.18);
  border-color: rgba(167, 139, 250, 0.35);
}

.spec-badge--landscape {
  color: #0d9488;
  background: #f0fdfa;
  border-color: #99f6e4;
}
:global(html.dark) .spec-badge--landscape,
:global(html[class*="dark"]) .spec-badge--landscape {
  color: #5eead4;
  background: rgba(13, 148, 136, 0.18);
  border-color: rgba(45, 212, 191, 0.35);
}

.spec-badge--square {
  color: #0284c7;
  background: #f0f9ff;
  border-color: #bae6fd;
}
:global(html.dark) .spec-badge--square,
:global(html[class*="dark"]) .spec-badge--square {
  color: #7dd3fc;
  background: rgba(2, 132, 199, 0.18);
  border-color: rgba(56, 189, 248, 0.35);
}

.spec-badge--generic {
  color: #b45309;
  background: #fffbeb;
  border-color: #fde68a;
}
:global(html.dark) .spec-badge--generic,
:global(html[class*="dark"]) .spec-badge--generic {
  color: #fcd34d;
  background: rgba(217, 119, 6, 0.18);
  border-color: rgba(251, 191, 36, 0.35);
}

.publish-quick-card__checking-badge {
  display: inline-flex;
  align-items: center;
}

.checking-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--el-color-primary);
  animation: pulse-dot 1.2s infinite ease-in-out;
}

@keyframes pulse-dot {
  0% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.5; }
}

.publish-quick-card__action-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  margin: 0;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
  transition: color 140ms ease;
}

.publish-quick-card__action-link:hover {
  color: var(--el-color-primary);
}

.publish-quick-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.publish-quick-section--published {
  padding-top: 8px;
  border-top: 1px dashed var(--el-border-color-lighter);
}

.publish-quick-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.publish-quick-section__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.publish-quick-section__title.text-muted {
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.publish-quick-count-badge {
  padding: 0 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  border-radius: 999px;
}

.publish-quick-tag-done {
  padding: 0 5px;
  font-size: 10px;
  color: var(--el-color-success);
  background: color-mix(in srgb, var(--el-color-success) 12%, transparent);
  border-radius: 3px;
}

.publish-quick-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.publish-quick-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  cursor: pointer;
  background: var(--el-fill-color-lighter);
  border: 1px solid transparent;
  border-radius: 6px;
  transition: all 120ms ease;
  user-select: none;
}

.publish-quick-item:hover {
  background: var(--el-fill-color);
}

.publish-quick-item.is-selected {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
}

.publish-quick-item.is-selected .publish-quick-item__name {
  color: var(--el-color-primary);
  font-weight: 600;
}

html.dark .publish-quick-item.is-selected,
html[class*="dark"] .publish-quick-item.is-selected {
  background: rgba(64, 158, 255, 0.12);
  border-color: rgba(64, 158, 255, 0.35);
}

.publish-quick-checkbox {
  margin: 0;
  pointer-events: none;
}

.publish-quick-item__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.publish-quick-item__left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.platform-tag {
  flex-shrink: 0;
  font-size: 10px;
}

.publish-quick-item__name {
  flex: 1;
  overflow: hidden;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.publish-quick-item__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.publish-quick-item__desc {
  padding: 0;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: 0.2px;
  background: transparent;
  border: none;
  transition: all 0.12s ease;
}

/* 🎨 比例形态专属文字配色体系（简洁纯文本，去 tag 边框与背景） */
.ratio-tag--portrait {
  color: #7c3aed;
}
:global(html.dark) .ratio-tag--portrait,
:global(html[class*="dark"]) .ratio-tag--portrait {
  color: #c4b5fd;
}

.ratio-tag--landscape {
  color: #0d9488;
}
:global(html.dark) .ratio-tag--landscape,
:global(html[class*="dark"]) .ratio-tag--landscape {
  color: #5eead4;
}

.ratio-tag--square {
  color: #0284c7;
}
:global(html.dark) .ratio-tag--square,
:global(html[class*="dark"]) .ratio-tag--square {
  color: #7dd3fc;
}

.ratio-tag--generic {
  color: #d97706;
}
:global(html.dark) .ratio-tag--generic,
:global(html[class*="dark"]) .ratio-tag--generic {
  color: #fcd34d;
}

.match-badge {
  padding: 0 4px;
  font-size: 10px;
  border-radius: 3px;
}

.match-badge--perfect {
  color: var(--el-color-success);
  background: color-mix(in srgb, var(--el-color-success) 14%, transparent);
}

.match-badge--qualified {
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 14%, transparent);
}

.match-badge--warning {
  color: var(--el-color-warning);
  background: color-mix(in srgb, var(--el-color-warning) 14%, transparent);
}

.match-badge--generic {
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color);
}

.publish-quick-footer {
  padding-top: 8px;
  margin-top: 2px;
  border-top: 1px dashed var(--el-border-color-lighter);
}

.publish-quick-create-btn__pill {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  margin-left: 4px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  color: #ffffff;
}

.publish-quick-create-btn__kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  padding: 1px 5px;
  font-size: 10px;
  font-family: inherit;
  font-weight: 600;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.publish-quick-all-done {
  display: flex;
  align-items: center;
  padding: 5px 8px;
  font-size: 11px;
  line-height: 1.3;
  color: var(--el-color-success);
  background: color-mix(in srgb, var(--el-color-success) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--el-color-success) 22%, transparent);
  border-radius: 4px;
}

.publish-quick-empty {
  padding: 6px 8px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.published-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0;
  margin: 0;
  list-style: none;
  max-height: 150px;
  overflow-y: auto;
}

.published-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
}

.published-item__left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.published-item__desc {
  padding: 0;
  font-size: 10.5px;
  font-weight: 700;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: 0.2px;
  background: transparent;
  border: none;
  opacity: 0.92;
}

.published-item__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 状态徽标：排队中(琥珀黄) / 已发布(清透绿) / 制作中(科技蓝) / 失败(警示红) */
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 6px;
  font-size: 10.5px;
  font-weight: 500;
  line-height: 1.4;
  border-radius: 4px;
  white-space: nowrap;
  border: 1px solid transparent;
}

/* 注意：本 style 块为原生 CSS（非 scss），不能使用 &-- 嵌套写法 */
/* 已发布 / 成功：清透翡翠绿 */
.status-badge--success {
  color: #059669;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

/* 排队中：暖琥珀金 */
.status-badge--pending {
  color: #b45309;
  background: #fffbeb;
  border-color: #fcd34d;
}

/* 制作中：科技蔚蓝 */
.status-badge--processing {
  color: #0369a1;
  background: #f0f9ff;
  border-color: #7dd3fc;
}

/* 失败：警示珊瑚红 */
.status-badge--failed {
  color: #dc2626;
  background: #fef2f2;
  border-color: #fca5a5;
}

/* 已过期：中性灰 */
.status-badge--expired {
  color: #64748b;
  background: #f1f5f9;
  border-color: #e2e8f0;
}

/* 默认兜底：中性灰 */
.status-badge--neutral {
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color);
  border-color: var(--el-border-color-lighter);
}

/* 行左侧状态色条 + 图标颜色，一眼区分 */
.published-item {
  border-left: 2px solid transparent;
}
.published-item--success { border-left-color: #10b981; }
.published-item--pending { border-left-color: #f59e0b; }
.published-item--processing { border-left-color: #0ea5e9; }
.published-item--failed {
  border-left-color: #ef4444;
  background: color-mix(in srgb, #ef4444 6%, var(--el-fill-color-lighter));
}
.published-item--success .published-item__icon { color: #10b981; }
.published-item--pending .published-item__icon { color: #f59e0b; }
.published-item--processing .published-item__icon { color: #0ea5e9; }
.published-item--failed .published-item__icon { color: #ef4444; }
.published-item--expired .published-item__icon,
.published-item--neutral .published-item__icon { color: var(--el-text-color-placeholder); }

/* 暗色模式 */
html.dark .status-badge--success {
  color: #34d399;
  background: rgba(16, 185, 129, 0.16);
  border-color: rgba(16, 185, 129, 0.35);
}
html.dark .status-badge--pending {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.16);
  border-color: rgba(245, 158, 11, 0.35);
}
html.dark .status-badge--processing {
  color: #38bdf8;
  background: rgba(14, 165, 233, 0.16);
  border-color: rgba(56, 189, 248, 0.35);
}
html.dark .status-badge--failed {
  color: #f87171;
  background: rgba(239, 68, 68, 0.18);
  border-color: rgba(239, 68, 68, 0.35);
}
html.dark .status-badge--expired,
html.dark .status-badge--neutral {
  color: rgba(255, 255, 255, 0.65);
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
}

.publish-quick-error {
  margin: 0;
  font-size: 11px;
  color: var(--el-color-danger);
}
</style>
