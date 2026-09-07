<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="ecom-collect-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="filters" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col :xs="24" :sm="12" :md="8" :lg="7">
                <el-form-item :label="t('operation.runIdOrTaskName')">
                  <el-input
                    v-model="filters.keyword"
                    clearable
                    :placeholder="t('operation.searchRunIdOrTaskName')"
                    @keyup.enter="handleSearch"
                  />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item :label="t('operation.platform')">
                  <el-select
                    v-model="filters.platform"
                    clearable
                    :placeholder="t('operation.platform')"
                    @change="handlePlatformFilterChange"
                  >
                    <el-option
                      v-for="item in catalog.platforms"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item :label="t('operation.taskType')">
                  <el-select
                    v-model="filters.taskType"
                    clearable
                    filterable
                    :placeholder="t('operation.taskType')"
                  >
                    <el-option
                      v-for="item in availableTaskTypeOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="4">
                <el-form-item :label="t('operation.taskId')">
                  <el-input v-model="filters.taskId" clearable :placeholder="t('operation.taskId')" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="4">
                <el-form-item :label="t('operation.runId')">
                  <el-input v-model="filters.runId" clearable :placeholder="t('operation.runId')" />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" @click="handleSearch">{{ t('common.query') }}</el-button>
              <el-button size="small" @click="handleReset">{{ t('common.reset') }}</el-button>
              <el-button size="small" @click="loadData">{{ t('common.refresh') }}</el-button>
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
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid
                v-bind="gridOptions"
                :max-height="gridOptions.maxHeight"
                :data="tableData"
                :loading="loading"
                @checkbox-change="handleCheckboxChange"
                @checkbox-all="handleCheckboxAll"
              >
                <template #runIdSlot="{ row }">
                  <div class="primary-cell">
                    <strong class="primary-cell__title mono-text">{{ row.runId || "-" }}</strong>
                    <span class="primary-cell__meta mono-text">task {{ row.taskId || "-" }}</span>
                  </div>
                </template>

                <template #platformSceneSlot="{ row }">
                  <div class="inline-chip-list">
                    <span class="info-chip info-chip--platform">
                      {{ getPlatformLabel(catalog, getRawPlatform(row)) }}
                    </span>
                    <span class="info-chip info-chip--task mono-text">
                      {{ getRawTaskType(row) || "-" }}
                    </span>
                  </div>
                </template>

                <template #summarySlot="{ row }">
                  <span class="summary-line">{{ getRawSummaryMessage(row) }}</span>
                </template>

                <template #recordsSlot="{ row }">
                  <span
                    class="metric-badge"
                    :class="{ 'metric-badge--success': getRawRecordsCount(row) > 0 }"
                  >
                    {{ getRawRecordsCount(row) }}
                  </span>
                </template>

                <template #snapshotsSlot="{ row }">
                  <span
                    class="metric-badge metric-badge--muted"
                    :class="{ 'metric-badge--success': getSnapshotCount(row.snapshotData || row.collectData) > 0 }"
                  >
                    {{ getSnapshotCount(row.snapshotData || row.collectData) }}
                  </span>
                </template>

                <template #operationSlot="{ row }">
                  <div class="flex justify-start">
                    <el-dropdown
                      class="operation-dropdown"
                      placement="bottom-end"
                      @command="(command) => handleOperationCommand(String(command), row)"
                    >
                      <el-button
                        type="primary"
                        link
                        size="small"
                        class="operation-trigger-button"
                      >
                        {{ t('common.operation') }}
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item command="json">
                            <el-icon><View /></el-icon>
                            <span>{{ t('operation.viewJson') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="snapshots">
                            <el-icon><Picture /></el-icon>
                            <span>{{ t('operation.viewScreenshots') }}</span>
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
      v-model="jsonDialogVisible"
      :title="t('operation.fullJson')"
      fullscreen
      append-to-body
      destroy-on-close
      class="ecom-raw-detail-dialog ecom-raw-detail-dialog--fullscreen"
      @closed="handleDetailClosed"
    >
      <div v-loading="detailLoading" class="ecom-raw-detail-dialog__body">
        <JsonPrettyViewer
          v-if="currentDetail"
          :value="currentDetail.collectData || {}"
          :deep="8"
          :show-double-quotes="false"
          :show-length="true"
        />
        <el-empty v-else :description="t('operation.noDetailData')" />
      </div>
    </el-dialog>

    <el-dialog
      v-model="snapshotDialogVisible"
      :title="t('operation.executionScreenshots')"
      fullscreen
      append-to-body
      destroy-on-close
      class="ecom-raw-detail-dialog ecom-raw-detail-dialog--fullscreen"
      @closed="handleDetailClosed"
    >
      <div v-loading="detailLoading" class="ecom-raw-detail-dialog__body">
        <div v-if="snapshotItems.length" class="raw-detail-snapshot-grid">
          <div
            v-for="snapshot in snapshotItems"
            :key="`${snapshot.url || snapshot.path || snapshot.key || ''}`"
            class="raw-detail-snapshot-card"
          >
            <el-image
              v-if="snapshot.url"
              :src="snapshot.url"
              fit="cover"
              preview-teleported
              :preview-src-list="snapshotUrls"
              class="raw-detail-snapshot-image"
            />
            <div v-else class="raw-detail-snapshot-placeholder">{{ t('operation.localScreenshotNotUploaded') }}</div>
            <div class="raw-detail-snapshot-meta">
              <div>{{ formatDateTime(snapshot.createdAt) }}</div>
            </div>
          </div>
        </div>
        <el-empty v-else :description="t('operation.noScreenshots')" />
      </div>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, reactive, ref, watch, watchEffect } from "vue";
import { useWindowSize } from "@vueuse/core";
import { useI18n } from 'vue-i18n';
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Picture, View } from "@element-plus/icons-vue";
import type { VxeGridProps } from "vxe-table";
import {
  batchDeleteEcomPlatformRawRecord,
  deleteEcomPlatformRawRecord,
  getEcomPlatformRawRecordDetail,
  getEcomPlatformRawRecordList,
  type EcomPlatformRawRecord,
} from "@/api/operation/ecomPlatformCollect";
import JsonPrettyViewer from "@/components/JsonPrettyViewer.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import {
  createEmptyEcomCollectCatalog,
  formatDateTime,
  getPlatformLabel,
  getRawFinishedAt,
  getRawPlatform,
  getRawRecordsCount,
  getRawSummaryMessage,
  getRawTaskType,
  getSnapshotCount,
  getTaskTypeLabel,
  getTaskTypeSchemas,
  loadEcomCollectCatalog,
} from "./shared";
import { normalizeSnapshotItems } from "./components/raw-detail/helpers";

