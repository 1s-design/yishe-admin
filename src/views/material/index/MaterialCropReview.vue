<template>
  <teleport to="body">
    <div v-if="visible" class="mcr" :class="{ 'is-dark': isDark }">
      <!-- 顶栏 -->
      <header class="mcr__topbar">
        <div class="mcr__top-left">
          <span class="mcr__title">
            <el-icon class="mr-1"><Crop /></el-icon>
            图片裁剪审核
          </span>
          <span v-if="queue.length" class="mcr__progress">
            {{ currentIndex + 1 }} / {{ queue.length }}
          </span>
          <span class="mcr__tip">选择满意的裁剪方案，确认后交由客户端裁切入库</span>
        </div>
        <div class="mcr__top-right">
          <el-button size="small" @click="openConfigDrawer">
            <el-icon class="mr-1"><Setting /></el-icon>
            裁剪配置
          </el-button>
          <el-button size="small" @click="openTaskDrawer">
            <el-icon class="mr-1"><List /></el-icon>
            任务进度
          </el-button>
          <el-button size="small" circle title="关闭 (Esc)" @click="close">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
      </header>

      <!-- 主体：左原图 + 右裁剪预览 -->
      <main class="mcr__body" v-loading="loading">
        <template v-if="current">
          <section class="mcr__source">
            <div class="mcr__section-label">原图 · {{ current.name || current.id }}</div>
            <div class="mcr__source-stage">
              <img
                :src="sourceUrl"
                class="mcr__source-img"
                @error="onImageError"
              />
            </div>
            <div class="mcr__source-meta">
              <span>{{ current.width || '?' }} × {{ current.height || '?' }}</span>
              <span v-if="current.aspectRatio">比例 {{ Number(current.aspectRatio).toFixed(3) }}</span>
            </div>
            <div class="mcr__nav">
              <el-button size="small" :disabled="currentIndex <= 0" @click="prev">
                <el-icon><ArrowLeft /></el-icon> 上一张
              </el-button>
              <el-button
                size="small"
                type="primary"
                plain
                :disabled="currentIndex >= queue.length - 1"
                @click="skip"
              >
                下一张 <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </section>

          <section class="mcr__plans">
            <div class="mcr__section-label">
              裁剪预览 · 已选 {{ selectedKeys.size }} / {{ enabledPlans.length }} 个方案
            </div>
            <div v-if="!enabledPlans.length" class="mcr__empty-plans">
              {{ plans.length ? '所有裁剪方案都已停用，请在「裁剪配置」中启用' : '还没有裁剪方案，点击右上角「裁剪配置」添加宽高比' }}
            </div>
            <div class="mcr__plan-grid">
              <div
                v-for="plan in enabledPlans"
                :key="plan.key"
                class="mcr__plan-card"
                :class="{ 'is-selected': selectedKeys.has(plan.key) }"
                @click="togglePlan(plan.key)"
              >
                <div class="mcr__plan-check">
                  <el-icon v-if="selectedKeys.has(plan.key)"><Check /></el-icon>
                </div>
                <div class="mcr__plan-preview-wrap">
                  <!-- 按目标比例精确算出预览框像素尺寸，图片 object-fit:cover 居中；
                       与客户端 sharp cover 裁剪逻辑一致，所见即所得 -->
                  <div
                    class="mcr__plan-preview"
                    :style="previewBoxStyle(plan.aspectRatio)"
                  >
                    <img :src="sourceUrl" class="mcr__plan-preview-img" />
                  </div>
                </div>
                <div class="mcr__plan-label">{{ plan.label || ratioLabel(plan.aspectRatio) }}</div>
                <div class="mcr__plan-dim">比例 {{ ratioLabel(plan.aspectRatio) }}</div>
              </div>
            </div>
            <div class="mcr__confirm-bar">
              <el-button
                type="primary"
                :disabled="!selectedKeys.size"
                :loading="submitting"
                @click="confirmCrop"
              >
                <el-icon class="mr-1"><Check /></el-icon>
                确认裁剪所选方案
              </el-button>
              <span class="mcr__confirm-hint">
                确认后生成裁剪任务，由在线客户端执行裁切与上传
              </span>
            </div>
          </section>
        </template>
        <div v-else class="mcr__empty">没有可审核的图片</div>
      </main>

      <!-- 快捷键说明 -->
      <footer class="mcr__footer">
        <span><kbd>←</kbd> 上一张</span>
        <span><kbd>→</kbd> / <kbd>空格</kbd> 下一张</span>
        <span><kbd>Enter</kbd> 确认裁剪</span>
        <span><kbd>1-9</kbd> 快速选择方案</span>
        <span><kbd>Esc</kbd> 关闭</span>
      </footer>

      <!-- 裁剪配置抽屉 -->
      <el-drawer
        v-model="configDrawerVisible"
        title="裁剪方案配置"
        size="560px"
        class="mcr-drawer"
        :append-to-body="true"
      >
        <div class="cfg">
          <div class="cfg__intro">
            配几个常用比例，审核时逐张勾选；配置存到账号，跨设备生效。
          </div>

          <!-- ① 预设一键添加：统一大小的紧凑标签 -->
          <div class="cfg__label">常用比例</div>
          <div class="cfg__presets">
            <el-button
              v-for="preset in presets"
              :key="preset.label"
              size="small"
              class="cfg__chip"
              :title="`添加 ${preset.label} ${preset.name}`"
              @click="addPreset(preset)"
            >
              <el-icon><Plus /></el-icon>{{ preset.label }}
              <span class="cfg__chip-name">{{ preset.name }}</span>
            </el-button>
          </div>

          <!-- ② 自定义宽高比 -->
          <div class="cfg__label">自定义宽高比</div>
          <div class="cfg__custom-row">
            <el-input-number v-model="customRW" :min="1" :max="999" :controls="false" class="cfg__custom-num" />
            <span class="cfg__custom-colon">:</span>
            <el-input-number v-model="customRH" :min="1" :max="999" :controls="false" class="cfg__custom-num" />
            <el-button type="primary" plain size="small" class="cfg__custom-add" @click="addCustomRatio">
              <el-icon class="mr-1"><Plus /></el-icon>添加方案
            </el-button>
          </div>
          <div class="cfg__hint">支持任意比例，如 3:4、5:7、2.35:1</div>

          <!-- ③ 已配置方案：表格化，列严格对齐 -->
          <div class="cfg__label cfg__label--split">
            <span>已配置方案</span>
            <span class="cfg__count">{{ plans.length }} 个 · 启用 {{ enabledPlans.length }} 个</span>
          </div>
          <div v-if="!plans.length" class="cfg__empty">还没有方案，点上方预设或自定义添加</div>

          <div class="cfg__table" v-else>
            <div class="cfg__thead">
              <span>#</span>
              <span>名称</span>
              <span>宽高比</span>
              <span>状态</span>
              <span></span>
            </div>
            <div
              v-for="(plan, idx) in plans"
              :key="plan.key"
              class="cfg__trow"
              :class="{ 'is-error': ratioErrors[plan.key], 'is-off': !isPlanEnabled(plan) }"
            >
              <span class="cfg__cell-index">{{ idx + 1 }}</span>
              <span class="cfg__cell">
                <el-input v-model="plan.label" size="small" placeholder="名称" />
              </span>
              <span class="cfg__cell">
                <el-input
                  v-model="ratioDrafts[plan.key]"
                  size="small"
                  placeholder="16:9"
                  :class="{ 'is-error': ratioErrors[plan.key] }"
                  @blur="commitDraft(plan)"
                  @keyup.enter="commitDraft(plan)"
                />
              </span>
              <span class="cfg__cell cfg__cell-status">
                <el-switch
                  :model-value="isPlanEnabled(plan)"
                  size="small"
                  inline-prompt
                  active-text="启"
                  inactive-text="停"
                  @change="(val: any) => setPlanEnabled(plan, val)"
                />
              </span>
              <span class="cfg__cell cfg__cell-op">
                <el-button size="small" circle text title="删除" @click="removePlan(idx)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </span>
            </div>
          </div>
          <div class="cfg__note">宽高比支持 16:9、9:16、1.5 等，失焦生效；裁剪按原图等比裁切，成品保持原图分辨率。停用的方案不参与审核。</div>

          <div class="cfg__footer">
            <el-button @click="configDrawerVisible = false">取消</el-button>
            <el-button type="primary" :loading="savingConfig" @click="saveConfig">保存配置</el-button>
          </div>
        </div>
      </el-drawer>

      <!-- 任务进度抽屉 -->
      <el-drawer
        v-model="taskDrawerVisible"
        title="裁剪任务进度"
        size="560px"
        class="mcr-drawer"
        :append-to-body="true"
      >
        <div class="mcr__task-toolbar">
          <el-button size="small" @click="refreshTasks" :loading="taskLoading">
            <el-icon class="mr-1"><Refresh /></el-icon>刷新
          </el-button>
          <span class="mcr__task-summary" v-if="taskStats">
            共 {{ taskStats.total }} 条 · 完成 {{ taskStats.completed }} · 处理中
            {{ taskStats.processing }} · 失败 {{ taskStats.failed }}
          </span>
        </div>
        <el-table :data="taskList" size="small" v-loading="taskLoading" max-height="70vh">
          <el-table-column label="原图" min-width="140">
            <template #default="{ row }">
              <span class="mcr__task-name">{{ row.originalName || row.originalId }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small">
                {{ statusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="进度" width="110">
            <template #default="{ row }">
              <el-progress
                v-if="row.progress?.total"
                :percentage="Math.round((row.progress.done / row.progress.total) * 100)"
                :stroke-width="6"
              />
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="关联" width="80">
            <template #default="{ row }">
              <el-tag v-if="row.relateStatus === 'ok'" type="success" size="small">已关联</el-tag>
              <el-tooltip v-else-if="row.relateStatus === 'error'" :content="row.relateError || '关联失败'" placement="top">
                <el-tag type="danger" size="small">失败</el-tag>
              </el-tooltip>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="时间" width="150">
            <template #default="{ row }">
              {{ formatTime(row.updatedAt) }}
            </template>
          </el-table-column>
        </el-table>
      </el-drawer>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Close,
  Crop,
  Delete,
  List,
  Plus,
  Refresh,
  Setting,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getReviewImageUrl } from '@/utils/image'
import { useAppStore } from '@/store/modules/app'
import {
  COMMON_ASPECT_RATIOS,
  parseAspectRatioInput,
  calculateAspectRatioRange,
} from './sizeShapeConfig'
import { convertFolderIdToApiParam } from '@/constants/folder'
import {
  createCropTasks,
  getCropReviewConfig,
  getCropTaskList,
  getMaterialList,
  updateCropReviewConfig,
  type CropConfigPlan,
} from '@/api/material'

defineOptions({ name: 'MaterialCropReview' })

const appStore = useAppStore()
const isDark = computed(() => appStore.getIsDark)

const props = withDefaults(
  defineProps<{
    visible: boolean
    items?: any[]
    /** 是否继承列表页筛选条件并按条件从服务端分页拉全量 */
    inheritFilters?: boolean
    initialFilters?: Record<string, any>
    hasUserSelection?: boolean
    folderId?: any
  }>(),
  {
    items: () => [],
    inheritFilters: false,
    initialFilters: () => ({}),
    hasUserSelection: false,
    folderId: undefined,
  }
)

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'submitted'): void
}>()

