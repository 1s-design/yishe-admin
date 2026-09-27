<template>
  <ContentWrap :plain="true">
    <div class="collect-page">
      <!-- 客户端选择 -->
      <ClientSelector
        v-model="selectedClientId"
        plugin-key="magnific"
        @change="handleSelectClient"
        @refresh="loadClients"
      />

      <!-- 客户端节点区域 -->
      <div class="collect-layout" v-loading="loading">
        <!-- 主区域 -->
        <section class="collect-main">
          <div v-if="selectedClient" class="collect-panel">
            <!-- 视频采集 -->
            <div class="collect-section">
              <div class="collect-search__header">
                <div class="collect-section__title">视频采集 (免费无水印预览 mp4)</div>
                <div class="collect-search__opts">
                  <div class="collect-search__field">
                    <span class="collect-search__label">类型</span>
                    <el-select v-model="type" size="small" style="width: 110px" aria-label="采集类型">
                      <el-option value="video" label="视频" />
                    </el-select>
                  </div>
                  <div class="collect-search__field">
                    <span class="collect-search__label">授权</span>
                    <el-select v-model="license" size="small" style="width: 120px" @change="handleFilterChange">
                      <el-option value="free" label="免费(无水印)" />
                      <el-option value="premium" label="Premium(带水印)" />
                      <el-option value="all" label="全部" />
                    </el-select>
                  </div>
                  <div class="collect-search__field">
                    <span class="collect-search__label">排序</span>
                    <el-select v-model="order" size="small" style="width: 100px" @change="handleFilterChange">
                      <el-option value="relevance" label="相关度" />
                      <el-option value="recent" label="最新" />
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
                  placeholder="输入英文关键词搜索 Magnific 视频素材（如 cat, city, nature, business）"
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

                <!-- 视频卡片网格 -->
                <div class="magnific-grid">
                  <div
                    v-for="item in searchResults"
                    :key="item.id"
                    class="magnific-card"
                    :class="{ 'is-selected': selectedItems.includes(item.id) }"
                  >
                    <div class="magnific-card__check">
                      <el-checkbox
                        :model-value="selectedItems.includes(item.id)"
                        @change="toggleSelect(item)"
                      />
                    </div>

                    <div
                      class="magnific-card__cover"
                      @click="handlePreviewVideo(item)"
                      @mouseenter="handleCardHover(item, true)"
                      @mouseleave="handleCardHover(item, false)"
                    >
                      <img
                        v-if="item.image || item.thumbnail"
                        :src="item.thumbnail || item.image || ''"
                        :alt="item.title || 'Magnific Video'"
                        loading="lazy"
                      />
                      <div v-else class="magnific-card__cover-error">
                        <el-icon><VideoCamera /></el-icon>
                      </div>
                      <!-- 悬停播放预览 -->
                      <video
                        v-if="hoveredId === item.id && item.previewUrl"
                        :src="item.previewUrl"
                        class="magnific-card__preview-video"
                        muted
                        autoplay
                        loop
                        playsinline
                      />
                      <!-- 角标 -->
                      <span v-if="item.duration" class="magnific-card__badge magnific-card__badge--duration">
                        {{ formatDuration(item.duration) }}
                      </span>
                      <span v-if="item.quality" class="magnific-card__badge magnific-card__badge--quality">
                        {{ item.quality }}
                      </span>
                      <span
                        v-if="item.premium"
                        class="magnific-card__badge magnific-card__badge--premium"
                        title="Premium 素材，预览带水印"
                      >
                        水印
                      </span>
                      <span v-if="item.isAIGenerated" class="magnific-card__badge magnific-card__badge--ai">
                        AI
                      </span>
                      <span class="magnific-card__badge magnific-card__badge--play">
                        <el-icon><VideoPlay /></el-icon>
                      </span>
                    </div>

                    <div class="magnific-card__info">
                      <div class="magnific-card__title" :title="item.title || 'Magnific 视频'">
                        {{ item.title || 'Magnific 视频' }}
                      </div>
                      <div class="magnific-card__meta">
                        <span v-if="item.author">🎬 {{ item.author }}</span>
                        <span v-if="item.itemSubtype" class="magnific-card__subtype">
                          {{ item.itemSubtype === 'motion_graphics' ? '动效' : '实拍' }}
                        </span>
                      </div>
                    </div>

                    <div class="magnific-card__actions">
                      <el-button
                        size="small"
                        @click.stop="copyLink(item.link || item.url || item.videoUrl || '')"
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
                description="未找到相关视频，请尝试其他英文关键词"
              />
            </div>
          </div>

          <el-empty v-else description="请先在上方选择客户端节点" />
        </section>
      </div>
    </div>

    <!-- 视频预览对话框 -->
    <el-dialog v-model="previewVisible" title="Magnific 视频预览" width="760px" destroy-on-close align-center>
      <div v-if="previewItem" class="magnific-preview">
        <video
          v-if="previewItem.videoUrl"
          :src="previewItem.videoUrl"
          controls
          autoplay
          style="max-width: 100%; max-height: 460px; display: block; margin: 0 auto; border-radius: 8px; background: #000;"
        />
        <div style="margin-top: 16px;">
          <h4>{{ previewItem.title || 'Magnific 视频素材' }}</h4>
          <div style="margin-top: 8px; font-size: 13px; color: #888; display: flex; flex-direction: column; gap: 4px;">
            <span v-if="previewItem.author"><strong>作者:</strong> {{ previewItem.author }}</span>
            <span v-if="previewItem.duration"><strong>时长:</strong> {{ formatDuration(previewItem.duration) }}</span>
            <span v-if="previewItem.quality"><strong>原片规格:</strong> {{ previewItem.quality }}（采集为无水印预览 mp4）</span>
            <span v-if="previewItem.license"><strong>授权:</strong> {{ previewItem.license }}</span>
            <span v-if="previewItem.tags"><strong>标签:</strong> {{ previewItem.tags }}</span>
            <span v-if="previewItem.link || previewItem.url">
              <strong>来源页面:</strong>
              <a :href="previewItem.link || previewItem.url" target="_blank" style="color: #409eff; word-break: break-all;">
                {{ previewItem.link || previewItem.url }}
              </a>
            </span>
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
          保存到素材库
        </el-button>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { VideoCamera, VideoPlay } from '@element-plus/icons-vue';