const { t } = useI18n();

defineOptions({ name: "EcomPlatformCollectRawPage" });

const route = useRoute();
const loading = ref(false);
const detailLoading = ref(false);
const total = ref(0);
const list = ref<EcomPlatformRawRecord[]>([]);
const currentDetail = ref<EcomPlatformRawRecord | null>(null);
const selectedIds = ref<string[]>([]);
const jsonDialogVisible = ref(false);
const snapshotDialogVisible = ref(false);

const catalog = reactive(createEmptyEcomCollectCatalog());

const filters = reactive({
  pageNo: 1,
  pageSize: 10,
  keyword: "",
  platform: "",
  taskType: "",
  taskId: "",
  runId: "",
});

const availableTaskTypeOptions = computed(() =>
  getTaskTypeSchemas(catalog, filters.platform),
);

const syncQueryToFilters = () => {
  filters.runId = String(route.query.runId || "").trim();
  filters.taskId = String(route.query.taskId || "").trim();
  filters.platform = String(route.query.platform || "").trim();
  filters.taskType = String(route.query.taskType || "").trim();
};

const updateSelectedIds = (records: EcomPlatformRawRecord[] = []) => {
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

const { height } = useWindowSize();

const gridOptions = ref<VxeGridProps<EcomPlatformRawRecord>>({
  ...(commonGridOptions as VxeGridProps<EcomPlatformRawRecord>),
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
    {
      title: t('operation.runId'),
      field: "runId",
      minWidth: 220,
      showOverflow: "tooltip",
      slots: { default: "runIdSlot" },
    },
    {
      title: t('operation.platformOrTaskType'),
      field: "collectData",
      width: 300,
      slots: { default: "platformSceneSlot" },
    },
    {
      title: t('operation.executionSummary'),
      field: "collectData",
      minWidth: 240,
      showOverflow: "tooltip",
      slots: { default: "summarySlot" },
    },
    {
      title: t('operation.recordCount'),
      field: "recordsCount",
      width: 90,
      align: "center",
      slots: { default: "recordsSlot" },
    },
    {
      ...buildTimeColumn(t('operation.collectTime'), "capturedAt", 180),
      formatter: ({ cellValue }) => formatDateTime(cellValue as string),
    },
    {
      ...buildTimeColumn(t('operation.finishTime'), "finishedAt", 180),
      formatter: ({ row }) => formatDateTime(getRawFinishedAt(row)),
    },
    {
      title: t('operation.snapshotCount'),
      field: "snapshotData",
      width: 80,
      align: "center",
      slots: { default: "snapshotsSlot" },
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

const fetchListData = async () => {
  const data = await getEcomPlatformRawRecordList(filters);
  applyListData(data);
  return data;
};

const loadList = async () => {
  loading.value = true;
  try {
    await fetchListData();
  } finally {
    loading.value = false;
  }
};

const loadData = async () => {
  loading.value = true;
  try {
    const [catalogData, listData] = await Promise.all([
      loadEcomCollectCatalog(),
      getEcomPlatformRawRecordList(filters),
    ]);
    applyCatalog(catalogData);
    applyListData(listData);
  } finally {
    loading.value = false;
  }
};

const handleSearch = async () => {
  filters.pageNo = 1;
  await loadList();
};

const handlePlatformFilterChange = () => {
  if (
    filters.taskType &&
    !availableTaskTypeOptions.value.some((item) => item.value === filters.taskType)
  ) {
    filters.taskType = "";
  }
};

const handleReset = async () => {
  filters.pageNo = 1;
  filters.keyword = "";
  filters.platform = "";
  filters.taskType = "";
  filters.taskId = "";
  filters.runId = "";
  await loadList();
};

const handleCheckboxChange = ({ records }: { records: EcomPlatformRawRecord[] }) => {
  updateSelectedIds(records);
};

const handleCheckboxAll = ({ records }: { records: EcomPlatformRawRecord[] }) => {
  updateSelectedIds(records);
};

const handleOperationCommand = (command: string, row: EcomPlatformRawRecord) => {
  switch (command) {
    case "json":
      void openDetail(row, "json");
      break;
    case "snapshots":
      void openDetail(row, "snapshots");
      break;
    case "delete":
      void handleDelete(row);
      break;
  }
};

const openDetail = async (row: EcomPlatformRawRecord, mode: "json" | "snapshots") => {
  detailLoading.value = true;
  jsonDialogVisible.value = mode === "json";
  snapshotDialogVisible.value = mode === "snapshots";
  try {
    const detail = await getEcomPlatformRawRecordDetail(row.id);
    currentDetail.value = {
      ...row,
      ...detail,
    };
  } finally {
    detailLoading.value = false;
  }
};

const handleDetailClosed = () => {
  currentDetail.value = null;
  detailLoading.value = false;
  jsonDialogVisible.value = false;
  snapshotDialogVisible.value = false;
};

const snapshotItems = computed(() =>
  currentDetail.value
    ? normalizeSnapshotItems(currentDetail.value.snapshotData || currentDetail.value.collectData)
    : [],
);

const snapshotUrls = computed(() =>
  snapshotItems.value.map((item) => String(item.url || "").trim()).filter(Boolean),
);

const handleDelete = async (row: EcomPlatformRawRecord) => {
  try {
    await ElMessageBox.confirm(
      t('operation.confirmDeleteRawData'),
      t('common.tip'),
      { type: "warning" },
    );
    await deleteEcomPlatformRawRecord(row.id);
    ElMessage.success(t('operation.rawDataDeleted'));
    await loadList();
  } catch {}
};

const handleBatchDelete = async () => {
  if (!selectedIds.value.length) return;
  try {
    await ElMessageBox.confirm(
      `${t('operation.confirmBatchDeleteRawData')} ${selectedIds.value.length} ${t('operation.batchDeleteRawDataWarning')}`,
      t('common.tip'),
      { type: "warning" },
    );
    await batchDeleteEcomPlatformRawRecord(selectedIds.value);
    ElMessage.success(t('operation.batchDeleteSuccess'));
    await loadList();
  } catch {}
};

watch(
  () => route.query,
  () => {
    syncQueryToFilters();
    void loadList();
  },
);

onMounted(() => {
  syncQueryToFilters();
  void loadData();
});

onActivated(() => {
  syncQueryToFilters();
  void loadData();
});
</script>

<style scoped lang="scss">
:deep(.ecom-collect-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.ecom-collect-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.ecom-collect-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.ecom-collect-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}

.resource-toolbar__title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.resource-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.resource-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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

:deep(.ecom-collect-page .common-table__body-cell) {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
}

:deep(.ecom-collect-page .vxe-body--column .vxe-cell) {
  min-height: 0 !important;
  line-height: 1.35 !important;
}

.mono {
  font-family:
    SFMono-Regular,
    "Cascadia Code",
    "Source Code Pro",
    monospace;
}

.mono-text {
  font-family: "JetBrains Mono", SFMono-Regular, Consolas, monospace;
}

.primary-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.primary-cell__title {
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.primary-cell__meta {
  overflow: hidden;
  font-size: 10px;
  line-height: 1.2;
  color: var(--el-text-color-placeholder);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inline-chip-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.info-chip {
  display: inline-flex;
  max-width: 100%;
  min-height: 20px;
  padding: 0 7px;
  font-size: 11px;
  line-height: 1.2;
  color: var(--el-text-color-regular);
  white-space: nowrap;
  background: color-mix(in srgb, var(--el-fill-color-light) 72%, transparent);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  align-items: center;
}

.info-chip--platform {
  font-weight: 600;
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  border-color: color-mix(in srgb, var(--el-color-primary) 34%, var(--el-border-color));
}

.info-chip--task {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
}

.metric-badge {
  display: inline-flex;
  height: 22px;
  min-width: 28px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  color: var(--el-text-color-secondary);
  background: color-mix(in srgb, var(--el-fill-color) 76%, transparent);
  border-radius: 999px;
  align-items: center;
  justify-content: center;
}

.metric-badge--success {
  color: var(--el-color-success);
  background: color-mix(in srgb, var(--el-color-success) 12%, transparent);
}

.metric-badge--muted {
  color: var(--el-text-color-secondary);
}

.summary-line {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.35;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

:deep(.ecom-raw-detail-dialog .el-dialog__header) {
  padding: 16px 20px 10px;
  margin-right: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.ecom-raw-detail-dialog .el-dialog__body) {
  padding: 16px 20px 20px;
}

:deep(.ecom-raw-detail-dialog--fullscreen.el-dialog.is-fullscreen) {
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  margin: 0 !important;
}

:deep(.ecom-raw-detail-dialog--fullscreen .el-dialog__body) {
  height: calc(100vh - 58px);
  overflow: auto;
}

.ecom-raw-detail-dialog__body {
  display: flex;
  overflow: auto;
  flex-direction: column;
}

.raw-detail-snapshot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.raw-detail-snapshot-card {
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
}

.raw-detail-snapshot-image {
  width: 100%;
  height: 160px;
}

.raw-detail-snapshot-placeholder {
  display: flex;
  height: 160px;
  font-size: 13px;
  color: var(--el-text-color-placeholder);
  align-items: center;
  justify-content: center;
}

.raw-detail-snapshot-meta {
  display: flex;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  word-break: break-word;
  flex-direction: column;
  gap: 6px;
}

@media (width <= 768px) {
  :deep(.ecom-raw-detail-dialog .el-dialog__header) {
    padding: 14px 16px 10px;
  }

  :deep(.ecom-raw-detail-dialog .el-dialog__body) {
    padding: 12px 16px 16px;
  }
}
</style>
