<template>
  <ContentWrap :plain="true">
    <div class="collect-page">
      <!-- 客户端选择 -->
      <ClientSelector
        v-model="selectedClientId"
        plugin-key="google-art"
        @change="handleSelectClient"
        @refresh="loadClients"
      />

      <!-- 客户端节点区域 -->
      <div class="collect-layout" v-loading="loading">
        <!-- 主区域 -->
        <section class="collect-main">
          <div v-if="selectedClient" class="collect-panel">
            <!-- 作品搜索 -->
            <div class="collect-section">
              <div class="collect-search__header">
                <div class="collect-section__title">作品搜索</div>
                <div class="collect-search__opts">
                  <div class="collect-search__field">
                    <span class="collect-search__label">每页条数</span>
                    <el-select v-model="pageSize" size="small" style="width: 100px" @change="handleSizeChange">
                      <el-option :value="20" label="20 条" />
                      <el-option :value="30" label="30 条" />
                      <el-option :value="48" label="48 条" />
                      <el-option :value="64" label="64 条" />
                    </el-select>
                  </div>
                </div>
              </div>
              <div class="collect-inline">
                <el-input
                  v-model="searchKeyword"
                  clearable
                  placeholder="输入关键词搜索艺术作品（英文效果更佳，如 van gogh, impressionism）"
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

              <!-- 搜索结果 -->
              <div v-if="searchResults.length > 0" class="collect-search__results">
                <!-- 顶部批量操作及状态信息 -->
                <div class="collect-search__header">
                  <div class="collect-search__info">
                    <template v-if="searchTotal > 0">
                      共 {{ searchTotal }} 个结果 · 第 {{ currentPage }} 页（第 {{ paginationStart }} - {{ paginationEnd }} 条）
                    </template>
                    <template v-else>
                      共 {{ searchResults.length }} 个结果
                    </template>
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
                    <el-select
                      v-model="batchQualityPreference"
                      size="small"
                      style="width: 155px; margin-right: 8px;"
                      placeholder="清晰度选择"
                    >
                      <el-option label="按最大像素(最高清)" value="max" />
                      <el-option label="按最小像素(最低清)" value="min" />
                    </el-select>
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

                <div class="collect-list">
                  <div
                    v-for="item in searchResults"
                    :key="item.id"
                    class="collect-item"
                    :class="{ 'is-selected': selectedItems.includes(item.url) }"
                  >
                    <el-checkbox
                      :model-value="selectedItems.includes(item.url)"
                      @change="toggleSelect(item)"
                    />
                    <div class="collect-item__thumb">
                      <img
                        v-if="item.thumbnail"
                        :src="item.thumbnail"
                        :alt="item.title"
                        loading="lazy"
                        @error="onImageError"
                      />
                      <div v-else class="collect-item__thumb-error">
                        <el-icon><Picture /></el-icon>
                      </div>
                    </div>
                    <div class="collect-item__info">
                      <div class="collect-item__title" :title="item.title">{{ item.title }}</div>
                      <div class="collect-item__meta">
                        <span v-if="item.artist">{{ item.artist }}</span>
                        <span v-if="item.institution">{{ item.institution }}</span>
                      </div>
                    </div>
                    <div class="collect-item__actions">
                      <el-button
                        size="small"
                        @click.stop="copyLink(item.url)"
                        title="复制详情页链接"
                      >
                        复制链接
                      </el-button>
                      <el-button
                        type="primary"
                        size="small"
                        :loading="loadingItems.has(item.id)"
                        @click.stop="openZoomDialog(item)"
                        title="添加到素材库"
                      >
                        采集入库
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>

                <!-- 分页 -->
                <div class="collect-pagination">
                  <el-pagination
                    :current-page="currentPage"
                    :total="searchTotal"
                    :page-size="pageSize"
                    layout="total, prev, pager, next"
                    background
                    :pager-count="5"
                    @current-change="handlePageChange"
                    @size-change="handleSizeChange"
                  />
                </div>
            </div>

              <!-- 单链接下载（兼容模式） -->
              <div class="collect-section">
                <div class="collect-section__title">单链接下载</div>
                <div class="collect-inline">
                  <el-input
                    v-model="artUrl"
                    clearable
                    placeholder="https://artsandculture.google.com/asset/..."
                    @keyup.enter="handleFetchZooms"
                  />
                  <el-button
                    type="primary"
                    :disabled="!canOperate || !artUrl.trim()"
                    :loading="actionLoading.getZooms"
                    @click="handleFetchZooms"
                  >
                    获取分辨率
                  </el-button>
                </div>

                <div v-if="zoomOptions.length" class="collect-field">
                  <div class="collect-field__label">分辨率</div>
                  <el-radio-group v-model="selectedZoom" class="zoom-group">
                    <el-radio-button v-for="item in zoomOptions" :key="item.idx" :value="item.idx" :label="item.idx">
                      {{ item.width }} × {{ item.height }}
                    </el-radio-button>
                  </el-radio-group>
                </div>

                <div class="collect-actions" v-if="zoomOptions.length">
                  <el-button
                    type="primary"
                    :disabled="!canOperate || !artUrl.trim() || selectedZoom === null"
                    :loading="actionLoading.sync"
                    @click="handleSync"
                  >
                    同步到素材库
                  </el-button>
                </div>
              </div>
            </div>

            <div v-else class="collect-panel collect-panel--empty">
              <el-empty description="请选择客户端节点" />
            </div>
          </section>

          <!-- 分辨率选择对话框 -->
          <el-dialog
            v-model="zoomDialogVisible"
            title="选择分辨率"
            width="480px"
            destroy-on-close
            align-center
          >
            <div v-if="zoomDialogItem" class="zoom-dialog">
              <div class="zoom-dialog__preview">
                <img
                  v-if="zoomDialogItem.thumbnail"
                  :src="zoomDialogItem.thumbnail"
                  :alt="zoomDialogItem.title"
                />
                <div class="zoom-dialog__info">
                  <div class="zoom-dialog__title">{{ zoomDialogItem.title }}</div>
                  <div class="zoom-dialog__meta">
                    <span v-if="zoomDialogItem.artist">{{ zoomDialogItem.artist }}</span>
                    <span v-if="zoomDialogItem.institution">{{ zoomDialogItem.institution }}</span>
                  </div>
                </div>
              </div>
              <div class="zoom-dialog__options">
                <div class="zoom-dialog__label">选择分辨率（越大越清晰，文件也越大）</div>
                <el-radio-group v-model="selectedZoomLevel" class="zoom-options">
                  <el-radio
                    v-for="zoom in zoomDialogOptions"
                    :key="zoom.idx"
                    :value="zoom.idx"
                    :label="zoom.idx"
                    class="zoom-option"
                  >
                    <span class="zoom-option__size">{{ zoom.width }} × {{ zoom.height }} px</span>
                    <span class="zoom-option__label">{{ zoom.label }}</span>
                    <span class="zoom-option__tiles">{{ zoom.tiles }} tiles</span>
                  </el-radio>
                </el-radio-group>
              </div>
            </div>
            <template #footer>
              <el-button @click="zoomDialogVisible = false">取消</el-button>
              <el-button
                type="primary"
                :loading="zoomDialogLoading"
                :disabled="selectedZoomLevel === null || selectedZoomLevel === undefined"
                @click="confirmDownload"
              >
                确认采集
              </el-button>
            </template>
          </el-dialog>
        </div>
      </div>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { Link, Picture } from '@element-plus/icons-vue'
