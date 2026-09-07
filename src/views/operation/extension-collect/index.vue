<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="extension-collect-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col
                class="list-page-search-form__col--wide"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="6"
                :xl="5"
              >
                <el-form-item :label="t('operation.keyword')">
                  <el-input
                    v-model="queryParams.search"
                    size="small"
                    :placeholder="t('operation.searchTitleOrNotes')"
                    clearable
                    @change="
                      (val) => {
                        if (!val) getList();
                      }
                    "
                  />
                </el-form-item>
              </el-col>
              <el-col
                class="list-page-search-form__col--narrow"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="4"
                :xl="3"
              >
                <el-form-item :label="t('operation.collectType')">
                  <el-select
                    v-model="queryParams.collectType"
                    size="small"
                    :placeholder="t('operation.allTypes')"
                    clearable
                    @change="getList"
                  >
                    <el-option :label="t('operation.all')" value="" />
                    <el-option :label="t('operation.product')" value="product" />
                    <el-option :label="t('operation.article')" value="article" />
                    <el-option :label="t('operation.webPage')" value="web_page" />
                    <el-option :label="t('operation.trendWord')" value="trend" />
                    <el-option :label="t('operation.imageBatch')" value="image_batch" />
                    <el-option :label="t('operation.textSnippet')" value="text_snippet" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button
                size="small"
                type="primary"
                :icon="Search"
                :loading="loading"
                @click="getList"
                >{{ t('common.search') }}</el-button
              >
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                :loading="deleteLoading"
                @click="handleDelete(null)"
                :disabled="!ids.length"
                >{{ t('operation.batchDeleteWithCount') }}({{ ids.length }})</el-button
              >
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div
          class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat"
        >
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid
                v-bind="gridOptions"
                :data="dataSource"
                :loading="loading"
                @checkbox-change="checkboxChange"
                @checkbox-all="checkboxAllChange"
              >
                <template #titleSlot="{ row }">
                  <div class="collect-title">
                    <el-link
                      v-if="row.sourceUrl"
                      :href="row.sourceUrl"
                      target="_blank"
                      type="primary"
                      :underline="false"
                    >
                      {{ row.sourceTitle || "-" }}
                    </el-link>
                    <span v-else>{{ row.sourceTitle || "-" }}</span>
                  </div>
                  <div v-if="row.aiAnalysis" class="collect-preview">
                    {{ getPreviewText(row.aiAnalysis) }}
                  </div>
                </template>

                <template #collectTypeSlot="{ row }">
                  <el-tag :type="getTypeTagType(row.collectType)" size="small">
                    {{ getTypeLabel(row.collectType) }}
                  </el-tag>
                </template>

                <template #aiStatusSlot="{ row }">
                  <el-tag :type="row.aiAnalysis ? 'success' : 'info'" size="small">
                    {{ row.aiAnalysis ? t('operation.analyzed') : t('operation.notAnalyzed') }}
                  </el-tag>
                </template>

                <template #createdAtSlot="{ row }">
                  <span>{{ formatTimestamp(row.createdAt) }}</span>
                </template>

                <template #operationDefaultSlot="{ row }">
                  <div class="flex items-center">
                    <el-dropdown
                      trigger="click"
                      @command="(command) => handleOperationCommand(command, row)"
                      class="operation-dropdown"
                    >
                      <el-button type="primary" link size="small" class="operation-trigger-button"
                        >{{ t('common.operation') }}</el-button
                      >
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item command="detail">
                            <el-icon><View /></el-icon><span>{{ t('operation.viewDetails') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item
                            command="delete"
                            divided
                            class="operation-menu-item--danger"
                          >
                            <el-icon><Delete /></el-icon><span>{{ t('common.delete') }}</span>
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </template>
              </vxe-grid>
            </div>
          </div>
        </div>
      </template>

      <template #pagination>
        <div
          class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat"
        >
          <pagination
            :total="total"
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>

    <!-- 全屏详情抽屉 -->
    <el-drawer
      v-model="detailVisible"
      :title="t('operation.collectDetails')"
      direction="rtl"
      size="100%"
      :destroy-on-close="true"
    >
      <div v-if="currentRecord" class="detail-fullscreen">
        <!-- 顶部信息 -->
        <div class="detail-header">
          <el-tag :type="getTypeTagType(currentRecord.collectType)" size="large">
            {{ getTypeLabel(currentRecord.collectType) }}
          </el-tag>
          <span class="detail-header__title">{{ currentRecord.sourceTitle || t('operation.noTitle') }}</span>
        </div>
        
        <!-- 基本信息 -->
        <div class="detail-info-list">
          <div class="info-item">
            <span class="info-label">ID</span>
            <span class="info-value">{{ currentRecord.id }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('operation.collectType') }}</span>
            <span class="info-value">
              <el-tag :type="getTypeTagType(currentRecord.collectType)" size="small">
                {{ getTypeLabel(currentRecord.collectType) }}
              </el-tag>
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('operation.sourceTitle') }}</span>
            <span class="info-value">{{ currentRecord.sourceTitle || "-" }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('operation.platform') }}</span>
            <span class="info-value">{{ currentRecord.data?.platform || "-" }}</span>
          </div>
          <div class="info-item" v-if="currentRecord.sourceUrl">
            <span class="info-label">{{ t('operation.sourceLink') }}</span>
            <span class="info-value">
              <el-link :href="currentRecord.sourceUrl" target="_blank" type="primary">
                {{ currentRecord.sourceUrl }}
              </el-link>
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('operation.uploader') }}</span>
            <span class="info-value">
              {{ currentRecord.uploader?.account || currentRecord.uploader?.name || "-" }}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('operation.createTime') }}</span>
            <span class="info-value">{{ formatTimestamp(currentRecord.createdAt) }}</span>
          </div>
          <div class="info-item" v-if="currentRecord.userTags?.length">
            <span class="info-label">{{ t('operation.userTags') }}</span>
            <span class="info-value">
              <el-tag
                v-for="tag in currentRecord.userTags"
                :key="tag"
                size="small"
                style="margin-right: 4px"
              >
                {{ tag }}
              </el-tag>
            </span>
          </div>
          <div class="info-item" v-if="currentRecord.userNotes">
            <span class="info-label">{{ t('operation.userNotes') }}</span>
            <span class="info-value">{{ currentRecord.userNotes }}</span>
          </div>
        </div>

        <el-divider />

        <!-- AI 分析报告 -->
        <div class="section-title">{{ t('operation.aiAnalysisReport') }}</div>
        <div
          v-if="currentRecord.aiAnalysis"
          class="markdown-body"
          v-html="renderAiAnalysis(currentRecord.aiAnalysis)"
        ></div>
        <div v-else class="no-ai-data">
          <el-empty :description="t('operation.noAiAnalysisData')" />
        </div>

        <el-divider />

        <!-- 采集数据详情 -->
        <div class="section-title">{{ t('operation.collectDataDetails') }}</div>
        <div v-if="currentRecord.data" class="data-detail">
          <div class="detail-info-list">
            <template v-for="(value, key) in currentRecord.data" :key="key">
              <div class="info-item" v-if="value !== null && value !== undefined">
                <span class="info-label">{{ formatLabel(key) }}</span>
                <span class="info-value">
                  <template v-if="isImageUrl(value)">
                    <el-image :src="value" style="max-width: 100px; max-height: 100px" fit="contain" />
                  </template>
                  <template v-else-if="typeof value === 'object'">
                    <pre class="json-preview">{{ JSON.stringify(value, null, 2) }}</pre>
                  </template>
                  <template v-else>
                    {{ formatValue(value) }}
                  </template>
                </span>
              </div>
            </template>
          </div>
        </div>
        <div v-else class="no-ai-data">
          <el-empty :description="t('operation.noCollectData')" />
        </div>

        <!-- 原始 JSON（可折叠） -->
        <el-divider />
        <div class="raw-section">
          <el-button size="small" link @click="showRawJson = !showRawJson">
            {{ showRawJson ? t('operation.collapseRawJson') : t('operation.viewRawJson') }}
          </el-button>
          <el-collapse-transition>
            <pre v-show="showRawJson" class="json-preview full-json">{{ JSON.stringify(currentRecord, null, 2) }}</pre>
          </el-collapse-transition>
        </div>
      </div>
    </el-drawer>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watchEffect } from "vue";
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from "element-plus";
import { Search, Delete, View } from "@element-plus/icons-vue";
import { marked } from "marked";
import { ExtensionCollectApi } from "@/api/operation/extensionCollect";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import Pagination from "@/components/Pagination/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import { useWindowSize } from "@vueuse/core";

