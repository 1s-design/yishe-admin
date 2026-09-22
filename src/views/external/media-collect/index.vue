<template>
  <div class="media-collect-page">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <div class="search-row">
        <el-select
          v-model="selectedSource"
          placeholder="选择采集源"
          style="width: 180px"
          @change="handleSourceChange"
        >
          <el-option
            v-for="provider in providers"
            :key="provider.key"
            :label="provider.name"
            :value="provider.key"
          />
        </el-select>

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

        <el-select
          v-model="selectedMediaType"
          placeholder="媒体类型"
          style="width: 120px"
        >
          <el-option label="图片" value="image" />
          <el-option label="视频" value="video" />
          <el-option label="音频" value="audio" />
        </el-select>

        <el-button type="primary" :loading="loading" @click="handleSearch">
          搜索
        </el-button>
      </div>
    </div>

    <!-- 结果统计 -->
    <div v-if="hasSearched" class="result-info">
      共找到 <strong>{{ totalCount }}</strong> 条结果，当前第 {{ currentPage }} 页
      <el-button
        v-if="selectedItems.length > 0"
        type="success"
        size="small"
        :loading="importing"
        @click="handleImport"
        style="margin-left: 16px"
      >
        导入选中 ({{ selectedItems.length }})
      </el-button>
    </div>

    <!-- 资源网格 -->
    <div v-loading="loading" class="media-grid">
      <div
        v-for="item in items"
        :key="item.id"
        class="media-card"
        :class="{ 'is-selected': isSelected(item) }"
        @click="toggleSelect(item)"
      >
        <!-- 选择框 -->
        <div class="card-select" @click.stop="toggleSelect(item)">
          <el-checkbox :model-value="isSelected(item)" />
        </div>

        <!-- 类型标签 -->
        <div class="card-type-badge">{{ typeLabel(item.mediaType) }}</div>

        <!-- 缩略图 -->
        <div class="card-thumb">
          <img
            v-if="item.thumbnailUrl"
            :src="item.thumbnailUrl"
            :alt="item.title"
            loading="lazy"
            @error="handleImgError"
          />
          <div v-else class="thumb-placeholder">
            <el-icon size="32"><Picture /></el-icon>
          </div>
        </div>

        <!-- 信息 -->
        <div class="card-info">
          <div class="card-title" :title="item.title">{{ item.title }}</div>
          <div class="card-meta">
            <span v-if="item.width && item.height">{{ item.width }}x{{ item.height }}</span>
            <span v-if="item.duration">时长: {{ formatDuration(item.duration) }}</span>
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
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
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

// 采集源
const providers = ref<MediaCollectProvider[]>([])
const selectedSource = ref('wikimedia')

// 搜索
const searchQuery = ref('')
const selectedMediaType = ref('image')
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
import const importResult = reactive({ success: 0, failed: 0 })

// 加载采集源
async function loadProviders() {
  try {
    const res: any = await getMediaCollectProviders()
    if (res?.data?.length) {
      providers.value = res.data
      // 默认选中第一个支持图片的
      const imgProvider = res.data.find((p: MediaCollectProvider) =>
        p.supportedTypes.includes('image')
      )
      if (imgProvider) selectedSource.value = imgProvider.key
    }
  } catch (e: any) {
    ElMessage.error(`加载采集源失败: ${e.message}`)
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
  try {
    const res: any = await searchMediaCollect({
      source: selectedSource.value,
      query: searchQuery.value,
      mediaType: selectedMediaType.value,
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

// 源切换
function handleSourceChange() {
  selectedItems.value = []
  // 检查当前媒体类型是否被新源支持
  const provider = providers.value.find((p) => p.key === selectedSource.value)
  if (provider && !provider.supportedTypes.includes(selectedMediaType.value)) {
    selectedMediaType.value = provider.supportedTypes[0] || 'image'
  }
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

// 跳转到文件库
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

function handleImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

onMounted(() => {
  loadProviders()
})
</script>

<style scoped lang="scss">
.media-collect-page {
  padding: 20px;
  min-height: 600px;
}

.search-bar {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.search-row {
  display: flex;
  gap: 12px;
  align-items: center;

  .search-input {
    flex: 1;
    max-width: 500px;
  }
}

.result-info {
  padding: 8px 0 16px;
  color: #606266;
  font-size: 14px;
  display: flex;
  align-items: center;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  min-height: 200px;
}

.media-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  position: relative;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  &.is-selected {
    border-color: #409eff;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
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
  background: #f5f7fa;
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
    color: #303133;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 4px;
  }

  .card-meta {
    display: flex;
    gap: 8px;
    font-size: 11px;
    color: #909399;
    flex-wrap: wrap;
  }

  .card-license {
    font-size: 11px;
    color: #e6a23c;
    margin-top: 4px;
  }
}

.pagination {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

.import-result {
  display: flex;
  align-items: center;
  gap: 12px;

  .success-icon {
    font-size: 28px;
  }

  .failed-text {
    color: #f56c6c;
    margin-top: 4px;
  }
}
</style>
