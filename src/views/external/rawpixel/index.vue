<template>
  <ContentWrap :plain="true">
    <div class="collect-page">
            <!-- 客户端选择 -->
      <ClientSelector
        v-model="selectedClientId"
        plugin-key="rawpixel"
        @change="handleSelectClient"
        @refresh="loadClients"
      />

      <!-- 客户端节点区域 -->
      <div class="collect-layout" v-loading="loading">
        <!-- 主区域 -->
        <section class="collect-main">
          <div v-if="selectedClient" class="collect-panel">
            <!-- 状态卡片 -->
            

            <!-- 图片采集 -->
            <div class="collect-section">
              <div class="collect-search__header">
                <div class="collect-section__title">图片采集</div>
                <div class="collect-search__opts">
                  <div class="collect-search__field">
                    <span class="collect-search__label">每页数量</span>
                    <el-select v-model="pageSize" size="small" style="width: 100px" @change="handleSizeChange">
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
                  v-model="searchKeyword"
                  clearable
                  placeholder="输入关键词搜索 Rawpixel 素材（如 cat, vintage, art, pattern）"
                  @keyup.enter="handleSearch"
                />
                <el-button type="primary" :loading="searchLoading" @click="handleSearch">
                  搜索
                </el-button>
              </div>

              <!-- 搜索结果 -->
              <div v-if="searchResults.length > 0" class="collect-search__results">
                <!-- 顶部批量操作及状态信息 -->
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
                    <span class="collect-actions-bar__count">已选 {{ selectedItems.length }} 项</span>
                    <el-button
                      type="primary"
                      size="small"
                      :disabled="selectedItems.length === 0"
                      :loading="batchDownloadLoading"
                      @click="handleBatchDownload"
                    >
                      批量采集
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

                <!-- 列表渲染 -->
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
                    <div class="collect-item__thumb" @click="handlePreviewPhoto(item)">
                      <img
                        v-if="item.image || item.thumbnail"
                        :src="item.thumbnail || item.image || ''"
                        :alt="item.title || 'Rawpixel Photo'"
                        loading="lazy"
                      />
                      <div v-else class="collect-item__thumb-error">
                        <el-icon><Picture /></el-icon>
                      </div>
                    </div>
                    <div class="collect-item__info">
                      <div class="collect-item__title" :title="item.title || 'Rawpixel 素材'">
                        {{ item.title || 'Rawpixel 素材' }}
                      </div>
                      <div class="collect-item__meta">
                        <span v-if="item.author">📷 {{ item.author }}</span>
                        <span v-if="item.width" class="collect-item__size">
                          {{ item.width }} × {{ item.height }}
                        </span>
                      </div>
                    </div>
                    <div class="collect-item__actions">
                      <el-button
                        size="small"
                        @click.stop="copyLink(item.link || item.url || item.image || '')"
                        title="复制详情页链接"
                      >
                        复制链接
                      </el-button>
                      <el-button
                        type="primary"
                        size="small"
                        :loading="loadingItems.has(item.id)"
                        :disabled="!item.image && !item.thumbnail"
                        @click.stop="handleSyncOne(item)"
                        title="同步到素材库"
                      >
                        采集入库
                      </el-button>
                    </div>
                  </div>
                </div>

                <!-- 分页 -->
                <div v-if="searchResults.length > 0" class="collect-pagination">
                  <el-pagination
                    v-model:current-page="currentPage"
                    v-model:page-size="pageSize"
                    :total="searchTotal"
                    layout="total, prev, pager, next"
                    background
                    @current-change="handlePageChange"
                    @size-change="handleSizeChange"
                  />
                </div>
              </div>

              <el-empty
                v-else-if="hasSearched && !searchLoading"
                description="未找到匹配的 Rawpixel 图片素材"
              />
            </div>
          </div>
          <el-empty v-else description="请先在上方选择客户端节点" />
        </section>
      </div>

      <!-- 预览模态框 -->
      <el-dialog v-model="previewVisible" title="图片详情" width="700px" destroy-on-close>
        <div v-if="activePhoto" class="preview-modal">
          <div class="preview-modal__img">
            <img :src="activePhoto.image || activePhoto.thumbnail" :alt="activePhoto.title" />
          </div>
          <div class="preview-modal__info">
            <h3>{{ activePhoto.title }}</h3>
            <p v-if="activePhoto.description">{{ activePhoto.description }}</p>
            <div class="preview-modal__meta">
              <div><strong>ID:</strong> {{ activePhoto.id }}</div>
              <div><strong>作者:</strong> {{ activePhoto.author || 'Rawpixel' }}</div>
              <div><strong>授权:</strong> {{ activePhoto.license || 'Public Domain / Free' }}</div>
              <div v-if="activePhoto.width"><strong>分辨率:</strong> {{ activePhoto.width }} x {{ activePhoto.height }}</div>
            </div>
          </div>
        </div>
        <template #footer>
          <el-button @click="previewVisible = false">关闭</el-button>
          <el-button type="primary" @click="handleSyncOne(activePhoto)">采集到素材库</el-button>
        </template>
      </el-dialog>
    </div>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Picture } from '@element-plus/icons-vue'