import { useClientNodeState } from '@/services/clientNodeState';
import {
  searchMagnificAndWait,
  syncMagnificToMaterialLibraryAndWait,
  type MagnificVideo,
} from '@/api/external/magnific';
import '@/styles/external-collect.css';
import ClientSelector from '../components/ClientSelector.vue';

defineOptions({ name: 'ExternalMagnific' });

const type = ref('video');
const license = ref<'free' | 'premium' | 'all'>('free');
const order = ref<'relevance' | 'recent'>('relevance');

// ─── 客户端节点 ──────────────────────────────────────────────

const {
  onlineClients,
  loading,
  refresh: refreshClientNodes,
} = useClientNodeState();

const selectedClientId = ref('');
const lastResult = ref<{
  success: boolean;
  message: string;
  data?: Record<string, any> | null;
} | null>(null);

// ─── 搜索 ────────────────────────────────────────────────────

const searchKeyword = ref('');
const searchLoading = ref(false);
const pageSize = ref(20);
const searchResults = ref<MagnificVideo[]>([]);
const searchTotal = ref(0);
const currentPage = ref(1);
const totalPages = ref(0);
const selectedItems = ref<string[]>([]);
const loadingItems = ref<Set<string>>(new Set());
const batchDownloadLoading = ref(false);
const hoveredId = ref<string | null>(null);

const previewVisible = ref(false);
const previewItem = ref<MagnificVideo | null>(null);