const { t } = useI18n();

const { height } = useWindowSize();

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  search: "",
  collectType: "",
});

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: { keyField: "id" },
  checkboxConfig: { reserve: true },
  columns: [
    { type: "checkbox", width: 50, ellipsis: true, reserve: true },
    { title: "ID", field: "id", width: 70 },
    { title: t('operation.title'), field: "sourceTitle", minWidth: 300, slots: { default: "titleSlot" } },
    { title: t('operation.type'), field: "collectType", width: 90, slots: { default: "collectTypeSlot" } },
    { title: t('operation.aiStatus'), field: "aiAnalysis", width: 80, slots: { default: "aiStatusSlot" } },
    {
      title: t('operation.uploader'),
      field: "uploader",
      width: 100,
      formatter: ({ row }) => row?.uploader?.account || row?.uploader?.name || "-",
    },
    { title: t('operation.createTime'), field: "createdAt", width: 150, slots: { default: "createdAtSlot" } },
    buildOperationColumn("operationDefaultSlot"),
  ],
} as any);

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const dataSource = ref<any[]>([]);
const loading = ref(false);
const ids = ref<number[]>([]);
const total = ref(0);
const deleteLoading = ref(false);

const detailVisible = ref(false);
const currentRecord = ref<any>(null);
const showRawJson = ref(false);

