<template>
  <ContentWrap :plain="true">
    <div class="collect-page">
            <!-- 客户端选择 -->
      <ClientSelector
        v-model="selectedClientId"
        plugin-key="pinterest"
        @change="handleSelectClient"
        @refresh="loadClients"
      />

      <!-- 客户端节点区域 -->
      <div class="collect-layout" v-loading="loading">
        <!-- 主区域 -->
        <section class="collect-main">
          <div v-if="selectedClient" class="collect-panel">
            <!-- 状态卡片 -->
            

            <!-- Pinterest 图片采集 -->
            <div class="collect-section">
              <div class="collect-search__header">
                <div class="collect-section__title">图片采集</div>
                <div class="collect-search__opts">
                  <div class="collect-search__field">
                    <span class="collect-search__label">采集范围</span>
                    <el-select
                      v-model="scope"
                      size="small"
                      style="width: 110px"
                      aria-label="采集范围"
                    >
                      <el-option value="pins" label="图片" />
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
                  placeholder="输入关键词搜索 Pinterest（如 interior design, landscape photography）"
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
                        v-if="item.image"
                        :src="item.image"
                        :alt="item.title"
                        loading="lazy"
                        @error="onImageError"
                      />
                      <div v-else class="collect-item__thumb-error">
                        <el-icon><Picture /></el-icon>
                      </div>
                      <span v-if="item.isVideo" class="collect-item__badge">视频</span>
                    </div>
                    <div class="collect-item__info">
                      <div class="collect-item__title" :title="item.title">{{ item.title }}</div>
                      <div class="collect-item__meta">
                        <span v-if="item.boardName">{{ item.boardName }}</span>
                        <span v-if="item.pinner">{{ item.pinner }}</span>
                        <span v-if="item.width" class="collect-item__size">
                          {{ item.width }} × {{ item.height }}
                        </span>
                      </div>
                    </div>
                    <div class="collect-item__actions">
                      <el-button
                        size="small"
                        @click.stop="copyLink(item.link || item.image || '')"
                        title="复制详情页链接"
                      >
                        复制链接
                      </el-button>
                      <el-button
                        type="primary"
                        size="small"
                        :loading="loadingItems.has(item.id)"
                        :disabled="!item.image"
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
                  @size-change="handleSizeChange"
                />
              </div>
            </div>
          </div>

          <div v-else class="collect-panel collect-panel--empty">
            <el-empty description="请选择客户端节点" />
          </div>
        </section>
      </div>
    </div>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { ElMessage, ElNotification } from "element-plus";
import { Link, Picture } from "@element-plus/icons-vue";
import {
  refreshPinterestStatus,
  searchPinterestAndWait,
  syncPinterestToMaterialLibraryAndWait,
  type PinterestClientVO,
  type PinterestPin,
  type PinterestScope,
  type PinterestServiceStatus,
} from "@/api/external/pinterest";
import { websocketClient, type ServiceCommandResultEvent } from "@/services/websocketClient";
import { uploadMaterialFile } from "@/api/material";
import { usePluginClientNodes } from "@/services/clientNodeState";
import { formatDate } from "@/utils/formatTime";
import ExternalClientSidebar, {
  type ClientNodeItem,
} from "../components/ExternalClientSidebar.vue";
import ClientSelector from '../components/ClientSelector.vue'

defineOptions({ name: "ExternalPinterest" });

// ─── 客户端节点 ──────────────────────────────────────────────

const {
  clients: rawClients,
  loading,
  refresh: refreshClientNodes,
  getServiceRuntime,
} = usePluginClientNodes("pinterest");

const selectedClientId = ref("");
const lastResult = ref<{
  success: boolean
  message: string
  data?: Record<string, any> | null
} | null>(null);

const actionLoading = reactive({
  refreshRuntime: false,
  sync: false,
});

const pendingCommandIds = reactive<Record<string, "refreshRuntime" | "sync">>({});

// ─── 搜索 ────────────────────────────────────────────────────

const searchKeyword = ref("");
const searchLoading = ref(false);
const scope = ref<PinterestScope>("pins");
const pageSize = ref(20);
const searchResults = ref<PinterestPin[]>([]);
const searchTotal = ref(0);
const currentPage = ref(1);
const totalPages = ref(0);
const bookmarkHistory = ref<(string | null)[]>([]);
const selectedItems = ref<string[]>([]);
const imageErrorSet = ref<Set<string>>(new Set());
const loadingItems = ref<Set<string>>(new Set());
const batchDownloadLoading = ref(false);

