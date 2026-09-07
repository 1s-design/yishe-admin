<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="ecom-data-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="filters" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col :xs="24" :sm="12" :md="8" :lg="8">
                <el-form-item :label="t('operation.taskNameOrCreator')">
                  <el-input
                    v-model="filters.keyword"
                    clearable
                    :placeholder="t('operation.searchTaskNameOrCreator')"
                    @keyup.enter="handleSearch"
                  />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item :label="t('operation.taskType')">
                  <el-select v-model="filters.matchType" clearable :placeholder="t('operation.allTypes')">
                    <el-option :label="t('operation.supplyMatch')" value="supply_match" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" @click="handleSearch">{{ t('common.query') }}</el-button>
              <el-button size="small" @click="handleReset">{{ t('common.reset') }}</el-button>
              <el-button size="small" type="primary" @click="openTaskDialog()">
                {{ t('operation.createTask') }}
              </el-button>
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
                    {{ getSupplyMatchTypeLabel(row.matchType) }}
                  </el-tag>
                </template>

                <template #sourceSlot="{ row }">
                  <span class="table-meta-text">{{ getSourceSummary(row) }}</span>
                </template>

                <template #optionsSlot="{ row }">
                  <div class="table-stack">
                    <span>{{ getOptionsSummary(row) }}</span>
                    <span class="table-meta-text">
                      {{ t('operation.snapshot') }}: {{ row.optionsData?.captureSnapshots ? t('operation.enabled') : t('operation.disabled') }}
                    </span>
                  </div>
                </template>

                <template #lastRunSlot="{ row }">
                  <div class="table-stack">
                    <el-tag
                      v-if="row.lastRunStatus"
                      size="small"
                      :type="getRunStatusTagType(row.lastRunStatus)"
                    >
                      {{ getRunStatusLabel(row.lastRunStatus) }}
                    </el-tag>
                    <span v-else class="table-meta-text">{{ t('operation.notExecuted') }}</span>
                    <span class="table-meta-text">
                      {{ formatDateTime(row.lastRunAt) }}
                    </span>
                  </div>
                </template>

                <template #summarySlot="{ row }">
                  <span class="table-meta-text">{{ getResultSummary(row) }}</span>
                </template>

                <template #operationSlot="{ row }">
                  <div class="flex justify-start">
                    <el-dropdown
                      class="operation-dropdown"
                      placement="bottom-end"
                      :disabled="!!triggeringTaskId"
                      @command="(command) => handleOperationCommand(String(command), row)"
                    >
                      <el-button
                        type="primary"
                        link
                        size="small"
                        class="operation-trigger-button"
                        :loading="triggeringTaskId === row.id"
                      >
                        {{ t('common.operation') }}
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item command="trigger">
                            <el-icon><VideoPlay /></el-icon>
                            <span>{{ t('operation.executeNow') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="edit">
                            <el-icon><Edit /></el-icon>
                            <span>{{ t('common.edit') }}</span>
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

    <SupplyMatchTaskDialog
      v-model="dialogVisible"
      :task="currentTask"
      :analysis-runs="analysisRuns"
      :preset-analysis-run-id="presetAnalysisRunId"
      :preset-source-item-ids="presetSourceItemIds"
      @success="handleDialogSuccess"
    />

    <TaskExecutionTriggerDialog
      v-model="triggerDialogVisible"
      :platform="triggerTaskRecord?.optionsData?.supplierPlatforms?.[0] || ''"
      task-type="supply_match"
      :submitting="triggeringTaskId === (triggerTaskRecord?.id || '')"
      @confirm="handleTriggerConfirm"
    />
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, reactive, ref, watch, watchEffect } from "vue";
import { useWindowSize } from "@vueuse/core";
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox, ElNotification } from "element-plus";
import { Delete, Edit, VideoPlay } from "@element-plus/icons-vue";
import type { VxeGridProps } from "vxe-table";
import {
  batchDeleteEcomSelectionSupplyMatchTask,
  deleteEcomSelectionSupplyMatchTask,
  getEcomSelectionSupplyMatchTaskList,
  triggerEcomSelectionSupplyMatchTask,
  type EcomSelectionSupplyMatchTask,
} from "@/api/operation/ecomSelectionSupplyMatch";
import {
  getEcomSelectionAnalysisRunList,
  type EcomSelectionAnalysisRun,
} from "@/api/operation/ecomSelectionAnalysis";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import TaskExecutionTriggerDialog from "@/components/TaskExecutionTriggerDialog.vue";
import SupplyMatchTaskDialog from "./components/SupplyMatchTaskDialog.vue";
import {
  formatDateTime,
  formatListPreview,
  getRunStatusLabel,
  getRunStatusTagType,
  getSupplyMatchTypeLabel,
  parseTextareaList,
} from "@/views/operation/ecom-data/shared";

const { t } = useI18n();

