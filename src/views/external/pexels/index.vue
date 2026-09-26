<template>
  <ContentWrap :plain="true">
    <div class="collect-page">
      <!-- 客户端选择 -->
      <ClientSelector
        v-model="selectedClientId"
        plugin-key="pexels"
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
                    <span class="collect-search__label">类型</span>
                    <el-select v-model="type" size="small" style="width: 110px" aria-label="采集类型">
                      <el-option value="image" label="图片" />
                    </el-select>
                  </div>
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
                  placeholder="输入关键词搜索 Pexels 高清摄影图片（如 cat, nature, architecture, minimalist）"
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
                    <div class="collect-item__thumb">
                      <img
                        v-if="item.image || item.thumbnail"
                        :src="item.thumbnail || item.image || ''"
                        :alt="item.title || 'Pexels Photo'"
                        loading="lazy"
                        @error="onImageError"
                      />
                      <div v-else class="collect-item__thumb-error">
                        <el-icon><Picture /></el-icon>
                      </div>
                    </div>
                    <div class="collect-item__info">
                      <div class="collect-item__title" :title="item.title || item.alt || 'Pexels 摄影作品'">
                        {{ item.title || item.alt || 'Pexels 摄影作品' }}
                      </div>
                      <div class="collect-item__meta">
                        <span v-if="item.photographer">📷 {{ item.photographer }}</span>
                        <span v-if="item.width" class="collect-item__size">
                          {{ item.width }} × {{ item.height }}
                        </span>
                      </div>
                    </div>
                    <div class="collect-item__actions">
                      <el-button
                        size="small"
                        @click.stop="copyLink(item.url || item.image || '')"
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
                />
              </div>
            </div>
          </div>

          <el-empty v-else description="请先在上方选择客户端节点" />
        </section>
      </div>
    </div>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Picture } from '@element-plus/icons-vue';
import { useClientNodeState } from '@/services/clientNodeState';
import { getClientServiceRuntime } from '@/store/modules/clientNode';import {
  searchPexelsAndWait,
  syncPexelsToMaterialLibraryAndWait,
  refreshPexelsStatus,
  type PexelsPhoto,
  type PexelsClientVO,
  type PexelsServiceStatus,
} from '@/api/external/pexels';
import { uploadMaterialFile } from '@/api/material';
import '@/styles/external-collect.css';
import ClientSelector from '../components/ClientSelector.vue'
defineOptions({ name: 'ExternalPexels' });

const type = ref('image');
const actionLoading = reactive({
  refreshRuntime: false,
});

// ─── 客户端节点 ──────────────────────────────────────────────

const {
  onlineClients,
  loading,
  refresh: refreshClientNodes,
} = useClientNodeState();
const _getServiceRuntime = (c: any) => getClientServiceRuntime(c, 'pexels');;

const selectedClientId = ref('');
const lastResult = ref<{
  success: boolean;
  message: string;
  data?: Record<string, any> | null;
} | null>(null);

// ─── 搜索 ────────────────────────────────────────────────────

const searchKeyword = ref('');
const searchLoading = ref(false);
const pageSize = ref(10);
const searchResults = ref<PexelsPhoto[]>([]);
const searchTotal = ref(0);
const currentPage = ref(1);
const totalPages = ref(0);
const selectedItems = ref<string[]>([]);
const imageErrorSet = ref<Set<string>>(new Set());
const loadingItems = ref<Set<string>>(new Set());
const batchDownloadLoading = ref(false);

const clients = computed<PexelsClientVO[]>(() => {
  return onlineClients.value.map((client) => {
    const pexels = (_getServiceRuntime(client) as PexelsServiceStatus | null) || null;
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
      pexels,
    };
  });
});

watch(
  clients,
  (list) => {
    if (list.length > 0 && !selectedClientId.value) {
      const onlineClient = list.find((c) => c.isOnline);
      selectedClientId.value = onlineClient ? onlineClient.clientId : list[0].clientId;
    }
  },
  { immediate: true },
);

const selectedClient = computed<PexelsClientVO | null>(() => {
  if (!selectedClientId.value) return null;
  return clients.value.find((c) => c.clientId === selectedClientId.value) || null;
});

const pexelsService = computed<PexelsServiceStatus | null>(
  () => selectedClient.value?.pexels || null,
);

// ─── 状态计算属性 ──────────────────────────────────────────

