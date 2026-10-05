<template>
  <div class="engine-view">
    <!-- 客户端选择（与其他采集功能一致） -->
    <ClientSelector
      v-model="selectedClientId"
      plugin-key="collect-engine"
      @change="handleSelectClient"
      @refresh="refreshClientNodes"
    />

    <!-- 不可用提示（meta.available=false 时展示并禁用执行） -->
    <div v-if="isUnavailable" class="unavailable-notice">
      <el-tag type="danger" size="small">不可用</el-tag>
      <span class="unavailable-reason">{{ sourceMeta?.unavailableReason || '该采集源当前不可用' }}</span>
    </div>

    <!-- 搜索表单（由源 meta.searchParams 动态渲染） -->
    <div class="engine-toolbar">
      <template v-for="field in searchParams" :key="field.key">
        <el-input
          v-if="field.type === 'text'"
          v-model="formModel[field.key]"
          class="search-input"
          :placeholder="field.placeholder || `${field.label}...`"
          clearable
          size="small"
          :disabled="!selectedClientId"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-else-if="field.type === 'select'"
          v-model="formModel[field.key]"
          class="field-select"
          :placeholder="field.label"
          size="small"
          clearable
          :disabled="!selectedClientId"
        >
          <el-option
            v-for="opt in field.options || []"
            :key="String(opt.value)"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-color-picker
          v-else-if="field.type === 'color'"
          v-model="formModel[field.key]"
          size="small"
          :disabled="!selectedClientId"
        />
        <el-input-number
          v-else-if="field.type === 'number'"
          v-model="formModel[field.key]"
          size="small"
          :min="1"
          :max="100"
          :placeholder="field.label"
          :disabled="!selectedClientId"
        />
      </template>

      <el-button
        type="primary"
        size="small"
        :loading="searchLoading"
        :disabled="!selectedClientId || isUnavailable"
        @click="handleSearch"
      >
        搜索
      </el-button>
      <el-button
        v-if="hasListAction"
        size="small"
        :loading="searchLoading"
        :disabled="!selectedClientId || isUnavailable"
        @click="handleList"
      >
        最新列表
      </el-button>
    </div>

    <!-- 批量操作栏（仅当源支持采集下载） -->
    <div v-if="items.length > 0 && hasDownload" class="batch-bar">
      <div class="batch-info">
        <el-checkbox
          :model-value="allSelected"
          :indeterminate="indeterminate"
          @change="toggleSelectAll"
        >
          全选
        </el-checkbox>
        <span class="batch-count">已选 {{ selectedItems.length }} / {{ items.length }}</span>
      </div>
      <el-button
        type="primary"
        size="small"
        :loading="batchLoading"
        :disabled="selectedItems.length === 0 || !selectedClientId || isUnavailable"
        @click="handleBatchSync"
      >
        批量采集 ({{ selectedItems.length }})
      </el-button>
    </div>

    <!-- 搜索结果列表（严格按 meta.output / meta.actions 渲染） -->
    <div v-if="items.length > 0" class="result-list">
      <div
        v-for="(item, index) in items"
        :key="item.id || `${getField(item, 'title')}-${index}`"
        class="result-item"
        :class="{ 'is-selected': selectedItems.includes(itemKey(item, index)) }"
      >
        <el-checkbox
          v-if="hasDownload"
          :model-value="selectedItems.includes(itemKey(item, index))"
          class="item-checkbox"
          @change="toggleSelectItem(itemKey(item, index))"
        />
        <!-- 缩略图列：仅当源 output 声明了图片字段 -->
        <div v-if="thumbField" class="item-thumb" @click="openImagePreview(item)">
          <el-image
            :src="getField(item, thumbField)"
            fit="cover"
            loading="lazy"
            class="thumb-img"
          >
            <template #error>
              <div class="thumb-placeholder">
                <el-icon><Picture /></el-icon>
              </div>
            </template>
          </el-image>
        </div>
        <!-- 榜单型：排名徽标（output 含 rank 时） -->
        <div v-else-if="rankField && getField(item, rankField)" class="item-rank">
          {{ getField(item, rankField) }}
        </div>
        <div class="item-info">
          <div class="item-title" :title="getField(item, titleField)">
            <span v-if="mediaBadge(item)" class="media-badge" :class="'media-' + mediaBadge(item)">
              {{ mediaBadge(item) === 'video' ? '视频' : mediaBadge(item) === 'audio' ? '音频' : '图' }}
            </span>
            {{ getField(item, titleField) || '未命名' }}
          </div>
          <!-- 信息行：按 output 声明的其余文本/数字字段展示（热搜=热度，新闻=作者/日期…） -->
          <div v-if="metaChips(item).length" class="item-meta">
            <span v-for="(chip, ci) in metaChips(item)" :key="ci" class="meta-tag">
              {{ chip }}
            </span>
          </div>
          <div v-if="descSnippet(item)" class="item-desc">
            {{ descSnippet(item) }}
          </div>
        </div>
        <div class="item-actions">
          <el-button
            v-if="hasDownload"
            size="small"
            :loading="loadingItems.has(itemKey(item, index))"
            :disabled="!selectedClientId || isUnavailable"
            @click.stop="handleSyncOne(item, index)"
          >
            采集入库
          </el-button>
          <el-button
            v-if="hasOpenPage"
            size="small"
            text
            @click.stop="openPage(item)"
          >
            原页
          </el-button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="!searchLoading && items.length === 0 && hasSearched"
      class="empty-state"
    >
      <el-empty description="未找到相关素材" :image-size="80" />
    </div>

    <!-- 加载状态 -->
    <div v-if="searchLoading" class="loading-state">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>搜索中...</span>
    </div>

    <!-- 分页（与其他采集功能一致） -->
    <div v-if="items.length > 0" class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="estimatedTotal"
        layout="prev, pager, next"
        background
        @current-change="handlePageChange"
      />
    </div>

    <!-- 入库结果提示 -->
    <div v-if="lastSyncResult" class="sync-result">{{ lastSyncResult }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Picture, Loading } from '@element-plus/icons-vue'
