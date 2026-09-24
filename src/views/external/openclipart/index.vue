<template>
  <ContentWrap :plain="true">
    <div class="collect-page">
            <!-- 客户端选择 -->
      <ClientSelector
        v-model="selectedClientId"
        plugin-key="openclipart"
        @change="handleSelectClient"
        @refresh="loadClients"
      />

      <!-- 客户端节点区域 -->
      <div class="collect-layout" v-loading="loading">
        <!-- 主区域 -->
        <section class="collect-main">
          <div v-if="selectedClient" class="collect-panel">
            <!-- 状态卡片 -->
            

            <!-- 插画采集 -->
            <div class="collect-section">
              <div class="collect-search__header">
                <div class="collect-section__title">插画采集 (矢量 SVG / 2000px 超清位图)</div>
                <div class="collect-search__opts">
                  <div class="collect-search__field">
                    <span class="collect-search__label">格式偏好</span>
                    <el-select v-model="formatPreference" size="small" style="width: 120px" aria-label="格式偏好">
                      <el-option value="png" label="超清 PNG" />
                      <el-option value="svg" label="矢量 SVG" />
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
                  placeholder="输入英文关键词搜索 Openclipart 矢量插画（如 cat, robot, flower, banner, car）"
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
                    共 {{ searchTotal }} 个插画结果，第 {{ currentPage }} / {{ totalPages }} 页
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

                <!-- 统一列表渲染 -->
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
                        :alt="item.title || 'Openclipart Artwork'"
                        loading="lazy"
                      />
                      <div v-else class="collect-item__thumb-error">
                        <el-icon><Picture /></el-icon>
                      </div>
                    </div>
                    <div class="collect-item__info">
                      <div class="collect-item__title" :title="item.title || 'Openclipart 矢量素材'">
                        {{ item.title || 'Openclipart 矢量素材' }}
                      </div>
                      <div class="collect-item__meta">
                        <span v-if="item.author">🎨 {{ item.author }}</span>
                        <span class="collect-item__size">CC0 Public Domain</span>
                      </div>
                    </div>
                    <div class="collect-item__actions">
                      <el-button
                        size="small"
                        @click.stop="copyLink(formatPreference === 'svg' ? (item.svgUrl || item.image) : (item.pngUrl || item.image))"
                      >
                        复制
                      </el-button>
                      <el-button
                        type="primary"
                        size="small"
                        :loading="loadingItems.has(item.id)"
                        :disabled="!selectedClientId || !selectedClient?.isOnline"
                        @click.stop="handleSyncOne(item)"
                      >
                        采集入库
                      </el-button>
                    </div>
                  </div>
                </div>

                <!-- 分页 -->
                <div class="collect-pagination">
                  <el-pagination
                    v-model:current-page="currentPage"
                    :page-size="pageSize"
                    :total="searchTotal"
                    layout="total, prev, pager, next"
                    background
                    @current-change="handlePageChange"
                  />
                </div>
              </div>

              <!-- 空状态 -->
              <el-empty
                v-else-if="!searchLoading && searchKeyword"
                description="未找到相关矢量插画，请尝试其他英文关键词"
              />
            </div>
          </div>

          <el-empty v-else description="请先在上方选择客户端节点" />
        </section>
      </div>
    </div>

    <!-- 插画预览对话框 -->
    <el-dialog v-model="previewVisible" title="Openclipart 矢量插画预览" width="700px" destroy-on-close align-center>
      <div v-if="previewItem" class="collect-preview">
        <img
          :src="previewItem.thumbnail || previewItem.image"
          :alt="previewItem.title || 'Preview'"
          style="max-width: 100%; max-height: 500px; display: block; margin: 0 auto; border-radius: 8px; background: #fafafa; padding: 16px;"
        />
        <div style="margin-top: 16px;">
          <h4>{{ previewItem.title || 'Openclipart 矢量插画' }}</h4>
          <p v-if="previewItem.description" style="color: #666; font-size: 13px; margin-top: 4px;">{{ previewItem.description }}</p>
          <div style="margin-top: 8px; font-size: 13px; color: #888; display: flex; flex-direction: column; gap: 4px;">
            <span v-if="previewItem.author"><strong>作者:</strong> {{ previewItem.author }}</span>
            <span><strong>授权协议:</strong> CC0 1.0 Universal (100% 免费商用)</span>
            <span><strong>矢量 SVG 下载:</strong> <a :href="previewItem.svgUrl" target="_blank" style="color: #409eff;">{{ previewItem.svgUrl }}</a></span>
            <span><strong>2000px 超清 PNG:</strong> <a :href="previewItem.pngUrl" target="_blank" style="color: #409eff;">{{ previewItem.pngUrl }}</a></span>
            <span><strong>原详情页:</strong> <a :href="previewItem.url" target="_blank" style="color: #409eff;">{{ previewItem.url }}</a></span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button
          v-if="previewItem"
          type="primary"
          :loading="loadingItems.has(previewItem.id)"
          :disabled="!selectedClientId || !selectedClient?.isOnline"
          @click="handleSyncOne(previewItem)"
        >
          保存到贴纸素材库 ({{ formatPreference.toUpperCase() }})
        </el-button>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Picture } from '@element-plus/icons-vue';