const isOnline = computed(() => !!selectedClient.value?.isOnline);
const isServiceConnected = computed(() => !!pexelsService.value?.connected);
const isAvailable = computed(
  () => isOnline.value && (isServiceConnected.value || pexelsService.value?.available),
);

const availabilityTone = computed(() => (isAvailable.value ? 'success' : 'danger'));
const availabilityText = computed(() => (isAvailable.value ? '服务就绪' : '不可用'));

const clientTone = computed(() => (isOnline.value ? 'success' : 'danger'));
const clientStatusText = computed(() => (isOnline.value ? '客户端在线' : '客户端离线'));

const siteTone = computed(() => (isServiceConnected.value ? 'success' : 'warning'));
const siteStatusBadge = computed(() => (isServiceConnected.value ? 'Pexels 已连接' : 'Pexels 未连接'));

const platformText = computed(() => {
  const p = selectedClient.value?.machine?.platform;
  if (!p) return '未知平台';
  return p === 'darwin' ? 'macOS' : p === 'win32' ? 'Windows' : p;
});

const checkedAtText = computed(() => {
  const t = pexelsService.value?.lastCheckedAt;
  if (!t) return '未检测';
  try {
    return new Date(t).toLocaleTimeString();
  } catch {
    return t;
  }
});

// 批量选择计算属性
const isAllSelected = computed(() => {
  return searchResults.value.length > 0 && selectedItems.value.length === searchResults.value.length;
});

const isIndeterminate = computed(() => {
  return selectedItems.value.length > 0 && selectedItems.value.length < searchResults.value.length;
});

// ─── 列表操作 ──────────────────────────────────────────────

const loadClients = async () => {
  await refreshClientNodes();
};

const handleSelectClient = () => {
  searchResults.value = [];
  selectedItems.value = [];
};

const handleRefreshRuntime = async () => {
  if (!selectedClientId.value) return;
  actionLoading.refreshRuntime = true;
  try {
    await refreshPexelsStatus(selectedClientId.value);
    await refreshClientNodes();
    ElMessage.success('运行状态刷新请求已发送');
  } catch (error: any) {
    ElMessage.error(error?.message || '刷新运行状态失败');
  } finally {
    actionLoading.refreshRuntime = false;
  }
};

const onImageError = (e: Event) => {
  const target = e.target as HTMLImageElement;
  const id = target.alt || target.src;
  imageErrorSet.value.add(id);
  target.style.display = 'none';
};

const copyLink = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url);
    ElMessage.success('链接已复制');
  } catch {
    ElMessage.error('复制失败');
  }
};

const copySelectedLinks = async () => {
  if (selectedItems.value.length === 0) return;
  const links = selectedItems.value
    .map((id) => getItemById(id))
    .map((item) => item?.url || item?.image || '')
    .filter(Boolean);
  try {
    await navigator.clipboard.writeText(links.join('\n'));
    ElMessage.success(`已复制 ${links.length} 个链接`);
  } catch {
    ElMessage.error('复制失败');
  }
};

const toggleSelectAll = (val: boolean) => {
  if (val) {
    selectedItems.value = searchResults.value.map((item) => item.id);
  } else {
    selectedItems.value = [];
  }
};

const toggleSelect = (item: PexelsPhoto) => {
  const idx = selectedItems.value.indexOf(item.id);
  if (idx > -1) {
    selectedItems.value.splice(idx, 1);
  } else {
    selectedItems.value.push(item.id);
  }
};

const clearSelection = () => {
  selectedItems.value = [];
};

const getItemById = (id: string) => searchResults.value.find((item) => item.id === id);

const handleSyncOne = async (item: PexelsPhoto) => {
  if (!selectedClientId.value || (!item.image && !item.thumbnail)) {
    ElMessage.warning('该内容没有可同步的图片');
    return;
  }
  loadingItems.value.add(item.id);
  try {
    const result = await syncPexelsToMaterialLibraryAndWait(selectedClientId.value, {
      imageUrl: item.image || item.thumbnail || '',
      metadata: {
        title: item.title || item.alt || 'Pexels 摄影作品',
        url: item.url,
        photographer: item.photographer,
        photographerUrl: item.photographerUrl,
        width: item.width,
        height: item.height,
        id: item.id,
      },
    });
    if (result.success) {
      const resultData = result.data?.data || result.data || {};
      if (!resultData.cosUrl) {
        ElMessage.error('图片未成功上传至个人 COS 存储，采集取消');
        return;
      }
      await uploadMaterialFile({
        url: resultData.cosUrl,
        originUrl: item.url || item.image,
        name: item.title || item.alt || 'Pexels 素材',
        keywords: searchKeyword.value || 'pexels',
        source: 'pexels',
        suffix: 'jpg',
        meta: item,
      });
      ElMessage.success(`已成功保存到贴纸素材库: ${item.title || item.id}`);
    } else {
      ElMessage.error(`采集失败: ${result.message || '未知错误'}`);
    }
  } catch (error: any) {
    ElMessage.error(`同步出错: ${error.message || '网络或服务端错误'}`);
  } finally {
    loadingItems.value.delete(item.id);
  }
};