const queue = ref<any[]>([])
const currentIndex = ref(0)
const current = computed(() => queue.value[currentIndex.value] || null)
const sourceUrl = computed(() => {
  const url = current.value?.url || ''
  return url ? getReviewImageUrl(url, 1600) : ''
})

const loading = ref(false)
const submitting = ref(false)

// ==================== 继承列表筛选：按条件从服务端分页拉全量 ====================
const CROP_PAGE_SIZE = 50
const cropFilters = ref<Record<string, any>>({})
const hasMore = ref(false)
const batchPage = ref(1)

/** 由列表页透传的筛选条件构造 /sticker/page 查询参数 */
function buildCropQueryPayload(page: number) {
  const params: any = {
    currentPage: page,
    pageSize: CROP_PAGE_SIZE,
    listMode: 'compact',
    includeRelations: false,
    sortOrder: 'DESC',
  }
  const folderFilter = convertFolderIdToApiParam(props.folderId)
  if (folderFilter !== undefined && folderFilter !== null) {
    params.folderId = folderFilter
  }
  const init = cropFilters.value || {}
  if (init.isCutout !== undefined && init.isCutout !== null && init.isCutout !== '') {
    params.isCutout = init.isCutout
  }
  const suffix = Array.isArray(init.suffix) ? init.suffix.filter(Boolean) : init.suffix ? [init.suffix] : []
  if (suffix.length) params.suffix = suffix
  const sizeShape = Array.isArray(init.sizeShape) ? init.sizeShape.filter(Boolean) : init.sizeShape ? [init.sizeShape] : []
  if (sizeShape.length) params.sizeShape = sizeShape
  const target = Number(init.targetAspectRatio)
  if (Number.isFinite(target) && target > 0) {
    const tolerance = Number(init.aspectRatioTolerance) > 0 ? Number(init.aspectRatioTolerance) : 5
    const range = calculateAspectRatioRange(target, tolerance)
    params.targetAspectRatio = target
    params.aspectRatioTolerance = tolerance / 100
    params.minAspectRatio = range.min
    params.maxAspectRatio = range.max
  }
  if (init.startTime) params.startTime = init.startTime
  if (init.endTime) params.endTime = init.endTime
  return params
}

