<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="ai-usage-page">
      <template #filter>
        <div class="ai-usage-toolbar">
          <div class="ai-usage-stats">
            <div v-for="card in summaryCards" :key="card.label" class="ai-usage-stat">
              <span class="ai-usage-stat__label">{{ card.label }}</span>
              <span class="ai-usage-stat__value">{{ card.value }}</span>
            </div>
          </div>
          <div class="ai-usage-actions">
            <el-button size="small" link :disabled="loading" @click="openCleanupDialog">
              清理历史数据
            </el-button>
            <el-button size="small" link :disabled="loading" @click="loadAll">刷新</el-button>
          </div>
        </div>

        <div class="list-page-filter list-page-filter--flat">
          <div class="list-page-filter__row">
            <div class="list-page-search-form__actions">
              <el-input
                v-model="queryParams.keyword"
                class="ai-usage-search"
                clearable
                placeholder="搜索功能 / 模型 / Key 名称"
                size="small"
                @clear="handleSearch"
                @keyup.enter="handleSearch"
              />
              <el-select
                v-model="queryParams.featureCode"
                class="ai-usage-select"
                clearable
                filterable
                placeholder="功能场景"
                size="small"
                @change="handleSearch"
              >
                <el-option
                  v-for="item in facets.features"
                  :key="item.value"
                  :label="item.label || item.value"
                  :value="item.value"
                />
              </el-select>
              <el-select
                v-model="queryParams.model"
                class="ai-usage-select"
                clearable
                filterable
                placeholder="大模型"
                size="small"
                @change="handleSearch"
              >
                <el-option
                  v-for="item in facets.models"
                  :key="item.value"
                  :label="item.value"
                  :value="item.value"
                />
              </el-select>
              <el-select
                v-model="queryParams.status"
                class="ai-usage-select ai-usage-select--narrow"
                clearable
                placeholder="状态"
                size="small"
                @change="handleSearch"
              >
                <el-option label="成功" value="success" />
                <el-option label="失败" value="error" />
              </el-select>
              <el-date-picker
                v-model="timeRange"
                type="daterange"
                value-format="YYYY-MM-DD 00:00:00"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                size="small"
                class="ai-usage-daterange"
                @change="handleSearch"
              />
              <el-button size="small" :disabled="loading" @click="handleSearch">查询</el-button>
              <el-button
                size="small"
                type="danger"
                plain
                :disabled="loading || !selectedIds.length"
                @click="handleBatchDelete"
              >
                批量删除{{ selectedIds.length ? ` (${selectedIds.length})` : "" }}
              </el-button>
            </div>
          </div>
        </div>
      </template>

      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="ai-usage-tabs">
            <el-tabs v-model="activeTab" @tab-change="handleTabChange">
              <el-tab-pane label="调用明细" name="detail" />
              <el-tab-pane label="按 AI 使用设置" name="feature" />
              <el-tab-pane label="按大模型" name="model" />
              <el-tab-pane label="按 AI Key" name="key" />
              <el-tab-pane label="按调用规范" name="spec" />
              <el-tab-pane label="按天" name="day" />
            </el-tabs>
          </div>

          <div class="list-page-table-panel__body">
            <!-- 明细 -->
            <div v-if="activeTab === 'detail'" class="common-table">
              <vxe-grid
                v-bind="detailGridOptions"
                :max-height="tableMaxHeight"
                :data="detailList"
                :loading="loading"
                @checkbox-change="handleSelectionChange"
                @checkbox-all="handleSelectionChange"
              >
                <template #operationSlot="{ row }">
                  <div class="flex justify-start">
                    <el-button
                      type="danger"
                      link
                      size="small"
                      @click="handleDeleteRow(row)"
                    >
                      删除
                    </el-button>
                  </div>
                </template>
              </vxe-grid>
            </div>

            <!-- 聚合 -->
            <div v-else class="common-table">
              <vxe-grid
                v-bind="aggregateGridOptions"
                :max-height="tableMaxHeight"
                :data="aggregateList"
                :loading="loading"
              />
            </div>
          </div>
        </div>
      </template>

      <template #pagination>
        <div
          v-if="activeTab === 'detail'"
          class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat"
        >
          <pagination
            :total="detailTotal"
            v-model:page="queryParams.page"
            v-model:limit="queryParams.pageSize"
            @pagination="loadDetail"
          />
        </div>
      </template>
    </ListPageLayout>

    <!-- 清理弹窗 -->
    <el-dialog v-model="cleanupVisible" title="清理历史数据" width="520px" append-to-body>
      <el-alert
        v-if="cleanupPreview"
        type="warning"
        :closable="false"
        show-icon
        class="ai-usage-cleanup-preview"
        :title="`预览：将删除 ${cleanupPreview.willDelete} 条记录`"
      />
      <el-form label-width="110px">
        <el-form-item label="清理方式">
          <el-radio-group v-model="cleanupMode">
            <el-radio value="retention">按保留天数</el-radio>
            <el-radio value="before">按时间点</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="cleanupMode === 'retention'" label="保留天数">
          <el-input-number v-model="cleanupRetentionDays" :min="1" :max="3650" />
          <span class="ai-usage-cleanup-hint">只保留最近 N 天，更早的删除</span>
        </el-form-item>
        <el-form-item v-else label="删除该时间前">
          <el-date-picker
            v-model="cleanupBefore"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="选择时间点"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cleanupVisible = false">取消</el-button>
        <el-button :loading="cleanupLoading" @click="handleCleanupPreview">预览条数</el-button>
        <el-button type="danger" :loading="cleanupLoading" @click="handleCleanupConfirm">
          确认清理
        </el-button>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useWindowSize } from "@vueuse/core";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  cleanupAiUsageLog,
  deleteAiUsageLog,
  deleteAiUsageLogBatch,
  getAiUsageLogAggregate,
  getAiUsageLogFacets,
  getAiUsageLogPage,
  getAiUsageLogStats,
  type AiUsageAggregateDimension,
  type AiUsageAggregateRow,
  type AiUsageLogRecord,
  type AiUsageStats,
} from "@/api/system/ai-usage-log";
import { buildOperationColumn, commonGridOptions } from "@/common/table";