import { usePluginClientNodes } from '@/services/clientNodeState'
import ClientSelector from './ClientSelector.vue'
import { saveCollectPanelState, loadCollectPanelState, saveSourceMetas, loadSourceMetas } from './collectPanelState'
import {
  createCollectTask,
  listCollectSources,
  type CollectSourceMeta,
  type CollectSearchParam
} from '@/api/external/collect'

const props = withDefaults(
  defineProps<{
    /** 采集源 ID（由服务端源定义提供，一 tab 一源） */
    sourceId?: string
    /** 预置表单参数（如 data-tools 的工具选择） */
    presetParams?: Record<string, any>
    /** 入库目标：collect_file（媒体采集→采集文件）| 默认走 crawler_material */
    materialTarget?: string
  }>(),
  { sourceId: '4kwallpapers', presetParams: () => ({}) }
)

defineOptions({ name: 'CollectEnginePanel' })

// ─── 客户端节点（与其他采集功能一致）────────────────────────
const { refresh: refreshClientNodes } = usePluginClientNodes('collect-engine')
const selectedClientId = ref('')

// ─── 源 meta（驱动表单/展示）─────────────────────────────────
const sourceMeta = ref<CollectSourceMeta | null>(null)
const searchParams = computed<CollectSearchParam[]>(() => {
  // meta 就绪后以其定义为准（空数组=榜单型无筛选）；meta 未加载时给关键词兜底
  const base = sourceMeta.value
    ? (sourceMeta.value.searchParams || [])
    : [{ key: 'query', label: '关键词', type: 'text', required: true } as CollectSearchParam]
  // 隐藏已由 tab 预置的字段（如 data-tools 的 tool）
  const presetKeys = new Set(Object.keys(props.presetParams || {}))
  // 按 tools 标注过滤：仅显示适用于当前工具/子场景的字段
  const currentTool = String(
    (props.presetParams as any)?.tool || (formModel as any).tool || '',
  )
  return base.filter((f) => {
    if (presetKeys.has(f.key)) return false
    if (f.tools && f.tools.length > 0 && currentTool && !f.tools.includes(currentTool)) {
      return false
    }
    return true
  })
})
const formModel = reactive<Record<string, any>>({})

function initFormModel() {
  for (const f of searchParams.value) {
    formModel[f.key] = f.default !== undefined ? f.default : f.type === 'number' ? 24 : ''
  }
}

// ─── 搜索状态（与其他采集功能一致）──────────────────────────
const searchLoading = ref(false)
const hasSearched = ref(false)
const items = ref<Array<Record<string, any>>>([])
const selectedItems = ref<string[]>([])
const loadingItems = ref<Set<string>>(new Set())
const batchLoading = ref(false)
const lastSyncResult = ref('')