import {
  fetchGoogleArtZooms,
  fetchGoogleArtZoomsAndWait,
  refreshGoogleArtStatus,
  searchGoogleArts,
  searchGoogleArtsAndWait,
  syncGoogleArtToMaterialLibrary,
  syncGoogleArtToMaterialLibraryAndWait,
  type GoogleArtAsset,
  type GoogleArtClientVO,
  type GoogleArtServiceStatus,
  type GoogleArtZoomLevel,
} from '@/api/external/googleArt'
import { websocketClient, type ServiceCommandResultEvent } from '@/services/websocketClient'
import { uploadMaterialFile } from '@/api/material'
import { useClientNodeState } from '@/services/clientNodeState'
import { getClientServiceRuntime } from '@/store/modules/clientNode';import { formatDate } from '@/utils/formatTime'
import ExternalClientSidebar, {
  type ClientNodeItem,
} from '../components/ExternalClientSidebar.vue'
import ClientSelector from '../components/ClientSelector.vue'

defineOptions({ name: 'ExternalGoogleArt' })

const GOOGLE_ART_QUICK_LINK = 'https://artsandculture.google.com/search/asset?q'

// ─── 客户端节点 ──────────────────────────────────────────────

const {
  onlineClients,
  loading,
  refresh: refreshClientNodes,
} = useClientNodeState();
const _getServiceRuntime = (c: any) => getClientServiceRuntime(c, 'google-art');

