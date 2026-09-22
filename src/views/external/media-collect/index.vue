<template>
  <div class="collect-page">
    <div class="collect-layout">
      <!-- 左侧菜单 -->
      <aside class="collect-menu">
        <div class="menu-header">媒体采集</div>
        <nav class="menu-list">
          <div class="menu-group">
            <div class="menu-group__label">开放素材库</div>
            <div
              v-for="item in openProviders"
              :key="item.key"
              class="menu-item"
              :class="{ 'is-active': activeKey === item.key }"
              @click="switchTab(item.key)"
            >
              <span class="menu-item-text">{{ item.name }}</span>
            </div>
          </div>
          <div class="menu-group">
            <div class="menu-group__label">媒体类型</div>
            <div
              v-for="type in mediaTypes"
              :key="type.value"
              class="menu-item"
              :class="{ 'is-active': activeMediaType === type.value }"
              @click="switchMediaType(type.value)"
            >
              <span class="menu-item-text">{{ type.label }}</span>
            </div>
          </div>
        </nav>
      </aside>

      <!-- 右侧内容 -->
      <main class="collect-body">
        <div class="media-panel" v-loading="loading">
          <!-- 顶部工具条 -->
          <div class="panel-toolbar">
            <div class="toolbar-left">
              <div class="platform-header">
                <span class="platform-name">{{ activeProvider?.name || '媒体采集' }}</span>
                <span class="platform-subtitle">{{ typeLabel(activeMediaType) }}</span>
              </div>
            </div>
            <div class="toolbar-right">
              <el-input
                v-model="searchQuery"
                placeholder="输入搜索关键词..."
                class="search-input"
                clearable
                @keyup.enter="handleSearch"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-button
                type="primary"
                :loading="loading"
                @click="handleSearch"
              >
                {{ items.length ? '再次搜索' : '开始搜索' }}
              </el-button>
              <el-button
                v-if="selectedItems.length > 0"
                type="success"
                :loading="importing"
                @click="handleImport"
              >
                导入选中 ({{ selectedItems.length }})
              </el-button>
            </div>
          </div>

          <!-- 结果统计 -->
          <div v-if="hasSearched" class="stats-bar">
            共找到 <strong>{{ totalCount }}</strong> 条结果
            <span v-if="items.length">，当前显示 {{ items.length }} 条</span>
          </div>

          <!-- 资源网格 -->
          <div v-if="items.length" class="media-grid">
            <div
              v-for="item in items"
              :key="item.id"
              class="media-card"
              :class="{ 'is-selected': isSelected(item) }"
              @click="toggleSelect(item)"
            >
              <div class="card-select" @click.stop="toggleSelect(item)">
                <el-checkbox :model-value="isSelected(item)" />
              </div>
              <div class="card-type-badge">{{ typeLabel(item.mediaType) }}</div>
              <div class="card-thumb">
                <img
                  v-if="item.thumbnailUrl"
                  :src="item.thumbnailUrl"
                  :alt="item.title"
                  loading="lazy"
                  @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
                />
                <div v-else class="thumb-placeholder">
                  <el-icon size="32"><Picture /></el-icon>
                </div>
              </div>
              <div class="card-info">
                <div class="card-title" :title="item.title">{{ item.title }}</div>
                <div class="card-meta">
                  <span v-if="item.width && item.height">{{ item.width }}x{{ item.height }}</span>
                  <span v-if="item.duration">{{ formatDuration(item.duration) }}</span>
                  <span v-if="item.fileSize">{{ formatSize(item.fileSize) }}</span>
                </div>
                <div v-if="item.license" class="card-license">{{ item.license }}</div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <el-empty
            v-if="hasSearched && items.length === 0 && !loading"
            description="未找到相关资源"
          />

          <!-- 初始提示 -->
          <div v-if="!hasSearched && !loading" class="empty-tip">
            <el-icon size="48" color="#c0c4cc"><Picture /></el-icon>
            <p>输入关键词开始搜索开放媒体资源</p>
            <p class="empty-sub">支持 Wikimedia Commons 和 Internet Archive</p>
          </div>

          <!-- 分页 -->
          <div v-if="totalCount > pageSize" class="pagination">
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="pageSize"
              :total="totalCount"
              layout="prev, pager, next, jumper"
              @current-change="handlePageChange"
            />
          </div>
        </div>
      </main>
    </div>

    <!-- 导入成功提示 -->
    <el-dialog v-model="importDialogVisible" title="导入结果" width="400px">
      <div class="import-result">
        <el-icon class="success-icon" color="#67c23a"><CircleCheck /></el-icon>
        <div>
          <p>成功导入 <strong>{{ importResult.success }}</strong> 个资源到文件库</p>
          <p v-if="importResult.failed > 0" class="failed-text">
            失败 <strong>{{ importResult.failed }}</strong> 个
          </p>
        </div>
      </div>
      <template #footer>
        <el-button @click="importDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="goToFileResource">查看文件库</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Search, Picture, CircleCheck } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  getMediaCollectProviders,
  searchMediaCollect,
  importMediaCollect,
  type MediaCollectProvider,
  type MediaAsset,
} from '@/api/media-collect'

