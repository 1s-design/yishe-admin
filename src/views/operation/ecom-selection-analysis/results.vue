<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="ecom-data-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <div class="resource-toolbar">
            <div class="resource-toolbar__meta">
              <div class="resource-toolbar__title">{{ t('operation.selectionAnalysisResults') }}</div>
            </div>
          </div>

          <el-form :model="filters" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col :xs="24" :sm="12" :md="8" :lg="7">
                <el-form-item :label="t('operation.analysisTask')">
                  <el-select v-model="filters.taskId" clearable filterable :placeholder="t('operation.allTasks')">
                    <el-option
                      v-for="item in taskOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item :label="t('operation.runId')">
                  <el-input v-model="filters.runId" clearable :placeholder="t('operation.runId')" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item :label="t('operation.analysisType')">
                  <el-select v-model="filters.analysisType" clearable :placeholder="t('operation.allTypes')">
                    <el-option :label="t('operation.hotSellingSelection')" value="hot_selling_selection" />
                    <el-option :label="t('operation.podPatternAnalysis')" value="pod_pattern_analysis" />
                    <el-option :label="t('operation.customPromptAnalysis')" value="custom_prompt_extract" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" @click="handleSearch">{{ t('common.query') }}</el-button>
              <el-button size="small" @click="handleReset">{{ t('common.reset') }}</el-button>
              <el-button
                size="small"
                type="danger"
                :disabled="!selectedIds.length"
                @click="handleBatchDelete"
              >
                {{ t('operation.batchDelete') }}({{ selectedIds.length }})
              </el-button>
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
                :data="tableData"
                :loading="loading"
                @checkbox-change="handleCheckboxChange"
                @checkbox-all="handleCheckboxAll"
              >
                <template #typeSlot="{ row }">
                  <el-tag size="small" type="info">
                    {{ getAnalysisTypeLabel(row.analysisType) }}
                  </el-tag>
                </template>

                <template #statusSlot="{ row }">
                  <el-tag size="small" :type="getRunStatusTagType(row.runStatus)">
                    {{ getRunStatusLabel(row.runStatus) }}
                  </el-tag>
                </template>

                <template #summarySlot="{ row }">
                  <span class="table-meta-text">{{ getOverviewText(row) }}</span>
                </template>

                <template #operationSlot="{ row }">
                  <div class="flex justify-start">
                    <el-dropdown
                      class="operation-dropdown"
                      placement="bottom-end"
                      @command="(command) => handleOperationCommand(String(command), row)"
                    >
                      <el-button type="primary" link size="small" class="operation-trigger-button">
                        {{ t('common.operation') }}
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item command="detail">
                            <el-icon><View /></el-icon>
                            <span>{{ t('common.detail') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item
                            v-if="row.analysisType === 'hot_selling_selection'"
                            command="supply-match"
                          >
                            <el-icon><Link /></el-icon>
                            <span>{{ t('operation.createSupplyMatch') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item
                            command="delete"
                            divided
                            class="operation-menu-item--danger"
                          >
                            <el-icon><Delete /></el-icon>
                            <span>{{ t('common.delete') }}</span>
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
          <Pagination
            :total="total"
            v-model:page="filters.pageNo"
            v-model:limit="filters.pageSize"
            @pagination="loadList"
          />
        </div>
      </template>
    </ListPageLayout>

    <el-dialog
      v-model="detailVisible"
      fullscreen
      destroy-on-close
      class="analysis-result-detail-dialog"
      :title="t('operation.analysisResultDetails')"
      @closed="handleDetailClosed"
    >
      <div v-loading="detailLoading" class="detail-shell">
        <template v-if="currentDetail">
          <CompactNotice
            v-if="currentRunStatus === 'failed'"
            type="danger"
            :title="t('operation.analysisExecutionFailed')"
            :description="currentRunErrorMessage || t('operation.checkCollectSampleOrAiConfig')"
            class="detail-notice"
          />

          <div class="detail-overview-grid">
            <div class="detail-card detail-card--hero">
              <div class="detail-card__header">
                <div>
                  <div class="detail-card__title">
                    {{ currentDetail.taskName || getAnalysisTypeLabel(currentDetail.analysisType) }}
                  </div>
                  <div class="detail-card__subtitle">
                    {{ detailOverviewSummary }}
                  </div>
                </div>
                <div class="detail-chip-row">
                  <el-tag size="small" :type="getRunStatusTagType(currentRunStatus)">
                    {{ getRunStatusLabel(currentRunStatus) }}
                  </el-tag>
                  <el-tag size="small" type="info">
                    {{ getAnalysisTypeLabel(currentDetail.analysisType) }}
                  </el-tag>
                  <el-tag v-if="currentAiModel" size="small" type="info">
                    {{ currentAiModel }}
                  </el-tag>
                </div>
              </div>

              <div class="metric-grid">
                <div class="metric-card">
                  <span>{{ t('operation.sampleCount') }}</span>
                  <strong>{{ detailSourceSummary.itemCount || 0 }}</strong>
                </div>
                <div class="metric-card">
                  <span>{{ resultCountLabel }}</span>
                  <strong>{{ resultCountValue }}</strong>
                </div>
                <div class="metric-card">
                  <span>{{ supportMetricLabel }}</span>
                  <strong>{{ supportMetricValue }}</strong>
                </div>
                <div class="metric-card">
                  <span>{{ t('operation.resultTime') }}</span>
                  <strong>{{
                    formatDateTime(currentDetail.analyzedAt || currentDetail.runFinishedAt)
                  }}</strong>
                </div>
              </div>
            </div>

            <div class="detail-card">
              <div class="detail-card__title">{{ t('operation.resultSummary') }}</div>
              <div class="stats-list">
                <div class="stats-item">
                  <span>{{ t('operation.resultId') }}</span>
                  <strong>{{ currentDetail.id || "-" }}</strong>
                </div>
                <div class="stats-item">
                  <span>{{ t('operation.runId') }}</span>
                  <strong>{{ currentDetail.runId || "-" }}</strong>
                </div>
                <div class="stats-item">
                  <span>{{ t('operation.taskCount') }}</span>
                  <strong>{{ detailSourceSummary.taskCount || 0 }}</strong>
                </div>
                <div class="stats-item">
                  <span>{{ t('operation.runCount') }}</span>
                  <strong>{{ detailSourceSummary.runCount || 0 }}</strong>
                </div>
              </div>

              <div class="detail-mini-section" v-if="detailSourceSummary.platformBreakdown?.length">
                <div class="detail-mini-section__title">{{ t('operation.platformDistribution') }}</div>
                <div class="chip-list">
                  <el-tag
                    v-for="item in detailSourceSummary.platformBreakdown"
                    :key="item.platform"
                    size="small"
                  >
                    {{ item.platform }} · {{ item.count }}
                  </el-tag>
                </div>
              </div>
            </div>
          </div>

          <div class="detail-toolbar" v-if="currentDetail.analysisType === 'hot_selling_selection'">
            <el-button type="primary" @click="handleCreateSupplyMatchTask(currentDetail)">
              {{ t('operation.createSupplyMatchTaskBasedOnAnalysis') }}
            </el-button>
          </div>

          <el-tabs>
            <el-tab-pane :label="t('operation.resultPreview')">
              <div v-if="recommendedProducts.length" class="simple-list">
                <div
                  v-for="item in recommendedProducts"
                  :key="item.rank || item.productName"
                  class="simple-card"
                >
                  <div class="simple-card__title">
                    #{{ item.rank || "-" }} {{ item.productName || "-" }}
                  </div>
                  <div class="simple-card__text">{{ item.selectionReason || "-" }}</div>
                </div>
              </div>

              <div v-else-if="customResultItems.length" class="simple-list">
                <div
                  v-for="(item, index) in customResultItems.slice(0, 12)"
                  :key="item?.id || item?.sourceUrl || index"
                  class="simple-card"
                >
                  <div class="simple-card__title">
                    {{ item?.title || item?.name || item?.label || `${t('operation.result')} ${index + 1}` }}
                  </div>
                  <div class="simple-card__text">{{ formatCustomResultCell(item) }}</div>
                </div>
              </div>

              <el-empty v-else :description="t('operation.noResultPreview')" />
            </el-tab-pane>

            <el-tab-pane :label="t('operation.sourceProducts')">
              <pre class="json-preview">{{ formatJson(normalizedItems) }}</pre>
            </el-tab-pane>

            <el-tab-pane :label="t('operation.resultJson')">
              <pre class="json-preview">{{ formatJson(currentDetail.output) }}</pre>
            </el-tab-pane>
          </el-tabs>
        </template>

        <el-empty v-else :description="t('operation.noDetailData')" />
      </div>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, reactive, ref, watch, watchEffect } from "vue";
import { useWindowSize } from "@vueuse/core";
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Link, View } from "@element-plus/icons-vue";
import type { VxeGridProps } from "vxe-table";
import {
  batchDeleteEcomSelectionAnalysisResult,
  deleteEcomSelectionAnalysisResult,
  getEcomSelectionAnalysisResultDetail,
  getEcomSelectionAnalysisResultList,
  getEcomSelectionAnalysisTaskList,
  type EcomSelectionAnalysisResult,
  type EcomSelectionAnalysisTask,
} from "@/api/operation/ecomSelectionAnalysis";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import CompactNotice from "@/components/CompactNotice/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import {
  formatDateTime,
  formatJson,
  getAnalysisTypeLabel,
  getRunStatusLabel,
  getRunStatusTagType,
} from "@/views/operation/ecom-data/shared";

const { t } = useI18n();

defineOptions({ name: "EcomSelectionAnalysisResultPage" });

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const detailLoading = ref(false);
const detailVisible = ref(false);
const total = ref(0);
const list = ref<EcomSelectionAnalysisResult[]>([]);
const tasks = ref<EcomSelectionAnalysisTask[]>([]);
const selectedIds = ref<string[]>([]);
const currentDetail = ref<EcomSelectionAnalysisResult | null>(null);

const filters = reactive({
  pageNo: 1,
  pageSize: 10,
  taskId: "",
  runId: "",
  analysisType: "",
});

const syncQueryToFilters = () => {
  filters.taskId = String(route.query.taskId || "").trim();
  filters.runId = String(route.query.runId || "").trim();
};

const updateSelectedIds = (records: EcomSelectionAnalysisResult[] = []) => {
  selectedIds.value = Array.from(
    new Set(records.map((item) => String(item.id || "").trim()).filter(Boolean)),
  );
};

const tableData = computed(() => {
  if (list.value.length <= filters.pageSize) {
    return list.value;
  }
  const start = (filters.pageNo - 1) * filters.pageSize;
  return list.value.slice(start, start + filters.pageSize);
});

const taskOptions = computed(() =>
  tasks.value.map((item) => ({ value: item.id, label: item.name })),
);

const currentRunStatus = computed(
  () => String(currentDetail.value?.runStatus || "").trim() || "success",
);
const currentRunErrorMessage = computed(
  () => String(currentDetail.value?.runErrorMessage || "").trim() || "",
);
const currentAiModel = computed(() => String(currentDetail.value?.aiModel || "").trim() || "");

const detailSourceSummary = computed(() => {
  return currentDetail.value?.sourceSummary || {};
});

const recommendedProducts = computed(() => {
  return Array.isArray(currentDetail.value?.output?.recommendedProducts)
    ? currentDetail.value?.output?.recommendedProducts
    : [];
});

const customResultItems = computed(() => {
  const value = currentDetail.value?.output?.customResult?.items;
  return Array.isArray(value) ? value : [];
});

const normalizedItems = computed(() => {
  return Array.isArray(currentDetail.value?.sourceItems) ? currentDetail.value?.sourceItems : [];
});

const resultCountLabel = computed(() =>
  currentDetail.value?.analysisType === "hot_selling_selection" ? t('operation.recommendedProducts') : t('operation.resultCount'),
);
const resultCountValue = computed(() =>
  currentDetail.value?.analysisType === "hot_selling_selection"
    ? recommendedProducts.value.length
    : customResultItems.value.length,
);
const supportMetricLabel = computed(() =>
  currentDetail.value?.analysisType === "hot_selling_selection" ? t('operation.hotKeywords') : t('operation.sourceProducts'),
);
const supportMetricValue = computed(() =>
  currentDetail.value?.analysisType === "hot_selling_selection"
    ? Number(currentDetail.value?.output?.hotKeywords?.length || 0)
    : normalizedItems.value.length,
);

const detailOverviewSummary = computed(
  () =>
    currentDetail.value?.output?.overview?.summary ||
    currentRunErrorMessage.value ||
    t('operation.noSummaryAvailable'),
);
const formatCustomResultCell = (value: unknown) => {
  if (value == null || value === "") {
    return "-";
  }
  if (typeof value === "object") {
    return formatJson(value);
  }
  return String(value);
};

const getOverviewText = (row: EcomSelectionAnalysisResult) => {
  const overviewSummary = String(row?.output?.overview?.summary || "").trim();
  if (overviewSummary) {
    return overviewSummary;
  }

  const resultCount = getListResultCount(row);
  if (resultCount > 0) {
    return row.analysisType === "pod_pattern_analysis"
      ? `${t('operation.output')} ${resultCount} ${t('operation.patternResults')}`
      : row.analysisType === "custom_prompt_extract"
        ? `${t('operation.output')} ${resultCount} ${t('operation.customResults')}`
        : `${t('operation.recommended')} ${resultCount} ${t('operation.candidateDirections')}`;
  }

  if (row?.sourceSummary?.itemCount) {
    return `${t('operation.sample')} ${row.sourceSummary.itemCount} ${t('operation.items')}`;
  }

  if (row.runErrorMessage) {
    return row.runErrorMessage;
  }

  return t('operation.noSummary');
};

const getListResultCount = (row: EcomSelectionAnalysisResult) => {
  if (String(row.analysisType || "").trim() === "hot_selling_selection") {
    return Number(row?.output?.recommendedProducts?.length || 0);
  }

  return Number(row?.output?.customResult?.items?.length || 0);
};

const { height } = useWindowSize();

const gridOptions = ref<VxeGridProps<EcomSelectionAnalysisResult>>({
  ...(commonGridOptions as VxeGridProps<EcomSelectionAnalysisResult>),
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: {
    ...(commonGridOptions as any).rowConfig,
    keyField: "id",
  },
  checkboxConfig: {
    reserve: true,
  },
  columns: [
    { type: "checkbox", width: 48 },
    { title: t('operation.taskName'), field: "taskName", minWidth: 220, showOverflow: "tooltip" },
    {
      title: t('operation.type'),
      field: "analysisType",
      width: 110,
      slots: { default: "typeSlot" },
    },
    {
      title: t('operation.runStatus'),
      field: "runStatus",
      width: 100,
      slots: { default: "statusSlot" },
    },
    {
      title: t('operation.aiModel'),
      field: "aiModel",
      minWidth: 140,
      formatter: ({ row }) => row.aiModel || "-",
    },
    {
      title: t('operation.sampleCount'),
      field: "sourceSummary",
      width: 88,
      formatter: ({ row }) => Number(row.sourceSummary?.itemCount || 0),
    },
    {
      title: t('operation.resultCount'),
      field: "output",
      width: 88,
      formatter: ({ row }) => getListResultCount(row),
    },
    {
      ...buildTimeColumn(t('operation.resultTime'), "analyzedAt", 180),
      formatter: ({ row }) =>
        formatDateTime((row as EcomSelectionAnalysisResult).analyzedAt || row.runFinishedAt),
    },
    {
      title: t('operation.summary'),
      field: "summaryText",
      minWidth: 220,
      showOverflow: "tooltip",
      slots: { default: "summarySlot" },
    },
    buildOperationColumn("operationSlot", 132),
  ],
});

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const applyListData = (data: any) => {
  list.value = Array.isArray(data?.list) ? data.list : [];
  total.value = Number(data?.total || 0);
  selectedIds.value = [];
};

const loadList = async () => {
  loading.value = true;
  try {
    const data = await getEcomSelectionAnalysisResultList(filters);
    applyListData(data);
  } finally {
    loading.value = false;
  }
};

const loadData = async () => {
  loading.value = true;
  try {
    const [resultData, taskData] = await Promise.all([
      getEcomSelectionAnalysisResultList(filters),
      getEcomSelectionAnalysisTaskList({ pageNo: 1, pageSize: 100 }),
    ]);
    applyListData(resultData);
    tasks.value = Array.isArray(taskData?.list) ? taskData.list : [];
  } finally {
    loading.value = false;
  }
};

const handleSearch = async () => {
  filters.pageNo = 1;
  await loadList();
};

const handleReset = async () => {
  filters.pageNo = 1;
  filters.taskId = "";
  filters.runId = "";
  filters.analysisType = "";
  await loadList();
};

const handleCheckboxChange = ({ records }: { records: EcomSelectionAnalysisResult[] }) => {
  updateSelectedIds(records);
};

const handleCheckboxAll = ({ records }: { records: EcomSelectionAnalysisResult[] }) => {
  updateSelectedIds(records);
};

const handleOperationCommand = (command: string, row: EcomSelectionAnalysisResult) => {
  switch (command) {
    case "detail":
      void openDetail(row);
      break;
    case "supply-match":
      void handleCreateSupplyMatchTask(row);
      break;
    case "delete":
      void handleDelete(row);
      break;
  }
};

const openDetail = async (row: EcomSelectionAnalysisResult) => {
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    currentDetail.value = await getEcomSelectionAnalysisResultDetail(row.id);
  } finally {
    detailLoading.value = false;
  }
};