const selectedClientId = ref('')
const artUrl = ref('')
const zoomOptions = ref<GoogleArtZoomLevel[]>([])
const selectedZoom = ref<number | null>(null)
const lastResult = ref<{
  success: boolean
  message: string
  data?: Record<string, any> | null
} | null>(null)

const actionLoading = reactive({
  refreshRuntime: false,
  getZooms: false,
  sync: false,
})

const pendingCommandIds = reactive<Record<string, 'refreshRuntime' | 'getZooms' | 'sync'>>({})

// ─── 搜索 ────────────────────────────────────────────────────

const searchKeyword = ref('')
const searchLoading = ref(false)
const pageSize = ref(20)
const searchResults = ref<GoogleArtAsset[]>([])
const selectedItems = ref<string[]>([])
const imageErrorSet = ref<Set<string>>(new Set())
const loadingItems = ref<Set<string>>(new Set())
const searchTotal = ref(0)
const currentPage = ref(1)
const nextCursor = ref<string | null>(null)
const cursorHistory = ref<string[]>([])

// ─── 分辨率选择对话框 ───
const zoomDialogVisible = ref(false)
const zoomDialogLoading = ref(false)
const zoomDialogItem = ref<GoogleArtAsset | null>(null)
const zoomDialogOptions = ref<GoogleArtZoomLevel[]>([])
const selectedZoomLevel = ref<number | null>(null)
const batchDownloadLoading = ref(false)
const batchQualityPreference = ref<'max' | 'min'>('min')

// ─── 计算属性 ────────────────────────────────────────────────

const mapGoogleArtClient = (client: any): GoogleArtClientVO => ({
  clientId: client.id,
  isOnline: client.isOnline,
  nodeStatus: client.nodeStatus,
  connectedAt: client.connectedAt,
  lastOnlineAt: client.lastOnlineAt,
  appVersion: client.clientInfo?.appVersion || null,
  machine: client.clientInfo?.machine || null,
  location: client.clientInfo?.location || null,
  googleArt: (_getServiceRuntime(client) as GoogleArtServiceStatus | null) || null,
})

const clients = computed<GoogleArtClientVO[]>(() =>
  onlineClients.value.map((client) => mapGoogleArtClient(client)),
)

const selectedClient = computed(
  () => clients.value.find((item) => item.clientId === selectedClientId.value) || null,
)

const selectedService = computed<GoogleArtServiceStatus | null>(
  () => selectedClient.value?.googleArt || null,
)

const selectedDetails = computed<Record<string, any>>(() => selectedService.value?.details || {})

const canOperate = computed(
  () => !!(selectedClientId.value && selectedClient.value?.isOnline && selectedService.value?.available),
)

const clientNodeItems = computed<ClientNodeItem[]>(() =>
  clients.value.map((client) => ({
    connectionId: client.clientId,
    name: client.machine?.code || client.clientId,
    time: formatDateSafe(client.connectedAt),
    metaLeft: client.appVersion || '未知版本',
    metaRight: client.location?.ip || client.location?.city || '未知位置',
    detail: client.workspaceDirectory ? `工作目录: ${client.workspaceDirectory}` : '工作目录: 未上报',
  })),
)

const availabilityTone = computed(() =>
  selectedService.value?.available ? 'success' : selectedClient.value?.isOnline ? 'warning' : 'muted',
)

const availabilityText = computed(() => {
  if (!selectedClient.value?.isOnline) return '客户端离线'
  if (selectedService.value?.available) return '可同步'
  return '受限'
})

