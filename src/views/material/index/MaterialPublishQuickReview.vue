<template>
  <teleport to="body">
    <div v-if="visible" class="pqr" :class="{ 'is-dark': isDark }">
      <!-- ================= 左侧：负责图片与沉浸式操作 ================= -->
      <section
        class="pqr__stage-wrap"
        v-loading="loadingBatch"
        element-loading-text="正在加载素材图片..."
      >
        <!-- 极简悬浮顶条：无多余实底头栏，浮动毛玻璃轻量胶囊控件 -->
        <header class="pqr__floating-bar">
          <div class="pqr__floating-left">
            <span v-if="queue.length" class="pqr__floating-progress">
              {{ currentIndex + 1 }} / {{ queue.length }}
            </span>
            <span v-if="hasUserSelection" class="pqr__floating-badge">已选</span>

            <!-- 模式切换：极简文字分段切换 -->
            <div v-if="!hasUserSelection" class="pqr__mode-segmented">
              <button
                type="button"
                class="pqr__mode-tab"
                :class="{ 'is-active': activeMode === 'recent' }"
                :disabled="loadingBatch"
                title="按创建时间从最新到最旧审核"
                @click="switchMode('recent')"
              >
                <span>最近图片</span>
              </button>
              <button
                type="button"
                class="pqr__mode-tab"
                :class="{ 'is-active': activeMode === 'oldest' }"
                :disabled="loadingBatch"
                title="按创建时间从最早到最新审核"
                @click="switchMode('oldest')"
              >
                <span>最早图片</span>
              </button>
              <button
                type="button"
                class="pqr__mode-tab"
                :class="{ 'is-active': activeMode === 'random' }"
                :disabled="loadingBatch"
                title="随机乱序抽检审核"
                @click="switchMode('random')"
              >
                <span>随机图片</span>
              </button>
            </div>

            <!-- 多维度精准过滤 Popover -->
            <el-popover
              v-if="!hasUserSelection"
              v-model:visible="filterPopoverVisible"
              trigger="click"
              placement="bottom-start"
              :width="500"
              popper-class="pqr-filter-popover"
              :teleported="true"
            >
              <template #reference>
                <button
                  type="button"
                  class="pqr__filter-trigger-btn"
                  :class="{ 'has-active': activeFilterCount > 0, 'is-open': filterPopoverVisible }"
                  :disabled="loadingBatch"
                  title="多维度筛选：图片尺寸比例、是否抠图、时间范围、后缀格式"
                >
                  <el-icon class="mr-0.5"><Operation /></el-icon>
                  <span>筛选</span>
                  <span v-if="activeFilterCount > 0" class="pqr__filter-count-badge">{{ activeFilterCount }}</span>
                </button>
              </template>

              <!-- 筛选控制面板 -->
              <div class="pqr-filter-panel">
                <div class="pqr-filter-header">
                  <div class="pqr-filter-header-left">
                    <span class="pqr-filter-title">审核素材精准过滤</span>
                    <span class="pqr-filter-subtitle">按比例、抠图、时间与格式定制审核队列</span>
                  </div>
                  <el-button
                    v-if="activeFilterCount > 0"
                    link
                    type="primary"
                    size="small"
                    @click="resetFilters"
                  >
                    重置所有
                  </el-button>
                </div>

                <!-- 1. 图片尺寸比例 -->
                <div class="pqr-filter-section">
                  <div class="pqr-filter-label">
                    <span>图片尺寸比例</span>
                    <span v-if="hasInheritedRatio" class="pqr-filter-val-hint">
                      已同步列表：{{ inheritedRatioLabel }}
                    </span>
                    <span v-else-if="reviewFilters.aspectRatioCategory !== 'all'" class="pqr-filter-val-hint">
                      {{ getRatioCategoryLabel(reviewFilters.aspectRatioCategory) }}
                    </span>
                    <button
                      v-if="hasInheritedRatio"
                      type="button"
                      class="pqr-filter-clear-inherited"
                      @click="clearInheritedRatio"
                    >
                      清除
                    </button>
                  </div>
                  <div class="pqr-filter-chips">
                    <button
                      v-for="opt in RATIO_FILTER_OPTIONS"
                      :key="opt.key"
                      type="button"
                      class="pqr-chip"
                      :class="{ 'is-active': !hasInheritedRatio && reviewFilters.aspectRatioCategory === opt.key }"
                      @click="selectRatioCategory(opt.key)"
                    >
                      <span>{{ opt.label }}</span>
                      <span v-if="opt.sub" class="pqr-chip-sub">{{ opt.sub }}</span>
                    </button>
                  </div>
                </div>

                <!-- 2. 是否抠图 -->
                <div class="pqr-filter-section">
                  <div class="pqr-filter-label">
                    <span>是否抠图</span>
                    <span v-if="reviewFilters.isCutout !== undefined && reviewFilters.isCutout !== null" class="pqr-filter-val-hint">
                      {{ reviewFilters.isCutout ? '仅透明底抠图' : '仅含底色背景' }}
                    </span>
                  </div>
                  <div class="pqr-filter-chips">
                    <button
                      type="button"
                      class="pqr-chip"
                      :class="{ 'is-active': reviewFilters.isCutout === undefined || reviewFilters.isCutout === null }"
                      @click="reviewFilters.isCutout = undefined"
                    >
                      全部
                    </button>
                    <button
                      type="button"
                      class="pqr-chip"
                      :class="{ 'is-active': reviewFilters.isCutout === true }"
                      @click="reviewFilters.isCutout = true"
                    >
                      <i class="pqr-chip-dot pqr-chip-dot--cutout"></i>
                      <span>已抠图 (透明底)</span>
                    </button>
                    <button
                      type="button"
                      class="pqr-chip"
                      :class="{ 'is-active': reviewFilters.isCutout === false }"
                      @click="reviewFilters.isCutout = false"
                    >
                      <i class="pqr-chip-dot pqr-chip-dot--bg"></i>
                      <span>未抠图 (含底色)</span>
                    </button>
                  </div>
                </div>

                <!-- 3. 时间范围 -->
                <div class="pqr-filter-section">
                  <div class="pqr-filter-label">
                    <span>时间范围</span>
                  </div>
                  <div class="pqr-filter-chips">
                    <button
                      v-for="tOpt in TIME_PRESET_OPTIONS"
                      :key="tOpt.key"
                      type="button"
                      class="pqr-chip"
                      :class="{ 'is-active': reviewFilters.timePreset === tOpt.key }"
                      @click="selectTimePreset(tOpt.key)"
                    >
                      {{ tOpt.label }}
                    </button>
                  </div>
                  <!-- 自定义时间范围选择器 -->
                  <div v-if="reviewFilters.timePreset === 'custom'" class="pqr-filter-custom-time">
                    <el-date-picker
                      v-model="reviewFilters.dateRange"
                      type="datetimerange"
                      size="small"
                      range-separator="至"
                      start-placeholder="开始时间"
                      end-placeholder="结束时间"
                      format="YYYY-MM-DD HH:mm"
                      value-format="x"
                      style="width: 100%"
                    />
                  </div>
                </div>

                <!-- 4. 文件格式 / 后缀 -->
                <div class="pqr-filter-section">
                  <div class="pqr-filter-label">
                    <span>文件格式 / 后缀</span>
                    <span v-if="reviewFilters.suffix.length" class="pqr-filter-val-hint">
                      {{ reviewFilters.suffix.map(s => s.toUpperCase()).join('、') }}
                    </span>
                  </div>
                  <div class="pqr-filter-chips">
                    <button
                      type="button"
                      class="pqr-chip"
                      :class="{ 'is-active': !reviewFilters.suffix.length }"
                      @click="reviewFilters.suffix = []"
                    >
                      全部格式
                    </button>
                    <button
                      v-for="ext in SUFFIX_OPTIONS"
                      :key="ext"
                      type="button"
                      class="pqr-chip"
                      :class="{ 'is-active': reviewFilters.suffix.includes(ext) }"
                      @click="toggleSuffix(ext)"
                    >
                      {{ ext.toUpperCase() }}
                    </button>
                  </div>
                </div>

                <!-- 底部操作按钮 -->
                <div class="pqr-filter-footer">
                  <span class="pqr-filter-tips">应用后将自动从第 1 页加载符合条件的素材</span>
                  <div class="pqr-filter-btns">
                    <el-button size="small" @click="filterPopoverVisible = false">取消</el-button>
                    <el-button size="small" type="primary" :loading="loadingBatch" @click="applyFilters">
                      应用并审核
                    </el-button>
                  </div>
                </div>
              </div>
            </el-popover>

            <!-- 活跃过滤标签展示条 -->
            <div v-if="!hasUserSelection && activeFilterTags.length" class="pqr__active-tags">
              <span
                v-for="tag in activeFilterTags"
                :key="tag.key"
                class="pqr__active-tag"
                :title="`点击移除 ${tag.label} 筛选`"
                @click="tag.onRemove"
              >
                <span>{{ tag.label }}</span>
                <el-icon class="pqr__active-tag-close"><Close /></el-icon>
              </span>
              <button
                type="button"
                class="pqr__clear-all-link"
                title="清空所有筛选条件"
                @click="resetFilters"
              >
                清空
              </button>
            </div>

            <!-- 非指定勾选模式下，支持随时换一批 -->
            <button
              v-if="!hasUserSelection"
              type="button"
              class="pqr__refresh-batch-btn"
              :class="{ 'is-loading': loadingBatch }"
              :disabled="loadingBatch"
              :title="activeMode === 'random' ? '随机从素材库换一批50张素材' : '从素材库加载下一批50张素材'"
              @click="loadNextBatch"
            >
              <el-icon :class="{ 'is-loading': loadingBatch }"><Refresh /></el-icon>
              <span>换一批</span>
            </button>
          </div>

          <div class="pqr__floating-right">
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
        </header>

        <!-- 左右翻页按钮：固定在舞台两侧安全区域，绝不超出屏幕，绝不遮挡右侧面板 -->
        <button
          v-if="current && currentIndex > 0 && !loadingBatch"
          type="button"
          class="pqr__nav-arrow pqr__nav-arrow--prev"
          title="上一张 (快捷键：← 或 W)"
          @click.stop="actPrev"
        >
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <button
          v-if="current && !loadingBatch"
          type="button"
          class="pqr__nav-arrow pqr__nav-arrow--next"
          title="忽略/下一张 (当前不处理，直接看下一张；快捷键：空格、→ 或 D)"
          @click.stop="actSkip"
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
              :class="{ 'is-pending': deckPending }"
            />
            <div v-if="deckPending" class="pqr__deck-loading-dot" title="高清图解码中..."></div>
          </div>

          <!-- 图片规格与素材信息条 -->
          <div class="pqr__image-info-bar">
            <span class="pqr__info-name" :title="current.name || ''">
              {{ current.name || `素材 #${current.id}` }}
            </span>
            <span class="pqr__info-pill pqr__info-pill--highlight">
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

        <div v-else-if="!loadingBatch" class="pqr__empty">
          <template v-if="createdMaterialCount > 0 || skippedCount > 0">
            <p class="pqr__empty-title">队列中的素材已全部审核完毕！</p>
            <p class="pqr__empty-desc">
              本次共完成 {{ createdMaterialCount }} 张素材的商品任务制作（共派发 {{ createdTaskCount }} 个发布任务），忽略 {{ skippedCount }} 张素材。
            </p>
            <div class="mt-4 flex gap-3 justify-center">
              <el-button type="primary" @click="reloadQueue">重新开始审核</el-button>
              <el-button @click="close">返回素材列表</el-button>
            </div>
          </template>
          <template v-else>
            <p class="pqr__empty-title">当前素材库暂无可审核素材</p>
            <p class="pqr__empty-desc">
              未能加载到待审核的素材图片，请点击重试加载或选择其他文件夹。
            </p>
            <div class="mt-4 flex gap-3 justify-center">
              <el-button type="primary" :loading="loadingBatch" @click="() => fetchBatch(activeMode, 1)">重试加载</el-button>
              <el-button @click="close">返回素材列表</el-button>
            </div>
          </template>
        </div>

        <!-- 底部简洁浮动 Dock 快捷键操作栏 -->
        <footer class="pqr__dock">
          <div class="pqr__dock-capsule">
            <button
              type="button"
              class="pqr__dock-btn"
              :disabled="currentIndex <= 0 || loadingBatch"
              title="查看上一张（快捷键：← 或 W）"
              @click="actPrev"
            >
              <span class="pqr__dock-text">上一张</span>
              <kbd class="pqr__dock-kbd">← / W</kbd>
            </button>

            <div class="pqr__dock-sep"></div>

            <button
              type="button"
              class="pqr__dock-btn"
              :disabled="!current || loadingBatch"
              title="当前不处理，直接忽略并进入下一张（快捷键：空格 Space、→、D、S）"
              @click="actSkip"
            >
              <span class="pqr__dock-text">忽略 / 下一张</span>
              <kbd class="pqr__dock-kbd">空格 / →</kbd>
            </button>

            <div class="pqr__dock-sep"></div>

            <button
              type="button"
              class="pqr__dock-btn pqr__dock-btn--primary"
              :disabled="!current || !selectedConfigIds.length || creating || loadingBatch"
              title="一键直接创建任务并自动切换下一张（快捷键：↵ Enter）"
              @click="actCreateAndNext"
            >
              <span class="pqr__dock-text">
                一键创建
                <template v-if="selectedConfigIds.length">({{ selectedConfigIds.length }})</template>
              </span>
              <kbd class="pqr__dock-kbd pqr__dock-kbd--primary">Enter ↵</kbd>
            </button>
          </div>
        </footer>
      </section>

      <!-- ================= 右侧：负责完整配置面板 ================= -->
      <aside
        class="pqr__side"
        v-loading="loadingBatch"
        element-loading-text="正在加载发布配置..."
      >
        <!-- 顶栏：标题 + 推荐状态 + 右上角专属关闭按钮 -->
        <div class="pqr__side-header">
          <div class="pqr__side-title-row">
            <span class="pqr__side-title">发布任务配置</span>
            <span v-if="current" class="pqr__count-badge">{{ displayConfigs.length }} 项</span>
            <span v-if="current && matchedCount" class="pqr__count-badge pqr__count-badge--success">
              推荐匹配 {{ matchedCount }}
            </span>
          </div>

          <button type="button" class="pqr__side-close" title="退出审核 (Esc)" @click="close">
            <el-icon><Close /></el-icon>
          </button>
        </div>

        <!-- 快捷操作栏：仅选匹配 / 全选 -->
        <div class="pqr__side-subbar">
          <div class="pqr__side-actions">
            <button
              v-if="matchedCount > 0"
              type="button"
              class="pqr__action-link"
              :disabled="loadingBatch || !current"
              title="一键重置为仅勾选推荐匹配项"
              @click="selectOnlyMatched"
            >
              仅选匹配 ({{ matchedCount }})
            </button>
            <button
              type="button"
              class="pqr__action-link"
              :disabled="loadingBatch || !current"
              @click="toggleSelectAll"
            >
              {{ isAllSelected ? '取消全选' : '全选所有' }}
            </button>
          </div>
          <span class="pqr__side-sub-count">已选 {{ selectedConfigIds.length }} 项</span>
        </div>

        <!-- 配置列表：按契合度与近似比例从高到低从上到下排序 -->
        <div class="pqr__config-scroll">
          <template v-if="current && displayConfigs.length > 0">
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

                    <!-- ⚡ 简洁清晰的比例显示：告别tag边框底色，直接以专属形态配色文字呈现，清爽直观 -->
                    <span
                      class="pqr__ratio-text"
                      :class="[
                        item.isMatched ? 'pqr__ratio-text--matched' : 'pqr__ratio-text--mismatch',
                        `pqr__ratio-text--${getRatioBadgeKind(item)}`
                      ]"
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
          </template>
          <div v-else-if="!loadingBatch" class="pqr__side-empty">
            <el-empty description="暂无可配置素材" :image-size="64" />
          </div>
        </div>

        <!-- 侧边栏底部提交栏（贴底） -->
        <div class="pqr__side-footer">
          <el-button
            type="primary"
            class="pqr__submit"
            :disabled="!current || !selectedConfigIds.length || creating || loadingBatch"
            :loading="creating"
            title="一键创建选中的发布任务并看下一张 (快捷键：↵ Enter)"
            @click="actCreateAndNext"
          >
            <span>{{ current && selectedConfigIds.length ? `一键创建并看下一张 (${selectedConfigIds.length})` : (loadingBatch ? '正在加载配置...' : (current ? '请勾选配置' : '暂无可配置素材')) }}</span>
            <kbd v-if="current && selectedConfigIds.length" class="pqr__kbd-hint">↵ Enter</kbd>
          </el-button>
        </div>
      </aside>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Close,
  Filter,
  Operation,
  Refresh,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { convertFolderIdToApiParam } from '@/constants/folder'