// ─── 计算属性 ────────────────────────────────────────────────

const mapPinterestClient = (client: any): PinterestClientVO => ({
  clientId: client.id,
  isOnline: client.isOnline,
  nodeStatus: client.nodeStatus,
  connectedAt: client.connectedAt,
  lastOnlineAt: client.lastOnlineAt,
  appVersion: client.clientInfo?.appVersion || null,
  machine: client.clientInfo?.machine || null,
  location: client.clientInfo?.location || null,
  pinterest: (getServiceRuntime(client) as PinterestServiceStatus | null) || null,
});

const clients = computed<PinterestClientVO[]>(() =>
  rawClients.value.map((client) => mapPinterestClient(client)),
);

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

const selectedClient = computed(
  () => clients.value.find((item) => item.clientId === selectedClientId.value) || null,
);

const selectedService = computed<PinterestServiceStatus | null>(
  () => selectedClient.value?.pinterest || null,
);

const selectedDetails = computed<Record<string, any>>(() => selectedService.value?.details || {});

const clientNodeItems = computed<ClientNodeItem[]>(() =>
  clients.value.map((client) => ({
    connectionId: client.clientId,
    name: client.machine?.code || client.clientId,
    time: formatDateSafe(client.connectedAt),
    metaLeft: client.appVersion || "未知版本",
    metaRight: client.location?.ip || client.location?.city || "未知位置",
    detail: client.workspaceDirectory ? `工作目录: ${client.workspaceDirectory}` : "工作目录: 未上报",
  })),
);

const availabilityTone = computed(() =>
  selectedService.value?.available ? "success" : selectedClient.value?.isOnline ? "warning" : "muted",
);

const availabilityText = computed(() => {
  if (!selectedClient.value?.isOnline) return "客户端离线";
  if (selectedService.value?.available) return "可采集";
  return "受限";
});

const clientTone = computed(() => (selectedClient.value?.isOnline ? "success" : "muted"));

const clientStatusText = computed(() => (selectedClient.value?.isOnline ? "客户端在线" : "客户端离线"));

const siteTone = computed(() => {
  if (!selectedClient.value?.isOnline) return "muted";
  if (selectedDetails.value.siteAvailable) return "success";
  return "warning";
});

const siteStatusBadge = computed(() => {
  if (!selectedClient.value?.isOnline) return "站点未检测";
  if (selectedDetails.value.siteAvailable) {
    return Number.isFinite(selectedDetails.value.siteLatencyMs)
      ? `网站连通 ${selectedDetails.value.siteLatencyMs}ms`
      : "网站连通";
  }
  return "站点异常";
});

const platformText = computed(() => selectedDetails.value.platformName || selectedDetails.value.platform || "未知平台");

const checkedAtText = computed(() => `检测 ${formatDateSafe(selectedService.value?.lastCheckedAt)}`);

const isAllSelected = computed(() => {
  return searchResults.value.length > 0 && selectedItems.value.length === searchResults.value.length;
});

const isIndeterminate = computed(() => {
  return selectedItems.value.length > 0 && selectedItems.value.length < searchResults.value.length;
});

// ─── 方法 ────────────────────────────────────────────────────

const formatDateSafe = (value?: string | null) => {
  if (!value) return "-";
  try {
    return formatDate(new Date(value));
  } catch {
    return value;
  }
};

const formatFileSize = (value?: number) => {
  if (!value || !Number.isFinite(value)) return "-";
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
};

const loadClients = async () => {
  await refreshClientNodes();
  const list = clients.value;
  if (!selectedClientId.value && list.length) {
    selectedClientId.value = list[0].clientId;
  } else if (selectedClientId.value && !list.some((item) => item.clientId === selectedClientId.value)) {
    selectedClientId.value = list[0]?.clientId || "";
  }
};

const handleSelectClient = (clientId: string) => {
  selectedClientId.value = clientId;
  lastResult.value = null;
};

// ─── 搜索相关 ────────────────────────────────────────────────