/** 按筛选拉取一页；append=true 追加到队尾，否则重置队列 */
async function fetchCropBatch(page = 1, append = false) {
  loading.value = true
  try {
    const res: any = await getMaterialList(buildCropQueryPayload(page))
    const list: any[] = res?.list || []
    if (!append) {
      queue.value = list
      currentIndex.value = 0
    } else {
      queue.value.push(...list)
    }
    hasMore.value = list.length >= CROP_PAGE_SIZE
    batchPage.value = page
    if (!append) {
      const hint = activeFilterCount.value ? `（已同步 ${activeFilterCount.value} 个筛选）` : ''
      if (list.length) ElMessage.success(`按列表筛选加载了 ${list.length} 张素材${hint}`)
      else ElMessage.warning('未找到符合当前筛选条件的素材')
    }
  } catch (e: any) {
    console.warn('[MaterialCropReview] 按筛选拉取失败:', e)
    ElMessage.error(e?.message || '按筛选加载素材失败')
    if (!append) queue.value = []
  } finally {
    loading.value = false
  }
}

/** 队列到底时自动续拉下一页 */
function ensureMore(): boolean {
  if (props.inheritFilters && hasMore.value && !loading.value) {
    void fetchCropBatch(batchPage.value + 1, true)
    return true
  }
  return false
}

