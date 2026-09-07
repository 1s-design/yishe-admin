<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="ecom-data-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <div class="resource-toolbar">
            <div class="resource-toolbar__meta">
              <div class="resource-toolbar__title">{{ t('operation.selectionAnalysisRuns') }}</div>
            </div>
          </div>

          <el-form :model="filters" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col :xs="24" :sm="12" :md="8" :lg="8">
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
              <el-col :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item :label="t('operation.runStatus')">
                  <el-select v-model="filters.status" clearable :placeholder="t('operation.allStatuses')">
                    <el-option :label="t('operation.running')" value="running" />
                    <el-option :label="t('operation.success')" value="success" />
                    <el-option :label="t('operation.failed')" value="failed" />
                  </el-select>
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
                  <el-tag size="small" :type="getRunStatusTagType(row.status)">
                    {{ getRunStatusLabel(row.status) }}
                  </el-tag>
                </template>

                <template #summarySlot="{ row }">
                  <span class="table-meta-text">{{ getSummaryText(row) }}</span>
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
                          <el-dropdown-item command="results">
                            <el-icon><List /></el-icon>
                            <span>{{ t('operation.viewResults') }}</span>
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
      class="analysis-run-detail-dialog"
      :title="t('operation.analysisRunDetails')"
      @closed="handleDetailClosed"
    >
      <div v-loading="detailLoading" class="detail-shell">
        <template v-if="currentDetail">
          <CompactNotice
            v-if="currentDetail.status === 'failed'"
            type="danger"
            :title="t('operation.analysisRunFailed')"
            :description="currentDetail.errorMessage || t('operation.checkCollectSampleOrAiConfig')"
            class="detail-notice"
          />

          <div class="detail-overview-grid">
            <div class="detail-card detail-card--hero">
              <div class="detail-card__header">
                <div>
                  <div class="detail-card__title">
                    {{ currentDetail.taskName || "-" }}
                  </div>
                  <div class="detail-card__subtitle">
                    {{ getSummaryText(currentDetail) }}
                  </div>
                </div>
                <div class="detail-chip-row">
                  <el-tag size="small" :type="getRunStatusTagType(currentDetail.status)">
                    {{ getRunStatusLabel(currentDetail.status) }}
                  </el-tag>
                  <el-tag size="small" type="info">
                    {{ getAnalysisTypeLabel(currentDetail.analysisType) }}
                  </el-tag>
                  <el-tag v-if="currentDetail.aiModel" size="small" type="info">
                    {{ currentDetail.aiModel }}
                  </el-tag>
                </div>
              </div>

              <div class="metric-grid">
                <div class="metric-card">
                  <span>{{ t('operation.sampleCount') }}</span>
                  <strong>{{ sourceSummary.itemCount || 0 }}</strong>
                </div>
                <div class="metric-card">
                  <span>{{ t('operation.resultCount') }}</span>
                  <strong>{{ resultCount }}</strong>
                </div>
                <div class="metric-card">
                  <span>{{ t('operation.taskCount') }}</span>
                  <strong>{{ sourceSummary.taskCount || 0 }}</strong>
                </div>
                <div class="metric-card">
                  <span>{{ t('operation.platformCount') }}</span>
                  <strong>{{ sourceSummary.platformBreakdown?.length || 0 }}</strong>
                </div>
              </div>
            </div>

            <div class="detail-card">
              <div class="detail-card__title">{{ t('operation.runInfo') }}</div>
              <div class="stats-list">
                <div class="stats-item">
                  <span>{{ t('operation.runId') }}</span>
                  <strong>{{ currentDetail.id || "-" }}</strong>
                </div>
                <div class="stats-item">
                  <span>{{ t('operation.resultId') }}</span>
                  <strong>{{ currentDetail.resultId || "-" }}</strong>
                </div>
                <div class="stats-item">
                  <span>{{ t('operation.startTime') }}</span>
                  <strong>{{ formatDateTime(currentDetail.startedAt) }}</strong>
                </div>
                <div class="stats-item">
                  <span>{{ t('operation.endTime') }}</span>
                  <strong>{{ formatDateTime(currentDetail.finishedAt) }}</strong>
                </div>
              </div>

              <div class="detail-mini-section" v-if="sourceSummary.platformBreakdown?.length">
                <div class="detail-mini-section__title">{{ t('operation.platformDistribution') }}</div>
                <div class="chip-list">
                  <el-tag
                    v-for="item in sourceSummary.platformBreakdown"
                    :key="`${item.platform}-${item.count}`"
                    size="small"
                  >
                    {{ item.platform }} · {{ item.count }}
                  </el-tag>
                </div>
              </div>
            </div>
          </div>

          <div class="detail-toolbar">
            <el-button type="primary" @click="openResultsPage(currentDetail)">
              {{ t('operation.viewAnalysisResults') }}
            </el-button>
          </div>

          <el-tabs>
            <el-tab-pane :label="t('operation.runSummary')">
              <pre class="json-preview">{{ formatJson(currentDetail.summary) }}</pre>
            </el-tab-pane>

            <el-tab-pane :label="t('operation.dataSourceSnapshot')">
              <pre class="json-preview">{{ formatJson(currentDetail.sourceSnapshot) }}</pre>
            </el-tab-pane>

            <el-tab-pane :label="t('operation.analysisParamsSnapshot')">
              <pre class="json-preview">{{ formatJson(currentDetail.analysisConfigSnapshot) }}</pre>
            </el-tab-pane>

            <el-tab-pane v-if="currentDetail.errorMessage" :label="t('operation.errorMessage')">
              <pre class="json-preview">{{ currentDetail.errorMessage }}</pre>
            </el-tab-pane>
          </el-tabs>
        </template>

        <el-empty v-else :description="t('operation.noDetailData')" />
      </div>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, reactive, ref, watchEffect } from "vue";