import { stickerPsdSetApi } from '@/api/stickerPsdSet'
import { getMaterialList } from '@/api/material'
import { useImageDeck } from '@/composables/useImageDeck'
import { getReviewImageUrl } from '@/utils/image'
import { useAppStore } from '@/store/modules/app'
import {
  extractDimensions,
  findMatchingConfigsSync,
  evaluatePublishConfigsForSticker,
  getRatioBadgeKind,
  invalidatePublishBindingsCache,
  preloadPublishConfigs,
  preloadMaterialBindings,
  type QuickPublishMatchResult,
  type MatchedPublishConfigItem
} from './useMaterialPublishQuick'
import { invalidateMaterialRelations } from './useMaterialRelations'
import { calculateAspectRatioRange, getSizeShapeConfig } from './sizeShapeConfig'

defineOptions({ name: 'MaterialPublishQuickReview' })

export type QuickReviewMode = 'recent' | 'oldest' | 'random'

const appStore = useAppStore()
const isDark = computed(() => appStore.getIsDark)

const props = withDefaults(
  defineProps<{
    visible: boolean
    items?: any[]
    startIndex?: number
    initialMode?: QuickReviewMode
    hasUserSelection?: boolean
    folderId?: any
    initialFilters?: Record<string, any>
  }>(),
  {
    items: () => [],
    startIndex: 0,
    initialMode: 'recent',
    hasUserSelection: false,
    folderId: undefined,
    initialFilters: () => ({})
  }
)

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'reviewed'): void
}>()

