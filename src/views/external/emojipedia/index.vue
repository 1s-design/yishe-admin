<template>
  <ContentWrap :plain="true">
    <div class="collect-page">
      <!-- 客户端选择 -->
      <ClientSelector
        v-model="selectedClientId"
        plugin-key="emojipedia"
        @change="handleSelectClient"
        @refresh="loadClients"
      />
      <div class="collect-layout" v-loading="loading">
        <section class="collect-main">
          <div v-if="selectedClient" class="collect-panel">
            
            <div class="collect-section">
              <div class="collect-search__header">
                <div class="collect-section__title">素材采集 (Emoji · Sticker · 多平台风格)</div>
                <div class="collect-search__opts">
                  <div class="collect-search__field">
                    <span class="collect-search__label">分类</span>
                    <el-select v-model="category" size="small" style="width: 100px"><el-option value="stickers" label="Stickers" /><el-option value="emojis" label="Emojis" /></el-select>
                  </div>
                  <div class="collect-search__field">
                    <span class="collect-search__label">每页数量</span>
                    <el-select v-model="pageSize" size="small" style="width: 100px" @change="handleSizeChange">
                      <el-option :value="10" label="10 条" /><el-option :value="20" label="20 条" /><el-option :value="30" label="30 条" /><el-option :value="50" label="50 条" />
                    </el-select>
                  </div>
                </div>
              </div>
              <div class="collect-inline">
                <el-input v-model="searchKeyword" clearable placeholder="输入英文关键词搜索 Emojipedia（如 cat, heart, fire）" @keyup.enter="handleSearch" />
                <el-button type="primary" :loading="searchLoading" @click="handleSearch">搜索</el-button>
              </div>
              <div v-if="searchResults.length > 0" class="collect-search__results">
                <div class="collect-search__header">
                  <div class="collect-search__info">共 {{ searchTotal }} 个结果，第 {{ currentPage }} / {{ totalPages }} 页</div>
                  <div class="collect-actions-bar">
                    <el-checkbox :model-value="isAllSelected" :indeterminate="isIndeterminate" @change="toggleSelectAll">全选</el-checkbox>
                    <span class="collect-actions-bar__count">已选 {{ selectedItems.length }} 项</span>
                    <el-button type="primary" size="small" :disabled="selectedItems.length === 0" :loading="batchDownloadLoading" @click="handleBatchDownload">批量采集</el-button>
                    <el-button size="small" :disabled="selectedItems.length === 0" @click="copySelectedLinks">复制链接</el-button>
                    <el-button size="small" @click="clearSelection">清空</el-button>
                  </div>
                </div>
                <div class="collect-list">
                  <div v-for="item in searchResults" :key="item.id" class="collect-item" :class="{ 'is-selected': selectedItems.includes(item.id) }">
                    <el-checkbox :model-value="selectedItems.includes(item.id)" @change="toggleSelect(item)" />
                    <div class="collect-item__thumb" @click="handlePreviewPhoto(item)">
                      <img v-if="item.image || item.thumbnail" :src="item.thumbnail || item.image || ''" :alt="item.title" loading="lazy" />
                      <div v-else class="collect-item__thumb-error"><el-icon><Picture /></el-icon></div>
                    </div>
                    <div class="collect-item__info">
                      <div class="collect-item__title" :title="item.title">{{ item.emoji ? item.emoji + ' ' + item.title : item.title }}</div>
                      <div class="collect-item__meta"><span class="collect-item__size">{{ item.platform || category }}</span></div>
                    </div>
                    <div class="collect-item__actions">
                      <el-button size="small" @click.stop="copyLink(item.image)">复制</el-button>
                      <el-button type="primary" size="small" :loading="loadingItems.has(item.id)" :disabled="!selectedClientId || !selectedClient?.isOnline" @click.stop="handleSyncOne(item)">采集入库</el-button>
                    </div>
                  </div>
                </div>
                <div class="collect-pagination">
                  <el-pagination v-model:current-page="currentPage" :page-size="pageSize" :total="searchTotal" layout="total, prev, pager, next" background @current-change="handlePageChange" />
                </div>
              </div>
              <el-empty v-else-if="!searchLoading && searchKeyword" description="未找到相关素材，请尝试其他关键词" />
            </div>
          </div>
          <el-empty v-else description="请先在上方选择客户端节点" />
        </section>
      </div>
    </div>
    <el-dialog v-model="previewVisible" title="Emojipedia 预览" width="700px" destroy-on-close align-center>
      <div v-if="previewItem" class="collect-preview">
        <img :src="previewItem.thumbnail || previewItem.image" :alt="previewItem.title" style="max-width: 100%; max-height: 500px; display: block; margin: 0 auto; border-radius: 8px; background: #fafafa; padding: 16px;" />
        <div style="margin-top: 16px;"><h4>{{ previewItem.emoji }} {{ previewItem.title }}</h4>
          <div style="margin-top: 8px; font-size: 13px; color: #888; display: flex; flex-direction: column; gap: 4px;">
            <span><strong>平台:</strong> {{ previewItem.platform || 'Multi-platform' }}</span>
            <span><strong>下载:</strong> <a :href="previewItem.image" target="_blank" style="color: #409eff;">{{ previewItem.image }}</a></span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button v-if="previewItem" type="primary" :loading="loadingItems.has(previewItem.id)" :disabled="!selectedClientId || !selectedClient?.isOnline" @click="handleSyncOne(previewItem)">保存到素材库</el-button>
      </template>
    </el-dialog>
  </ContentWrap>