const activeFilterCount = computed(() => {
  const init = cropFilters.value || {}
  let n = 0
  if (init.isCutout !== undefined && init.isCutout !== null && init.isCutout !== '') n++
  if (Array.isArray(init.suffix) && init.suffix.length) n++
  if (Array.isArray(init.sizeShape) && init.sizeShape.length) n++
  if (Number(init.targetAspectRatio) > 0) n++
  if (init.startTime || init.endTime) n++
  return n
})

// 裁剪方案
const plans = ref<CropConfigPlan[]>([])
const selectedKeys = ref<Set<string>>(new Set())
const presets = COMMON_ASPECT_RATIOS

/** 启用的方案才参与审核 */
function isPlanEnabled(plan: CropConfigPlan): boolean {
  return plan.enabled !== false
}

const enabledPlans = computed(() => plans.value.filter(isPlanEnabled))

// 比例输入框的草稿文本：与 plan.aspectRatio 解耦，允许自由输入中间态（如 "16:"），
// 失焦/回车时才解析提交，避免受控回写把用户的输入打断
const ratioDrafts = reactive<Record<string, string>>({})
const ratioErrors = reactive<Record<string, boolean>>({})
// 自定义比例输入
const customRW = ref(16)
const customRH = ref(9)

// 抽屉
const configDrawerVisible = ref(false)
const savingConfig = ref(false)
const taskDrawerVisible = ref(false)
const taskLoading = ref(false)
const taskList = ref<any[]>([])
const taskStats = ref<{ total: number; completed: number; processing: number; failed: number } | null>(null)