// ==================== 审核模式状态 ====================
const activeMode = ref<QuickReviewMode>('recent')
const loadingBatch = ref(false)
const batchPage = ref(1)

// ==================== 多维度筛选状态 ====================
const filterPopoverVisible = ref(false)

export interface QuickReviewFiltersState {
  isCutout?: boolean | null | undefined
  suffix: string[]
  aspectRatioCategory: string
  /** 继承自列表页的精细尺寸形状（多选，如 wide / ultra-long） */
  sizeShape: string[]
  /** 继承自列表页的自定义精确比例（与 sizeShape 可同时生效） */
  ratioTarget?: number
  ratioTolerance?: number
  timePreset: string
  dateRange: any[]
}

const reviewFilters = ref<QuickReviewFiltersState>({
  isCutout: undefined,
  suffix: [],
  aspectRatioCategory: 'all',
  sizeShape: [],
  ratioTarget: undefined,
  ratioTolerance: undefined,
  timePreset: 'all',
  dateRange: []
})

const RATIO_FILTER_OPTIONS = [
  { key: 'all', label: '全部比例' },
  { key: '1:1', label: '1:1 方图', sub: '正方' },
  { key: '3:4', label: '3:4 竖图', sub: '商品/海报' },
  { key: '4:3', label: '4:3 横图', sub: '画报' },
  { key: '9:16', label: '9:16 竖图', sub: '壁纸/立标' },
  { key: '16:9', label: '16:9 横图', sub: '宽屏/电脑' },
  { key: '2:1', label: '2:1 长图', sub: '桌垫/横幅' },
  { key: 'portrait', label: '所有竖图', sub: '高 > 宽' },
  { key: 'landscape', label: '所有横图', sub: '宽 > 高' }
]

const TIME_PRESET_OPTIONS = [
  { key: 'all', label: '全部时间' },
  { key: 'today', label: '今天' },
  { key: '3days', label: '近3天' },
  { key: '7days', label: '近7天' },
  { key: '30days', label: '近30天' },
  { key: 'custom', label: '自定义范围' }
]

const SUFFIX_OPTIONS = ['png', 'jpg', 'webp', 'svg', 'psd']

/** 预设比例对应的查询参数（容差为百分比，与列表页一致） */
const RATIO_PRESET_QUERY: Record<string, { target: number; tolerance: number }> = {
  '1:1': { target: 1.0, tolerance: 5 },
  '3:4': { target: 0.75, tolerance: 6 },
  '4:3': { target: 1.333, tolerance: 6 },
  '9:16': { target: 0.5625, tolerance: 6 },
  '16:9': { target: 1.778, tolerance: 6 },
  '2:1': { target: 2.0, tolerance: 15 }
}

const activeFilterCount = computed(() => {
  let count = 0
  if (reviewFilters.value.isCutout !== undefined && reviewFilters.value.isCutout !== null) count++
  if (reviewFilters.value.suffix && reviewFilters.value.suffix.length > 0) count++
  if (
    hasInheritedRatio.value ||
    (reviewFilters.value.aspectRatioCategory && reviewFilters.value.aspectRatioCategory !== 'all')
  ) {
    count++
  }
  if (reviewFilters.value.timePreset && reviewFilters.value.timePreset !== 'all') count++
  return count
})

