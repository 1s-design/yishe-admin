<template>
  <div class="collect-page">
    <div class="collect-layout">
      <aside class="collect-menu">
        <div class="menu-header">媒体采集</div>
        <nav class="menu-list">
          <div class="menu-group">
            <div class="menu-group__label">开放素材库</div>
            <div
              v-for="item in providers"
              :key="item.key"
              class="menu-item"
              :class="{ 'is-active': activeKey === item.key }"
              @click="switchTab(item.key)"
            >
              <span class="menu-item-text">{{ item.name }}</span>
            </div>
          </div>
        </nav>
      </aside>

      <main class="collect-body">
        <ContentWrap :plain="true">
          <div class="standard-collect-page">
            <ClientSelector
              v-model="selectedClientId"
              ref="clientSelectorRef"
              plugin-key="media-collect"
              @change="handleSelectClient"
              @refresh="loadClients"
            />

            <div class="standard-collect-layout">
              <section class="collect-main">
                <div v-if="selectedClient" class="collect-panel">
                  <div class="collect-section">
                    <div class="collect-search__header">
                      <div class="collect-section__title">
                        {{ activeProvider?.name || '媒体采集' }}
                      </div>
                      <div class="collect-search__opts">
                        <!-- Wikimedia 专用参数 -->
                        <template v-if="activeKey === 'wikimedia'">
                          <div class="collect-search__field">
                            <span class="collect-search__label">类型</span>
                            <el-select
                              v-model="sourceStates.wikimedia.mediaType"
                              size="small"
                              style="width: 110px"
                              aria-label="媒体类型"
                            >
                              <el-option value="image" label="图片" />
                              <el-option value="video" label="视频" />
                              <el-option value="audio" label="音频" />
                            </el-select>
                          </div>
                        </template>
                        <!-- Internet Archive 专用参数 -->
                        <template v-else-if="activeKey === 'internet-archive'">
                          <div class="collect-search__field">
                            <span class="collect-search__label">类型</span>
                            <el-select
                              v-model="sourceStates['internet-archive'].mediaType"
                              size="small"
                              style="width: 110px"
                              aria-label="媒体类型"
                            >
                              <el-option value="image" label="图片" />
                              <el-option value="video" label="影片" />
                              <el-option value="audio" label="音频" />
                            </el-select>
                          </div>
                          <div class="collect-search__field">
                            <span class="collect-search__label">排序</span>
                            <el-select
                              v-model="sourceStates['internet-archive'].sort"
                              size="small"
                              style="width: 100px"
                            >
                              <el-option value="relevance" label="相关度" />
                              <el-option value="date" label="日期" />
                            </el-select>
                          </div>
                        </template>
                        <!-- Pexels 专用参数 -->
                        <template v-else-if="activeKey === 'pexels'">
                          <div class="collect-search__field">
                            <span class="collect-search__label">类型</span>
                            <el-select
                              v-model="sourceStates.pexels.mediaType"
                              size="small"
                              style="width: 110px"
                              aria-label="媒体类型"
                            >
                              <el-option value="image" label="图片" />
                              <el-option value="video" label="视频" />
                            </el-select>
                          </div>
                        </template>
                        <div class="collect-search__field">
                          <span class="collect-search__label">每页数量</span>
                          <el-select
                            v-model="currentPageSize"
                            size="small"
                            style="width: 100px"
                            @change="handleSizeChange"
                          >
                            <el-option :value="10" label="10 条" />
                            <el-option :value="20" label="20 条" />
                            <el-option :value="30" label="30 条" />
                            <el-option :value="50" label="50 条" />
                          </el-select>
                        </div>
                      </div>
                    </div>

                    <div class="collect-inline">
                      <el-input
                        v-model="currentSearchKeyword"
                        clearable
                        :placeholder="`输入关键词搜索 ${activeProvider?.name || '媒体资源'}（如 cat, landscape, architecture）`"
                        @keyup.enter="handleSearch"
                      />
                      <el-button
                        type="primary"
                        :loading="searchLoading"
                        @click="handleSearch"
                      >
                        搜索
                      </el-button>
                    </div>

                    <div v-if="searchResults.length > 0" class="collect-search__results">
                      <div class="collect-search__header">
                        <div class="collect-search__info">
                          共 {{ searchTotal }} 个结果，第 {{ currentPage }} / {{ totalPages }} 页
                        </div>
                        <div class="collect-actions-bar">
                          <el-checkbox
                            :model-value="isAllSelected"
                            :indeterminate="isIndeterminate"
                            @change="toggleSelectAll"
                          >
                            全选
                          </el-checkbox>
                          <span class="collect-actions-bar__count">
                            已选 {{ selectedItems.length }} 项
                          </span>
                          <el-button
                            type="primary"
                            size="small"
                            :disabled="selectedItems.length === 0"
                            :loading="importing"
                            @click="handleImport"
                          >
                            批量入库
                          </el-button>
                          <el-button
                            size="small"
                            :disabled="selectedItems.length === 0"
                            @click="copySelectedLinks"
                          >
                            复制链接
                          </el-button>
                          <el-button size="small" @click="clearSelection">清空</el-button>
                        </div>
                      </div>

                      <div class="collect-list">
                        <div
                          v-for="item in searchResults"
                          :key="item.id"
                          class="collect-item"
                          :class="{ 'is-selected': selectedItems.includes(item.id) }"
                        >
                          <el-checkbox
                            :model-value="selectedItems.includes(item.id)"
                            @change="toggleSelect(item)"
                          />
                          <div class="collect-item__thumb" @click.stop="openPreview(item)">
                            <!-- 图片缩略图 -->
                            <img
                              v-if="(item.thumbnailUrl || item.previewUrl) && item.mediaType === 'image'"
                              :src="item.thumbnailUrl || item.previewUrl"
                              :alt="item.title || 'Media Asset'"
                              loading="lazy"
                              class="collect-item__thumb-img"
                              @error="onImageError"
                            />
                            <!-- 视频预览 -->
                            <div v-else-if="item.mediaType === 'video'" class="collect-item__thumb-video">
                              <video
                                v-if="item.thumbnailUrl"
                                :src="item.fileUrl || item.previewUrl"
                                :poster="item.thumbnailUrl"
                                preload="metadata"
                                muted
                                class="collect-item__thumb-video-el"
                              ></video>
                              <div v-else class="collect-item__thumb-video-placeholder">
                                <el-icon size="24"><VideoPlay /></el-icon>
                              </div>
                              <div class="collect-item__thumb-play-icon">
                                <el-icon size="20"><VideoPlay /></el-icon>
                              </div>
                            </div>
                            <!-- 音频 -->
                            <div v-else-if="item.mediaType === 'audio'" class="collect-item__thumb-audio">
                              <el-icon size="24"><Headset /></el-icon>
                            </div>
                            <!-- 默认图标 -->
                            <div v-else class="collect-item__thumb-error">
                              <el-icon><Picture /></el-icon>
                            </div>
                          </div>

                          <div class="collect-item__info">
                            <div class="collect-item__title" :title="item.title">
                              {{ item.title || '未命名资源' }}
                            </div>
                            <div class="collect-item__meta">
                              <span>{{ typeLabel(item.mediaType) }}</span>
                              <span v-if="item.creator">👤 {{ item.creator }}</span>
                              <span v-if="item.width && item.height">
                                {{ item.width }} × {{ item.height }}
                              </span>
                              <span v-if="item.duration">⏱ {{ formatDuration(item.duration) }}</span>
                              <span v-if="item.license">{{ item.license }}</span>
                            </div>
                          </div>

                          <div class="collect-item__actions">
                            <el-button
                              size="small"
                              @click.stop="copyLink(item.fileUrl || item.previewUrl || '')"
                            >
                              复制链接
                            </el-button>
                          </div>
                        </div>
                      </div>

                      <div class="collect-pagination">
                        <el-pagination
                          v-model:current-page="currentPage"
                          :page-size="currentPageSize"
                          :total="searchTotal"
                          layout="total, prev, pager, next, jumper"
                          background
                          @current-change="handlePageChange"
                        />
                        <div class="collect-pagination__extra">
                          <span class="collect-pagination__label">每页</span>
                          <el-select
                            v-model="currentPageSize"
                            size="small"
                            style="width: 80px"
                            @change="handleSizeChange"
                          >
                            <el-option :value="10" label="10 条" />
                            <el-option :value="20" label="20 条" />
                            <el-option :value="30" label="30 条" />
                            <el-option :value="50" label="50 条" />
                          </el-select>
                          <span class="collect-pagination__label">条</span>
                        </div>
                      </div>
                    </div>

                    <el-empty
                      v-else-if="hasSearched && !searchLoading"
                      description="未找到相关资源"
                      :image-size="80"
                    />
                    <el-empty
                      v-else-if="!searchLoading"
                      description="输入关键词开始搜索开放媒体资源"
                      :image-size="80"
                    />
                  </div>
                </div>

                <el-empty v-else description="请先在上方选择客户端节点" />
              </section>
            </div>
          </div>
        </ContentWrap>
      </main>
    </div>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewDialogVisible" :title="previewItem?.title || '预览'" width="700px" align-center>
      <div class="preview-container">
        <!-- 图片预览 -->
        <img
          v-if="previewItem?.mediaType === 'image' && previewItem?.fileUrl"
          :src="previewItem.fileUrl"
          :alt="previewItem.title"
          class="preview-image"
        />
        <!-- 视频预览 -->
        <video
          v-else-if="previewItem?.mediaType === 'video' && previewItem?.fileUrl"
          :src="previewItem.fileUrl"
          controls
          autoplay
          class="preview-video"
        ></video>
        <!-- 音频预览 -->
        <div v-else-if="previewItem?.mediaType === 'audio'" class="preview-audio">
          <el-icon size="48"><Headset /></el-icon>
          <audio
            v-if="previewItem?.fileUrl"
            :src="previewItem.fileUrl"
            controls
            preload="auto"
            class="preview-audio-player"
          ></audio>
          <span v-else class="preview-audio-error">音频地址无效</span>
        </div>
        <el-empty v-else description="无法预览此资源" />
      </div>
      <template #footer>
        <el-button @click="previewDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="previewItem && toggleSelect(previewItem)">选择并关闭</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Headset, Picture, VideoPlay } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ClientSelector from '../components/ClientSelector.vue'