const clientTone = computed(() => (selectedClient.value?.isOnline ? 'success' : 'muted'))

const clientStatusText = computed(() => (selectedClient.value?.isOnline ? '客户端在线' : '客户端离线'))

const siteTone = computed(() => {
  if (!selectedClient.value?.isOnline) return 'muted'
  if (selectedDetails.value.siteAvailable) return 'success'
  return 'warning'
})

const siteStatusBadge = computed(() => {
  if (!selectedClient.value?.isOnline) return '站点未检测'
  if (selectedDetails.value.siteAvailable) {
    return Number.isFinite(selectedDetails.value.siteLatencyMs)
      ? `网站连通 ${selectedDetails.value.siteLatencyMs}ms`
      : '网站连通'
  }
  return '站点异常'
})

const platformText = computed(() => selectedDetails.value.platformName || selectedDetails.value.platform || '未知平台')

const checkedAtText = computed(() => `检测 ${formatDateSafe(selectedService.value?.lastCheckedAt)}`)

// ─── 方法 ────────────────────────────────────────────────────

const formatDateSafe = (value?: string | null) => {
  if (!value) return '-'
  try {
    return formatDate(new Date(value))
  } catch {
    return value
  }
}

const formatFileSize = (value?: number) => {
  if (!value || !Number.isFinite(value)) return '-'
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

const loadClients = async () => {
  await refreshClientNodes()
  const list = clients.value
  if (!selectedClientId.value && list.length) {
    selectedClientId.value = list[0].clientId
  } else if (selectedClientId.value && !list.some((item) => item.clientId === selectedClientId.value)) {
    selectedClientId.value = list[0]?.clientId || ''
  }
}

const handleSelectClient = (clientId: string) => {
  selectedClientId.value = clientId
  zoomOptions.value = []
  selectedZoom.value = null
  lastResult.value = null
}

// ─── 搜索相关 ────────────────────────────────────────────────

const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  if (!selectedClientId.value) {
    ElMessage.warning('请先选择客户端节点')
    return
  }

  searchLoading.value = true
  selectedItems.value = []
  imageErrorSet.value.clear()
  currentPage.value = 1
  nextCursor.value = null
  cursorHistory.value = []

  try {
    const result = await searchGoogleArtsAndWait(selectedClientId.value, searchKeyword.value.trim(), 1, 'en', pageSize.value, null)

    if (!result || !result.items) {
      ElMessage.error('搜索返回数据异常')
      searchLoading.value = false
      return
    }
    searchResults.value = result.items || []
    searchTotal.value = result.total ?? 0
    nextCursor.value = result.nextCursor || null
    cursorHistory.value = [null]

    if (searchResults.value.length === 0) {
      ElMessage.info('未找到匹配的作品')
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '搜索失败')
  } finally {
    searchLoading.value = false
  }
}

const handlePageChange = async (newPage: number) => {
  if (!newPage || newPage < 1) return
  if (newPage === currentPage.value) return
  if (!selectedClientId.value || !searchKeyword.value.trim()) return

  // 上一页优先用本地缓存游标回退，不发请求
  if (newPage < currentPage.value) {
    const cachedCursor = cursorHistory.value[newPage - 1] ?? null
    if (cachedCursor || newPage === 1) {
      const current = currentPage.value
      currentPage.value = newPage
      const ok = cachedCursor
        ? await loadPage(newPage, cachedCursor)
        : await loadPage(newPage, null)
      if (!ok) currentPage.value = current
      return
    }
  }

  // 下一页/任意页：用页码直查（客户端从首页游标走到目标页）
  const current = currentPage.value
  currentPage.value = newPage
  const ok = await loadPage(newPage, null)
  if (!ok) currentPage.value = current
}

const handleNextPage = async () => {
  if (!nextCursor.value || !selectedClientId.value || !searchKeyword.value.trim()) return
  const current = currentPage.value
  const nextPage = current + 1
  currentPage.value = nextPage
  const ok = await loadPage(nextPage, null)
  if (!ok) currentPage.value = current
}