// ─── 翻页状态 ──────────────────────────────────────────────
const currentPage = ref(1)
const pageSize = computed(() => Number(formModel.pageSize) || 24)
const hasNext = ref(false)
const lastMode = ref<'search' | 'list'>('search')
const lastParams = ref<Record<string, any>>({})
const estimatedTotal = computed(() => {
  const base = (currentPage.value - 1) * pageSize.value + items.value.length
  return hasNext.value ? base + pageSize.value : base
})

const allSelected = computed(
  () => items.value.length > 0 && selectedItems.value.length === items.value.length
)
const indeterminate = computed(
  () => selectedItems.value.length > 0 && selectedItems.value.length < items.value.length
)

function getField(item: Record<string, any>, key: string): string {
  const v = item?.[key]
  return v == null ? '' : String(v)
}

function itemKey(item: Record<string, any>, index: number): string {
  return item.id || `${getField(item, 'title')}-${index}`
}

// ─── meta 驱动的展示字段（各模块形态不同，不搞一刀切）────────
const metaOutput = computed(() => sourceMeta.value?.output || [])
const metaActions = computed(() => sourceMeta.value?.actions || [])
const isUnavailable = computed(() => sourceMeta.value?.available === false)
const hasDownload = computed(() => metaActions.value.includes('download'))
const hasListAction = computed(() => metaActions.value.includes('list'))
const hasOpenPage = computed(() => metaActions.value.includes('openPage'))

/** 缩略图字段：output 里第一个 image 类型字段；无声明则不显示缩略图列 */
const thumbField = computed(() => {
  const f = metaOutput.value.find((o) => o.type === 'image')
  return f?.key || ''
})

/** 榜单排名字段：output 里叫 rank 的数字字段 */
const rankField = computed(() => {
  const f = metaOutput.value.find((o) => o.key === 'rank' && o.type === 'number')
  return f?.key || ''
})

/** 标题字段：第一个 text 字段（约定 title） */
const titleField = computed(() => {
  const f = metaOutput.value.find((o) => o.type === 'text')
  return f?.key || 'title'
})

/**
 * 信息行 chips：output 里除标题/描述/图片/链接外的文本、数字字段
 * （热搜→热度；新闻→作者/日期/标签；数据→值/单位）
 */
function metaChips(item: Record<string, any>): string[] {
  const out: string[] = []
  for (const f of metaOutput.value) {
    if (f.key === titleField.value) continue
    if (f.type === 'image' || f.type === 'link') continue
    if (f.key === 'description') continue
    if (rankField.value && f.key === rankField.value) continue
    const v = getField(item, f.key)
    if (!v) continue
    out.push(v.length > 40 ? v.slice(0, 40) + '…' : v)
    if (out.length >= 4) break
  }
  return out
}

/** 描述摘要（output 含 description 时显示一行） */
function descSnippet(item: Record<string, any>): string {
  const v = getField(item, 'description')
  return v ? (v.length > 90 ? v.slice(0, 90) + '…' : v) : ''
}

/** 媒体类型角标：video / audio / ''（图片不标） */
function mediaBadge(item: Record<string, any>): string {
  const explicit = String(item?.mediaType || item?.type || '').toLowerCase()
  if (explicit === 'video' || explicit === 'audio') return explicit
  const mime = String(item?.mime || '').toLowerCase()
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return ''
}

function handleSelectClient(clientId: string) {
  selectedClientId.value = clientId
  items.value = []
  selectedItems.value = []
}

function toggleSelectItem(key: string) {
  const idx = selectedItems.value.indexOf(key)
  if (idx >= 0) selectedItems.value.splice(idx, 1)
  else selectedItems.value.push(key)
}

function toggleSelectAll(checked: any) {
  selectedItems.value = checked
    ? items.value.map((item, index) => itemKey(item, index))
    : []
}

// ─── 任务执行（REST → 服务端派发指定客户端）────────────────
async function runTask(
  action: 'search' | 'list' | 'download',
  params: Record<string, any>
) {
  const res: any = await createCollectTask({
    sourceId: props.sourceId,
    action,
    params,
    clientId: selectedClientId.value
  })
  return res?.data ?? res
}

function collectFormParams(): Record<string, any> {
  const out: Record<string, any> = {}
  for (const f of searchParams.value) {
    const v = formModel[f.key]
    if (v !== undefined && v !== null && v !== '') out[f.key] = v
  }
  return out
}

function validateForm(): boolean {
  for (const f of searchParams.value) {
    if (f.required && (formModel[f.key] === undefined || formModel[f.key] === null || formModel[f.key] === '')) {
      ElMessage.warning(`请输入${f.label}`)
      return false
    }
  }
  return true
}