const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    ElMessage.warning("请输入搜索关键词");
    return;
  }

  if (!selectedClientId.value) {
    ElMessage.warning("请先选择客户端节点");
    return;
  }

  searchLoading.value = true;
  currentPage.value = 1;
  selectedItems.value = [];
  imageErrorSet.value.clear();
  bookmarkHistory.value = [];

  try {
    const result = await searchPinterestAndWait(
      selectedClientId.value,
      searchKeyword.value.trim(),
      {
        scope: scope.value,
        limit: pageSize.value,
        imageOnly: true,
      },
    );

    if (!result || !result.items) {
      ElMessage.error("搜索返回数据异常");
      return;
    }
    searchResults.value = result.items || [];
    if (result.total) {
      searchTotal.value = result.total;
    } else if (result.data && result.data.length > 0) {
      searchTotal.value = currentPage.value * pageSize.value + 1;
    } else {
      searchTotal.value = 0;
    }
    totalPages.value = Math.ceil(searchTotal.value / pageSize.value) || 1;
    bookmarkHistory.value[0] = result.bookmark || null;

    if (searchResults.value.length === 0) {
      ElMessage.info("未找到匹配的内容");
    }
  } catch (error: any) {
    ElMessage.error(error?.message || "搜索失败");
  } finally {
    searchLoading.value = false;
  }
};

const handlePageChange = async (page: number) => {
  if (!searchKeyword.value.trim() || !selectedClientId.value) return;
  searchLoading.value = true;
  selectedItems.value = [];
  try {
    let bookmark: string | null = null;
    if (page > 1) {
      const prevPageIndex = page - 2;
      if (prevPageIndex < bookmarkHistory.value.length) {
        bookmark = bookmarkHistory.value[prevPageIndex];
      }
    }
    const result = await searchPinterestAndWait(
      selectedClientId.value,
      searchKeyword.value.trim(),
      {
        scope: scope.value,
        limit: pageSize.value,
        imageOnly: true,
        bookmark,
      },
    );
    searchResults.value = result.items || [];
    currentPage.value = page;
    bookmarkHistory.value[page - 1] = result.bookmark || null;
  } catch (error: any) {
    ElMessage.error(error?.message || "加载失败");
  } finally {
    searchLoading.value = false;
  }
};

const handleSizeChange = (newSize: number) => {
  pageSize.value = newSize;
  currentPage.value = 1;
  handleSearch();
};

const toggleSelect = (item: PinterestPin) => {
  const index = selectedItems.value.indexOf(item.id);
  if (index >= 0) {
    selectedItems.value.splice(index, 1);
  } else {
    selectedItems.value.push(item.id);
  }
};

const toggleSelectAll = (val: boolean) => {
  if (val) {
    selectedItems.value = searchResults.value.map((item) => item.id);
  } else {
    selectedItems.value = [];
  }
};

const clearSelection = () => {
  selectedItems.value = [];
};

const getItemById = (id: string) => searchResults.value.find((item) => item.id === id);

const handleSyncOne = async (item: PinterestPin) => {
  if (!selectedClientId.value || !item.image) {
    ElMessage.warning("该内容没有可同步的图片");
    return;
  }
  loadingItems.value.add(item.id);
  try {
    const result = await syncPinterestToMaterialLibraryAndWait(selectedClientId.value, {
      imageUrl: item.image,
      metadata: {
        title: item.title,
        description: item.description,
        link: item.link,
        boardName: item.boardName,
        pinner: item.pinner,
        image: item.image,
        width: item.width,
        height: item.height,
        id: item.id,
        isVideo: item.isVideo,
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
        originUrl: item.link || item.image,
        name: item.title || "Pinterest 素材",
        keywords: searchKeyword.value || "pinterest",
        description: item.description || "",
        source: "pinterest",
        suffix: "jpg",
        meta: item,
      });
      ElMessage.success(`已保存到贴纸素材库: ${item.title || item.id}`);
    } else {
      ElMessage.error(`采集失败: ${result.message || "未知错误"}`);
    }
  } catch (error: any) {
    ElMessage.error(`采集异常: ${error?.message}`);
  } finally {
    loadingItems.value.delete(item.id);
  }
};