const handlePrevPage = async () => {
  if (currentPage.value <= 1) return
  const targetPage = currentPage.value - 1
  const cachedCursor = cursorHistory.value[targetPage - 1] ?? null
  const current = currentPage.value
  currentPage.value = targetPage
  const ok = cachedCursor ? await loadPage(targetPage, cachedCursor) : await loadPage(targetPage, null)
  if (!ok) currentPage.value = current
}

const loadPage = async (targetPage: number, cursor: string | null): Promise<boolean> => {
  if (!selectedClientId.value || !searchKeyword.value.trim()) return false

  searchLoading.value = true
  selectedItems.value = []
  imageErrorSet.value.clear()

  try {
    const result = await searchGoogleArtsAndWait(selectedClientId.value, searchKeyword.value.trim(), targetPage, 'en', pageSize.value, cursor)

    if (!result || !result.items) {
      ElMessage.error('加载页面数据异常')
      return false
    }
    searchResults.value = result.items || []
    searchTotal.value = result.total ?? searchTotal.value
    if (targetPage >= currentPage.value) {
      cursorHistory.value[targetPage - 1] = cursor
      nextCursor.value = result.nextCursor || null
      if (searchResults.value.length === 0) {
        ElMessage.info('没有更多结果了')
        nextCursor.value = null
      }
    }
    return true
  } catch (error: any) {
    ElMessage.error(error?.message || '加载页面失败')
    return false
  } finally {
    searchLoading.value = false
  }
}

const paginationStart = computed(() => {
  if (searchResults.value.length === 0) return 0
  return (currentPage.value - 1) * pageSize.value + 1
})

const paginationEnd = computed(() => {
  if (searchResults.value.length === 0) return 0
  return paginationStart.value + searchResults.value.length - 1
})

const toggleSelect = (item: GoogleArtAsset) => {
  const index = selectedItems.value.indexOf(item.url)
  if (index >= 0) {
    selectedItems.value.splice(index, 1)
  } else {
    selectedItems.value.push(item.url)
  }
}

const clearSelection = () => {
  selectedItems.value = []
}

const handleBatchDownload = async () => {
  if (!selectedClientId.value || !selectedItems.value.length) return

  batchDownloadLoading.value = true
  let successCount = 0
  let failCount = 0

  const qualityLabel = batchQualityPreference.value === 'min' ? '按最小像素' : '按最大像素'

  ElNotification.info({
    title: '批量下载',
    message: `开始下载 ${selectedItems.value.length} 个作品 (${qualityLabel})...`,
    duration: 3000,
  })

  for (let i = 0; i < selectedItems.value.length; i++) {
    const url = selectedItems.value[i]
    try {
      // 获取分辨率列表
      const zoomsResult = await fetchGoogleArtZoomsAndWait(selectedClientId.value, url)
      if (!zoomsResult.success || !zoomsResult.data?.zooms?.length) {
        failCount++
        continue
      }

      const sortedZooms = [...zoomsResult.data.zooms].sort((a, b) => (a.width * a.height) - (b.width * b.height))
      const targetZoom = batchQualityPreference.value === 'min' ? sortedZooms[0] : sortedZooms[sortedZooms.length - 1]

      // 下载并采集
      const syncResult = await syncGoogleArtToMaterialLibraryAndWait(selectedClientId.value, {
        url,
        zoomLevel: targetZoom.idx,
      })

      if (syncResult.success) {
        successCount++
      } else {
        failCount++
      }
    } catch {
      failCount++
    }
  }

  batchDownloadLoading.value = false

  ElNotification({
    title: '批量下载完成',
    message: `成功 ${successCount} 个，失败 ${failCount} 个 (${qualityLabel})`,
    type: failCount === 0 ? 'success' : 'warning',
    duration: 5000,
  })

  clearSelection()
  loadClients()
}

// ─── 分辨率选择和分页 ────────────────────────────────────────

const openZoomDialog = async (item: GoogleArtAsset) => {
  if (!selectedClientId.value || !item.url) {
    ElMessage.warning('请先选择客户端节点')
    return
  }
  loadingItems.value.add(item.id)
  try {
    const result = await fetchGoogleArtZoomsAndWait(selectedClientId.value, item.url)
    if (!result.success || !result.data?.zooms?.length) {
      ElMessage.error(`获取分辨率失败: ${result.message || item.title}`)
      return
    }
    zoomDialogItem.value = item
    zoomDialogOptions.value = result.data.zooms
    selectedZoomLevel.value = result.data.zooms[result.data.zooms.length - 1]?.idx ?? null
    zoomDialogVisible.value = true
  } catch (error: any) {
    ElMessage.error(`获取分辨率异常: ${error?.message}`)
  } finally {
    loadingItems.value.delete(item.id)
  }
}