const activeFilterTags = computed(() => {
  const tags: Array<{ key: string; label: string; onRemove: () => void }> = []

  if (reviewFilters.value.isCutout === true) {
    tags.push({
      key: 'cutout',
      label: '已抠图',
      onRemove: () => {
        reviewFilters.value.isCutout = undefined
        applyFilters()
      }
    })
  } else if (reviewFilters.value.isCutout === false) {
    tags.push({
      key: 'cutout',
      label: '未抠图',
      onRemove: () => {
        reviewFilters.value.isCutout = undefined
        applyFilters()
      }
    })
  }

  if (hasInheritedRatio.value) {
    tags.push({
      key: 'ratio',
      label: inheritedRatioLabel.value,
      onRemove: () => {
        clearInheritedRatio()
        applyFilters()
      }
    })
  } else if (reviewFilters.value.aspectRatioCategory && reviewFilters.value.aspectRatioCategory !== 'all') {
    const item = RATIO_FILTER_OPTIONS.find((o) => o.key === reviewFilters.value.aspectRatioCategory)
    tags.push({
      key: 'ratio',
      label: item ? item.label : reviewFilters.value.aspectRatioCategory,
      onRemove: () => {
        reviewFilters.value.aspectRatioCategory = 'all'
        applyFilters()
      }
    })
  }

  if (reviewFilters.value.suffix && reviewFilters.value.suffix.length > 0) {
    tags.push({
      key: 'suffix',
      label: reviewFilters.value.suffix.map((s) => s.toUpperCase()).join('/'),
      onRemove: () => {
        reviewFilters.value.suffix = []
        applyFilters()
      }
    })
  }

  if (reviewFilters.value.timePreset && reviewFilters.value.timePreset !== 'all') {
    const timeLabels: Record<string, string> = {
      today: '今天',
      '3days': '近3天',
      '7days': '近7天',
      '30days': '近30天',
      custom: '自定义时间'
    }
    tags.push({
      key: 'time',
      label: timeLabels[reviewFilters.value.timePreset] || '指定时间',
      onRemove: () => {
        reviewFilters.value.timePreset = 'all'
        reviewFilters.value.dateRange = []
        applyFilters()
      }
    })
  }

  return tags
})

function getRatioCategoryLabel(key: string): string {
  const item = RATIO_FILTER_OPTIONS.find((o) => o.key === key)
  return item ? item.label : key
}

function selectTimePreset(key: string) {
  reviewFilters.value.timePreset = key
  if (key !== 'custom') {
    reviewFilters.value.dateRange = []
  }
}

function toggleSuffix(ext: string) {
  const idx = reviewFilters.value.suffix.indexOf(ext)
  if (idx > -1) {
    reviewFilters.value.suffix.splice(idx, 1)
  } else {
    reviewFilters.value.suffix.push(ext)
  }
}

function initReviewFilters() {
  const init = props.initialFilters || {}
  const hasInit = Object.keys(init).length > 0
  const sizeShape = hasInit
    ? Array.isArray(init.sizeShape)
      ? init.sizeShape.filter(Boolean)
      : init.sizeShape
        ? [init.sizeShape]
        : []
    : []
  const targetNum = Number(init.targetAspectRatio)
  const hasTarget =
    hasInit &&
    init.targetAspectRatio !== undefined &&
    init.targetAspectRatio !== null &&
    init.targetAspectRatio !== '' &&
    Number.isFinite(targetNum) &&
    targetNum > 0
  const toleranceNum = Number(init.aspectRatioTolerance)
  const legacyCategory = init.aspectRatioCategory
  const category =
    hasInit && legacyCategory && RATIO_FILTER_OPTIONS.some((o) => o.key === legacyCategory)
      ? legacyCategory
      : 'all'

  reviewFilters.value = {
    isCutout: hasInit && init.isCutout !== undefined && init.isCutout !== '' ? init.isCutout : undefined,
    suffix: hasInit && Array.isArray(init.suffix) ? [...init.suffix] : hasInit && init.suffix ? [init.suffix] : [],
    aspectRatioCategory: sizeShape.length || hasTarget ? 'all' : category,
    sizeShape,
    ratioTarget: hasTarget ? targetNum : undefined,
    ratioTolerance: hasTarget ? (Number.isFinite(toleranceNum) ? toleranceNum : 5) : undefined,
    timePreset: hasInit && (init.startTime || init.endTime) ? 'custom' : init.timePreset || 'all',
    dateRange: hasInit && init.startTime && init.endTime ? [init.startTime, init.endTime] : []
  }
}

/** 是否带有从列表页同步来的比例条件（精细形状 / 自定义比例） */
const hasInheritedRatio = computed(
  () => reviewFilters.value.sizeShape.length > 0 || reviewFilters.value.ratioTarget !== undefined
)

const inheritedRatioLabel = computed(() => {
  const parts: string[] = []
  if (reviewFilters.value.sizeShape.length) {
    parts.push(
      reviewFilters.value.sizeShape.map((key) => getSizeShapeConfig(key)?.label || key).join('、')
    )
  }
  if (reviewFilters.value.ratioTarget !== undefined) {
    parts.push(`比例 ${reviewFilters.value.ratioTarget} (±${reviewFilters.value.ratioTolerance ?? 5}%)`)
  }
  return parts.join(' + ')
})

/** 点击预设比例：覆盖同步来的比例条件 */
function selectRatioCategory(key: string) {
  reviewFilters.value.sizeShape = []
  reviewFilters.value.ratioTarget = undefined
  reviewFilters.value.ratioTolerance = undefined
  reviewFilters.value.aspectRatioCategory = key
}

function clearInheritedRatio() {
  reviewFilters.value.sizeShape = []
  reviewFilters.value.ratioTarget = undefined
  reviewFilters.value.ratioTolerance = undefined
  reviewFilters.value.aspectRatioCategory = 'all'
}

function applyFilters() {
  filterPopoverVisible.value = false
  batchPage.value = 1
  fetchBatch(activeMode.value, 1)
}

function resetFilters() {
  reviewFilters.value = {
    isCutout: undefined,
    suffix: [],
    aspectRatioCategory: 'all',
    sizeShape: [],
    ratioTarget: undefined,
    ratioTolerance: undefined,
    timePreset: 'all',
    dateRange: []
  }
  applyFilters()
}

// ==================== 辅助排序与模式调度 ====================
function getMaterialTimestamp(item: any): number {
  if (item?.createTime) {
    const t = new Date(item.createTime).getTime()
    if (!isNaN(t)) return t
  }
  if (item?.created_at) {
    const t = new Date(item.created_at).getTime()
    if (!isNaN(t)) return t
  }
  const idNum = Number(item?.id)
  return isNaN(idNum) ? 0 : idNum
}

function sortQueueItems(items: any[], mode: QuickReviewMode): any[] {
  const arr = [...items]
  if (mode === 'recent') {
    return arr.sort((a, b) => getMaterialTimestamp(b) - getMaterialTimestamp(a))
  } else if (mode === 'oldest') {
    return arr.sort((a, b) => getMaterialTimestamp(a) - getMaterialTimestamp(b))
  } else if (mode === 'random') {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }
  return arr
}