const handleDetailClosed = () => {
  currentDetail.value = null;
};

const handleCreateSupplyMatchTask = async (
  result: EcomSelectionAnalysisResult,
  sourceItemIds?: string[],
  productName?: string,
) => {
  if (result.analysisType !== "hot_selling_selection") {
    ElMessage.warning(t('operation.onlyHotSellingCanCreateSupplyMatch'));
    return;
  }

  await router.push({
    name: "EcomSelectionSupplyMatchTaskPage",
    query: {
      analysisRunId: result.runId,
      sourceItemIds:
        Array.isArray(sourceItemIds) && sourceItemIds.length ? sourceItemIds.join(",") : "",
      productName: productName || "",
    },
  });
};

const handleDelete = async (row: EcomSelectionAnalysisResult) => {
  try {
    await ElMessageBox.confirm(
      t('operation.confirmDeleteAnalysisResult'),
      t('common.tip'),
      { type: "warning" },
    );
    await deleteEcomSelectionAnalysisResult(row.id);
    ElMessage.success(t('operation.analysisResultDeleted'));
    await loadList();
  } catch {}
};

const handleBatchDelete = async () => {
  if (!selectedIds.value.length) return;
  try {
    await ElMessageBox.confirm(`${t('operation.confirmBatchDeleteResults')} ${selectedIds.value.length} ${t('operation.items')}`, t('common.tip'), {
      type: "warning" },
    );
    await batchDeleteEcomSelectionAnalysisResult(selectedIds.value);
    ElMessage.success(t('operation.batchDeleteSuccess'));
    await loadList();
  } catch {}
};