defineOptions({ name: "EcomSelectionSupplyMatchTaskPage" });

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const dialogVisible = ref(false);
const currentTask = ref<EcomSelectionSupplyMatchTask | null>(null);
const list = ref<EcomSelectionSupplyMatchTask[]>([]);
const total = ref(0);
const selectedIds = ref<string[]>([]);
const analysisRuns = ref<EcomSelectionAnalysisRun[]>([]);
const triggeringTaskId = ref("");
const triggerDialogVisible = ref(false);
const triggerTaskRecord = ref<EcomSelectionSupplyMatchTask | null>(null);
const presetAnalysisRunId = ref("");
const presetSourceItemIds = ref<string[]>([]);

const filters = reactive({
  pageNo: 1,
  pageSize: 10,
  keyword: "",
  matchType: "",
});

const updateSelectedIds = (records: EcomSelectionSupplyMatchTask[] = []) => {
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

const getSourceSummary = (task: EcomSelectionSupplyMatchTask) => {
  const sourceConfig = task.sourceConfig || {};
  const parts = [
    sourceConfig.analysisRunId ? t('operation.sourceAnalysisRun') : "",
    Array.isArray(sourceConfig.sourceItemIds) && sourceConfig.sourceItemIds.length
      ? `${t('operation.sourceProducts')} ${sourceConfig.sourceItemIds.length} ${t('operation.items')}`
      : "",
    Array.isArray(sourceConfig.rawRecordIds) && sourceConfig.rawRecordIds.length
      ? `${t('operation.rawRecords')} ${sourceConfig.rawRecordIds.length} ${t('operation.items')}`
      : "",
    Array.isArray(sourceConfig.keywordSeeds) && sourceConfig.keywordSeeds.length
      ? `${t('operation.keywordSeeds')} ${sourceConfig.keywordSeeds.length} ${t('operation.items')}`
      : "",
  ].filter(Boolean);

  return parts.join(" | ") || t('operation.sourceNotConfigured');
};

const getOptionsSummary = (task: EcomSelectionSupplyMatchTask) => {
  const options = task.optionsData || {};
  const parts = [
    Array.isArray(options.supplierPlatforms) && options.supplierPlatforms.length
      ? `${t('operation.supplierPlatforms')} ${formatListPreview(options.supplierPlatforms, 2)}`
      : "",
    options.maxSourceItems ? `${t('operation.source')} ${options.maxSourceItems}` : "",
    options.maxMatchesPerSource ? `${t('operation.matchesPerSource')} ${options.maxMatchesPerSource}` : "",
    options.maxDetailPerSource != null ? `${t('operation.details')} ${options.maxDetailPerSource}` : "",
    options.queryCount ? `${t('operation.queryWords')} ${options.queryCount}` : "",
  ].filter(Boolean);

  return parts.join(" | ") || t('operation.useDefaultSupplyMatchParams');
};

const getResultSummary = (task: EcomSelectionSupplyMatchTask) => {
  const summaryData = task.lastResultSummary?.summaryData || {};
  return (
    summaryData?.message ||
    task.lastResultSummary?.errorMessage ||
    (summaryData?.matchedItemsCount ? `${t('operation.matched')} ${summaryData.matchedItemsCount} ${t('operation.results')}` : "-")
  );
};

const { height } = useWindowSize();

const gridOptions = ref<VxeGridProps<EcomSelectionSupplyMatchTask>>({
  ...(commonGridOptions as VxeGridProps<EcomSelectionSupplyMatchTask>),
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
    { title: t('operation.taskName'), field: "name", minWidth: 220, showOverflow: "tooltip" },
    {
      title: t('operation.type'),
      field: "matchType",
      width: 110,
      slots: { default: "typeSlot" },
    },
    {
      title: t('operation.sourceRange'),
      field: "sourceConfig",
      minWidth: 240,
      showOverflow: "tooltip",
      slots: { default: "sourceSlot" },
    },
    {
      title: t('operation.executionParams'),
      field: "optionsData",
      minWidth: 280,
      showOverflow: "tooltip",
      slots: { default: "optionsSlot" },
    },
    {
      title: t('operation.latestRun'),
      field: "lastRunStatus",
      width: 120,
      slots: { default: "lastRunSlot" },
    },
    {
      title: t('operation.resultSummary'),
      field: "lastResultSummary",
      minWidth: 240,
      showOverflow: "tooltip",
      slots: { default: "summarySlot" },
    },
    {
      title: t('operation.creator'),
      field: "creator",
      width: 120,
      formatter: ({ row }) => row.creator || "-",
    },
    {
      ...buildTimeColumn(t('operation.updateTime'), "updateTime", 180),
      formatter: ({ cellValue }) => formatDateTime(cellValue as string),
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
    const data = await getEcomSelectionSupplyMatchTaskList(filters);
    applyListData(data);
  } finally {
    loading.value = false;
  }
};

const loadData = async () => {
  loading.value = true;
  try {
    const [taskData, analysisRunData] = await Promise.all([
      getEcomSelectionSupplyMatchTaskList(filters),
      getEcomSelectionAnalysisRunList({ pageNo: 1, pageSize: 100 }),
    ]);
    applyListData(taskData);
    analysisRuns.value = Array.isArray(analysisRunData?.list) ? analysisRunData.list : [];
  } finally {
    loading.value = false;
  }
};

const consumeRoutePreset = async () => {
  const analysisRunId = String(route.query.analysisRunId || "").trim();
  if (!analysisRunId) {
    return;
  }

  presetAnalysisRunId.value = analysisRunId;
  presetSourceItemIds.value = parseTextareaList(String(route.query.sourceItemIds || "").trim());
  currentTask.value = null;
  dialogVisible.value = true;

  const nextQuery = { ...route.query };
  delete nextQuery.analysisRunId;
  delete nextQuery.sourceItemIds;
  delete nextQuery.productName;
  await router.replace({ query: nextQuery });
};

const openTaskDialog = (task?: EcomSelectionSupplyMatchTask) => {
  currentTask.value = task || null;
  if (task) {
    presetAnalysisRunId.value = "";
    presetSourceItemIds.value = [];
  }
  dialogVisible.value = true;
};

const handleDialogSuccess = async () => {
  currentTask.value = null;
  presetAnalysisRunId.value = "";
  presetSourceItemIds.value = [];
  await loadData();
};

const handleSearch = async () => {
  filters.pageNo = 1;
  await loadList();
};

const handleReset = async () => {
  filters.pageNo = 1;
  filters.keyword = "";
  filters.matchType = "";
  await loadList();
};

const handleCheckboxChange = ({ records }: { records: EcomSelectionSupplyMatchTask[] }) => {
  updateSelectedIds(records);
};

const handleCheckboxAll = ({ records }: { records: EcomSelectionSupplyMatchTask[] }) => {
  updateSelectedIds(records);
};

const handleOperationCommand = (command: string, row: EcomSelectionSupplyMatchTask) => {
  switch (command) {
    case "trigger":
      triggerTaskRecord.value = row;
      triggerDialogVisible.value = true;
      break;
    case "edit":
      openTaskDialog(row);
      break;
    case "delete":
      void handleDelete(row);
      break;
  }
};

const handleTriggerConfirm = async (executionContext: Record<string, any>) => {
  const row = triggerTaskRecord.value;
  if (!row) {
    return;
  }
  if (triggeringTaskId.value) {
    return;
  }

  triggeringTaskId.value = row.id;
  const loadingMessage = ElMessage({
    type: "info",
    message: `${t('operation.submittingSupplyMatchTask')}: ${row.name}`,
    duration: 0,
    showClose: true,
  });

  try {
    const result = await triggerEcomSelectionSupplyMatchTask(row.id, {
      executionContext,
    });
    loadingMessage.close();
    triggerDialogVisible.value = false;
    triggerTaskRecord.value = null;
    ElNotification({
      title: result?.status === "failed" ? t('operation.taskStartFailed') : t('operation.submittedForExecution'),
      type: result?.status === "failed" ? "warning" : "success",
      duration: 5000,
      message: result?.id
        ? `${t('operation.runRecord')}: ${result.id}${result.summaryData?.message ? `，${result.summaryData.message}` : ""}`
        : t('operation.taskTriggeredPleaseCheckRunRecords'),
    });
    await loadList();
  } catch (error: any) {
    loadingMessage.close();
    ElMessage.error(error?.message || t('operation.triggerFailed'));
  } finally {
    triggeringTaskId.value = "";
  }
};

const handleDelete = async (row: EcomSelectionSupplyMatchTask) => {
  try {
    await ElMessageBox.confirm(
      `${t('operation.confirmDeleteSupplyMatchTask')}「${row.name}」${t('operation.deleteSupplyMatchTaskWarning')}`,
      t('common.tip'),
      { type: "warning" },
    );
    await deleteEcomSelectionSupplyMatchTask(row.id);
    ElMessage.success(t('operation.supplyMatchTaskDeleted'));
    await loadList();
  } catch {}
};

const handleBatchDelete = async () => {
  if (!selectedIds.value.length) return;
  try {
    await ElMessageBox.confirm(
      `${t('operation.confirmBatchDeleteSupplyMatchTasks')} ${selectedIds.value.length} ${t('operation.batchDeleteSupplyMatchTasksWarning')}`,
      t('common.tip'),
      { type: "warning" },
    );
    await batchDeleteEcomSelectionSupplyMatchTask(selectedIds.value);
    ElMessage.success(t('operation.batchDeleteSuccess'));
    await loadList();
  } catch {}
};

watch(
  () => route.query.analysisRunId,
  () => {
    void consumeRoutePreset();
  },
);

onMounted(async () => {
  await loadData();
  await consumeRoutePreset();
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

.table-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.table-meta-text {
  color: var(--el-text-color-secondary);
}
</style>