function renderMarkdown(text: any): string {
  if (!text) return "";
  const content = typeof text === 'string' ? text : JSON.stringify(text);
  return marked(content, { breaks: true }) as string;
}

// 渲染 AI 分析结果（支持对象、数组和字符串）
function renderAiAnalysis(aiAnalysis: any): string {
  if (!aiAnalysis) return "";
  
  // 如果是数组，取第一个元素处理
  if (Array.isArray(aiAnalysis)) {
    if (aiAnalysis.length === 0) return "";
    return renderAiAnalysis(aiAnalysis[0]);
  }
  
  // 如果是字符串，直接渲染 Markdown
  if (typeof aiAnalysis === 'string') {
    return marked(aiAnalysis, { breaks: true }) as string;
  }
  
  // 如果是对象，提取内容字段
  if (typeof aiAnalysis === 'object') {
    // 检测是否是逐字符拆分的数据（键是 "0", "1", "2", ...）
    const keys = Object.keys(aiAnalysis);
    const isCharArray = keys.length > 0 && keys.every((k, i) => k === String(i));
    if (isCharArray) {
      // 将字符数组转换为字符串
      const str = keys.map(k => aiAnalysis[k]).join('');
      return marked(str, { breaks: true }) as string;
    }
    
    // 优先级：markdown > content > analysis > message > raw
    const content = aiAnalysis.markdown || aiAnalysis.content || aiAnalysis.analysis || aiAnalysis.message || aiAnalysis.raw;
    if (content && typeof content === 'string') {
      return marked(content, { breaks: true }) as string;
    }
    
    // 如果有 error 字段，显示错误信息
    if (aiAnalysis.error) {
      return marked(`**${t('operation.analysisFailed')}**: ${aiAnalysis.error}`, { breaks: true }) as string;
    }
    
    // 否则格式化展示整个对象
    const formatted = Object.entries(aiAnalysis)
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, v]) => {
        const label = formatLabel(k);
        const value = typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v);
        return `**${label}**: ${value}`;
      })
      .join('\n\n');
    return marked(formatted, { breaks: true }) as string;
  }
  
  return "";
}