// 选中态用普通对象驱动响应式（Set 需触发视图更新）
function togglePlan(key: string) {
  const plan = plans.value.find((p) => p.key === key)
  if (!plan || !isPlanEnabled(plan)) return
  const next = new Set(selectedKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  selectedKeys.value = next
}

/** 启停方案：停用后立即退出审核选择集 */
function setPlanEnabled(plan: CropConfigPlan, value: any) {
  plan.enabled = value !== false
  if (!plan.enabled) {
    const next = new Set(selectedKeys.value)
    next.delete(plan.key)
    selectedKeys.value = next
  }
}

/** 预览舞台最大可用尺寸（与 .mcr__plan-preview-wrap 的 150px 高、卡片宽度匹配） */
const PREVIEW_STAGE_W = 160;
const PREVIEW_STAGE_H = 138;

/** 按宽高比在给定舞台内算出预览框的实际像素尺寸，严格保持比例，所见即所得。
 *  不传 stage 则用主预览区尺寸；传小尺寸用于配置抽屉里的比例示意。 */
function previewBoxStyle(ratio: number, stageW = PREVIEW_STAGE_W, stageH = PREVIEW_STAGE_H): Record<string, string> {
  const r = Number(ratio) > 0 ? Number(ratio) : 1;
  let w = stageW;
  let h = w / r;
  if (h > stageH) {
    h = stageH;
    w = h * r;
  }
  return {
    width: `${Math.round(w)}px`,
    height: `${Math.round(h)}px`,
  };
}

function ratioLabel(ratio: number): string {
  const presetsFound = COMMON_ASPECT_RATIOS.find((p) => Math.abs(p.value - ratio) < 0.002)
  return presetsFound ? presetsFound.label : `${Number(ratio).toFixed(2)}:1`
}

function ratioToText(ratio: number): string {
  const presetsFound = COMMON_ASPECT_RATIOS.find((p) => Math.abs(p.value - ratio) < 0.002)
  return presetsFound ? presetsFound.label : String(Number(ratio).toFixed(4))
}

/** 初始化草稿：从已确定的比例生成一份可编辑文本 */
function initDraft(plan: CropConfigPlan) {
  ratioDrafts[plan.key] = ratioToText(plan.aspectRatio)
  ratioErrors[plan.key] = false
}

/** 提交草稿：解析成功则写入 aspectRatio；失败则标红保留原文，不覆盖 */
function commitDraft(plan: CropConfigPlan) {
  const text = (ratioDrafts[plan.key] || '').trim()
  const parsed = parseAspectRatioInput(text)
  if (parsed && parsed > 0) {
    plan.aspectRatio = parsed
    ratioErrors[plan.key] = false
    ratioDrafts[plan.key] = ratioToText(parsed)
    // 名称为空时按新比例自动补一个
    if (!plan.label) plan.label = ratioLabel(parsed)
  } else {
    ratioErrors[plan.key] = true
  }
}

function addPlan(label: string, ratio: number, width?: number, height?: number) {
  const key = `plan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const plan: CropConfigPlan = { key, label, aspectRatio: ratio, width, height, enabled: true }
  plans.value.push(plan)
  initDraft(plan)
  // 新增默认选中
  const next = new Set(selectedKeys.value)
  next.add(key)
  selectedKeys.value = next
}

function addPreset(preset: { label: string; name: string; value: number }) {
  addPlan(`${preset.label} ${preset.name}`, preset.value)
}

/** 自定义宽高比：把 宽:高 两个数换算成比例（可约分展示，但按比例值存储） */
function addCustomRatio() {
  const w = Number(customRW.value)
  const h = Number(customRH.value)
  if (!(w > 0) || !(h > 0)) {
    ElMessage.warning('宽和高都必须是大于 0 的数字')
    return
  }
  addPlan(`${w}:${h}`, Number((w / h).toFixed(4)))
  ElMessage.success(`已添加 ${w}:${h} 方案`)
}

function removePlan(idx: number) {
  const removed = plans.value[idx]
  plans.value.splice(idx, 1)
  if (removed) {
    delete ratioDrafts[removed.key]
    delete ratioErrors[removed.key]
    const next = new Set(selectedKeys.value)
    next.delete(removed.key)
    selectedKeys.value = next
  }
}

async function loadConfig() {
  try {
    const res: any = await getCropReviewConfig()
    const data = res?.data || res || {}
    const plansRaw = data?.plans || []
    if (Array.isArray(plansRaw) && plansRaw.length) {
      plans.value = plansRaw
        .filter((p: any) => p && Number(p.aspectRatio) > 0)
        .map((p: any) => ({
          key: String(p.key || `plan_${Math.random().toString(36).slice(2, 8)}`),
          label: p.label || '',
          aspectRatio: Number(p.aspectRatio),
          enabled: p.enabled !== false,
        }))
      plans.value.forEach(initDraft)
      // 默认全选启用的方案
      selectedKeys.value = new Set(enabledPlans.value.map((p) => p.key))
    }
  } catch {
    // 首次使用无配置，忽略
  }
}

async function saveConfig() {
  // 保存前先把所有正在编辑的草稿提交，避免失焦事件未触发导致漏存
  plans.value.forEach(commitDraft)
  const invalid = plans.value.some((p) => ratioErrors[p.key])
  if (invalid) {
    ElMessage.warning('有比例格式不正确，请修正标红的输入项')
    return
  }
  if (!plans.value.length) {
    ElMessage.warning('请至少添加一个裁剪方案')
    return
  }
  savingConfig.value = true
  try {
    const cleaned = plans.value
      .filter((p) => Number(p.aspectRatio) > 0)
      .map((p) => ({
        key: p.key,
        label: p.label || ratioLabel(p.aspectRatio),
        aspectRatio: Number(p.aspectRatio),
        enabled: isPlanEnabled(p),
      }))
    await updateCropReviewConfig({ plans: cleaned })
    plans.value = cleaned
    // 确保预览选中态覆盖所有启用的方案（保存时可能新增过）
    selectedKeys.value = new Set(enabledPlans.value.map((p) => p.key))
    ElMessage.success('裁剪配置已保存')
    configDrawerVisible.value = false
  } catch (e: any) {
    ElMessage.error(e?.message || '保存配置失败')
  } finally {
    savingConfig.value = false
  }
}

function openConfigDrawer() {
  configDrawerVisible.value = true
}

async function openTaskDrawer() {
  taskDrawerVisible.value = true
  await refreshTasks()
}

async function refreshTasks() {
  taskLoading.value = true
  try {
    const res: any = await getCropTaskList({ pageNo: 1, pageSize: 100 })
    const data = res?.data || res || {}
    taskList.value = data.list || []
    const list = taskList.value
    taskStats.value = {
      total: data.total ?? list.length,
      completed: list.filter((t: any) => t.status === 'completed').length,
      processing: list.filter((t: any) => t.status === 'processing' || t.status === 'pending').length,
      failed: list.filter((t: any) => t.status === 'failed').length,
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '加载任务进度失败')
  } finally {
    taskLoading.value = false
  }
}

function statusTagType(status: string): 'success' | 'danger' | 'warning' | 'info' {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'processing') return 'warning'
  return 'info'
}

function statusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待领取',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
  }
  return map[status] || status
}

function formatTime(val: string): string {
  if (!val) return '-'
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function onImageError(e: Event) {
  const img = e.target as HTMLImageElement
  if (img && current.value?.url && img.src !== current.value.url) {
    img.src = current.value.url
  }
}

function prev() {
  if (currentIndex.value > 0) currentIndex.value -= 1
}

function skip() {
  if (currentIndex.value < queue.value.length - 1) {
    currentIndex.value += 1
    // 接近队尾时后台续拉下一页，做到边审边取、不间断
    if (props.inheritFilters && currentIndex.value >= queue.value.length - 5) ensureMore()
  } else if (ensureMore()) {
    // 续拉已发起，等数据到位后用户再前进
    ElMessage.info('正在加载更多素材…')
  } else {
    ElMessage.info('已经是最后一张')
  }
}

async function confirmCrop() {
  if (!current.value || !selectedKeys.value.size) {
    ElMessage.warning('请先选择裁剪方案')
    return
  }
  const selectedPlans = enabledPlans.value.filter((p) => selectedKeys.value.has(p.key))
  if (!selectedPlans.length) return
  submitting.value = true
  try {
    await createCropTasks({
      items: [
        {
          originalId: String(current.value.id),
          originalUrl: current.value.url,
          originalName: current.value.name || '',
          configs: selectedPlans,
        },
      ],
    })
    ElMessage.success(`已创建 ${selectedPlans.length} 个裁剪任务`)
    emit('submitted')
    // 自动跳到下一张
    skip()
  } catch (e: any) {
    ElMessage.error(e?.message || '创建裁剪任务失败')
  } finally {
    submitting.value = false
  }
}

function close() {
  emit('update:visible', false)
}

function handleKeydown(e: KeyboardEvent) {
  if (!props.visible) return
  const target = e.target as HTMLElement
  if (target && /INPUT|TEXTAREA/.test(target.tagName)) return
  if (configDrawerVisible.value || taskDrawerVisible.value) {
    if (e.key === 'Escape') {
      configDrawerVisible.value = false
      taskDrawerVisible.value = false
    }
    return
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    prev()
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
    e.preventDefault()
    skip()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    void confirmCrop()
  } else if (/^[1-9]$/.test(e.key)) {
    const idx = Number(e.key) - 1
    const plan = enabledPlans.value[idx]
    if (plan) {
      e.preventDefault()
      togglePlan(plan.key)
    }
  }
}

watch(
  () => props.visible,
  async (visible) => {
    if (visible) {
      selectedKeys.value = new Set(enabledPlans.value.map((p) => p.key))
      await loadConfig()
      if (props.inheritFilters) {
        cropFilters.value = { ...(props.initialFilters || {}) }
        hasMore.value = false
        batchPage.value = 1
        queue.value = []
        currentIndex.value = 0
        await fetchCropBatch(1, false)
      } else {
        queue.value = Array.isArray(props.items) ? [...props.items] : []
        currentIndex.value = 0
        hasMore.value = false
      }
    }
  }
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown, true)
})
</script>

<style scoped lang="scss">
.mcr {
  /* ── 浅色主题变量 ── */
  --mcr-bg: #f5f7fa;
  --mcr-fg: #1f2329;
  --mcr-bar-bg: rgba(255, 255, 255, 0.92);
  --mcr-footer-bg: rgba(255, 255, 255, 0.9);
  --mcr-border: #e5e6eb;
  --mcr-card-bg: #ffffff;
  --mcr-checker-1: #eceef1;
  --mcr-checker-2: #f7f8fa;
  --mcr-check-bg: #ffffff;
  --mcr-check-border: #c9cdd4;
  --mcr-check-on: #ffffff;
  --mcr-kbd-bg: #ffffff;
  --mcr-muted: #909399;

  position: fixed;
  inset: 0;
  z-index: 2500;
  display: flex;
  flex-direction: column;
  background: var(--mcr-bg);
  color: var(--mcr-fg);

  /* ── 暗黑主题变量：作用在根节点自身，子元素引用变量即可 ── */
  &.is-dark {
    --mcr-bg: #1d1e1f;
    --mcr-fg: #e5e6eb;
    --mcr-bar-bg: rgba(30, 31, 32, 0.92);
    --mcr-footer-bg: rgba(30, 31, 32, 0.9);
    --mcr-border: #333333;
    --mcr-card-bg: #252628;
    --mcr-checker-1: #2a2b2d;
    --mcr-checker-2: #232427;
    --mcr-check-bg: #252628;
    --mcr-check-border: #4a4b4d;
    --mcr-check-on: #ffffff;
    --mcr-kbd-bg: #333333;
    --mcr-muted: #a3a6ad;
  }

  .mcr__topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 18px;
    background: var(--mcr-bar-bg);
    border-bottom: 1px solid var(--mcr-border);
    flex-shrink: 0;

    .mcr__top-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .mcr__title {
      font-size: 16px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
    }
    .mcr__progress {
      font-size: 13px;
      color: var(--el-color-primary);
      font-weight: 600;
    }
    .mcr__tip {
      font-size: 12px;
      opacity: 0.6;
    }
    .mcr__top-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .mcr__body {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;

    .mcr__source {
      width: 46%;
      display: flex;
      flex-direction: column;
      padding: 14px 18px;
      border-right: 1px solid var(--mcr-border);
      min-width: 0;

      .mcr__source-stage {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 0;
        overflow: hidden;
        background: repeating-conic-gradient(var(--mcr-checker-1) 0% 25%, var(--mcr-checker-2) 0% 50%) 50% / 20px 20px;
      }
      .mcr__source-img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      .mcr__source-meta {
        display: flex;
        gap: 16px;
        padding: 8px 0;
        font-size: 12px;
        opacity: 0.75;
      }
      .mcr__nav {
        display: flex;
        justify-content: space-between;
        padding-top: 8px;
      }
    }

    .mcr__plans {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 14px 18px;
      min-width: 0;

      .mcr__plan-grid {
        flex: 1;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
        gap: 16px;
        overflow-y: auto;
        align-content: start;
        padding: 4px;
      }
    }

    .mcr__section-label {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 12px;
      flex-shrink: 0;
    }

    .mcr__empty,
    .mcr__empty-plans {
      padding: 40px;
      text-align: center;
      opacity: 0.55;
      font-size: 13px;
    }
  }

  .mcr__plan-card {
    position: relative;
    border: 2px solid var(--mcr-border);
    border-radius: 10px;
    padding: 10px;
    cursor: pointer;
    transition: all 0.15s;
    background: var(--mcr-card-bg);

    &:hover {
      border-color: color-mix(in srgb, var(--el-color-primary) 60%, var(--mcr-border));
    }
    &.is-selected {
      border-color: var(--el-color-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--el-color-primary) 18%, transparent);

      .mcr__plan-label {
        color: var(--el-color-primary);
      }
    }
    .mcr__plan-check {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid var(--mcr-check-border);
      background: var(--mcr-check-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      color: var(--mcr-check-on);
      font-size: 13px;
    }
    &.is-selected .mcr__plan-check {
      background: var(--el-color-primary);
      border-color: var(--el-color-primary);
      color: var(--el-color-white, #ffffff);
    }
    .mcr__plan-preview-wrap {
      height: 150px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: repeating-conic-gradient(var(--mcr-checker-1) 0% 25%, var(--mcr-checker-2) 0% 50%) 50% / 16px 16px;
    }
    .mcr__plan-preview {
      flex: none;
      overflow: hidden;
      border-radius: 2px;
    }
    .mcr__plan-preview-img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }
    .mcr__plan-label {
      margin-top: 8px;
      font-size: 13px;
      font-weight: 600;
      text-align: center;
    }
    .mcr__plan-dim {
      font-size: 11px;
      opacity: 0.6;
      text-align: center;
      margin-top: 2px;
    }
  }

  .mcr__confirm-bar {
    display: flex;
    align-items: center;
    gap: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--mcr-border);
    margin-top: 10px;
    flex-shrink: 0;

    .mcr__confirm-hint {
      font-size: 12px;
      color: var(--mcr-muted);
    }
  }

  .mcr__footer {
    display: flex;
    gap: 20px;
    padding: 8px 18px;
    background: var(--mcr-footer-bg);
    border-top: 1px solid var(--mcr-border);
    font-size: 12px;
    opacity: 0.85;
    flex-shrink: 0;

    kbd {
      padding: 1px 5px;
      border: 1px solid var(--mcr-check-border);
      border-radius: 4px;
      font-size: 11px;
      background: var(--mcr-kbd-bg);
    }
  }

}
</style>

<!-- 裁剪审核面板 z-index 2500（与快速审核一致），Element Plus 弹层默认 2000 出头
     会被面板整体盖住：配置/任务抽屉、确认框、toast 弹了看不见，表现为「点了没反应」。
     沿用快速审核同款分层（抽屉 2600 / 消息 2700），避免与全局规则互相覆盖。 -->
<style lang="scss">
/* 抽屉经 append-to-body teleport 到 body，脱离 .mcr 子树：变量必须挂 :root 才能被继承 */
:root {
  --mcr-bg: #f5f7fa;
  --mcr-fg: #1f2329;
  --mcr-bar-bg: rgba(255, 255, 255, 0.92);
  --mcr-footer-bg: rgba(255, 255, 255, 0.9);
  --mcr-border: #e5e6eb;
  --mcr-card-bg: #ffffff;
  --mcr-checker-1: #eceef1;
  --mcr-checker-2: #f7f8fa;
  --mcr-check-bg: #ffffff;
  --mcr-check-border: #c9cdd4;
  --mcr-check-on: #ffffff;
  --mcr-kbd-bg: #ffffff;
  --mcr-muted: #909399;
}
html.dark,
html[class*='dark'],
body.dark {
  --mcr-bg: #1d1e1f;
  --mcr-fg: #e5e6eb;
  --mcr-bar-bg: rgba(30, 31, 32, 0.92);
  --mcr-footer-bg: rgba(30, 31, 32, 0.9);
  --mcr-border: #333333;
  --mcr-card-bg: #252628;
  --mcr-checker-1: #2a2b2d;
  --mcr-checker-2: #232427;
  --mcr-check-bg: #252628;
  --mcr-check-border: #4a4b4d;
  --mcr-check-on: #ffffff;
  --mcr-kbd-bg: #333333;
  --mcr-muted: #a3a6ad;
}

.el-overlay:has(.mcr-drawer) { z-index: 2600 !important; }
.el-message { z-index: 2700 !important; }

/* ── 裁剪配置抽屉：全局选择器（teleport 出去，不走 scoped 后代选择器） ── */
.cfg {
  .cfg__intro {
    font-size: 12px;
    line-height: 1.7;
    color: var(--mcr-muted);
    padding: 9px 12px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--mcr-fg) 4%, transparent);
    margin-bottom: 20px;
  }
  .cfg__label {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    &--split { padding-top: 18px; border-top: 1px solid var(--mcr-border); margin-top: 22px; }
    .cfg__count { font-size: 12px; font-weight: 400; color: var(--mcr-muted); }
  }
  .cfg__presets { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 22px; }
  .cfg__chip {
    margin: 0;
    height: 30px;
    .cfg__chip-name { margin-left: 4px; opacity: 0.6; font-size: 11px; }
  }
  .cfg__custom-row { display: flex; align-items: center; gap: 10px; }
  .cfg__custom-num { width: 84px; }
  .cfg__custom-colon { font-size: 16px; font-weight: 700; color: var(--mcr-muted); line-height: 1; }
  .cfg__custom-add { margin-left: 6px; }
  .cfg__hint { font-size: 11px; color: var(--mcr-muted); margin-top: 8px; }
  .cfg__empty {
    padding: 26px; text-align: center; font-size: 12px;
    color: var(--mcr-muted); border: 1px dashed var(--mcr-border); border-radius: 8px;
  }
  .cfg__thead,
  .cfg__trow {
    display: grid;
    grid-template-columns: 24px minmax(80px, 1fr) 130px 58px 34px;
    align-items: center;
    gap: 8px;
  }
  .cfg__thead {
    font-size: 11px; color: var(--mcr-muted);
    padding: 0 6px 8px; border-bottom: 1px solid var(--mcr-border);
  }
  .cfg__trow {
    padding: 8px 6px;
    border-bottom: 1px solid var(--mcr-border);
    &:last-child { border-bottom: none; }
    &:hover { background: color-mix(in srgb, var(--mcr-fg) 3%, transparent); }

    &.is-off { opacity: 0.55; }
  }
  .cfg__cell-index { font-size: 12px; color: var(--mcr-muted); text-align: center; }
  .cfg__cell {
    min-width: 0;
    .el-input__wrapper { padding-inline: 8px; }
    .el-input.is-error .el-input__wrapper { box-shadow: 0 0 0 1px #f56c6c inset; }
  }
  .cfg__cell-status {
    display: flex;
    justify-content: center;
  }

  .cfg__cell-op {
    display: flex; justify-content: center;
    .el-button { color: var(--mcr-muted); }
  }
  .cfg__note { font-size: 11px; color: var(--mcr-muted); line-height: 1.6; margin-top: 12px; }
  .cfg__footer {
    margin-top: 22px; padding-top: 16px;
    border-top: 1px solid var(--mcr-border);
    display: flex; justify-content: flex-end; gap: 10px;
  }
}

/* ── 任务进度抽屉：同样 teleport 出去，全局选择器 ── */
.mcr__task-toolbar { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
.mcr__task-summary { font-size: 12px; opacity: 0.75; }
.mcr__task-name {
  display: inline-block; max-width: 140px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
</style>