const confirmDownload = async () => {
  if (!selectedClientId.value) {
    ElMessage.warning('请先选择客户端节点')
    return
  }
  if (!zoomDialogItem.value || !zoomDialogItem.value.url) {
    ElMessage.warning('缺少素材链接')
    return
  }
  if (selectedZoomLevel.value === null || selectedZoomLevel.value === undefined) {
    ElMessage.warning('请先选择分辨率')
    return
  }
  zoomDialogLoading.value = true
  try {
    const syncResult = await syncGoogleArtToMaterialLibraryAndWait(selectedClientId.value, {
      url: zoomDialogItem.value.url,
      zoomLevel: Number(selectedZoomLevel.value),
    })
    if (syncResult.success) {
      ElMessage.success(`已采集: ${zoomDialogItem.value.title || 'Google Art 素材'}`)
      zoomDialogVisible.value = false
    } else {
      ElMessage.error(`采集失败: ${syncResult.message || '未知错误'}`)
    }
  } catch (error: any) {
    ElMessage.error(`采集异常: ${error?.message || '网络或客户端执行错误'}`)
  } finally {
    zoomDialogLoading.value = false
  }
}

const handleSizeChange = (newSize: number) => {
  pageSize.value = newSize
  if (searchKeyword.value.trim() && selectedClientId.value) {
    handleSearch()
  }
}

// ─── 单链接下载 ──────────────────────────────────────────────

const trackCommand = async (
  action: 'refreshRuntime' | 'getZooms' | 'sync',
  request: Promise<{ success: boolean; message: string; data?: { commandId?: string } }>,
) => {
  actionLoading[action] = true
  try {
    const response = await request
    if (!response.success) {
      finishAction(action)
      ElMessage.error(response.message || '命令发送失败')
      return
    }

    const commandId = response.data?.commandId
    if (!commandId) {
      finishAction(action)
      ElMessage.success(response.message || '命令已执行')
      return
    }

    pendingCommandIds[commandId] = action
    ElMessage.success(response.message || '命令已发送')
  } catch (error: any) {
    finishAction(action)
    ElMessage.error(error?.message || '命令发送失败')
  }
}

const finishAction = (action?: keyof typeof actionLoading) => {
  if (!action) return
  actionLoading[action] = false
}

const handleRefreshRuntime = async () => {
  if (!selectedClientId.value) return
  await trackCommand('refreshRuntime', refreshGoogleArtStatus(selectedClientId.value))
}

const handleFetchZooms = async () => {
  if (!selectedClientId.value || !artUrl.value.trim()) {
    ElMessage.warning('请输入 Google Art 链接')
    return
  }
  zoomOptions.value = []
  selectedZoom.value = null
  lastResult.value = null
  await trackCommand('getZooms', fetchGoogleArtZooms(selectedClientId.value, artUrl.value.trim()))
}

const handleSync = async () => {
  if (!selectedClientId.value || !artUrl.value.trim()) {
    ElMessage.warning('请输入 Google Art 链接')
    return
  }
  if (selectedZoom.value === null) {
    ElMessage.warning('请先获取并选择分辨率')
  }

  await trackCommand(
    'sync',
    syncGoogleArtToMaterialLibrary(selectedClientId.value, {
      url: artUrl.value.trim(),
      zoomLevel: selectedZoom.value!,
    }),
  )
}