// 格式化字段标签
function formatLabel(key: string): string {
  const labelMap: Record<string, string> = {
    id: 'ID',
    title: t('operation.title'),
    name: t('operation.name'),
    description: t('operation.description'),
    price: t('operation.price'),
    rating: t('operation.rating'),
    reviews: t('operation.reviewCount'),
    imageUrl: t('operation.image'),
    platform: t('operation.platform'),
    category: t('operation.category'),
    brand: t('operation.brand'),
    url: t('operation.link'),
    keywords: t('operation.keywords'),
    analysis: t('operation.analysisResult'),
    summary: t('operation.summary'),
    score: t('operation.score'),
    strengths: t('operation.strengths'),
    weaknesses: t('operation.weaknesses'),
    suggestions: t('operation.suggestions'),
    keyInfo: t('operation.keyInfo'),
    features: t('operation.features'),
    scenarios: t('operation.applicableScenarios'),
    evaluation: t('operation.evaluation'),
    content: t('operation.content'),
    markdown: 'Markdown',
    text: t('operation.text'),
    body: t('operation.body'),
    images: t('operation.imageList'),
    raw: t('operation.rawContent'),
  };
  return labelMap[key] || key;
}

// 格式化值
function formatValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? t('operation.yes') : t('operation.no');
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

// 判断是否是图片 URL
function isImageUrl(value: any): boolean {
  if (typeof value !== 'string') return false;
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value) || value.startsWith('data:image/');
}

function getPreviewText(aiAnalysis: any): string {
  if (!aiAnalysis) return "";
  // 如果是对象，转为 JSON 字符串
  const text = typeof aiAnalysis === 'string' ? aiAnalysis : JSON.stringify(aiAnalysis);
  // 取前100个字符作为预览，去掉 Markdown 标记
  return (
    text
      .replace(/#{1,6}\s/g, "")
      .replace(/\*{1,2}(.*?)\*{1,2}/g, "$1")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/\n/g, " ")
      .substring(0, 100)
      .trim() + "..."
  );
}

async function getList() {
  loading.value = true;
  try {
    const params: any = { ...queryParams };
    if (!params.collectType) delete params.collectType;
    const res = await ExtensionCollectApi.getPage(params);
    dataSource.value = res.list || [];
    total.value = res.total || 0;
    ids.value = [];
  } catch (error) {
    console.error(`${t('operation.getListFailed')}:`, error);
    ElMessage.error(t('operation.getListFailed'));
  } finally {
    loading.value = false;
  }
}

function checkboxChange(e: any) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  ids.value = [...records.map((item: any) => item.id), ...reserves.map((item: any) => item.id)];
}

function checkboxAllChange(e: any) {
  checkboxChange(e);
}

function getTypeLabel(type: string) {
  const map: Record<string, string> = {
    product: t('operation.product'),
    article: t('operation.article'),
    web_page: t('operation.webPage'),
    trend: t('operation.trendWord'),
    image_batch: t('operation.imageBatch'),
    text_snippet: t('operation.textSnippet'),
  };
  return map[type] || type;
}

function getTypeTagType(type: string) {
  const map: Record<string, string> = {
    product: "danger",
    article: "warning",
    web_page: "",
    trend: "success",
    image_batch: "info",
    text_snippet: "info",
  };
  return map[type] || "";
}