watch(
  () => route.query,
  () => {
    syncQueryToFilters();
    void loadData();
  },
);

onMounted(() => {
  syncQueryToFilters();
  void loadData();
});

onActivated(() => {
  void loadData();
});
</script>

<style scoped lang="scss">
:deep(.ecom-data-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.ecom-data-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.ecom-data-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.ecom-data-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}

.resource-toolbar__title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.resource-toolbar__desc,
.table-meta-text,
.detail-card__subtitle,
.simple-card__text {
  color: var(--el-text-color-secondary);
}

.detail-shell {
  min-height: calc(100vh - 180px);
}

.detail-notice {
  margin-bottom: 14px;
}

.detail-overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
  gap: 16px;
  margin-bottom: 18px;
}

.detail-card,
.simple-card {
  padding: 16px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
}

.detail-card--hero {
  background: var(--el-fill-color-lighter);
}

.detail-card__header,
.detail-chip-row,
.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-card__header {
  justify-content: space-between;
}

.detail-card__title,
.simple-card__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.metric-grid,
.stats-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.metric-card,
.stats-item {
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 12px;
}

.metric-card span,
.stats-item span {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.metric-card strong,
.stats-item strong {
  display: block;
  margin-top: 4px;
  font-size: 18px;
  line-height: 1.4;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.detail-mini-section,
.detail-toolbar {
  margin-top: 14px;
}

.detail-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 14px;
}

.simple-list {
  display: grid;
  gap: 12px;
}

.json-preview {
  max-height: 520px;
  padding: 14px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  word-break: break-word;
  white-space: pre-wrap;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
}

@media (width <= 1200px) {
  .detail-overview-grid {
    grid-template-columns: 1fr;
  }
}

@media (width <= 768px) {
  .metric-grid,
  .stats-list {
    grid-template-columns: 1fr;
  }

  .detail-card__header {
    flex-direction: column;
  }
}
</style>