function switchMode(mode: QuickReviewMode) {
  if (activeMode.value === mode && queue.value.length > 0) return
  activeMode.value = mode

  const labels: Record<QuickReviewMode, string> = {
    recent: '最近图片 (最新优先)',
    oldest: '最早图片 (最早优先)',
    random: '随机图片 (随机抽检)'
  }

  if (props.hasUserSelection) {
    queue.value = sortQueueItems(props.items || [], mode)
    currentIndex.value = 0
    skippedQueue.value = []
    syncCurrentMaterial()
    ElMessage.success(`已切换为：${labels[mode]}`)
  } else {
    batchPage.value = 1
    fetchBatch(mode, 1)
  }
}

function buildQueryPayload(mode: QuickReviewMode, page = 1) {
  const params: any = {
    currentPage: page,
    pageSize: 50,
    listMode: 'compact',
    includeRelations: false
  }
  const folderFilter = convertFolderIdToApiParam(props.folderId)
  if (folderFilter !== undefined && folderFilter !== null) {
    params.folderId = folderFilter
  }
  if (mode === 'recent') {
    params.sortOrder = 'DESC'
  } else if (mode === 'oldest') {
    params.sortOrder = 'ASC'
  } else if (mode === 'random') {
    params.random = true
    params._t = Date.now()
  }

  // 1. 是否抠图过滤
  if (reviewFilters.value.isCutout !== undefined && reviewFilters.value.isCutout !== null) {
    params.isCutout = reviewFilters.value.isCutout
  }

  // 2. 文件后缀过滤
  if (reviewFilters.value.suffix && reviewFilters.value.suffix.length > 0) {
    params.suffix = reviewFilters.value.suffix
  }

  // 3. 尺寸比例过滤
  // 列表页同步来的精细形状与自定义比例可同时生效（后端为 AND 关系）
  const { sizeShape, ratioTarget, ratioTolerance } = reviewFilters.value
  if (sizeShape.length > 0) {
    params.sizeShape = sizeShape
  }
  if (ratioTarget !== undefined) {
    const tolerance = ratioTolerance ?? 5
    const range = calculateAspectRatioRange(ratioTarget, tolerance)
    params.targetAspectRatio = ratioTarget
    params.aspectRatioTolerance = tolerance / 100
    params.minAspectRatio = range.min
    params.maxAspectRatio = range.max
  }

  const cat = sizeShape.length > 0 || ratioTarget !== undefined ? 'all' : reviewFilters.value.aspectRatioCategory
  if (cat && cat !== 'all') {
    if (cat === 'portrait' || cat === 'landscape' || cat === 'square') {
      params.sizeShape = [cat]
    } else {
      const preset = RATIO_PRESET_QUERY[cat]
      if (preset) {
        const range = calculateAspectRatioRange(preset.target, preset.tolerance)
        params.targetAspectRatio = preset.target
        params.aspectRatioTolerance = preset.tolerance / 100
        params.minAspectRatio = range.min
        params.maxAspectRatio = range.max
      }
    }
  }

  // 4. 时间范围过滤
  const timePreset = reviewFilters.value.timePreset
  const now = Date.now()
  if (timePreset === 'today') {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    params.startTime = d.getTime()
    params.endTime = now
  } else if (timePreset === '3days') {
    params.startTime = now - 3 * 86400 * 1000
    params.endTime = now
  } else if (timePreset === '7days') {
    params.startTime = now - 7 * 86400 * 1000
    params.endTime = now
  } else if (timePreset === '30days') {
    params.startTime = now - 30 * 86400 * 1000
    params.endTime = now
  } else if (
    timePreset === 'custom' &&
    Array.isArray(reviewFilters.value.dateRange) &&
    reviewFilters.value.dateRange.length === 2
  ) {
    params.startTime = reviewFilters.value.dateRange[0]
    params.endTime = reviewFilters.value.dateRange[1]
  }

  return params
}

async function fetchBatch(mode: QuickReviewMode, page = 1) {
  loadingBatch.value = true
  try {
    const params = buildQueryPayload(mode, page)
    const res: any = await getMaterialList(params)
    const list = res?.list || []
    if (list.length > 0) {
      deck.reset()
      queue.value = mode === 'random' ? sortQueueItems(list, 'random') : list
      currentIndex.value = 0
      skippedQueue.value = []
      // 批次到达立即预热前 4 张
      const headSlice = queue.value.slice(0, 4).map((item: any) => deckKeyOf(item)).filter(Boolean)
      if (headSlice.length) deck.warmNow(headSlice)
      syncCurrentMaterial()
      const labels: Record<QuickReviewMode, string> = {
        recent: '最近图片',
        oldest: '最早图片',
        random: '随机图片'
      }
      const filterHint = activeFilterCount.value > 0 ? ` (已生效 ${activeFilterCount.value} 个筛选)` : ''
      ElMessage.success(`已切换至【${labels[mode]}】，加载了 ${list.length} 张素材${filterHint}`)
    } else {
      if (props.items && props.items.length > 0) {
        queue.value = sortQueueItems(props.items, mode)
        currentIndex.value = 0
        skippedQueue.value = []
        syncCurrentMaterial()
      } else {
        queue.value = []
        currentIndex.value = 0
        syncCurrentMaterial()
        if (activeFilterCount.value > 0) {
          ElMessage.warning('未找到符合当前筛选条件的素材，可点击「筛选」放宽条件')
        }
      }
    }
  } catch (err) {
    console.warn('[MaterialPublishQuickReview] 拉取批次失败:', err)
    if (props.items && props.items.length > 0) {
      queue.value = sortQueueItems(props.items, mode)
      currentIndex.value = 0
      skippedQueue.value = []
      syncCurrentMaterial()
    } else {
      queue.value = []
      currentIndex.value = 0
      syncCurrentMaterial()
      ElMessage.error('拉取审核素材失败，请点击重试加载')
    }
  } finally {
    loadingBatch.value = false
  }
}

function loadNextBatch() {
  if (activeMode.value === 'random') {
    batchPage.value = Math.floor(Math.random() * 20) + 1
  } else {
    batchPage.value += 1
  }
  fetchBatch(activeMode.value, batchPage.value)
}

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

// ==================== 预加载与大图解码配置 ====================
/** 空闲帧里最多预热后面几张大图（紧挨着的 3 张走立即通道） */
const PRELOAD_AHEAD = 9
/** 出图宽度上限：兼顾高清画质与解码性能，避免过大原图占满主线程 */
const DECK_MAX_WIDTH = 2000
/** 队列剩余多少张素材时在后台无感补货下一批 */
const PREFETCH_THRESHOLD = 15

/** 图片预解码调度器：负责「下一张随时可上屏」 */
const deck = useImageDeck({ maxCache: 40, warmTimeout: 6000 })

/**
 * 实际下载/上屏的图片地址按视口宽度离散量化出图，
 * 采用 1200 / 1600 / 2000 档位消除微小视口抖动，
 * 确保预热算出的 URL 与真正渲染的 URL 100% 相同，杜绝脱靶。
 */
function pickDeckWidth(): number {
  if (typeof window === 'undefined') return 1600
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const cssWidth = window.innerWidth || 1600
  const target = cssWidth * dpr * 0.75
  if (target <= 1300) return 1200
  if (target <= 1700) return 1600
  return 2000
}

const deckWidth = ref(pickDeckWidth())