import { usePluginClientNodes } from '@/services/clientNodeState';
import {
  searchOpenclipartAndWait,
  syncOpenclipartToMaterialLibraryAndWait,
  refreshOpenclipartStatus,
  type OpenclipartPhoto,
  type OpenclipartClientVO,
  type OpenclipartServiceStatus,
} from '@/api/external/openclipart';
import { uploadMaterialFile } from '@/api/material';
import '@/styles/external-collect.css';
import ClientSelector from '../components/ClientSelector.vue'
defineOptions({ name: 'ExternalOpenclipart' });

const formatPreference = ref<'png' | 'svg'>('png');
const actionLoading = reactive({
  refreshRuntime: false,
});

// ─── 客户端节点 ──────────────────────────────────────────────

const {
  clients: rawClients,
  loading,
  refresh: refreshClientNodes,
  getServiceRuntime,
} = usePluginClientNodes('openclipart');

const selectedClientId = ref('');

const clients = computed<OpenclipartClientVO[]>(() => {
  return rawClients.value.map((c: any) => {
    const rawService = getServiceRuntime(c) as OpenclipartServiceStatus | null;
    const runtimeService: OpenclipartServiceStatus | null = rawService
      ? {
          key: rawService.key,
          pluginKey: rawService.pluginKey,
          label: rawService.label,
          connected: rawService.connected,
          available: rawService.available,
          status: rawService.status,
          state: rawService.state,
          busy: rawService.busy,
          message: rawService.message,
          version: rawService.version,
          endpoint: rawService.endpoint,
          lastCheckedAt: rawService.lastCheckedAt,
          currentTaskId: rawService.currentTaskId,
          lastError: rawService.lastError,
          supportedCommands: rawService.supportedCommands,
          details: rawService.details,
        }
      : null;

    return {
      clientId: c.id,
      isOnline: c.isOnline,
      nodeStatus: c.nodeStatus,
      connectedAt: c.connectedAt,
      lastOnlineAt: c.lastOnlineAt,
      appVersion: c.clientInfo?.appVersion || null,
      workspaceDirectory: c.clientInfo?.workspaceDirectory || null,
      machine: c.clientInfo?.machine || null,
      location: c.clientInfo?.location || null,
      openclipart: runtimeService,
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

const selectedClient = computed(() => {
  return clients.value.find((item) => item.clientId === selectedClientId.value) || null;
});

const selectedService = computed<OpenclipartServiceStatus | null>(() => {
  return selectedClient.value?.openclipart || null;
});

// ─── 状态卡片计算属性 ────────────────────────────────────────

const isClientOnline = computed(() => !!selectedClient.value?.isOnline);
const isServiceAvailable = computed(() => {
  if (!isClientOnline.value) return false;
  const s = selectedService.value;
  if (!s) return false;
  return !!(s.available || s.connected || s.status === 'connected');
});

const availabilityTone = computed<'success' | 'warning' | 'danger' | 'neutral'>(() => {
  if (!selectedClient.value) return 'neutral';
  if (!isClientOnline.value) return 'danger';
  if (isServiceAvailable.value) return 'success';
  return 'warning';
});

const availabilityText = computed(() => {
  if (!selectedClient.value) return '未选择节点';
  if (!isClientOnline.value) return '节点离线';
  if (isServiceAvailable.value) return '服务就绪';
  return selectedService.value?.message || '服务异常';
});

const clientTone = computed<'success' | 'danger'>(() => {
  return isClientOnline.value ? 'success' : 'danger';
});

const clientStatusText = computed(() => {
  return isClientOnline.value ? '客户端在线' : '客户端离线';
});

const siteTone = computed<'success' | 'warning' | 'danger'>(() => {
  if (!isClientOnline.value) return 'danger';
  return isServiceAvailable.value ? 'success' : 'warning';
});

const siteStatusBadge = computed(() => {
  if (!isClientOnline.value) return '不可用';
  return isServiceAvailable.value ? 'Openclipart 正常' : 'Openclipart 异常';
});

const platformText = computed(() => {
  const p = selectedClient.value?.machine?.platform || '';
  return p ? `平台: ${p}` : '平台: 本地桌面端';
});

const checkedAtText = computed(() => {
  const t = selectedService.value?.lastCheckedAt;
  if (!t) return '检测: --';
  const d = new Date(t);
  return `检测: ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
});

const loadClients = () => {
  refreshClientNodes();
};

const handleSelectClient = () => {
  // Client selection handled by v-model
};

const handleRefreshRuntime = async () => {
  if (!selectedClientId.value) return;
  actionLoading.refreshRuntime = true;
  try {
    const res = await refreshOpenclipartStatus(selectedClientId.value);
    if (res.success) {
      ElMessage.success('已发送状态刷新指令');
      await refreshClientNodes();
    } else {
      ElMessage.error(res.message || '刷新失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '刷新失败');
  } finally {
    actionLoading.refreshRuntime = false;
  }
};

// ─── 搜索与采集 ──────────────────────────────────────────────

const searchKeyword = ref('');
const searchLoading = ref(false);
const searchResults = ref<OpenclipartPhoto[]>([]);
const searchTotal = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const totalPages = ref(1);

const selectedItems = ref<string[]>([]);
const batchDownloadLoading = ref(false);
const loadingItems = ref<Set<string>>(new Set());

const isAllSelected = computed(() => {
  return searchResults.value.length > 0 && selectedItems.value.length === searchResults.value.length;
});

const isIndeterminate = computed(() => {
  return selectedItems.value.length > 0 && selectedItems.value.length < searchResults.value.length;
});

const toggleSelect = (item: OpenclipartPhoto) => {
  const idx = selectedItems.value.indexOf(item.id);
  if (idx > -1) {
    selectedItems.value.splice(idx, 1);
  } else {
    selectedItems.value.push(item.id);
  }
};

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedItems.value = [];
  } else {
    selectedItems.value = searchResults.value.map((item) => item.id);
  }
};

const clearSelection = () => {
  selectedItems.value = [];
};

const getItemById = (id: string): OpenclipartPhoto | undefined => {
  return searchResults.value.find((item) => item.id === id);
};

const copyLink = async (text: string) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success('直连已复制到剪贴板');
  } catch {
    ElMessage.error('复制失败');
  }
};

const copySelectedLinks = () => {
  const links = selectedItems.value
    .map((id) => {
      const item = getItemById(id);
      if (!item) return '';
      return formatPreference.value === 'svg' ? item.svgUrl || item.image : item.pngUrl || item.image;
    })
    .filter(Boolean);
  if (links.length === 0) return;
  copyLink(links.join('\n'));
};

const handlePreviewPhoto = (item: OpenclipartPhoto) => {
  previewItem.value = item;
  previewVisible.value = true;
};

const handleSyncOne = async (item: OpenclipartPhoto) => {
  if (!selectedClientId.value) {
    ElMessage.warning('请先选择客户端节点');
    return;
  }

  const targetUrl = formatPreference.value === 'svg' ? item.svgUrl || item.image : item.pngUrl || item.image;
  if (!targetUrl) {
    ElMessage.warning('该内容没有可同步的图片');
    return;
  }

  loadingItems.value.add(item.id);
  try {
    const isSvg = formatPreference.value === 'svg';
    const result = await syncOpenclipartToMaterialLibraryAndWait(selectedClientId.value, {
      imageUrl: targetUrl,
      metadata: {
        title: item.title || 'Openclipart 矢量插画',
        url: item.url || item.link,
        author: item.author,
        width: item.width,
        height: item.height,
        id: item.id,
        format: isSvg ? 'svg' : 'png',
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
        originUrl: item.url || targetUrl,
        title: item.title || `openclipart_${item.id}`,
        category: 'sticker',
        suffix: isSvg ? 'svg' : 'png',
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
  const isSvg = formatPreference.value === 'svg';

  try {
    for (const id of selectedItems.value) {
      const item = getItemById(id);
      if (!item) continue;
      const targetUrl = isSvg ? item.svgUrl || item.image : item.pngUrl || item.image;
      if (!targetUrl) continue;

      try {
        const res = await syncOpenclipartToMaterialLibraryAndWait(selectedClientId.value, {
          imageUrl: targetUrl,
          metadata: {
            title: item.title || 'Openclipart 矢量插画',
            url: item.url || item.link,
            author: item.author,
            width: item.width,
            height: item.height,
            id: item.id,
            format: isSvg ? 'svg' : 'png',
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
            originUrl: item.url || targetUrl,
            title: item.title || `openclipart_${item.id}`,
            category: 'sticker',
            suffix: isSvg ? 'svg' : 'png',
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
    const result = await searchOpenclipartAndWait(selectedClientId.value, searchKeyword.value.trim(), {
      limit: pageSize.value,
      page,
      formatPreference: formatPreference.value,
    });
    searchResults.value = result.items || [];
    if (result.total) {
      searchTotal.value = result.total;
    } else if (result.items && result.items.length > 0) {
      searchTotal.value = currentPage.value * pageSize.value + 1;
    } else {
      searchTotal.value = 0;
    }
    totalPages.value = result.totalPages || Math.ceil(searchTotal.value / pageSize.value) || 1;
    currentPage.value = page;
  } catch (error: any) {
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

// ─── 大图预览 modal ──────────────────────────────────────────
const previewVisible = ref(false);
const previewItem = ref<OpenclipartPhoto | null>(null);

// ─── 监听与初始化 ──────────────────────────────────────────

onMounted(() => {
  loadClients();
});

watch(
  clients,
  (newList) => {
    if (!selectedClientId.value && newList.length > 0) {
      const onlineClient = newList.find((c) => c.isOnline && c.openclipart?.available);
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