const handleBatchDownload = async () => {
  if (!selectedClientId.value || selectedItems.value.length === 0) return;
  batchDownloadLoading.value = true;
  let successCount = 0;
  let failCount = 0;

  try {
    for (const id of selectedItems.value) {
      const item = getItemById(id);
      if (!item || (!item.image && !item.thumbnail)) continue;
      try {
        const res = await syncPexelsToMaterialLibraryAndWait(selectedClientId.value, {
          imageUrl: item.image || item.thumbnail || '',
          metadata: {
            title: item.title || item.alt || 'Pexels 摄影作品',
            url: item.url,
            photographer: item.photographer,
            photographerUrl: item.photographerUrl,
            width: item.width,
            height: item.height,
            id: item.id,
          },
        });
        if (res.success) {
          const resultData = res.data?.data || res.data || {};
          if (!resultData.cosUrl) {
            failCount++;
            continue;
          }
          await uploadMaterialFile({
            url: resultData.cosUrl,
            originUrl: item.url || item.image,
            name: item.title || item.alt || 'Pexels 素材',
            keywords: searchKeyword.value || 'pexels',
            source: 'pexels',
            suffix: 'jpg',
            meta: item,
          });
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }
    lastResult.value = {
      success: failCount === 0,
      message: `批量同步完成: 成功 ${successCount} 个, 失败 ${failCount} 个`,
      data: { successCount, failCount },
    };
    if (failCount === 0) {
      ElMessage.success(`批量保存到贴纸素材库成功 (${successCount} 个)`);
    } else {
      ElMessage.warning(`批量完成：成功 ${successCount}，失败 ${failCount}`);
    }
  } finally {
    batchDownloadLoading.value = false;
  }
};

// ─── 动作响应函数 ──────────────────────────────────────────

const doSearch = async (page = 1) => {
  if (!selectedClientId.value) {
    ElMessage.warning('请先选择客户端节点');
    return;
  }
  if (!searchKeyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词');
    return;
  }

  searchLoading.value = true;
  selectedItems.value = [];
  try {
    const result = await searchPexelsAndWait(selectedClientId.value, searchKeyword.value.trim(), {
      limit: pageSize.value,
      page,
    });
    searchResults.value = result.items || [];
    if (result.total) {
      searchTotal.value = result.total;
    } else if (result.items && result.items.length > 0) {
      searchTotal.value = currentPage.value * pageSize.value + 1;
    } else {
      searchTotal.value = 0;
    }
    totalPages.value = Math.ceil(searchTotal.value / pageSize.value) || 1;
    currentPage.value = page;

    lastResult.value = {
      success: true,
      message: `搜索成功，获取到 ${searchResults.value.length} 个 Pexels 结果`,
      data: { count: searchResults.value.length },
    };
  } catch (error: any) {
    lastResult.value = {
      success: false,
      message: error.message || '搜索失败',
    };
    ElMessage.error(error.message || '搜索失败');
  } finally {
    searchLoading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  doSearch(1);
};

const handleSizeChange = (val: number) => {
  pageSize.value = val;
  if (searchResults.value.length > 0) {
    handleSearch();
  }
};

const handlePageChange = (page: number) => {
  doSearch(page);
};

// ─── 监听与初始化 ──────────────────────────────────────────

onMounted(() => {
  loadClients();
});

watch(
  clients,
  (newList) => {
    if (!selectedClientId.value && newList.length > 0) {
      const onlineClient = newList.find((c) => c.isOnline && c.pexels?.available);
      if (onlineClient) {
        selectedClientId.value = onlineClient.clientId;
      } else if (newList[0]) {
        selectedClientId.value = newList[0].clientId;
      }
    }
  },
  { immediate: true },
);
</script>