/** 预热与渲染必须算出同一个地址，否则缓存无法命中 */
function deckKeyOf(item: any): string {
  if (!item?.url) return ''
  return getReviewImageUrl(item.url, deckWidth.value) || item.url
}

function handleResize(): void {
  const nextW = pickDeckWidth()
  if (nextW !== deckWidth.value) {
    deckWidth.value = nextW
    // 档位变化时，重新预热当前及后续图片
    warmAhead()
  }
}

/** 真正上屏的图片地址与就绪状态 */
const displayUrl = ref('')
const deckPending = ref(false)
let deckSeq = 0

/**
 * 视觉层无缝极速切换：
 * 0ms 瞬间把当前目标素材的图片赋给 displayUrl，绝不卡死在上一张旧图！
 * 若已后台预解码完毕，实现 0ms 丝滑瞬切；若尚未就绪，保留轻量 pending 态并异步加速解码。
 */
function syncDeck(): void {
  const sticker = current.value
  const target = deckKeyOf(sticker)
  const seq = ++deckSeq

  if (!target) {
    displayUrl.value = ''
    deckPending.value = false
    return
  }

  // 1. 0ms 瞬间直显目标素材地址，彻底根除快速连按时旧图锁死 400ms 的缺陷
  displayUrl.value = target

  // 2. 检查是否在后台已完成预解码
  if (deck.isReady(target)) {
    deckPending.value = false
    return
  }

  // 3. 尚未预解码完成时，开启轻量 pending 提示，并在后台加速解码
  deckPending.value = true
  void deck.ensure(target).then(() => {
    if (seq === deckSeq) {
      deckPending.value = false
    }
  })
}

/**
 * 多级大图超前预热管线：
 * 1) 紧挨着的后 3 张大图走立即通道（最高优先级）
 * 2) 紧挨着的前 1 张大图走立即通道（方便用户按 W / ← 回退秒开）
 * 3) 前方的第 4~12 张通过空闲帧管道逐步预解码
 */
function warmAhead(): void {
  const list = queue.value
  const idx = currentIndex.value
  if (!list.length) return

  // 1. 立即通道：当前正在看的图确保在缓存中
  const curUrl = deckKeyOf(list[idx])
  if (curUrl) deck.ensure(curUrl)

  // 2. 立即通道：紧随其后的 3 张大图抢占式预解码
  const nextSlice: string[] = []
  for (let i = 1; i <= 3; i++) {
    if (idx + i < list.length) {
      const u = deckKeyOf(list[idx + i])
      if (u) nextSlice.push(u)
    }
  }
  // 3. 立即通道：前 1 张大图（回退秒开）
  if (idx > 0) {
    const prevU = deckKeyOf(list[idx - 1])
    if (prevU) nextSlice.push(prevU)
  }
  if (nextSlice.length) {
    deck.warmNow(nextSlice)
  }

  // 4. 空闲通道：前方第 4~12 张（共 9 张）通过空闲帧慢慢解码
  const idleSlice = list.slice(idx + 4, idx + 4 + PRELOAD_AHEAD)
  if (idleSlice.length) {
    const idleUrls = idleSlice.map((item: any) => deckKeyOf(item)).filter(Boolean)
    if (idleUrls.length) {
      deck.warmIdle(idleUrls)
    }
  }
}

/** 提前预拉取后续 5 张素材的发布配置绑定记录，填充 30s 内存缓存 */
function preloadDataAhead(): void {
  const list = queue.value
  const idx = currentIndex.value
  if (!list.length) return

  const aheadSlice = list.slice(idx + 1, idx + 6)
  aheadSlice.forEach((item: any) => {
    const id = item?.id ? String(item.id) : ''
    if (id) {
      preloadMaterialBindings(id)
      evaluatePublishConfigsForSticker(item, false).catch(() => {})
    }
  })
}

let inflightPrefetch: Promise<void> | null = null

/** 当队列剩余小于阈值时，在后台静默获取下一页数据并追加到队列末尾 */
async function checkAndPrefetchQueue(): Promise<void> {
  if (props.hasUserSelection || loadingBatch.value || inflightPrefetch) return
  const remaining = queue.value.length - (currentIndex.value + 1)
  if (remaining > PREFETCH_THRESHOLD) return

  inflightPrefetch = (async () => {
    try {
      const nextPage = batchPage.value + 1
      const params = buildQueryPayload(activeMode.value, nextPage)

      const res: any = await getMaterialList(params)
      const list = Array.isArray(res?.list) ? res.list : []
      if (list.length > 0) {
        batchPage.value = nextPage
        const existingIds = new Set(queue.value.map((item: any) => String(item.id)))
        const fresh = list.filter((item: any) => !existingIds.has(String(item.id)))
        if (fresh.length > 0) {
          queue.value.push(...fresh)
          warmAhead()
          preloadDataAhead()
        }
      }
    } catch (err) {
      console.warn('[MaterialPublishQuickReview] 后台静默补货失败:', err)
    } finally {
      inflightPrefetch = null
    }
  })()

  return inflightPrefetch
}

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
      window.addEventListener('resize', handleResize)
    } else {
      window.removeEventListener('keydown', handleKeydown, true)
      window.removeEventListener('resize', handleResize)
    }
  },
  { immediate: true }
)

function initQueue() {
  deck.reset()
  preloadPublishConfigs()
  activeMode.value = props.initialMode || 'recent'
  initReviewFilters()
  batchPage.value = 1
  skippedQueue.value = []
  createdMaterialCount.value = 0
  createdTaskCount.value = 0
  skippedCount.value = 0

  const initialItems = Array.isArray(props.items) ? [...props.items] : []

  // 如果用户手动勾选了卡片且有数据，按选中的卡片进行审核
  if (props.hasUserSelection && initialItems.length > 0) {
    loadingBatch.value = false
    queue.value = sortQueueItems(initialItems, activeMode.value)
    currentIndex.value = Math.min(Math.max(props.startIndex || 0, 0), Math.max(queue.value.length - 1, 0))
    const startIdx = currentIndex.value
    const headSlice = queue.value.slice(startIdx, startIdx + 4).map((item: any) => deckKeyOf(item)).filter(Boolean)
    if (headSlice.length) deck.warmNow(headSlice)
    syncCurrentMaterial()
  } else {
    // 未勾选或全库审核模式：同步置 loadingBatch = true，清空 queue，确保不会短暂露底「全部审核完毕」
    loadingBatch.value = true
    queue.value = []
    currentIndex.value = 0
    fetchBatch(activeMode.value, 1)
  }
}

