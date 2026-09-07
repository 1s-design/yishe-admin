<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="ecom-data-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <div class="resource-toolbar">
            <div class="resource-toolbar__meta">
              <div class="resource-toolbar__title">{{ t('operation.ecomAnalysisTasks') }}</div>
            </div>
          </div>

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
                    {{ getAnalysisTypeLabel(row.analysisType) }}
                  </el-tag>
                </template>

                <template #sourceSlot="{ row }">
                  <span class="table-meta-text">{{ getSourceSummary(row) }}</span>
                </template>

                <template #optionsSlot="{ row }">
                  <div class="table-stack">
                    <span>{{ getOptionsSummary(row) }}</span>
                    <span class="table-meta-text">
                      {{
                        row.analysisConfig?.customPrompt
                          ? t('operation.customPromptSet')
                          : row.analysisConfig?.customOutputSchema
                            ? t('operation.outputStructureSet')
                            : t('operation.defaultConfig')
                      }}
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
                  <span class="table-meta-text">
                    {{ getResultSummary(row) }}
                  </span>
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
                            <el-icon>
                              <VideoPlay />
                            </el-icon>
                            <span>{{ t('operation.analyzeNow') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="edit">
                            <el-icon>
                              <Edit />
                            </el-icon>
                            <span>{{ t('common.edit') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item
                            command="delete"
                            divided
                            class="operation-menu-item--danger"
                          >
                            <el-icon>
                              <Delete />
                            </el-icon>
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

    <SelectionAnalysisTaskDialog
      v-model="dialogVisible"
      :task="currentTask"
      :collect-catalog="catalog"
      :collect-tasks="collectTasks"
      :collect-runs="collectRuns"
      @success="handleDialogSuccess"
    />
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, reactive, ref, watchEffect } from "vue";
import { useWindowSize } from "@vueuse/core";
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox, ElNotification } from "element-plus";
import { Delete, Edit, VideoPlay } from "@element-plus/icons-vue";
import type { VxeGridProps } from "vxe-table";
import {
  getEcomPlatformCollectRunList,
  getEcomPlatformCollectTaskList,
  type EcomPlatformCollectRun,
  type EcomPlatformCollectTask,
} from "@/api/operation/ecomPlatformCollect";
import {
  batchDeleteEcomSelectionAnalysisTask,
  deleteEcomSelectionAnalysisTask,
  getEcomSelectionAnalysisTaskList,
  triggerEcomSelectionAnalysisTask,
  type EcomSelectionAnalysisTask,
} from "@/api/operation/ecomSelectionAnalysis";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import SelectionAnalysisTaskDialog from "./components/SelectionAnalysisTaskDialog.vue";
import {
  createEmptyEcomCollectCatalog,
  formatDateTime,
  getAnalysisTypeLabel,
  getRunStatusLabel,
  getRunStatusTagType,
  loadEcomCollectCatalog,
} from "@/views/operation/ecom-data/shared";

const { t } = useI18n();

defineOptions({ name: "EcomSelectionAnalysisTaskPage" });

const loading = ref(false);
const dialogVisible = ref(false);
const currentTask = ref<EcomSelectionAnalysisTask | null>(null);
const list = ref<EcomSelectionAnalysisTask[]>([]);
const total = ref(0);
const selectedIds = ref<string[]>([]);
const collectTasks = ref<EcomPlatformCollectTask[]>([]);
const collectRuns = ref<EcomPlatformCollectRun[]>([]);
const triggeringTaskId = ref("");

const catalog = reactive(createEmptyEcomCollectCatalog());

const filters = reactive({
  pageNo: 1,
  pageSize: 10,
  keyword: "",
  analysisType: "",
});

const updateSelectedIds = (records: EcomSelectionAnalysisTask[] = []) => {
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

const getSourceSummary = (task: EcomSelectionAnalysisTask) => {
  const sourceConfig = task.sourceConfig || {};
  const parts = [
    Array.isArray(sourceConfig.taskIds) && sourceConfig.taskIds.length
      ? `${t('operation.task')} ${sourceConfig.taskIds.length} ${t('operation.items')}`
      : "",
    Array.isArray(sourceConfig.runIds) && sourceConfig.runIds.length
      ? `${t('operation.run')} ${sourceConfig.runIds.length} ${t('operation.times')}`
      : "",
    Array.isArray(sourceConfig.rawRecordIds) && sourceConfig.rawRecordIds.length
      ? `${t('operation.rawRecords')} ${sourceConfig.rawRecordIds.length} ${t('operation.items')}`
      : "",
    sourceConfig.requireDetail ? t('operation.detailDataOnly') : "",
    sourceConfig.limit ? `${t('operation.sample')} ${sourceConfig.limit}` : "",
  ].filter(Boolean);

  return parts.join(" | ") || t('operation.allCollectRawDataUnderAccount');
};

const getOptionsSummary = (task: EcomSelectionAnalysisTask) => {
  const options = task.analysisConfig || {};
  const parts = [
    options.topN ? `Top ${options.topN}` : "",
    options.targetMarket ? options.targetMarket : "",
    options.notes ? t('operation.containsAnalysisNotes') : "",
  ].filter(Boolean);

  if (task.analysisType === "custom_prompt_extract") {
    const customParts = [
      options.customPrompt ? t('operation.customPrompt') : "",
      options.customOutputSchema ? t('operation.specifiedOutputStructure') : "",
      options.targetMarket ? options.targetMarket : "",
    ].filter(Boolean);
    return customParts.join(" | ") || t('operation.useDefaultCustomPromptConfig');
  }

  if (task.analysisType === "pod_pattern_analysis") {
    const podParts = [
      options.notes ? t('operation.patternAnalysisNotes') : "",
      options.customOutputSchema ? t('operation.specifiedOutputStructure') : "",
      options.targetMarket ? options.targetMarket : "",
    ].filter(Boolean);
    return podParts.join(" | ") || t('operation.useDefaultPodPatternAnalysisConfig');
  }

  return parts.join(" | ") || t('operation.useDefaultHotSellingSelectionParams');
};

const getResultSummary = (task: EcomSelectionAnalysisTask) => {
  const summary = task.lastRunSummary || {};
  return (
    summary?.overviewSummary ||
    (summary?.resultCount
      ? task.analysisType === "pod_pattern_analysis"
        ? `${t('operation.output')} ${summary.resultCount} ${t('operation.patternResults')}`
        : task.analysisType === "custom_prompt_extract"
          ? `${t('operation.output')} ${summary.resultCount} ${t('operation.customResults')}`
          : `${t('operation.recommended')} ${summary.resultCount} ${t('operation.candidateDirections')}`
      : "") ||
    summary?.errorMessage ||
    "-"
  );
};

const { height } = useWindowSize();

const gridOptions = ref<VxeGridProps<EcomSelectionAnalysisTask>>({
  ...(commonGridOptions as VxeGridProps<EcomSelectionAnalysisTask>),
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
      field: "analysisType",
      width: 110,
      slots: { default: "typeSlot" },
    },
    {
      title: t('operation.dataSourceRange'),
      field: "sourceConfig",
      minWidth: 280,
      showOverflow: "tooltip",
      slots: { default: "sourceSlot" },
    },
    {
      title: t('operation.analysisConfig'),
      field: "analysisConfig",
      minWidth: 260,
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
      field: "lastRunSummary",
      minWidth: 260,
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

const applyCatalog = (data: any) => {
  catalog.platforms = Array.isArray(data?.platforms) ? data.platforms : [];
};

const applyListData = (data: any) => {
  list.value = Array.isArray(data?.list) ? data.list : [];
  total.value = Number(data?.total || 0);
  selectedIds.value = [];
};

const loadList = async () => {
  loading.value = true;
  try {
    const data = await getEcomSelectionAnalysisTaskList(filters);
    applyListData(data);
  } finally {
    loading.value = false;
  }
};

const loadData = async () => {
  loading.value = true;
  try {
    const [catalogData, taskListData, collectTaskData, collectRunData] = await Promise.all([
      loadEcomCollectCatalog(),
      getEcomSelectionAnalysisTaskList(filters),
      getEcomPlatformCollectTaskList({ pageNo: 1, pageSize: 100 }),
      getEcomPlatformCollectRunList({ pageNo: 1, pageSize: 100 }),
    ]);
    applyCatalog(catalogData);
    applyListData(taskListData);
    collectTasks.value = Array.isArray(collectTaskData?.list) ? collectTaskData.list : [];
    collectRuns.value = Array.isArray(collectRunData?.list) ? collectRunData.list : [];
  } finally {
    loading.value = false;
  }
};

const openTaskDialog = (task?: EcomSelectionAnalysisTask) => {
  currentTask.value = task || null;
  dialogVisible.value = true;
};

const handleDialogSuccess = async () => {
  currentTask.value = null;
  await loadData();
};

const handleSearch = async () => {
  filters.pageNo = 1;
  await loadList();
};

const handleReset = async () => {
  filters.pageNo = 1;
  filters.keyword = "";
  filters.analysisType = "";
  await loadList();
};

const handleCheckboxChange = ({ records }: { records: EcomSelectionAnalysisTask[] }) => {
  updateSelectedIds(records);
};

const handleCheckboxAll = ({ records }: { records: EcomSelectionAnalysisTask[] }) => {
  updateSelectedIds(records);
};

const handleOperationCommand = (command: string, row: EcomSelectionAnalysisTask) => {
  switch (command) {
    case "trigger":
      void handleTriggerTask(row);
      break;
    case "edit":
      openTaskDialog(row);
      break;
    case "delete":
      void handleDelete(row);
      break;
  }
};

const handleTriggerTask = async (row: EcomSelectionAnalysisTask) => {
  if (triggeringTaskId.value) {
    return;
  }

  triggeringTaskId.value = row.id;
  const loadingMessage = ElMessage({
    type: "info",
    message: `${t('operation.submittingAnalysis')}: ${row.name}`,
    duration: 0,
    showClose: true,
  });

  try {
    const result = await triggerEcomSelectionAnalysisTask(row.id);
    loadingMessage.close();
    ElNotification({
      title: result?.status === "failed" ? t('operation.analysisFailed') : t('operation.analysisStarted'),
      type: result?.status === "failed" ? "warning" : "success",
      duration: 5000,
      message: result?.id
        ? `${t('operation.runRecord')}: ${result.id}${result.errorMessage ? `，${result.errorMessage}` : ""}`
        : t('operation.taskTriggeredPleaseCheck'),
    });
    await loadList();
  } catch (error: any) {
    loadingMessage.close();
    ElMessage.error(error?.message || t('operation.triggerFailed'));
  } finally {
    triggeringTaskId.value = "";
  }
};

const handleDelete = async (row: EcomSelectionAnalysisTask) => {
  try {
    await ElMessageBox.confirm(
      `${t('operation.confirmDeleteAnalysisTask')}「${row.name}」${t('operation.deleteAnalysisTaskWarning')}`,
      t('common.tip'),
      { type: "warning" },
    );
    await deleteEcomSelectionAnalysisTask(row.id);
    ElMessage.success(t('operation.analysisTaskDeleted'));
    await loadList();
  } catch {}
};

const handleBatchDelete = async () => {
  if (!selectedIds.value.length) return;
  try {
    await ElMessageBox.confirm(
      `${t('operation.confirmBatchDeleteAnalysisTasks')} ${selectedIds.value.length} ${t('operation.batchDeleteAnalysisTasksWarning')}`,
      t('common.tip'),
      { type: "warning" },
    );
    await batchDeleteEcomSelectionAnalysisTask(selectedIds.value);
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

.table-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.table-meta-text {
  color: var(--el-text-color-secondary);
}
</style>