const loading = ref(false);
const cleanupLoading = ref(false);
const activeTab = ref<"detail" | AiUsageAggregateDimension>("detail");
const detailList = ref<AiUsageLogRecord[]>([]);
const detailTotal = ref(0);
const aggregateList = ref<AiUsageAggregateRow[]>([]);
const selectedIds = ref<number[]>([]);
const stats = ref<AiUsageStats>({
  callCount: 0,
  totalTokens: 0,
  promptTokens: 0,
  completionTokens: 0,
  errorCount: 0,
  successCount: 0,
  avgDurationMs: 0,
});

const facets = ref<{
  features: Array<{ value: string; label: string | null }>;
  models: Array<{ value: string; label: string | null }>;
  specs: Array<{ value: string; label: string | null }>;
}>({ features: [], models: [], specs: [] });

const queryParams = reactive({
  page: 1,
  pageSize: 20,
  keyword: "",
  featureCode: "",
  model: "",
  status: "",
  startTime: "",
  endTime: "",
});
const timeRange = ref<string[] | null>(null);

const cleanupVisible = ref(false);
const cleanupMode = ref<"retention" | "before">("retention");
const cleanupRetentionDays = ref(90);
const cleanupBefore = ref("");
const cleanupPreview = ref<{ willDelete: number } | null>(null);

const { height } = useWindowSize();
const tableMaxHeight = computed(() => Math.max(height.value - 360, 320));

const formatNumber = (value: number) => Number(value || 0).toLocaleString("en-US");

const summaryCards = computed(() => [
  { label: "总调用", value: formatNumber(stats.value.callCount) },
  { label: "总 Tokens", value: formatNumber(stats.value.totalTokens) },
  { label: "失败次数", value: formatNumber(stats.value.errorCount) },
  {
    label: "平均耗时",
    value: `${formatNumber(stats.value.avgDurationMs)} ms`,
  },
]);

const buildQuery = () => {
  const [start, end] = timeRange.value || [];
  return {
    keyword: queryParams.keyword || undefined,
    featureCode: queryParams.featureCode || undefined,
    model: queryParams.model || undefined,
    status: queryParams.status || undefined,
    startTime: start || undefined,
    endTime: end ? end.replace("00:00:00", "23:59:59") : undefined,
  };
};

const detailGridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: tableMaxHeight.value,
  checkboxConfig: { reserve: true },
  columns: [
    { type: "checkbox", width: 48 },
    { title: "ID", field: "id", width: 80 },
    { title: "时间", field: "createTime", width: 170 },
    {
      title: "功能场景",
      field: "featureLabel",
      minWidth: 180,
      showOverflow: "tooltip",
      formatter: ({ row }: any) => row.featureLabel || row.featureCode,
    },
    { title: "调用规范", field: "specCode", width: 130, showOverflow: "tooltip" },
    {
      title: "AI Key",
      field: "keyName",
      minWidth: 150,
      showOverflow: "tooltip",
      formatter: ({ row }: any) => row.keyName || row.keyId || "-",
    },
    { title: "模型", field: "model", minWidth: 160, showOverflow: "tooltip" },
    { title: "Tokens", field: "totalTokens", width: 110, align: "right" },
    { title: "耗时(ms)", field: "durationMs", width: 100, align: "right" },
    {
      title: "状态",
      field: "status",
      width: 90,
      formatter: ({ row }: any) => (row.status === "error" ? "失败" : "成功"),
    },
    { title: "调用人", field: "userName", width: 120, showOverflow: "tooltip" },
    buildOperationColumn("operationSlot"),
  ] as any[],
}));

const aggregateGridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: tableMaxHeight.value,
  columns: [
    {
      title: activeTab.value === "feature" ? "功能场景" : "维度值",
      field: "label",
      minWidth: 220,
      showOverflow: "tooltip",
      formatter: ({ row }: any) => row.label || row.value || "-",
    },
    { title: "调用次数", field: "callCount", width: 120, align: "right" },
    { title: "总 Tokens", field: "totalTokens", width: 130, align: "right" },
    { title: "输入 Tokens", field: "promptTokens", width: 130, align: "right" },
    { title: "输出 Tokens", field: "completionTokens", width: 130, align: "right" },
    { title: "平均耗时(ms)", field: "avgDurationMs", width: 130, align: "right" },
    { title: "失败次数", field: "errorCount", width: 110, align: "right" },
  ] as any[],
}));

const handleSelectionChange = (params: any) => {
  const rows: AiUsageLogRecord[] = params?.records || params?.rows || [];
  selectedIds.value = rows.map((row) => row.id).filter(Boolean);
};

const loadStats = async () => {
  const data = await getAiUsageLogStats(buildQuery());
  stats.value = {
    callCount: Number(data?.callCount || 0),
    totalTokens: Number(data?.totalTokens || 0),
    promptTokens: Number(data?.promptTokens || 0),
    completionTokens: Number(data?.completionTokens || 0),
    errorCount: Number(data?.errorCount || 0),
    successCount: Number(data?.successCount || 0),
    avgDurationMs: Number(data?.avgDurationMs || 0),
  };
};

const loadFacets = async () => {
  const data = await getAiUsageLogFacets();
  facets.value = {
    features: Array.isArray(data?.features) ? data.features : [],
    models: Array.isArray(data?.models) ? data.models : [],
    specs: Array.isArray(data?.specs) ? data.specs : [],
  };
};

const loadDetail = async () => {
  loading.value = true;
  try {
    const data = await getAiUsageLogPage({
      ...buildQuery(),
      page: queryParams.page,
      pageSize: queryParams.pageSize,
    });
    detailList.value = Array.isArray(data?.list) ? data.list : [];
    detailTotal.value = Number(data?.total || 0);
    selectedIds.value = [];
  } finally {
    loading.value = false;
  }
};

const loadAggregate = async () => {
  loading.value = true;
  try {
    const data = await getAiUsageLogAggregate(
      activeTab.value as AiUsageAggregateDimension,
      { ...buildQuery(), pageSize: 100 },
    );
    aggregateList.value = Array.isArray(data?.list) ? data.list : [];
  } finally {
    loading.value = false;
  }
};

const loadAll = async () => {
  await Promise.all([loadStats(), loadFacets()]);
  if (activeTab.value === "detail") {
    await loadDetail();
  } else {
    await loadAggregate();
  }
};