const handleBatchDownload = async () => {
  if (!selectedClientId.value || !selectedItems.value.length) return;

  batchDownloadLoading.value = true;
  let successCount = 0;
  let failCount = 0;

  ElNotification.info({
    title: "批量采集",
    message: `开始处理 ${selectedItems.value.length} 个内容...`,
    duration: 3000,
  });

  for (const id of selectedItems.value) {
    const item = getItemById(id);
    if (!item?.image) {
      failCount++;
      continue;
    }
    try {
      const result = await syncPinterestToMaterialLibraryAndWait(selectedClientId.value, {
        imageUrl: item.image,
        metadata: {
          title: item.title,
          description: item.description,
          link: item.link,
          boardName: item.boardName,
          pinner: item.pinner,
          image: item.image,
          width: item.width,
          height: item.height,
          id: item.id,
          isVideo: item.isVideo,
        },
      });
      if (result.success) {
        const resultData = result.data?.data || result.data || {};
        if (!resultData.cosUrl) {
          failCount++;
          continue;
        }
        await uploadMaterialFile({
          url: resultData.cosUrl,
          originUrl: item.link || item.image,
          name: item.title || "Pinterest 素材",
          keywords: searchKeyword.value || "pinterest",
          description: item.description || "",
          source: "pinterest",
          suffix: "jpg",
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

  batchDownloadLoading.value = false;

  ElNotification({
    title: "批量保存到贴纸素材库完成",
    message: `成功 ${successCount} 个，失败 ${failCount} 个`,
    type: failCount === 0 ? "success" : "warning",
    duration: 5000,
  });

  clearSelection();
  loadClients();
};

// ─── 状态 ────────────────────────────────────────────────────

const trackCommand = async (
  action: "refreshRuntime",
  request: Promise<{ success: boolean; message: string; data?: { commandId?: string } }>,
) => {
  actionLoading[action] = true;
  try {
    const response = await request;
    actionLoading[action] = false;
    if (!response.success) {
      ElMessage.error(response.message || "命令发送失败");
      return;
    }

    const commandId = response.data?.commandId;
    if (!commandId) {
      ElMessage.success(response.message || "命令已执行");
      return;
    }

    pendingCommandIds[commandId] = action;
    ElMessage.success(response.message || "命令已发送");
  } catch (error: any) {
    actionLoading[action] = false;
    ElMessage.error(error?.message || "命令发送失败");
  }
};

const handleRefreshRuntime = async () => {
  if (!selectedClientId.value) return;
  await trackCommand("refreshRuntime", refreshPinterestStatus(selectedClientId.value));
};

const handleServiceCommandResult = async (event: ServiceCommandResultEvent) => {
  const pendingAction = pendingCommandIds[event.commandId];
  if (pendingAction) {
    delete pendingCommandIds[event.commandId];
    actionLoading[pendingAction] = false;
  }

  if (!event.success) {
    ElMessage.error(event.message || "执行失败");
    await loadClients();
    return;
  }

  if (pendingAction === "refreshRuntime") {
    ElMessage.success(event.message || "状态已刷新");
  }

  await loadClients();
};

watch(clients, (list) => {
  if (!selectedClientId.value && list.length) {
    selectedClientId.value = list[0].clientId;
  } else if (
    selectedClientId.value &&
    !list.some((item) => item.clientId === selectedClientId.value)
  ) {
    selectedClientId.value = list[0]?.clientId || "";
  }
});

// ─── 列表操作 ────────────────────────────────────────────────

const onImageError = (e: Event) => {
  const target = e.target as HTMLImageElement;
  const id = target.alt || target.src;
  imageErrorSet.value.add(id);
  target.style.display = "none";
};

const copyLink = async (url: string) => {
  if (!url) {
    ElMessage.warning("该内容没有可用链接");
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    ElMessage.success("链接已复制");
  } catch {
    ElMessage.error("复制失败");
  }
};

const copySelectedLinks = async () => {
  if (selectedItems.value.length === 0) return;
  const links = selectedItems.value
    .map((id) => {
      const item = getItemById(id);
      return item?.image || item?.link || "";
    })
    .filter(Boolean);
  if (!links.length) {
    ElMessage.warning("所选内容均无链接");
    return;
  }
  try {
    await navigator.clipboard.writeText(links.join("\n"));
    ElMessage.success(`已复制 ${links.length} 个链接`);
  } catch {
    ElMessage.error("复制失败");
  }
};

onMounted(async () => {
  await loadClients();
  websocketClient.events.on("serviceCommandResult", handleServiceCommandResult);
});

onUnmounted(() => {
  websocketClient.events.off("serviceCommandResult", handleServiceCommandResult);
});
</script>

<style scoped src="@/styles/external-collect.css"></style>