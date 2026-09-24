<template>
  <div class="engine-view">
    <!-- 客户端选择（单独一行） -->
    <ClientSelector
      v-model="selectedClientId"
      :plugin-key="props.pluginKey"
      @change="handleSelectClient"
      @refresh="loadClients"
    />

    <!-- 业务工具栏 -->
    <div class="engine-toolbar">
      <el-input
        v-model="searchKeyword"
        :placeholder="placeholder || '搜索关键词...'"
        clearable
        size="small"
        class="search-input"
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button
        type="primary"
        size="small"
        :loading="searchLoading"
        :disabled="!selectedClientId || !selectedClient?.isOnline"
        @click="handleSearch"
      >
        搜索
      </el-button>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="searchResults.length > 0" class="batch-bar">
      <div class="batch-info">
        <el-checkbox
          :model-value="allSelected"
          :indeterminate="indeterminate"
          @change="toggleSelectAll"
        >
          全选
        </el-checkbox>
        <span class="batch-count">已选 {{ selectedItems.length }} / {{ searchResults.length }}</span>
      </div>
      <el-button
        type="primary"
        size="small"
        :loading="batchDownloadLoading"
        :disabled="selectedItems.length === 0"
        @click="handleBatchSync"
      >
        批量采集 ({{ selectedItems.length }})
      </el-button>
    </div>

    <!-- 搜索结果列表 -->
    <div v-if="searchResults.length > 0" class="result-list">
      <div
        v-for="(item, index) in searchResults"
        :key="item.id || `${item.image}-${index}`"
        class="result-item"
        :class="{ 'is-selected': selectedItems.includes(item.id || `${item.image}-${index}`) }"
      >
        <el-checkbox
          :model-value="selectedItems.includes(item.id || `${item.image}-${index}`)"
          class="item-checkbox"
          @change="toggleSelectItem(item.id || `${item.image}-${index}`)"
        />
        <div class="item-thumb" @click="openImagePreview(item)">
          <el-image
            :src="item.thumbnail || item.image"
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
        <div class="item-info">
          <div class="item-title" :title="item.title">{{ item.title || '未命名' }}</div>
          <div class="item-meta">
            <span v-if="item.width && item.height" class="meta-tag">{{ item.width }}x{{ item.height }}</span>
            <span v-if="item.author" class="meta-author">{{ item.author }}</span>
          </div>
        </div>
        <div class="item-actions">
          <el-button
            size="small"
            :loading="loadingItems.has(`sync-${index}`)"
            :disabled="!selectedClientId || !selectedClient?.isOnline"
            @click.stop="handleSyncOne(index)"
          >
            采集入库
          </el-button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!searchLoading && searchResults.length === 0 && searchKeyword" class="empty-state">
      <el-empty description="未找到相关素材" :image-size="80" />
    </div>

    <!-- 加载状态 -->
    <div v-if="searchLoading" class="loading-state">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>搜索中...</span>
    </div>

    <!-- 分页 -->
    <div v-if="searchResults.length > 0" class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="searchTotal || 100"
        layout="prev, pager, next"
        small
        background
        @current-change="handlePageChange"
      />
    </div>

    <!-- 图片预览（轻量弹窗，仅展示图片） -->
    <el-image-viewer
      v-if="previewVisible"
      :url-list="[previewImage]"
      :initial-index="0"
      :zoom-rate="1.2"
      :max-scale="7"
      :min-scale="0.2"
      @close="previewVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Picture, Search, Loading } from '@element-plus/icons-vue'
import { usePluginClientNodes } from '@/services/clientNodeState'
import {
  createImageEngineApi,
  type ImageEnginePhoto,
  type ImageEngineClientVO,
  type ImageEngineServiceStatus,
} from '@/api/external/imageEngineApi'
import ClientSelector from './ClientSelector.vue'

const props = defineProps<{
  pluginKey: string
  title: string
  eyebrow?: string
  placeholder?: string
  accentColor?: string
}>()

const api = createImageEngineApi(props.pluginKey)

const actionLoading = reactive({
  refreshRuntime: false,
})

// ─── 客户端节点 ──────────────────────────────────────────────

const {
  clients: rawClients,
  loading,
  refresh: refreshClientNodes,
  getServiceRuntime,
} = usePluginClientNodes(props.pluginKey)

const selectedClientId = ref('')

// ─── 搜索状态 ────────────────────────────────────────────────

const searchKeyword = ref('')
const searchLoading = ref(false)
const pageSize = ref(20)
const searchResults = ref<ImageEnginePhoto[]>([])
const searchTotal = ref(0)
const currentPage = ref(1)
const selectedItems = ref<string[]>([])
const loadingItems = ref<Set<string>>(new Set())
const batchDownloadLoading = ref(false)

const previewVisible = ref(false)
const previewImage = ref('')

const clients = computed<ImageEngineClientVO[]>(() => {
  return rawClients.value.map((client) => {
    const service = (getServiceRuntime(client) as ImageEngineServiceStatus | null) || null
    return {
      clientId: client.id,
      isOnline: client.isOnline,
      nodeStatus: client.nodeStatus,
      connectedAt: client.connectedAt,
      lastOnlineAt: client.lastOnlineAt,
      appVersion: client.clientInfo?.appVersion || null,
      workspaceDirectory: client.clientInfo?.workspaceDirectory || null,
      machine: client.clientInfo?.machine || null,
      location: client.clientInfo?.location || null,
      service,
    }
  })
})

watch(
  clients,
  (list) => {
    if (list.length > 0 && !selectedClientId.value) {
      const onlineClient = list.find((c) => c.isOnline)
      selectedClientId.value = onlineClient ? onlineClient.clientId : list[0].clientId
    }
  },
  { immediate: true },
)