const clients = computed(() => {
  return onlineClients.value.map((client) => {
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
  if (!selectedClientId.value) return null;
  return clients.value.find((c) => c.clientId === selectedClientId.value) || null;
});

// ─── 批量选择 ──────────────────────────────────────────────

const isAllSelected = computed(() => {
  return searchResults.value.length > 0 && selectedItems.value.length === searchResults.value.length;
});

const isIndeterminate = computed(() => {
  return selectedItems.value.length > 0 && selectedItems.value.length < searchResults.value.length;
});

// ─── 工具函数 ──────────────────────────────────────────────

const formatDuration = (seconds?: number | null) => {
  if (!seconds || !Number.isFinite(seconds)) return '';
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
};

// ─── 列表操作 ──────────────────────────────────────────────

const loadClients = async () => {
  await refreshClientNodes();
};

const handleSelectClient = () => {
  searchResults.value = [];
  selectedItems.value = [];
};

const handleCardHover = (item: MagnificVideo, entering: boolean) => {
  hoveredId.value = entering ? item.id : null;
};

const handlePreviewVideo = (item: MagnificVideo) => {
  previewItem.value = item;
  previewVisible.value = true;
};

const copyLink = async (url: string) => {
  if (!url) return;
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
    .map((item) => item?.link || item?.url || item?.videoUrl || '')
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

const toggleSelect = (item: MagnificVideo) => {
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

const handleSyncOne = async (item: MagnificVideo) => {
  if (!selectedClientId.value || !item.videoUrl) {
    ElMessage.warning('该内容没有可同步的视频');
    return;
  }
  loadingItems.value.add(item.id);
  try {
    const result = await syncMagnificToMaterialLibraryAndWait(selectedClientId.value, {
      videoUrl: item.videoUrl,
      metadata: {
        title: item.title || 'Magnific 视频素材',
        url: item.url || item.link,
        link: item.link,
        author: item.author,
        duration: item.duration,
        quality: item.quality,
        premium: item.premium,
        tags: item.tags,
        id: item.id,
      },
    });
    if (result.success) {
      ElMessage.success(`已成功保存到素材库: ${item.title || item.id}`);
      if (previewVisible.value) previewVisible.value = false;
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
      if (!item || !item.videoUrl) continue;
      try {
        const res = await syncMagnificToMaterialLibraryAndWait(selectedClientId.value, {
          videoUrl: item.videoUrl,
          metadata: {
            title: item.title || 'Magnific 视频素材',
            url: item.url || item.link,
            link: item.link,
            author: item.author,
            duration: item.duration,
            quality: item.quality,
            premium: item.premium,
            tags: item.tags,
            id: item.id,
          },
        });
        if (res.success) {
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
      ElMessage.success(`批量保存到素材库成功 (${successCount} 个)`);
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
    const result = await searchMagnificAndWait(selectedClientId.value, searchKeyword.value.trim(), {
      limit: pageSize.value,
      page,
      license: license.value,
      order: order.value,
    });
    searchResults.value = result.items || [];
    searchTotal.value = result.total || 0;
    // 源站返回总页数，优先使用（避免 total 估算偏差）
    totalPages.value = result.pages || Math.ceil(searchTotal.value / pageSize.value) || 1;
    currentPage.value = page;

    lastResult.value = {
      success: true,
      message: `搜索成功，获取到 ${searchResults.value.length} 个 Magnific 视频结果`,
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

const handleFilterChange = () => {
  if (searchKeyword.value.trim()) {
    handleSearch();
  }
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
</script>

<style scoped>
/* ─── 视频卡片网格 ─────────────────────────────────────── */
.magnific-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.magnific-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  overflow: hidden;
  background: var(--el-bg-color);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.magnific-card:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.magnific-card.is-selected {
  border-color: var(--el-color-primary);
}

.magnific-card__check {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 3;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 4px;
  padding: 1px 4px;
}

.magnific-card__cover {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #000;
  cursor: pointer;
  overflow: hidden;
}

.magnific-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.magnific-card__preview-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}

.magnific-card__cover-error {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 28px;
}

.magnific-card__badge {
  position: absolute;
  z-index: 2;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  line-height: 18px;
  color: #fff;
  background: rgba(0, 0, 0, 0.65);
}

.magnific-card__badge--duration {
  bottom: 6px;
  right: 6px;
  font-variant-numeric: tabular-nums;
}

.magnific-card__badge--quality {
  top: 6px;
  right: 6px;
  background: rgba(64, 158, 255, 0.85);
}

.magnific-card__badge--premium {
  top: 6px;
  left: 44px;
  background: rgba(230, 162, 60, 0.9);
}

.magnific-card__badge--ai {
  top: 32px;
  left: 6px;
  background: rgba(103, 194, 58, 0.9);
}

.magnific-card__badge--play {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: rgba(0, 0, 0, 0.5);
  transition: opacity 0.2s ease;
}

.magnific-card__cover:hover .magnific-card__badge--play {
  opacity: 0;
}

.magnific-card__info {
  padding: 8px 10px 4px;
  flex: 1;
  min-width: 0;
}

.magnific-card__title {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
  min-height: 36px;
}

.magnific-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.magnific-card__subtype {
  flex-shrink: 0;
  padding: 0 5px;
  border: 1px solid var(--el-border-color);
  border-radius: 3px;
  font-size: 11px;
  line-height: 16px;
}

.magnific-card__actions {
  display: flex;
  gap: 8px;
  padding: 6px 10px 10px;
}

.magnific-card__actions .el-button {
  flex: 1;
  margin: 0;
}
</style>
