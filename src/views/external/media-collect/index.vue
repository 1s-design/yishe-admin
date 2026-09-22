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
              v-for="item in providers"
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

          <!-- 数据列表 -->
          <div v-if="items.length" class="items-container">
            <div
              v-for="item in items"
              :key="item.id"
              class="item-card"
              :class="{ 'has-cover': Boolean(item.thumbnailUrl), 'is-selected': isSelected(item) }"
              @click="toggleSelect(item)"
            >
              <!-- 选择框 -->
              <div class="card-checkbox" @click.stop="toggleSelect(item)">
                <el-checkbox :model-value="isSelected(item)" />
              </div>

              <!-- 封面缩略图 -->
              <div v-if="item.thumbnailUrl" class="item-cover">
                <img
                  :src="item.thumbnailUrl"
                  :alt="item.title"
                  loading="lazy"
                  @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
                />
              </div>

              <!-- 类型标识（无封面时显示） -->
              <div v-else class="item-type-icon">
                <el-icon v-if="item.mediaType === 'image'" size="18"><Picture /></el-icon>
                <el-icon v-else-if="item.mediaType === 'video'" size="18"><VideoPlay /></el-icon>
                <el-icon v-else-if="item.mediaType === 'audio'" size="18"><Headset /></el-icon>
              </div>

              <!-- 内容区域 -->
              <div class="item-body">
                <div class="item-header">
                  <span class="item-title" :title="item.title">{{ item.title }}</span>
                  <span class="item-type-badge">{{ typeLabel(item.mediaType) }}</span>
                  <span v-if="item.license" class="item-license">{{ item.license }}</span>
                </div>
                <div v-if="item.description" class="item-desc">{{ item.description }}</div>
                <div class="item-footer">
                  <span v-if="item.creator" class="meta-item">👤 {{ item.creator }}</span>
                  <span v-if="item.width && item.height" class="meta-item">{{ item.width }}x{{ item.height }}</span>
                  <span v-if="item.duration" class="meta-item">⏱ {{ formatDuration(item.duration) }}</span>
                  <span v-if="item.fileSize" class="meta-item">📦 {{ formatSize(item.fileSize) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else-if="hasSearched && !loading" class="panel-empty">
            未找到相关资源
          </div>

          <!-- 初始提示 -->
          <div v-else-if="!hasSearched && !loading" class="panel-empty">
            输入关键词开始搜索开放媒体资源
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
import { useRouter } from 'vue-router'
import { Search, Picture, CircleCheck, VideoPlay, Headset } from '@element-plus/icons-vue'
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

// 采集源
const providers = ref<MediaCollectProvider[]>([])
const activeKey = ref('wikimedia')

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
  const provider = providers.value.find((p) => p.key === key)
  if (provider && !provider.supportedTypes.includes(activeMediaType.value)) {
    activeMediaType.value = provider.supportedTypes[0] || 'image'
  }
  if (hasSearched.value && searchQuery.value) handleSearch()
}

// 切换媒体类型
function switchMediaType(type: string) {
  if (activeMediaType.value === type) return
  activeMediaType.value = type
  selectedItems.value = []
  if (hasSearched.value && searchQuery.value) handleSearch()
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
  width: 100%;
  padding: 16px;
}

.panel-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--el-border-color-lighter, #f3f4f6);
  margin-bottom: 14px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.platform-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.platform-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary, #111827);
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.search-input {
  width: 260px;
}

.stats-bar {
  font-size: 12px;
  color: var(--el-text-color-secondary, #9ca3af);
  margin-bottom: 12px;
}

/* 统一极简卡片列表 - 垂直列表 */
.items-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter, #f3f4f6);
  background: var(--el-bg-color, #ffffff);
  cursor: pointer;
  transition: all 0.15s ease;
}

.item-card:hover {
  background: var(--el-fill-color-lighter, #fafafa);
  border-color: var(--el-border-color, #e5e7eb);
  transform: translateX(2px);
}

.item-card.is-selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9, #ecf5ff);
}

.card-checkbox {
  flex-shrink: 0;
}

/* 缩略图 */
.item-cover {
  position: relative;
  width: 72px;
  height: 54px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background: var(--el-fill-color-light, #f3f4f6);
}

.item-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 类型图标（无封面时） */
.item-type-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 4px;
  background: var(--el-fill-color-light, #f3f4f6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary, #9ca3af);
}

.item-body {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary, #1f2937);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-card:hover .item-title {
  color: var(--el-color-primary, #4f46e5);
}

.item-type-badge {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 3px;
  background: #eef2ff;
  color: #4f46e5;
  flex-shrink: 0;
  font-weight: 600;
}

.item-license {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 3px;
  background: #fef2f2;
  color: #ef4444;
  flex-shrink: 0;
  font-weight: 600;
}

.item-desc {
  margin-top: 3px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #6b7280);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
  font-size: 11px;
  color: var(--el-text-color-placeholder, #9ca3af);
}

.meta-item {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-empty {
  padding: 80px 0;
  text-align: center;
  font-size: 13px;
  color: var(--el-text-color-secondary, #9ca3af);
}

.pagination {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.import-result {
  display: flex;
  align-items: center;
  gap: 12px;
}

.success-icon {
  font-size: 28px;
}

.failed-text {
  color: var(--el-color-danger);
  margin-top: 4px;
}
</style>