const selectedClient = computed<ImageEngineClientVO | null>(() => {
  if (!selectedClientId.value) return null
  return clients.value.find((c) => c.clientId === selectedClientId.value) || null
})

const currentService = computed<ImageEngineServiceStatus | null>(
  () => selectedClient.value?.service || null,
)

// ─── 状态展示 ──────────────────────────────────────────────

const isOnline = computed(() => !!selectedClient.value?.isOnline)
const isServiceConnected = computed(() => !!currentService.value?.connected)
const isAvailable = computed(
  () => isOnline.value && (isServiceConnected.value || currentService.value?.available),
)

function handleSelectClient(val: string) {
  selectedClientId.value = val
}

async function loadClients() {
  await refreshClientNodes()
  ElMessage.success('节点已刷新')
}

// ─── 搜索业务 ──────────────────────────────────────────────

async function handleSearch() {
  if (!selectedClientId.value) {
    ElMessage.warning('请先选择客户端节点')
    return
  }
  const kw = searchKeyword.value.trim()
  if (!kw) {
    ElMessage.warning('请输入搜索关键词')
    return
  }
  searchLoading.value = true
  selectedItems.value = []
  try {
    const result = await api.searchAndWait(selectedClientId.value, kw, {
      page: currentPage.value,
      limit: pageSize.value,
    })
    if (result.success) {
      searchResults.value = result.items || []
      searchTotal.value = result.total || result.count || 0
      ElMessage.success(`搜索到 ${result.count || searchResults.value.length} 条素材`)
    } else {
      searchResults.value = []
      searchTotal.value = 0
      ElMessage.error(result.error || '搜索失败')
    }
  } catch (e: any) {
    searchResults.value = []
    searchTotal.value = 0
    console.error(`[ImageEngineCollectView] 搜索异常:`, e)
    const errorMsg = e?.message || '搜索执行异常'
    if (errorMsg.includes('超时')) {
      ElMessage.error('搜索超时，请检查客户端网络')
    } else {
      ElMessage.error(errorMsg)
    }
  } finally {
    searchLoading.value = false
  }
}

function handleSizeChange(val: number) {
  pageSize.value = val
  if (searchKeyword.value.trim()) {
    currentPage.value = 1
    handleSearch()
  }
}

function handlePageChange(val: number) {
  currentPage.value = val
  handleSearch()
}

// ─── 选择管理 ──────────────────────────────────────────────

// 获取唯一 key，优先用 id，否则用 image + index
const getItemKey = (item: ImageEnginePhoto, index: number) => {
  return item.id || `${item.image || item.thumbnail}-${index}`
}

const allSelected = computed(() => {
  return searchResults.value.length > 0 && selectedItems.value.length === searchResults.value.length
})

const indeterminate = computed(() => {
  const len = selectedItems.value.length
  return len > 0 && len < searchResults.value.length
})

function toggleSelectItem(key: string) {
  const idx = selectedItems.value.indexOf(key)
  if (idx === -1) {
    selectedItems.value.push(key)
  } else {
    selectedItems.value.splice(idx, 1)
  }
}

function toggleSelectAll(checked: boolean) {
  if (checked) {
    selectedItems.value = searchResults.value.map((i, idx) => getItemKey(i, idx))
  } else {
    selectedItems.value = []
  }
}

function openImagePreview(item: ImageEnginePhoto) {
  previewImage.value = item.image || item.thumbnail
  previewVisible.value = true
}

// ─── 单图采集 ──────────────────────────────────────────────

async function handleSyncOne(index: number) {
  const item = searchResults.value[index]
  if (!selectedClientId.value || !item) return
  loadingItems.value.add(`sync-${index}`)
  try {
    const res = await api.syncAndWait(selectedClientId.value, {
      imageUrl: item.image,
      metadata: {
        title: item.title,
        description: item.description,
        url: item.url || item.link,
        author: item.author,
        width: item.width,
        height: item.height,
        tags: item.tags,
      },
    })
    if (res.success) {
      ElMessage.success(`「${item.title || '素材'}」已同步到素材库`)
    } else {
      ElMessage.error(res.message || '采集失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '采集异常')
  } finally {
    loadingItems.value.delete(`sync-${index}`)
  }
}

// ─── 批量采集 ──────────────────────────────────────────────

async function handleBatchSync() {
  if (!selectedClientId.value || selectedItems.value.length === 0) return
  const itemsToSync = searchResults.value.filter((i, idx) => selectedItems.value.includes(getItemKey(i, idx)))
  batchDownloadLoading.value = true
  let successCount = 0
  let failCount = 0

  for (const item of itemsToSync) {
    loadingItems.value.add(item.id || item.image)
    try {
      const res = await api.syncAndWait(selectedClientId.value, {
        imageUrl: item.image,
        metadata: {
          title: item.title,
          description: item.description,
          url: item.url || item.link,
          author: item.author,
          width: item.width,
          height: item.height,
          tags: item.tags,
        },
      })
      if (res.success) {
        successCount++
      } else {
        failCount++
      }
    } catch {
      failCount++
    } finally {
      loadingItems.value.delete(item.id || item.image)
    }
  }

  batchDownloadLoading.value = false
  if (successCount > 0) {
    ElMessage.success(`批量采集完成: 成功 ${successCount} 项${failCount > 0 ? `, 失败 ${failCount} 项` : ''}`)
  } else {
    ElMessage.error('批量采集失败')
  }
}
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

.engine-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1;
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

.result-item.is-selected {
  background: transparent;
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
  font-size: 11px;
}

.meta-author {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.item-actions {
  flex-shrink: 0;
}

/* ─── 空状态 ─────────────────────────────────────────────── */

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

/* ─── 分页 ───────────────────────────────────────────────── */

.pagination {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

</style>