import {
  importMediaCollect,
  refreshRuntime,
  searchMediaCollect,
  type MediaAsset,
} from '@/api/media-collect'
import '@/styles/external-collect.css'

defineOptions({ name: 'ExternalMediaCollect' })

const router = useRouter()
const providers = [
  { key: 'wikimedia', name: 'Wikimedia Commons' },
  { key: 'internet-archive', name: 'Internet Archive' },
  { key: 'pexels', name: 'Pexels' },
]
const activeKey = ref('wikimedia')
const activeProvider = computed(() => providers.find((item) => item.key === activeKey.value))
const clientSelectorRef = ref<{
  clients: { clientId: string; isOnline?: boolean }[]
  refresh: () => Promise<void>
} | null>(null)
const rawClients = computed(() => clientSelectorRef.value?.clients || [])

const selectedClientId = ref('')
const selectedClient = computed(() =>
  rawClients.value.find((client) => client.clientId === selectedClientId.value) || null,
)
const isAvailable = computed(() => !!selectedClient.value?.isOnline)

// 每个数据源独立维护搜索状态（key 与 providers 的 key 保持一致）
const sourceStates = reactive({
  wikimedia: {
    searchKeyword: '',
    mediaType: 'image' as 'image' | 'video' | 'audio',
    searchResults: [] as MediaAsset[],
    searchTotal: 0,
    currentPage: 1,
    pageSize: 10,
    hasSearched: false,
    selectedItems: [] as string[],
  },
  'internet-archive': {
    searchKeyword: '',
    mediaType: 'image' as 'image' | 'video' | 'audio',
    sort: 'relevance',
    searchResults: [] as MediaAsset[],
    searchTotal: 0,
    currentPage: 1,
    pageSize: 10,
    hasSearched: false,
    selectedItems: [] as string[],
  },
  pexels: {
    searchKeyword: '',
    mediaType: 'image' as 'image' | 'video' | 'audio',
    searchResults: [] as MediaAsset[],
    searchTotal: 0,
    currentPage: 1,
    pageSize: 10,
    hasSearched: false,
    selectedItems: [] as string[],
  },
})