import { usePluginClientNodes } from '@/services/clientNodeState'
import {
  searchRawpixelAndWait,
  syncRawpixelToMaterialLibraryAndWait,
  collectRawpixel,
  type RawpixelPhoto,
  type RawpixelSearchResult,
} from '@/api/external/rawpixel'
import { uploadMaterialFile } from '@/api/material'
import '@/styles/external-collect.css'
import ClientSelector from '../components/ClientSelector.vue'
defineOptions({ name: 'ExternalRawpixel' })

const {
  clients: rawClients,
  loading,
  refresh: refreshClientNodes,
  getServiceRuntime,
} = usePluginClientNodes('rawpixel')

const selectedClientId = ref('')
const searchKeyword = ref('')
const searchLoading = ref(false)
const hasSearched = ref(false)
const sort = ref('curated')
const currentPage = ref(1)
const pageSize = ref(20)
const searchTotal = ref(0)
const searchResults = ref<RawpixelPhoto[]>([])

const selectedItems = ref<string[]>([])
const loadingItems = ref<Set<string>>(new Set())
const batchDownloadLoading = ref(false)

const actionLoading = reactive({ refreshRuntime: false })
const activePhoto = ref<RawpixelPhoto | null>(null)
const previewVisible = ref(false)

const clients = computed(() => {
  return rawClients.value.map((client) => {
    const rawpixel = getServiceRuntime(client) || null
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
      os: client.clientInfo?.os || null,
      rawpixel,
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
  { immediate: true }
)

const selectedClient = computed(() => {
  if (!selectedClientId.value) return null
  return clients.value.find((c) => c.clientId === selectedClientId.value) || null
})

const availabilityTone = computed(() => (selectedClient.value?.isOnline ? 'online' : 'offline'))
const availabilityText = computed(() => (selectedClient.value?.isOnline ? 'Rawpixel 图库采集服务就绪' : '节点离线'))
const clientTone = computed(() => (selectedClient.value?.isOnline ? 'online' : 'offline'))
const clientStatusText = computed(() => (selectedClient.value?.isOnline ? '客户端在线' : '客户端离线'))
const siteTone = computed(() => 'online')
const siteStatusBadge = computed(() => 'www.rawpixel.com 可用')
const platformText = computed(() => `平台: ${selectedClient.value?.os?.platform || 'Unknown'}`)
const checkedAtText = computed(() => `检查于: ${new Date().toLocaleTimeString()}`)

const totalPages = computed(() => Math.ceil(searchTotal.value / pageSize.value) || 1)

// ─── 多选逻辑 ──────────────────────────────────────────────

const isAllSelected = computed(() => {
  if (searchResults.value.length === 0) return false
  return searchResults.value.every((item) => selectedItems.value.includes(item.id))
})

const isIndeterminate = computed(() => {
  if (searchResults.value.length === 0) return false
  const count = searchResults.value.filter((item) => selectedItems.value.includes(item.id)).length
  return count > 0 && count < searchResults.value.length
})

const toggleSelectAll = (val: boolean) => {
  if (val) {
    const pageIds = searchResults.value.map((item) => item.id)
    selectedItems.value = Array.from(new Set([...selectedItems.value, ...pageIds]))
  } else {
    const pageIds = new Set(searchResults.value.map((item) => item.id))
    selectedItems.value = selectedItems.value.filter((id) => !pageIds.has(id))
  }
}

const toggleSelect = (item: RawpixelPhoto) => {
  const index = selectedItems.value.indexOf(item.id)
  if (index > -1) {
    selectedItems.value.splice(index, 1)
  } else {
    selectedItems.value.push(item.id)
  }
}

const clearSelection = () => {
  selectedItems.value = []
}

const copyLink = (url: string) => {
  if (!url) return
  navigator.clipboard.writeText(url)
  ElMessage.success('已复制链接到剪贴板')
}

const copySelectedLinks = () => {
  const selectedPhotos = searchResults.value.filter((item) => selectedItems.value.includes(item.id))
  const links = selectedPhotos.map((item) => item.link || item.url || item.image).filter(Boolean)
  if (links.length === 0) {
    ElMessage.warning('没有可复制的链接')
    return
  }
  navigator.clipboard.writeText(links.join('\n'))
  ElMessage.success(`已复制 ${links.length} 个链接到剪贴板`)
}

// ─── 页面交互 ──────────────────────────────────────────────

const handleSelectClient = () => {
  searchResults.value = []
  hasSearched.value = false
  clearSelection()
}

const handleRefreshRuntime = async () => {
  actionLoading.refreshRuntime = true
  try {
    await refreshClientNodes()
    ElMessage.success('刷新就绪状态成功')
  } finally {
    actionLoading.refreshRuntime = false
  }
}

const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }
  if (!selectedClientId.value) {
    ElMessage.warning('请选择客户端节点')
    return
  }
  searchLoading.value = true
  hasSearched.value = true
  clearSelection()

  try {
    const res = await searchRawpixelAndWait(selectedClientId.value, searchKeyword.value.trim(), {
      limit: pageSize.value,
      page: currentPage.value,
      sort: sort.value,
    })
    searchResults.value = res?.items || []
    searchTotal.value = res?.total || res?.count || (res?.items || []).length
    if (res?.items?.length) {
      ElMessage.success(`找到 ${res.items.length} 张 Rawpixel 图片`)
    } else {
      ElMessage.info('未搜到匹配结果')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '搜索 Rawpixel 失败')
  } finally {
    searchLoading.value = false
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  handleSearch()
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  handleSearch()
}

const handlePreviewPhoto = (photo: RawpixelPhoto) => {
  activePhoto.value = photo
  previewVisible.value = true
}

// 单张采集
const handleSyncOne = async (item: RawpixelPhoto | null) => {
  if (!item || !selectedClientId.value) return
  loadingItems.value.add(item.id)
  try {
    const result = await syncRawpixelToMaterialLibraryAndWait(selectedClientId.value, {
      imageUrl: item.image,
      metadata: {
        title: item.title,
        url: item.url,
        author: item.author,
        width: item.width,
        height: item.height,
        id: item.id,
      },
    })
    if (result.success) {
      const resultData = result.data?.data || result.data || {}
      if (!resultData.cosUrl) {
        ElMessage.error('图片未成功上传至个人 COS 存储，采集取消')
        return
      }
      await uploadMaterialFile({
        url: resultData.cosUrl,
        originUrl: item.url || item.link || item.image,
        name: item.title || 'Rawpixel 素材',
        keywords: item.tags || searchKeyword.value || 'rawpixel',
        description: item.description || '',
        source: 'rawpixel',
        suffix: 'jpg',
        meta: item,
      })
      ElMessage.success(`《${item.title || item.id}》已成功保存到贴纸素材库！`)
    } else {
      ElMessage.error(`采集失败: ${result.message || '未知错误'}`)
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '同步失败')
  } finally {
    loadingItems.value.delete(item.id)
  }
}

// 批量采集
const handleBatchDownload = async () => {
  if (selectedItems.value.length === 0) {
    ElMessage.warning('请先勾选需要采集的图片')
    return
  }
  if (!selectedClientId.value) {
    ElMessage.warning('请选择客户端节点')
    return
  }

  const selectedPhotos = searchResults.value.filter((item) => selectedItems.value.includes(item.id))
  batchDownloadLoading.value = true
  let successCount = 0
  let failCount = 0

  for (const item of selectedPhotos) {
    loadingItems.value.add(item.id)
    try {
      const result = await syncRawpixelToMaterialLibraryAndWait(selectedClientId.value, {
        imageUrl: item.image,
        metadata: {
          title: item.title,
          url: item.url,
          author: item.author,
          width: item.width,
          height: item.height,
          id: item.id,
        },
      })
      if (result.success) {
        const resultData = result.data?.data || result.data || {}
        if (!resultData.cosUrl) {
          failCount++
          continue
        }
        await uploadMaterialFile({
          url: resultData.cosUrl,
          originUrl: item.url || item.link || item.image,
          name: item.title || 'Rawpixel 素材',
          keywords: item.tags || searchKeyword.value || 'rawpixel',
          description: item.description || '',
          source: 'rawpixel',
          suffix: 'jpg',
          meta: item,
        })
        successCount++
      } else {
        failCount++
      }
    } catch {
      failCount++
    } finally {
      loadingItems.value.delete(item.id)
    }
  }

  batchDownloadLoading.value = false
  if (failCount === 0) {
    ElMessage.success(`批量采集成功：${successCount} 个`)
  } else {
    ElMessage.warning(`批量采集完成：成功 ${successCount} 个，失败 ${failCount} 个`)
  }
}
</script>

<style scoped>
@import '@/styles/external-collect.css';

.preview-modal {
  display: flex;
  gap: 16px;
}

.preview-modal__img {
  flex: 1;
  max-height: 450px;
  overflow: hidden;
  border-radius: 6px;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-modal__img img {
  max-width: 100%;
  max-height: 450px;
  object-fit: contain;
}

.preview-modal__info {
  width: 260px;
}

.preview-modal__meta {
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
}
</style>