function formatTimestamp(date: Date | string) {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function handleViewDetail(row: any) {
  currentRecord.value = row;
  showRawJson.value = false;
  detailVisible.value = true;
}

async function handleDelete(row?: any | null) {
  let delIds: number[] = [];
  if (row) {
    delIds = [row.id];
  } else if (ids.value.length) {
    delIds = [...ids.value];
  } else {
    return ElMessage.warning(t('operation.pleaseSelectDataToDelete'));
  }

  try {
    await ElMessageBox.confirm(`${t('operation.confirmDeleteSelected')} ${delIds.length} ${t('operation.items')}`, t('operation.deleteConfirm'), {
      confirmButtonText: t('operation.confirm'),
      cancelButtonText: t('operation.cancel'),
      type: "warning",
    });
  } catch {
    return;
  }

  deleteLoading.value = true;
  try {
    for (const id of delIds) {
      await ExtensionCollectApi.delete(id);
    }
    ElMessage.success(t('operation.deleteSuccess'));
    await getList();
  } catch (error) {
    ElMessage.error(t('operation.deleteFailed'));
  } finally {
    deleteLoading.value = false;
  }
}

function handleOperationCommand(command: string, row: any) {
  switch (command) {
    case "detail":
      handleViewDetail(row);
      break;
    case "delete":
      handleDelete(row);
      break;
  }
}

onMounted(getList);
</script>

<style scoped>
:deep(.extension-collect-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.extension-collect-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.extension-collect-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.extension-collect-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}

.collect-title {
  font-size: 14px;
  line-height: 1.5;
}

.collect-preview {
  margin-top: 4px;
  overflow: hidden;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 全屏详情 */
.detail-fullscreen {
  padding: 0 24px 24px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.detail-header__title {
  font-size: 20px;
  font-weight: 600;
}

.detail-meta {
  display: flex;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  gap: 20px;
  align-items: center;
}

.no-ai-data {
  padding: 40px 0;
}

.raw-section {
  margin-top: 16px;
}

/* Markdown 样式 */
.markdown-body {
  font-size: 14px;
  line-height: 1.8;
}

.markdown-body :deep(h1) {
  padding-bottom: 8px;
  margin: 24px 0 16px;
  font-size: 24px;
  font-weight: 600;
  border-bottom: 1px solid var(--el-border-color-light);
}

.markdown-body :deep(h2) {
  margin: 20px 0 12px;
  font-size: 20px;
  font-weight: 600;
}

.markdown-body :deep(h3) {
  margin: 16px 0 8px;
  font-size: 16px;
  font-weight: 600;
}

.markdown-body :deep(p) {
  margin: 8px 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 24px;
  margin: 8px 0;
}

.markdown-body :deep(li) {
  margin: 4px 0;
}

.markdown-body :deep(table) {
  width: 100%;
  margin: 12px 0;
  border-collapse: collapse;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 8px 12px;
  text-align: left;
  border: 1px solid var(--el-border-color);
}

.markdown-body :deep(th) {
  font-weight: 600;
  background: var(--el-fill-color-light);
}

.markdown-body :deep(blockquote) {
  padding: 8px 16px;
  margin: 12px 0;
  background: var(--el-fill-color-lighter);
  border-left: 4px solid var(--el-color-primary);
}

.markdown-body :deep(code) {
  padding: 2px 6px;
  font-family: monospace;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.markdown-body :deep(pre) {
  padding: 16px;
  overflow-x: auto;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.markdown-body :deep(pre code) {
  padding: 0;
  background: none;
}

.markdown-body :deep(img) {
  max-width: 100%;
  margin: 8px 0;
  border-radius: 8px;
}

.markdown-body :deep(hr) {
  margin: 16px 0;
  border: none;
  border-top: 1px solid var(--el-border-color-light);
}

.markdown-body :deep(strong) {
  font-weight: 600;
}

/* 新增样式 */
.section-title {
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.data-detail {
  margin-top: 12px;
}

.data-detail :deep(.el-descriptions) {
  margin-bottom: 16px;
}

.data-detail :deep(.el-descriptions__label) {
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.data-detail :deep(.el-descriptions__content) {
  word-break: break-all;
}

.data-detail :deep(.el-image) {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.data-detail :deep(.el-textarea__inner) {
  font-size: 12px;
  line-height: 1.5;
}

/* 信息列表样式 */
.detail-info-list {
  margin-top: 16px;
}

.info-item {
  display: flex;
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  width: 100px;
  flex-shrink: 0;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.info-value {
  flex: 1;
  word-break: break-all;
}

.json-preview {
  padding: 12px;
  margin: 0;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.full-json {
  max-height: 400px;
  margin-top: 12px;
  overflow-y: auto;
}
</style>