async function handleSearch() {
  if (!selectedClientId.value) {
    ElMessage.warning('请先选择客户端节点')
    return
  }
  if (!validateForm()) return
  currentPage.value = 1
  await runSearch({ ...collectFormParams(), page: 1 })
}

async function handleList() {
  if (!selectedClientId.value) {
    ElMessage.warning('请先选择客户端节点')
    return
  }
  currentPage.value = 1
  await runSearch({ ...collectFormParams(), page: 1 }, true)
}

async function handlePageChange(page: number) {
  if (!selectedClientId.value) {
    ElMessage.warning('请先选择客户端节点')
    return
  }
  await runSearch({ ...lastParams.value, page })
}

async function runSearch(params: Record<string, any>, isList = false) {
  lastMode.value = isList ? 'list' : 'search'
  lastParams.value = { ...params }
  searchLoading.value = true
  selectedItems.value = []
  lastSyncResult.value = ''
  try {
    const task = await runTask(isList ? 'list' : 'search', params)
    if (task?.status === 'failed') {
      items.value = []
      hasNext.value = false
      ElMessage.error(task?.errorMessage || task?.message || '搜索失败')
      return
    }
    items.value = task?.items || []
    hasNext.value = !!task?.next
    currentPage.value = Number(params.page) || 1
    hasSearched.value = true
    ElMessage.success(`搜索到 ${items.value.length} 条素材`)
  } catch (e: any) {
    items.value = []
    hasNext.value = false
    hasSearched.value = true
    const errorMsg = e?.message || '搜索执行异常'
    if (String(errorMsg).includes('超时')) {
      ElMessage.error('搜索超时，请检查客户端网络')
    } else {
      ElMessage.error(errorMsg)
    }
  } finally {
    searchLoading.value = false
    saveState()
  }
}

async function handleSyncOne(item: Record<string, any>, index: number) {
  const key = itemKey(item, index)
  loadingItems.value.add(key)
  try {
    const task = await runTask('download', {
      item,
      ...(props.materialTarget ? { materialTarget: props.materialTarget } : {}),
    })
    if (task?.status === 'failed') {
      ElMessage.error(task?.errorMessage || task?.message || '采集失败')
      return
    }
    const first = task?.items?.[0] || {}
    if (first.materialOk) {
      ElMessage.success('已采集入库')
    } else if (first.cosUrl) {
      ElMessage.success('已上传 COS')
    } else {
      ElMessage.warning('采集完成但未返回地址')
    }
    item.__cosUrl = first.cosUrl || ''
  } catch (e: any) {
    ElMessage.error(e?.message || '采集失败')
  } finally {
    loadingItems.value.delete(key)
  }
}

async function handleBatchSync() {
  const keys = new Set(selectedItems.value)
  const targets = items.value
    .map((item, index) => ({ item, index, key: itemKey(item, index) }))
    .filter((t) => keys.has(t.key))
  if (!targets.length) return
  batchLoading.value = true
  lastSyncResult.value = ''
  let ok = 0
  let fail = 0
  try {
    for (const t of targets) {
      try {
        const task = await runTask('download', {
          item: t.item,
          ...(props.materialTarget ? { materialTarget: props.materialTarget } : {}),
        })
        if (task?.status === 'failed') fail++
        else {
          ok++
          const first = task?.items?.[0] || {}
          t.item.__cosUrl = first.cosUrl || ''
        }
      } catch {
        fail++
      }
    }
    lastSyncResult.value = `批量采集完成：成功 ${ok} 个, 失败 ${fail} 个`
    ElMessage.success(lastSyncResult.value)
    selectedItems.value = []
  } finally {
    batchLoading.value = false
  }
}

function openPage(item: Record<string, any>) {
  const url =
    getField(item, 'link') || getField(item, 'pageUrl') || getField(item, 'url')
  if (url) window.open(url, '_blank')
}

function openImagePreview(item: Record<string, any>) {
  const url =
    (thumbField.value && getField(item, thumbField.value)) ||
    getField(item, 'image') ||
    getField(item, 'thumbnail')
  if (url) window.open(url, '_blank')
}

async function loadSourceMeta() {
  // 缓存优先：切源时表单即时成形，不闪
  const cached = loadSourceMetas()
  if (cached && cached.length) {
    sourceMeta.value = (cached.find((s: any) => s.id === props.sourceId) as CollectSourceMeta) || null
    initFormModel()
  }
  try {
    const res: any = await listCollectSources()
    const list = res?.data ?? res ?? []
    const arr: CollectSourceMeta[] = Array.isArray(list) ? list : []
    saveSourceMetas(arr)
    sourceMeta.value = arr.find((s) => s.id === props.sourceId) || null
    initFormModel()
  } catch {
    if (!cached) initFormModel()
  }
}