defineOptions({ name: 'ExternalMediaCollect' })

const router = useRouter()
const route = useRoute()

// 采集源
const providers = ref<MediaCollectProvider[]>([])
const activeKey = ref('wikimedia')

const openProviders = computed(() => providers.value)

const activeProvider = computed(() =>
  providers.value.find((p) => p.key === activeKey.value),
)

// 媒体类型
const mediaTypes = [
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: '音频', value: 'audio' },
]
const activeMediaType = ref('image')

// 搜索
const searchQuery = ref('')
const loading = ref(false)
const hasSearched = ref(false)
const items = ref<MediaAsset[]>([])
const totalCount = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

// 选择
const selectedItems = ref<MediaAsset[]>([])

// 导入
const importing = ref(false)
const importDialogVisible = ref(false)
const importResult = reactive({ success: 0, failed: 0 })

// 加载采集源
async function loadProviders() {
  try {
    const res: any = await getMediaCollectProviders()
    if (res?.data?.length) {
      providers.value = res.data
      const imgProvider = res.data.find((p: MediaCollectProvider) =>
        p.supportedTypes.includes('image'),
      )
      if (imgProvider) activeKey.value = imgProvider.key
    }
  } catch (e: any) {
    ElMessage.error(`加载采集源失败: ${e.message}`)
  }
}

// 切换源
function switchTab(key: string) {
  if (activeKey.value === key) return
  activeKey.value = key
  selectedItems.value = []
  // 检查新源是否支持当前媒体类型
  const provider = providers.value.find((p) => p.key === key)
  if (provider && !provider.supportedTypes.includes(activeMediaType.value)) {
    activeMediaType.value = provider.supportedTypes[0] || 'image'
  }
  // 自动重新搜索
  if (hasSearched.value && searchQuery.value) {
    handleSearch()
  }
}

// 切换媒体类型
function switchMediaType(type: string) {
  if (activeMediaType.value === type) return
  activeMediaType.value = type
  selectedItems.value = []
  if (hasSearched.value && searchQuery.value) {
    handleSearch()
  }
}

// 搜索
async function handleSearch() {
  if (!searchQuery.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }
  loading.value = true
  hasSearched.value = true
  selectedItems.value = []
  currentPage.value = 1
  try {
    const res: any = await searchMediaCollect({
      source: activeKey.value,
      query: searchQuery.value,
      mediaType: activeMediaType.value,
      page: currentPage.value,
      pageSize: pageSize.value,
    })
    if (res?.data) {
      items.value = res.data.items || []
      totalCount.value = res.data.total || 0
    }
  } catch (e: any) {
    ElMessage.error(`搜索失败: ${e.message}`)
  } finally {
    loading.value = false
  }
}