import { useWindowSize } from "@vueuse/core";
import { useI18n } from 'vue-i18n';
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, List, View } from "@element-plus/icons-vue";
import type { VxeGridProps } from "vxe-table";
import {
  batchDeleteEcomSelectionAnalysisRun,
  deleteEcomSelectionAnalysisRun,
  getEcomSelectionAnalysisRunDetail,
  getEcomSelectionAnalysisRunList,
  getEcomSelectionAnalysisTaskList,
  type EcomSelectionAnalysisRun,
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

defineOptions({ name: "EcomSelectionAnalysisRunPage" });

const router = useRouter();
const loading = ref(false);
const detailLoading = ref(false);
const detailVisible = ref(false);
const total = ref(0);
const list = ref<EcomSelectionAnalysisRun[]>([]);
const tasks = ref<EcomSelectionAnalysisTask[]>([]);
const selectedIds = ref<string[]>([]);
const currentDetail = ref<EcomSelectionAnalysisRun | null>(null);

const filters = reactive({
  pageNo: 1,
  pageSize: 10,
  taskId: "",
  status: "",
  analysisType: "",
});

const updateSelectedIds = (records: EcomSelectionAnalysisRun[] = []) => {
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

const sourceSummary = computed(() => {
  return currentDetail.value?.summary?.sourceSummary || {};
});

const resultCount = computed(() => {
  return Number(currentDetail.value?.summary?.outputPreview?.resultCount || 0);
});

const getSummaryText = (row: EcomSelectionAnalysisRun) => {
  const outputPreview = row.summary?.outputPreview;
  const overviewSummary = String(outputPreview?.overviewSummary || "").trim();
  if (overviewSummary) {
    return overviewSummary;
  }

  const resultCount = Number(outputPreview?.resultCount || 0);
  if (resultCount > 0) {
    return row.analysisType === "pod_pattern_analysis"
      ? `${t('operation.output')} ${resultCount} ${t('operation.patternResults')}`
      : row.analysisType === "custom_prompt_extract"
        ? `${t('operation.output')} ${resultCount} ${t('operation.customResults')}`
        : `${t('operation.recommended')} ${resultCount} ${t('operation.candidateDirections')}`;
  }

  const itemCount = Number(row.summary?.sourceSummary?.itemCount || 0);
  if (itemCount > 0) {
    return `${t('operation.sample')} ${itemCount} ${t('operation.items')}`;
  }

  if (row.errorMessage) {
    return row.errorMessage;
  }

  if (row.status === "running") {
    return t('operation.analysisExecuting');
  }

  return t('operation.noSummary');
};

const getListResultCount = (row: EcomSelectionAnalysisRun) => {
  return Number(row.summary?.outputPreview?.resultCount || 0);
};

const { height } = useWindowSize();

const gridOptions = ref<VxeGridProps<EcomSelectionAnalysisRun>>({
  ...(commonGridOptions as VxeGridProps<EcomSelectionAnalysisRun>),
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
      width: 120,
      slots: { default: "typeSlot" },
    },
    {
      title: t('operation.status'),
      field: "status",
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
      field: "summary",
      width: 88,
      formatter: ({ row }) => Number(row.summary?.sourceSummary?.itemCount || 0),
    },
    {
      title: t('operation.resultCount'),
      field: "summary",
      width: 88,
      formatter: ({ row }) => getListResultCount(row),
    },
    {
      ...buildTimeColumn(t('operation.startTime'), "startedAt", 180),
      formatter: ({ cellValue }) => formatDateTime(cellValue as string),
    },
    {
      ...buildTimeColumn(t('operation.endTime'), "finishedAt", 180),
      formatter: ({ cellValue }) => formatDateTime(cellValue as string),
    },
    {
      title: t('operation.summary'),
      field: "summaryText",
      minWidth: 240,
      showOverflow: "tooltip",
      slots: { default: "summarySlot" },
    },
    buildOperationColumn("operationSlot", 120),
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
    const data = await getEcomSelectionAnalysisRunList(filters);
    applyListData(data);
  } finally {
    loading.value = false;
  }
};

const loadData = async () => {
  loading.value = true;
  try {
    const [runData, taskData] = await Promise.all([
      getEcomSelectionAnalysisRunList(filters),
      getEcomSelectionAnalysisTaskList({ pageNo: 1, pageSize: 100 }),
    ]);
    applyListData(runData);
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
  filters.status = "";
  filters.analysisType = "";
  await loadList();
};

const handleCheckboxChange = ({ records }: { records: EcomSelectionAnalysisRun[] }) => {
  updateSelectedIds(records);
};

const handleCheckboxAll = ({ records }: { records: EcomSelectionAnalysisRun[] }) => {
  updateSelectedIds(records);
};

const handleOperationCommand = (command: string, row: EcomSelectionAnalysisRun) => {
  switch (command) {
    case "detail":
      void openDetail(row);
      break;
    case "results":
      void openResultsPage(row);
      break;
    case "delete":
      void handleDelete(row);
      break;
  }
};

const openDetail = async (row: EcomSelectionAnalysisRun) => {
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    currentDetail.value = await getEcomSelectionAnalysisRunDetail(row.id);
  } finally {
    detailLoading.value = false;
  }
};

const handleDetailClosed = () => {
  currentDetail.value = null;
};

const openResultsPage = async (row: EcomSelectionAnalysisRun) => {
  await router.push({
    name: "EcomSelectionAnalysisResultPage",
    query: {
      runId: row.id,
      taskId: row.taskId,
    },
  });
};

const handleDelete = async (row: EcomSelectionAnalysisRun) => {
  try {
    await ElMessageBox.confirm(
      t('operation.confirmDeleteAnalysisRun'),
      t('common.tip'),
      { type: "warning" },
    );
    await deleteEcomSelectionAnalysisRun(row.id);
    ElMessage.success(t('operation.analysisRunDeleted'));
    await loadList();
  } catch {}
};

const handleBatchDelete = async () => {
  if (!selectedIds.value.length) return;
  try {
    await ElMessageBox.confirm(
      `${t('operation.confirmBatchDeleteAnalysisRuns')} ${selectedIds.value.length} ${t('operation.items')}`,
      t('common.tip'),
      { type: "warning" },
    );
    await batchDeleteEcomSelectionAnalysisRun(selectedIds.value);
    ElMessage.success(t('operation.batchDeleteSuccess'));
    await loadList();
  } catch {}
};

onMounted(() => {
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

.resource-toolbar__desc {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.table-meta-text {
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

.detail-card {
  padding: 18px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
}

.detail-card--hero {
  background: var(--el-fill-color-lighter);
}

.detail-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.detail-card__title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.detail-card__subtitle {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-secondary);
}

.detail-chip-row,
.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.metric-card {
  padding: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
}

.metric-card span {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.metric-card strong {
  display: block;
  margin-top: 6px;
  font-size: 18px;
  line-height: 1.3;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.stats-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.stats-item {
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 12px;
}

.stats-item span {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.stats-item strong {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.detail-mini-section {
  margin-top: 14px;
}

.detail-mini-section__title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.detail-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 14px;
}

.json-preview {
  max-height: 560px;
  padding: 16px;
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

  .metric-grid,
  .stats-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 768px) {
  .detail-card__header {
    flex-direction: column;
  }

  .metric-grid,
  .stats-list {
    grid-template-columns: 1fr;
  }
}
</style>