// ─── 跨实例状态缓存（切换 tab 无感恢复，不闪不丢）──────────
function saveState() {
  saveCollectPanelState(props.sourceId, {
    formModel: { ...formModel },
    items: items.value,
    currentPage: currentPage.value,
    hasNext: hasNext.value,
    hasSearched: hasSearched.value,
    lastParams: { ...lastParams.value },
    lastMode: lastMode.value,
  })
}

function restoreState(): boolean {
  const cached = loadCollectPanelState(props.sourceId)
  if (!cached) return false
  Object.assign(formModel, cached.formModel || {})
  items.value = cached.items || []
  currentPage.value = cached.currentPage || 1
  hasNext.value = !!cached.hasNext
  hasSearched.value = !!cached.hasSearched
  lastParams.value = { ...(cached.lastParams || {}) }
  lastMode.value = cached.lastMode || 'search'
  return true
}

async function initForSource() {
  await loadSourceMeta()
  // 预置参数（如 data-tools 工具选择）优先覆盖
  if (props.presetParams && Object.keys(props.presetParams).length) {
    Object.assign(formModel, props.presetParams)
  }
  // 有缓存则无感恢复（覆盖预置的仅表单其余字段）
  if (restoreState() && props.presetParams && Object.keys(props.presetParams).length) {
    Object.assign(formModel, props.presetParams)
  }
}

watch(
  () => props.sourceId,
  async () => {
    saveState() // 保存旧源
    items.value = []
    selectedItems.value = []
    currentPage.value = 1
    hasNext.value = false
    hasSearched.value = false
    await initForSource()
  },
)

// 预置参数变化（如 data-tools 切换工具）：只更新表单，不丢当前源缓存
watch(
  () => props.presetParams,
  (val) => {
    if (val && Object.keys(val).length) {
      Object.assign(formModel, val)
      saveState()
    }
  },
  { deep: true },
)

// 表单变化同步缓存（无需提交即保留）
watch(formModel, () => saveState(), { deep: true })

onMounted(() => {
  refreshClientNodes()
  initForSource()
})
</script>

<style scoped>
.engine-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 0;
  min-height: 100%;
}

/* ─── 业务工具栏 ─────────────────────────────────────────── */
.unavailable-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--el-color-danger-light-7, #fbc4c4);
  background: var(--el-color-danger-light-9, #fef0f0);
  border-radius: 6px;
  font-size: 12px;
}

.unavailable-reason {
  color: var(--el-color-danger, #f56c6c);
}

.engine-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.search-input {
  width: 240px;
}

.field-select {
  width: 150px;
}

:deep(.search-input .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--el-border-color) inset;
}

/* ─── 批量操作栏 ─────────────────────────────────────────── */
.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.batch-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-count {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

/* ─── 结果列表 ───────────────────────────────────────────── */
.result-list {
  display: flex;
  flex-direction: column;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  transition: background-color 0.15s ease;
}

.result-item:last-child {
  border-bottom: none;
}

.item-checkbox {
  flex-shrink: 0;
}

.item-thumb {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background: var(--el-fill-color-lighter);
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.item-thumb:hover {
  opacity: 0.85;
}

.thumb-img {
  width: 100%;
  height: 100%;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
  font-size: 18px;
}

/* 榜单型排名徽标（无缩略图时替代占位） */
.item-rank {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 13px;
  font-weight: 700;
}

.item-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-title {
  font-size: 13px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 6px;
}

.media-badge {
  flex-shrink: 0;
  font-size: 10px;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 3px;
  font-weight: 600;
}

.media-video {
  background: var(--el-color-primary-light-9, #ecf5ff);
  color: var(--el-color-primary, #409eff);
}

.media-audio {
  background: var(--el-color-success-light-9, #f0f9eb);
  color: var(--el-color-success, #67c23a);
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.meta-tag {
  background: var(--el-fill-color);
  padding: 1px 6px;
  border-radius: 3px;
  max-width: 320px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-author {
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* ─── 空状态 / 加载状态 ─────────────────────────────────── */
.empty-state {
  padding: 40px 0;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.sync-result {
  padding: 8px 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

/* ─── 分页 ───────────────────────────────────────────────── */
.pagination {
  display: flex;
  justify-content: center;
  padding: 12px 0;
}
</style>