// 分页
function handlePageChange(page: number) {
  currentPage.value = page
  handleSearch()
}

// 选择
function isSelected(item: MediaAsset) {
  return selectedItems.value.some((s) => s.id === item.id)
}

function toggleSelect(item: MediaAsset) {
  const idx = selectedItems.value.findIndex((s) => s.id === item.id)
  if (idx >= 0) {
    selectedItems.value.splice(idx, 1)
  } else {
    selectedItems.value.push(item)
  }
}

// 导入
async function handleImport() {
  if (selectedItems.value.length === 0) return
  importing.value = true
  try {
    const res: any = await importMediaCollect(selectedItems.value)
    if (res?.data) {
      importResult.success = res.data.success || 0
      importResult.failed = res.data.failed || 0
      importDialogVisible.value = true
      selectedItems.value = []
    }
  } catch (e: any) {
    ElMessage.error(`导入失败: ${e.message}`)
  } finally {
    importing.value = false
  }
}

// 跳转文件库
function goToFileResource() {
  importDialogVisible.value = false
  router.push({ path: '/material/file-resource' })
}

// 工具函数
function typeLabel(type: string) {
  const map: Record<string, string> = { image: '图片', video: '视频', audio: '音频' }
  return map[type] || type
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

onMounted(() => {
  loadProviders()
})
</script>

<style scoped lang="scss">
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
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  padding: 0 8px 4px 8px;
}

.menu-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 8px;
}

.menu-group__label {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  padding: 0 8px 4px 8px;
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
  transition: color 0.15s ease;
  user-select: none;
}

.menu-item:hover {
  background: transparent;
  color: var(--el-text-color-primary);
}

.menu-item:focus,
.menu-item:focus-visible {
  outline: none;
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

/* 窄滚动条 */
.collect-menu::-webkit-scrollbar,
.collect-body::-webkit-scrollbar {
  width: 4px;
}

.collect-menu::-webkit-scrollbar-track,
.collect-body::-webkit-scrollbar-track {
  background: transparent;
}

.collect-menu::-webkit-scrollbar-thumb,
.collect-body::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 2px;
}

.collect-menu::-webkit-scrollbar-thumb:hover,
.collect-body::-webkit-scrollbar-thumb:hover {
  background: var(--el-text-color-secondary);
}

/* 面板内容 */
.media-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.platform-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.platform-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.platform-subtitle {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  width: 280px;
}

.stats-bar {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

/* 资源网格 */
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding: 16px;
  flex: 1;
  align-content: start;
}

.media-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid var(--el-border-color-lighter);
  position: relative;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }

  &.is-selected {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.15);
  }
}

.card-select {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
}

.card-type-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  z-index: 2;
}

.card-thumb {
  width: 100%;
  height: 140px;
  background: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .thumb-placeholder {
    color: #c0c4cc;
  }
}

.card-info {
  padding: 10px 12px;

  .card-title {
    font-size: 13px;
    color: var(--el-text-color-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 4px;
  }

  .card-meta {
    display: flex;
    gap: 8px;
    font-size: 11px;
    color: var(--el-text-color-secondary);
    flex-wrap: wrap;
  }

  .card-license {
    font-size: 11px;
    color: var(--el-color-warning);
    margin-top: 4px;
  }
}

/* 空状态 */
.empty-tip {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
  gap: 8px;

  p {
    margin: 0;
    font-size: 14px;
  }

  .empty-sub {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }
}

.pagination {
  display: flex;
  justify-content: center;
  padding: 16px;
  flex-shrink: 0;
}

.import-result {
  display: flex;
  align-items: center;
  gap: 12px;

  .success-icon {
    font-size: 28px;
  }

  .failed-text {
    color: var(--el-color-danger);
    margin-top: 4px;
  }
}
</style>