</template>
<script setup lang="ts">
import { ref, computed, watch, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Picture } from '@element-plus/icons-vue';
import { useClientNodeState } from '@/services/clientNodeState';
import { getClientServiceRuntime } from '@/store/modules/clientNode';
import { searchEmojipediaAndWait, syncEmojipediaToMaterialLibraryAndWait, refreshEmojipediaStatus, type EmojipediaItem, type EmojipediaClientVO, type EmojipediaServiceStatus } from '@/api/external/emojipedia';
import { uploadMaterialFile } from '@/api/material';
import '@/styles/external-collect.css';
import ClientSelector from '../components/ClientSelector.vue'
defineOptions({ name: 'ExternalEmojipedia' });
const category = ref('stickers');
const actionLoading = reactive({ refreshRuntime: false });
const { onlineClients, loading, refresh: refreshClientNodes } = useClientNodeState();
const _getServiceRuntime = (c: any) => getClientServiceRuntime(c, 'emojipedia');
const selectedClientId = ref('');
const clients = computed<EmojipediaClientVO[]>(() => onlineClients.value.map((c: any) => {
  const s = _getServiceRuntime(c) as EmojipediaServiceStatus | null;
  return {
    clientId: c.id,
    isOnline: c.isOnline,
    nodeStatus: c.nodeStatus,
    machine: c.clientInfo?.machine || null,
    location: c.clientInfo?.location || null,
    emojipedia: s ? { ...s } : null,
  };
}));

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
const selectedClient = computed(() => clients.value.find((c) => c.clientId === selectedClientId.value) || null);
const selectedService = computed<EmojipediaServiceStatus | null>(() => selectedClient.value?.emojipedia || null);
const isClientOnline = computed(() => !!selectedClient.value?.isOnline);
const isServiceAvailable = computed(() => isClientOnline.value && !!(selectedService.value?.available || selectedService.value?.connected));
const availabilityTone = computed(() => !selectedClient.value ? 'neutral' : !isClientOnline.value ? 'danger' : isServiceAvailable.value ? 'success' : 'warning');
const availabilityText = computed(() => !selectedClient.value ? '未选择节点' : !isClientOnline.value ? '节点离线' : isServiceAvailable.value ? '服务就绪' : '服务异常');
const clientTone = computed(() => isClientOnline.value ? 'success' : 'danger');
const clientStatusText = computed(() => isClientOnline.value ? '客户端在线' : '客户端离线');
const siteTone = computed(() => !isClientOnline.value ? 'danger' : isServiceAvailable.value ? 'success' : 'warning');
const siteStatusBadge = computed(() => !isClientOnline.value ? '不可用' : isServiceAvailable.value ? 'Emojipedia 正常' : 'Emojipedia 异常');
const loadClients = () => refreshClientNodes();
const handleRefreshRuntime = async () => { if (!selectedClientId.value) return; actionLoading.refreshRuntime = true; try { const r = await refreshEmojipediaStatus(selectedClientId.value); ElMessage.success(r.success ? '已发送刷新指令' : (r.message || '刷新失败')); if (r.success) await refreshClientNodes(); } catch (e: any) { ElMessage.error(e.message || '刷新失败'); } finally { actionLoading.refreshRuntime = false; } };
const searchKeyword = ref(''); const searchLoading = ref(false); const searchResults = ref<EmojipediaItem[]>([]); const searchTotal = ref(0);
const currentPage = ref(1); const pageSize = ref(20); const totalPages = ref(1);
const selectedItems = ref<string[]>([]); const batchDownloadLoading = ref(false); const loadingItems = ref<Set<string>>(new Set());
const isAllSelected = computed(() => searchResults.value.length > 0 && selectedItems.value.length === searchResults.value.length);
const isIndeterminate = computed(() => selectedItems.value.length > 0 && selectedItems.value.length < searchResults.value.length);
const toggleSelect = (item: EmojipediaItem) => { const idx = selectedItems.value.indexOf(item.id); if (idx > -1) selectedItems.value.splice(idx, 1); else selectedItems.value.push(item.id); };
const toggleSelectAll = () => { selectedItems.value = isAllSelected.value ? [] : searchResults.value.map((i) => i.id); };
const clearSelection = () => { selectedItems.value = []; };
const getItemById = (id: string) => searchResults.value.find((i) => i.id === id);
const copyLink = async (text: string) => { if (!text) return; try { await navigator.clipboard.writeText(text); ElMessage.success('已复制'); } catch { ElMessage.error('复制失败'); } };
const copySelectedLinks = () => { const links = selectedItems.value.map((id) => getItemById(id)?.image).filter(Boolean); if (links.length) copyLink(links.join('\n')); };
const handlePreviewPhoto = (item: EmojipediaItem) => { previewItem.value = item; previewVisible.value = true; };
const handleSyncOne = async (item: EmojipediaItem) => {
  if (!selectedClientId.value) { ElMessage.warning('请先选择客户端节点'); return; }
  const targetUrl = item.image; if (!targetUrl) { ElMessage.warning('没有可同步的图片'); return; }
  loadingItems.value.add(item.id);
  try { const result = await syncEmojipediaToMaterialLibraryAndWait(selectedClientId.value, { imageUrl: targetUrl, metadata: { title: item.title, id: item.id, platform: item.platform } });
    if (result.success) { const d = result.data?.data || result.data || {}; if (!d.cosUrl) { ElMessage.error('上传 COS 失败'); return; }
      const suffix = item.image.endsWith('.svg') ? 'svg' : item.image.endsWith('.png') ? 'png' : 'jpg';
      await uploadMaterialFile({ url: d.cosUrl, originUrl: item.url || targetUrl, title: item.title || `emojipedia_${item.id}`, category: 'sticker', suffix, meta: item });
      ElMessage.success(`已保存: ${item.title}`); } else { ElMessage.error(`采集失败: ${result.message}`); }
  } catch (e: any) { ElMessage.error(`同步出错: ${e.message}`); } finally { loadingItems.value.delete(item.id); }
};
const handleBatchDownload = async () => {
  if (!selectedClientId.value || selectedItems.value.length === 0) return; batchDownloadLoading.value = true; let ok = 0, fail = 0;
  try { for (const id of selectedItems.value) { const item = getItemById(id); if (!item) continue; const url = item.image; if (!url) continue;
    try { const r = await syncEmojipediaToMaterialLibraryAndWait(selectedClientId.value, { imageUrl: url, metadata: { title: item.title, id: item.id } }); if (r.success) { const d = r.data?.data || r.data || {}; if (d.cosUrl) { const suffix = url.endsWith('.svg') ? 'svg' : url.endsWith('.png') ? 'png' : 'jpg'; await uploadMaterialFile({ url: d.cosUrl, originUrl: url, title: item.title, category: 'sticker', suffix, meta: item }); ok++; } else { fail++; } } else { fail++; } } catch { fail++; } }
  } finally { batchDownloadLoading.value = false; }
  if (fail === 0) ElMessage.success(`批量保存成功 (${ok} 个)`); else ElMessage.warning(`完成：成功 ${ok}，失败 ${fail}`);
};
const doSearch = async (page = 1) => {
  if (!selectedClientId.value) { ElMessage.warning('请先选择客户端节点'); return; } if (!searchKeyword.value.trim()) { ElMessage.warning('请输入关键词'); return; }
  searchLoading.value = true; selectedItems.value = []; try {
    const r = await searchEmojipediaAndWait(selectedClientId.value, searchKeyword.value.trim(), { limit: pageSize.value, page, category: category.value });
    searchResults.value = r.items || []; searchTotal.value = r.total || 0; totalPages.value = r.totalPages || 1; currentPage.value = page;
  } catch (e: any) { ElMessage.error(e.message || '搜索失败'); } finally { searchLoading.value = false; }
};
const handleSearch = () => { currentPage.value = 1; doSearch(1); };
const handleSizeChange = (val: number) => { pageSize.value = val; if (searchResults.value.length > 0) handleSearch(); };
const handlePageChange = (page: number) => { doSearch(page); };
const previewVisible = ref(false); const previewItem = ref<EmojipediaItem | null>(null);
onMounted(() => { loadClients(); });
watch(clients, (list) => { if (!selectedClientId.value && list.length > 0) { const online = list.find((c) => c.isOnline && c.emojipedia?.available); selectedClientId.value = online?.clientId || list[0]?.clientId; } }, { immediate: true });
</script>