// 当前激活 source 的计算属性
const currentSource = computed(() => sourceStates[activeKey.value as keyof typeof sourceStates])
const currentSearchKeyword = computed({
  get: () => currentSource.value.searchKeyword,
  set: (val) => { currentSource.value.searchKeyword = val },
})
const currentPageSize = computed({
  get: () => currentSource.value.pageSize,
  set: (val) => { currentSource.value.pageSize = val },
})
const searchResults = computed(() => currentSource.value.searchResults)
const searchTotal = computed(() => currentSource.value.searchTotal)
const currentPage = computed(() => currentSource.value.currentPage)
const totalPages = computed(() => Math.ceil(currentSource.value.searchTotal / currentSource.value.pageSize) || 1)
const selectedItems = computed({
  get: () => currentSource.value.selectedItems,
  set: (val) => { currentSource.value.selectedItems = val },
})
const hasSearched = computed(() => currentSource.value.hasSearched)

const searchLoading = ref(false)
const importing = ref(false)

// 预览弹窗
const previewDialogVisible = ref(false)
const previewItem = ref<MediaAsset | null>(null)
const actionLoading = reactive({ refreshRuntime: false })

const isAllSelected = computed(
  () =>
    searchResults.value.length > 0 &&
    selectedItems.value.length === searchResults.value.length,
)
const isIndeterminate = computed(
  () =>
    selectedItems.value.length > 0 &&
    selectedItems.value.length < searchResults.value.length,
)

async function loadClients() {
  await clientSelectorRef.value?.refresh?.()
}

function handleSelectClient() {
  // 重置当前 source 的搜索状态
  const src = currentSource.value
  src.searchResults = []
  src.selectedItems = []
  src.hasSearched = false
  src.searchTotal = 0
  src.currentPage = 1
}

function switchTab(key: string) {
  if (activeKey.value === key) return
  activeKey.value = key
}