const handleSearch = async () => {
  queryParams.page = 1;
  await loadAll();
};

const handleTabChange = async () => {
  selectedIds.value = [];
  if (activeTab.value === "detail") {
    await loadDetail();
  } else {
    await loadAggregate();
  }
};

const handleDeleteRow = async (row: AiUsageLogRecord) => {
  try {
    await ElMessageBox.confirm(
      `确认删除这条 AI 使用记录（#${row.id}）吗？删除后统计结果会同步变化。`,
      "提示",
      { type: "warning" },
    );
    await deleteAiUsageLog(row.id);
    ElMessage.success("删除成功");
    await loadAll();
  } catch {
    /* 取消 */
  }
};

const handleBatchDelete = async () => {
  if (!selectedIds.value.length) return;
  try {
    await ElMessageBox.confirm(
      `确认删除选中的 ${selectedIds.value.length} 条 AI 使用记录吗？删除后统计结果会同步变化。`,
      "批量删除",
      { type: "warning" },
    );
    const result = await deleteAiUsageLogBatch(selectedIds.value);
    ElMessage.success(`已删除 ${result?.deletedCount || 0} 条`);
    await loadAll();
  } catch {
    /* 取消 */
  }
};

const openCleanupDialog = () => {
  cleanupPreview.value = null;
  cleanupVisible.value = true;
};

const buildCleanupPayload = (dryRun: boolean) =>
  cleanupMode.value === "retention"
    ? { retentionDays: cleanupRetentionDays.value, dryRun }
    : { before: cleanupBefore.value, dryRun };

const handleCleanupPreview = async () => {
  if (cleanupMode.value === "before" && !cleanupBefore.value) {
    ElMessage.warning("请选择时间点");
    return;
  }
  cleanupLoading.value = true;
  try {
    const result = await cleanupAiUsageLog(buildCleanupPayload(true));
    cleanupPreview.value = { willDelete: Number(result?.willDelete || 0) };
  } finally {
    cleanupLoading.value = false;
  }
};

const handleCleanupConfirm = async () => {
  if (cleanupMode.value === "before" && !cleanupBefore.value) {
    ElMessage.warning("请选择时间点");
    return;
  }
  try {
    await ElMessageBox.confirm(
      "清理后数据无法恢复，确认执行吗？建议先点「预览条数」核对范围。",
      "清理历史数据",
      { type: "warning" },
    );
    cleanupLoading.value = true;
    const result = await cleanupAiUsageLog(buildCleanupPayload(false));
    ElMessage.success(result?.message || `已删除 ${result?.deletedCount || 0} 条`);
    cleanupVisible.value = false;
    await loadAll();
  } catch {
    /* 取消 */
  } finally {
    cleanupLoading.value = false;
  }
};

onMounted(() => {
  loadAll();
});
</script>

<style scoped lang="scss">
/* 与其它系统模块对齐的紧凑间距 */
:deep(.ai-usage-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.ai-usage-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.ai-usage-page .list-page-filter--flat) {
  gap: 8px;
  padding-bottom: 8px;
}

:deep(.ai-usage-page .list-page-table-panel__pagination--flat) {
  padding-top: 8px;
}

.ai-usage-tabs {
  padding: 0 14px;
}

.ai-usage-tabs :deep(.el-tabs__header) {
  margin-bottom: 8px;
}

/* 极简统计条：无边框、无底色，靠字重和间距分层 */
.ai-usage-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 2px 2px 0;
  margin-bottom: 10px;
}

.ai-usage-stats {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  min-width: 0;
}

.ai-usage-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 0 16px;

  /* 用伪元素做分隔线，保持标记干净 */
  & + & {
    border-left: 1px solid var(--el-border-color-lighter);
  }

  &:first-child {
    padding-left: 2px;
  }

  &:last-child {
    padding-right: 2px;
  }

  &__label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }

  &__value {
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
}

.ai-usage-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.ai-usage-search {
  width: 200px;
}

.ai-usage-select {
  width: 140px;

  &--narrow {
    width: 100px;
  }
}

.ai-usage-daterange {
  width: 240px;
}

.ai-usage-cleanup-preview {
  margin-bottom: 12px;
}

.ai-usage-cleanup-hint {
  margin-left: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