const handleServiceCommandResult = async (event: ServiceCommandResultEvent) => {
  const pendingAction = pendingCommandIds[event.commandId]
  if (pendingAction) {
    delete pendingCommandIds[event.commandId]
    finishAction(pendingAction)
  }

  if (pendingAction === 'getZooms') {
    const zooms = Array.isArray(event.data?.zooms) ? event.data.zooms : []
    zoomOptions.value = zooms
    selectedZoom.value = zooms.length ? (zooms[zooms.length - 1]?.idx ?? null) : null
  }

  if (pendingAction === 'sync') {
    lastResult.value = {
      success: event.success,
      message: event.message || (event.success ? '执行完成' : '执行失败'),
      data: event.data || null,
    }
  }

  if (!event.success) {
    ElMessage.error(event.message || '执行失败')
    await loadClients()
    return
  }

  if (pendingAction === 'refreshRuntime') {
    ElMessage.success(event.message || '状态已刷新')
  } else if (pendingAction === 'getZooms') {
    ElMessage.success(event.message || '已获取可用分辨率')
  } else if (pendingAction === 'sync') {
    ElMessage.success(event.message || '已同步到素材库')
  }

  await loadClients()
}

watch(clients, (list) => {
  if (!selectedClientId.value && list.length) {
    selectedClientId.value = list[0].clientId
  } else if (
    selectedClientId.value &&
    !list.some((item) => item.clientId === selectedClientId.value)
  ) {
    selectedClientId.value = list[0]?.clientId || ''
  }
})

// ─── 计算属性 ───

const isAllSelected = computed(() => {
  return searchResults.value.length > 0 && selectedItems.value.length === searchResults.value.length
})

const isIndeterminate = computed(() => {
  return selectedItems.value.length > 0 && selectedItems.value.length < searchResults.value.length
})

// ─── 列表操作 ───

const onImageError = (e: Event) => {
  const target = e.target as HTMLImageElement
  const id = target.alt || target.src
  imageErrorSet.value.add(id)
  target.style.display = 'none'
}

const copyLink = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('链接已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

const copySelectedLinks = async () => {
  if (selectedItems.value.length === 0) return
  try {
    await navigator.clipboard.writeText(selectedItems.value.join('\n'))
    ElMessage.success(`已复制 ${selectedItems.value.length} 个链接`)
  } catch {
    ElMessage.error('复制失败')
  }
}

const toggleSelectAll = (val: boolean) => {
  if (val) {
    selectedItems.value = searchResults.value.map((item) => item.url)
  } else {
    selectedItems.value = []
  }
}

/** 单个作品添加到素材库 */
const downloadOne = async (item: GoogleArtAsset) => {
  if (!selectedClientId.value || !item.url) {
    ElMessage.warning('请先选择客户端节点')
    return
  }

  // 标记加载状态
  item._loading = true

  try {
    // 获取分辨率
    const zoomsResult = await fetchGoogleArtZooms(selectedClientId.value, item.url)
    if (!zoomsResult.success || !zoomsResult.data?.zooms?.length) {
      ElMessage.error(`获取分辨率失败: ${item.title}`)
      return
    }

    const zooms = zoomsResult.data.zooms
    const maxZoom = zooms[zooms.length - 1]

    // 下载
    const syncResult = await syncGoogleArtToMaterialLibraryAndWait(selectedClientId.value, {
      url: item.url,
      zoomLevel: maxZoom.idx,
    })

    if (syncResult.success) {
      const resultData = syncResult.data?.data || syncResult.data || {}
      if (!resultData.cosUrl) {
        ElMessage.error('图片未成功上传至个人 COS 存储，采集取消')
        return
      }
      await uploadMaterialFile({
        url: resultData.cosUrl,
        originUrl: item.url || item.image,
        name: item.title || 'Google Arts 素材',
        keywords: searchKeyword.value || 'google-art',
        description: item.artist || '',
        source: 'google-art',
        suffix: 'jpg',
        meta: item,
      })
      ElMessage.success(`已成功保存到贴纸素材库: ${item.title}`)
    } else {
      ElMessage.error(`采集失败: ${syncResult.message}`)
    }
  } catch (error: any) {
    ElMessage.error(`采集异常: ${error?.message}`)
  } finally {
    loadingItems.value.delete(item.id)
  }
}

onMounted(async () => {
  await loadClients()
  websocketClient.events.on('serviceCommandResult', handleServiceCommandResult)
})

onUnmounted(() => {
  websocketClient.events.off('serviceCommandResult', handleServiceCommandResult)
})
</script>

<style scoped src="@/styles/external-collect.css"></style>