function syncCurrentMaterial() {
  const sticker = current.value
  if (!sticker) {
    displayUrl.value = ''
    deckPending.value = false
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

  // 1. 同步进行尺寸解析与全部配置排序初筛（0ms 纯同步内存计算）
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

  // 核心逻辑：默认只勾选「匹配且未被乐观记录发布」的配置
  const initialMatchedIds = allInitialConfigs
    .filter((item) => item.isMatched && !optimisticRecordKeys.value.has(`${sticker.id}:${item.id}`))
    .map((item) => item.id)
  selectedConfigIds.value = initialMatchedIds

  // 2. 调度图片高清上屏与无白屏平滑切换（0ms 即时生效）
  syncDeck()

  // 3. 多级高清预热管线（立即预热后 3 张 + 前 1 张，空闲预热后 4~12 张）
  warmAhead()

  // 4. 数据层预热（提前拉取后 5 张的发布记录）与无感静默补货
  preloadDataAhead()
  void checkAndPrefetchQueue()

  // 5. 异步获取已发布历史记录（若提前预热已在缓存中，则 0ms 瞬间解析）
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

/** 下一张：等同于忽略当前不处理，直接进入下一张素材 */
function actNext() {
  actSkip()
}

/** 忽略当前素材：当前不处理，记录忽略，直接进入下一张 */
function actSkip() {
  if (!current.value) return
  skippedCount.value++
  skippedQueue.value.push(current.value)
  currentIndex.value++

  // 若已到达当前队列末尾且为全库/分类模式，自动拉取下一批无感续航
  if (currentIndex.value >= queue.value.length && !props.hasUserSelection && !loadingBatch.value) {
    loadNextBatch()
  }
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

  // 若已到达当前队列末尾且为全库/分类模式，自动拉取下一批无感续航
  if (currentIndex.value >= queue.value.length && !props.hasUserSelection && !loadingBatch.value) {
    loadNextBatch()
  }

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

  // 1. 退出审核 (Esc)
  if (e.key === 'Escape' || e.code === 'Escape') {
    e.preventDefault()
    close()
    return
  }

  // 加载批次中不响应其他快捷键
  if (loadingBatch.value) return

  // 2. 一键创建选中的发布任务并看下一张：Enter / NumpadEnter
  if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter') {
    e.preventDefault()
    actCreateAndNext()
    return
  }

  // 3. 忽略 / 下一张（当前不处理，直接进入下一张素材）：
  // 覆盖：空格键(Space)、向右箭头(ArrowRight)、向右(D/d)、跳过/向下(S/s)、向下箭头(ArrowDown)、历史忽略键(A/a)
  if (
    e.code === 'Space' ||
    e.key === ' ' ||
    e.code === 'ArrowRight' ||
    e.key === 'ArrowRight' ||
    e.code === 'ArrowDown' ||
    e.key === 'ArrowDown' ||
    e.key === 'd' ||
    e.key === 'D' ||
    e.key === 's' ||
    e.key === 'S' ||
    e.key === 'a' ||
    e.key === 'A'
  ) {
    e.preventDefault()
    actSkip()
    return
  }

  // 4. 上一张（返回上一张素材）：
  // 覆盖：向左箭头(ArrowLeft)、向上箭头(ArrowUp)、向上(W/w)
  if (
    e.code === 'ArrowLeft' ||
    e.key === 'ArrowLeft' ||
    e.code === 'ArrowUp' ||
    e.key === 'ArrowUp' ||
    e.key === 'w' ||
    e.key === 'W'
  ) {
    e.preventDefault()
    actPrev()
    return
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown, true)
  window.removeEventListener('resize', handleResize)
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
  flex-direction: row;
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

  /* 主色淡底 / 描边 / 前景：半透明叠底，深色模式自动落到深紫底，不会整块发白 */
  --pqr-primary-tint: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  --pqr-primary-border: color-mix(in srgb, var(--el-color-primary) 28%, transparent);
  --pqr-primary-on-tint: var(--el-color-primary);
  /* 移除态前景：浅色压深、深色提亮，保证在淡红底上仍有足够对比 */
  --pqr-danger-on-tint: color-mix(in srgb, var(--el-color-danger) 62%, #000000);

  /* 黑夜模式变量覆盖 */
  &.is-dark {
    --pqr-checker-color-1: #18191b;
    --pqr-checker-color-2: #101012;
    /* 深色下主色 #6900ff 偏暗，前景提亮保证可读性 */
    --pqr-primary-on-tint: color-mix(in srgb, var(--el-color-primary) 50%, #ffffff);
    --pqr-danger-on-tint: color-mix(in srgb, var(--el-color-danger) 45%, #ffffff);
  }
}

/* 全局 html.dark / body.dark 兜底覆盖 */
:global(html.dark) .pqr,
:global(html[class*="dark"]) .pqr,
:global(body.dark) .pqr {
  --pqr-checker-color-1: #18191b;
  --pqr-checker-color-2: #101012;
}

@media (prefers-color-scheme: dark) {
  :global(html:not(.light)) .pqr {
    --pqr-checker-color-1: #18191b;
    --pqr-checker-color-2: #101012;
  }
}

/* ================= 左侧大图展示与沉浸舞台 ================= */
.pqr__stage-wrap {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  min-width: 0;
  overflow: hidden;
  background-image: repeating-conic-gradient(
      var(--pqr-checker-color-1, #edf1f7) 0% 25%,
      var(--pqr-checker-color-2, #ffffff) 0% 50%
    );
  background-size: 20px 20px;
  background-position: 50% 50%;
  transition: background-image 0.2s ease;
}

/* 极简悬浮顶条：无实底边框，浮动毛玻璃轻量控件 */
.pqr__floating-bar {
  position: absolute;
  top: 14px;
  left: 18px;
  right: 18px;
  z-index: 2005;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
}

.pqr__floating-left,
.pqr__floating-right {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.pqr__floating-progress {
  font-size: 13px;
  font-weight: 700;
  color: var(--pqr-primary-on-tint);
  font-variant-numeric: tabular-nums;
}

.pqr__floating-badge {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.pqr__mode-segmented {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.pqr__mode-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.14s ease;
  white-space: nowrap;
  user-select: none;

  &:hover {
    color: var(--el-text-color-primary);
  }

  &.is-active {
    color: var(--pqr-primary-on-tint);
    font-weight: 600;
  }
}

.pqr__refresh-batch-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.14s ease;

  &:hover:not(:disabled) {
    color: var(--pqr-primary-on-tint);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

/* ================= 筛选触发按钮与计数 ================= */
.pqr__filter-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.14s ease;
  user-select: none;

  &:hover,
  &.is-open {
    color: var(--el-text-color-primary);
  }

  &.has-active {
    color: var(--pqr-primary-on-tint);
    font-weight: 600;
  }
}

.pqr__filter-count-badge {
  font-size: 11px;
  font-weight: 700;
  color: var(--pqr-primary-on-tint);
}

/* ================= 活跃过滤标签快速指示条 ================= */
.pqr__active-tags {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.pqr__active-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11.5px;
  background: transparent;
  color: var(--pqr-primary-on-tint);
  border: none;
  padding: 0;
  cursor: pointer;
  transition: color 0.14s ease;
  white-space: nowrap;

  &:hover {
    color: var(--pqr-danger-on-tint);
  }
}

.pqr__active-tag-close {
  font-size: 10px;
}

.pqr__clear-all-link {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0 2px;
  white-space: nowrap;

  &:hover {
    color: var(--el-color-danger);
    text-decoration: underline;
  }
}

/* ================= 筛选面板样式 ================= */
.pqr-filter-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  color: var(--el-text-color-primary);
}

.pqr-filter-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding-bottom: 10px;
}

.pqr-filter-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pqr-filter-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.pqr-filter-subtitle {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.pqr-filter-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pqr-filter-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.pqr-filter-val-hint {
  font-size: 11px;
  font-weight: normal;
  color: var(--el-color-primary);
}

.pqr-filter-clear-inherited {
  margin-left: auto;
  padding: 0;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background: none;
  border: none;
  cursor: pointer;

  &:hover {
    color: var(--el-color-primary);
  }
}

.pqr-filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pqr-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  transition: all 0.14s ease;
  user-select: none;
  white-space: nowrap;

  &:hover {
    color: var(--pqr-primary-on-tint);
    border-color: var(--pqr-primary-border);
    background: var(--pqr-primary-tint);
  }

  &.is-active {
    color: var(--pqr-primary-on-tint);
    background: var(--pqr-primary-tint);
    border-color: var(--el-color-primary);
    font-weight: 600;
  }
}

.pqr-chip-sub {
  font-size: 10px;
  opacity: 0.65;
  margin-left: 1px;
}

.pqr-chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;

  &--cutout {
    background: #10b981;
  }

  &--bg {
    background: #3b82f6;
  }
}

.pqr-filter-custom-time {
  margin-top: 4px;
}

.pqr-filter-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 12px;
  margin-top: 2px;
}

.pqr-filter-tips {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.pqr-filter-btns {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pqr__stats {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 0 4px;
}

.pqr__stat-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.pqr__stat-dot {
  width: 6px;
  height: 6px;
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
  height: 14px;
  background: var(--el-border-color-lighter);
}

.pqr__text-btn {
  background: none;
  border: none;
  font-size: 12px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 4px;
  transition: all 0.15s ease;

  &:hover {
    color: var(--el-color-primary);
    background: var(--el-fill-color-light);
  }
}

.pqr__floating-close {
  background: none;
  border: none;
  color: var(--el-text-color-secondary);
  font-size: 16px;
  padding: 4px;
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

.pqr__stage-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: min(calc(100% - 90px), 1100px);
  max-height: 100%;
  gap: 12px;
  padding: 56px 20px 65px;
}

.pqr__stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-in;
}

.pqr__image {
  max-width: min(calc(100vw - 390px - 80px), 1100px);
  max-height: calc(100vh - 160px);
  object-fit: contain;
  border: none;
  background: transparent;
  transition: opacity 0.12s ease;

  &.is-pending {
    opacity: 0.88;
  }
}

.pqr__deck-loading-dot {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--pqr-primary-on-tint);
  animation: pqrDeckPulse 0.9s infinite alternate;
  pointer-events: none;
  z-index: 10;
}

@keyframes pqrDeckPulse {
  from {
    opacity: 0.25;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1.15);
  }
}

/* 图片下方：纯文字信息行 */
.pqr__image-info-bar {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 0;
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
  padding: 0;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  font-weight: 500;

  &--highlight {
    color: var(--pqr-primary-on-tint);
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

/* 翻页按钮：固定在舞台左右两侧安全距离 */
.pqr__nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--el-text-color-regular);
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 15;
  transition: color 0.15s ease;

  &:hover {
    color: var(--pqr-primary-on-tint);
  }

  &--prev {
    left: 20px;
  }

  &--next {
    right: 20px;
  }
}

.pqr__side-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  color: var(--el-text-color-secondary);
}

.pqr__empty {
  text-align: center;
  max-width: 420px;
  padding: 24px;
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

/* ================= 右侧面板（纯粹负责配置） ================= */
.pqr__side {
  width: 390px;
  flex-shrink: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  background: var(--app-content-surface-color, var(--el-bg-color));
  border-left: 1px solid var(--app-content-border-color, var(--el-border-color-lighter));
  padding: 14px 14px 0;
  gap: 10px;
}

.pqr__side-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 2px;
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
  color: var(--el-text-color-secondary);

  &--success {
    color: var(--el-color-success);
  }
}

.pqr__side-close {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--el-text-color-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 15px;
  position: relative;
  z-index: 2005;
  transition: color 0.15s ease;

  &:hover {
    color: var(--el-color-danger, #f56c6c);
  }
}

.pqr__side-subbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 2px 4px;
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

.pqr__side-sub-count {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.pqr__config-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0 -8px;
  padding: 0 8px;
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

/* ---------- 配置行：无边框，仅靠底色区分状态 ---------- */
.pqr__config-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.12s ease;
  user-select: none;

  &:hover {
    background: var(--el-fill-color-light);
  }

  /* ---------- 选中：淡色底 + 主色名称 + 实心勾 ---------- */
  &.is-selected {
    background: color-mix(in srgb, var(--el-color-primary) 8%, transparent);

    .pqr__check {
      background: var(--el-color-primary);
      border-color: var(--el-color-primary);
      color: #fff;
    }

    .pqr__config-name {
      color: var(--pqr-primary-on-tint);
      font-weight: 600;
    }
  }

  /* ---------- 已发布：不可选，弱化 + 绿勾 ---------- */
  &.is-published {
    cursor: default;
    background: transparent;

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
      background: transparent;
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

/* ⚡ 简洁清晰的比例显示：告别臃肿 tag，采用纯净专属彩色文字 */
.pqr__ratio-text {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 0;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.25px;
  line-height: 1.3;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  background: transparent;
  border: none;
  transition: all 0.12s ease;

  /* 竖版：紫罗兰色 (Violet) */
  &--portrait {
    color: #7c3aed;
  }
  /* 横版：青碧色 (Teal) */
  &--landscape {
    color: #0d9488;
  }
  /* 正方：天蓝色 (Sky Blue) */
  &--square {
    color: #0284c7;
  }
  /* 通用：暖琥珀金 (Amber) */
  &--generic {
    color: #d97706;
  }

  &--mismatch {
    opacity: 0.55;
  }
}

:global(html.dark) .pqr__ratio-text--portrait,
:global(html[class*="dark"]) .pqr__ratio-text--portrait {
  color: #c4b5fd;
}

:global(html.dark) .pqr__ratio-text--landscape,
:global(html[class*="dark"]) .pqr__ratio-text--landscape {
  color: #5eead4;
}

:global(html.dark) .pqr__ratio-text--square,
:global(html[class*="dark"]) .pqr__ratio-text--square {
  color: #7dd3fc;
}

:global(html.dark) .pqr__ratio-text--generic,
:global(html[class*="dark"]) .pqr__ratio-text--generic {
  color: #fcd34d;
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
  padding: 10px 0 14px;
}

.pqr__submit {
  width: 100%;
  height: 40px;
  font-size: 14px;
}

.pqr__kbd-hint {
  margin-left: 6px;
  font-size: 11px;
  font-family: inherit;
  color: rgba(255, 255, 255, 0.72);
}

/* ================= 底部极简浮动 Dock ================= */
.pqr__dock {
  position: absolute;
  bottom: 16px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
}

.pqr__dock-capsule {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
}

.pqr__dock-btn {
  background: none;
  border: none;
  height: 32px;
  padding: 0 8px;
  border-radius: 4px;
  color: var(--el-text-color-regular);
  font-size: 13px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: color 0.12s ease, background-color 0.12s ease;

  &:hover:not(:disabled) {
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
  padding: 0;
  background: transparent;
  color: var(--el-text-color-regular);
  border: none;

  &--primary {
    color: rgba(255, 255, 255, 0.78);
  }
}

.pqr__dock-sep {
  width: 1px;
  height: 16px;
  background: var(--el-border-color-lighter);
  margin: 0 2px;
}
</style>