async function handleRefreshRuntime() {
  if (!selectedClientId.value) return
  actionLoading.refreshRuntime = true
  try {
    await refreshRuntime(selectedClientId.value, activeKey.value)
    await loadClients()
    ElMessage.success('运行状态刷新请求已发送')
  } catch (error: any) {
    ElMessage.error(error?.message || '刷新运行状态失败')
  } finally {
    actionLoading.refreshRuntime = false
  }
}

function handleSizeChange() {
  if (searchResults.value.length > 0) {
    handleSearch()
  }
}

async function doSearch(page = 1) {
  if (!selectedClientId.value) {
    ElMessage.warning('请先选择客户端节点')
    return
  }
  const src = currentSource.value
  if (!src.searchKeyword.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  searchLoading.value = true
  src.selectedItems = []
  src.hasSearched = true
  try {
    const result = await searchMediaCollect(selectedClientId.value, {
      source: activeKey.value,
      query: src.searchKeyword.trim(),
      mediaType: src.mediaType,
      page,
      pageSize: src.pageSize,
    })
    src.searchResults = result.items || []
    src.searchTotal = result.total || 0
    src.currentPage = page
  } catch (error: any) {
    src.searchResults = []
    src.searchTotal = 0
    ElMessage.error(error?.message || '搜索失败')
  } finally {
    searchLoading.value = false
  }
}

function handleSearch() {
  currentSource.value.currentPage = 1
  doSearch(1)
}

function handlePageChange(page: number) {
  doSearch(page)
}

function getItemById(id: string) {
  return searchResults.value.find((item) => item.id === id)
}

function toggleSelect(item: MediaAsset) {
  const index = selectedItems.value.indexOf(item.id)
  if (index > -1) {
    selectedItems.value.splice(index, 1)
  } else {
    selectedItems.value.push(item.id)
  }
}

function toggleSelectAll(value: boolean) {
  selectedItems.value = value ? searchResults.value.map((item) => item.id) : []
}

function clearSelection() {
  selectedItems.value = []
}

async function copyLink(url: string) {
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('链接已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

async function copySelectedLinks() {
  const links = selectedItems.value
    .map((id) => getItemById(id))
    .map((item) => item?.fileUrl || item?.previewUrl || '')
    .filter(Boolean)
  if (!links.length) return
  await copyLink(links.join('\n'))
}

async function handleImport() {
  if (!selectedClientId.value) {
    ElMessage.warning('请先选择客户端节点')
    return
  }
  if (selectedItems.value.length === 0) {
    ElMessage.warning('请先选择要导入的资源')
    return
  }
  importing.value = true
  try {
    const items = selectedItems.value
      .map((id) => getItemById(id))
      .filter((item): item is MediaAsset => !!item)
    const result = await importMediaCollect(selectedClientId.value, items)
    selectedItems.value = []
    ElMessage.success('导入完成')
  } catch (error: any) {
    ElMessage.error(error?.message || '导入失败')
  } finally {
    importing.value = false
  }
}

function onImageError(event: Event) {
  const target = event.target as HTMLImageElement
  target.style.display = 'none'
}

function openPreview(item: MediaAsset) {
  previewItem.value = item
  previewDialogVisible.value = true
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    image: '图片',
    video: '视频',
    audio: '音频',
  }
  return labels[type] || type
}

function formatDuration(seconds?: number) {
  if (!seconds) return ''
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

watch(
  rawClients,
  (list) => {
    if (!selectedClientId.value && list.length > 0) {
      const onlineClient = list.find((client) => client.isOnline)
      selectedClientId.value = onlineClient?.clientId || list[0].clientId
    }
  },
  { immediate: true },
)

onMounted(() => {
  loadClients()
})
</script>

<style scoped>
.collect-page {
  width: 100%;
  height: 100%;
}

.collect-layout {
  display: flex;
  gap: 12px;
  height: calc(100vh - var(--top-tool-height) - var(--tags-view-height));
}

.collect-menu {
  width: 180px;
  flex-shrink: 0;
  padding: 8px;
  overflow-y: auto;
}

.menu-header {
  padding: 0 8px 8px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.menu-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 8px;
}

.menu-group__label {
  padding: 0 8px 4px;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.menu-item {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  user-select: none;
  transition: color 0.15s ease;
}

.menu-item:hover {
  background: transparent;
  color: var(--el-text-color-primary);
}

.menu-item.is-active {
  background: transparent;
  color: var(--el-color-primary);
  font-weight: 500;
}

.menu-item-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collect-body {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}

.standard-collect-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.standard-collect-layout {
  width: 100%;
}

.collect-menu::-webkit-scrollbar,
.collect-body::-webkit-scrollbar {
  width: 4px;
}

.collect-menu::-webkit-scrollbar-thumb,
.collect-body::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 2px;
}

</style>
