<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="ecom-data-page" sidebar-width="320px">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <div class="resource-toolbar">
            <div class="resource-toolbar__actions">
              <el-button size="small" @click="loadData">{{ t('common.refresh') }}</el-button>
            </div>
          </div>

          <el-form :model="filters" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item :label="t('operation.task')">
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
                <el-form-item :label="t('operation.supplierPlatform')">
                  <el-select
                    v-model="filters.supplierPlatform"
                    clearable
                    filterable
                    :placeholder="t('operation.allPlatforms')"
                  >
                    <el-option
                      v-for="item in supplierPlatformOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="7">
                <el-form-item :label="t('operation.keyword')">
                  <el-input
                    v-model="filters.keyword"
                    clearable
                    :placeholder="t('operation.matchTitleOrLinkOrQuery')"
                    @keyup.enter="handleSearch"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" @click="handleSearch">{{ t('common.query') }}</el-button>
              <el-button size="small" @click="handleReset">{{ t('common.reset') }}</el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #sidebar>
        <div class="sidebar-card">
          <div class="sidebar-card__title">{{ t('operation.runSummary') }}</div>

          <template v-if="activeRun">
            <div class="sidebar-metrics">
              <div class="sidebar-metric">
                <span>{{ t('operation.status') }}</span>
                <strong>{{ getRunStatusLabel(activeRun.status) }}</strong>
              </div>
              <div class="sidebar-metric">
                <span>{{ t('operation.sourceProducts') }}</span>
                <strong>{{
                  activeRun.summaryData?.sourceSummary?.sourceCount ||
                  activeRun.sourceItemsData?.length ||
                  0
                }}</strong>
              </div>
              <div class="sidebar-metric">
                <span>{{ t('operation.matchResults') }}</span>
                <strong>{{
                  activeRun.summaryData?.matchedItemsCount || activeRun.items?.length || 0
                }}</strong>
              </div>
              <div class="sidebar-metric">
                <span>{{ t('operation.matchedSources') }}</span>
                <strong>{{ activeRun.summaryData?.matchedSourceCount || 0 }}</strong>
              </div>
            </div>

            <div class="sidebar-block">
              <div class="sidebar-block__label">{{ t('operation.description') }}</div>
              <div class="sidebar-block__text">
                {{ activeRun.summaryData?.message || "-" }}
              </div>
            </div>

            <div class="sidebar-block" v-if="activeRun.summaryData?.supplierPlatforms?.length">
              <div class="sidebar-block__label">{{ t('operation.supplierPlatforms') }}</div>
              <div class="chip-list">
                <el-tag
                  v-for="platform in activeRun.summaryData?.supplierPlatforms"
                  :key="platform"
                  size="small"
                  type="info"
                >
                  {{ platform }}
                </el-tag>
              </div>
            </div>

            <div
              class="sidebar-block"
              v-if="activeRun.summaryData?.sourceSummary?.platformBreakdown?.length"
            >
              <div class="sidebar-block__label">{{ t('operation.sourcePlatforms') }}</div>
              <div class="chip-list">
                <el-tag
                  v-for="item in activeRun.summaryData?.sourceSummary?.platformBreakdown"
                  :key="item.platform"
                  size="small"
                >
                  {{ item.platform }} · {{ item.count }}
                </el-tag>
              </div>
            </div>
          </template>

          <el-empty v-else :description="t('operation.inputRunIdToViewSummary')" />
        </div>
      </template>

      <template #table>
        <div
          class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat"
        >
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid v-bind="gridOptions" :data="tableData" :loading="loading">
                <template #sourceSlot="{ row }">
                  <div class="table-stack">
                    <span>{{ row.sourceTitle || "-" }}</span>
                    <span class="table-meta-text">
                      {{ row.sourcePlatform || "-" }}
                    </span>
                    <el-link
                      v-if="row.sourceUrl"
                      :href="row.sourceUrl"
                      target="_blank"
                      type="primary"
                    >
                      {{ t('operation.sourceLink') }}
                    </el-link>
                  </div>
                </template>

                <template #supplierSlot="{ row }">
                  <div class="table-stack">
                    <span>{{ row.title || "-" }}</span>
                    <span class="table-meta-text">
                      {{ row.supplierPlatform || "-" }} · {{ row.priceText || "-" }}
                    </span>
                    <span class="table-meta-text">{{ row.shopName || "-" }}</span>
                  </div>
                </template>

                <template #scoreSlot="{ row }">
                  <div class="table-stack">
                    <el-tag size="small" type="success">
                      {{ row.matchScore ?? "-" }}
                    </el-tag>
                    <span class="table-meta-text">{{ t('operation.rank') }} {{ row.matchRank ?? "-" }}</span>
                  </div>
                </template>

                <template #snapshotSlot="{ row }">
                  <span class="table-meta-text">
                    {{ getSnapshotCount(row.snapshotData) }}
                  </span>
                </template>

                <template #operationSlot="{ row }">
                  <div class="flex justify-start">
                    <el-button type="primary" link size="small" @click="openDetail(row)">
                      {{ t('common.detail') }}
                    </el-button>
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
      width="1180px"
      destroy-on-close
      class="match-item-detail-dialog"
      :title="t('operation.supplyMatchResultDetails')"
      @closed="handleDetailClosed"
    >
      <div v-loading="detailLoading" class="detail-shell">
        <template v-if="currentDetail">
          <div class="detail-overview-grid">
            <div class="detail-card">
              <div class="detail-card__title">{{ t('operation.sourceProduct') }}</div>
              <div class="detail-card__subtitle">{{ currentDetail.sourceTitle || "-" }}</div>
              <div class="detail-meta-grid">
                <div class="detail-meta-item">
                  <span>{{ t('operation.platform') }}</span>
                  <strong>{{ currentDetail.sourcePlatform || "-" }}</strong>
                </div>
                <div class="detail-meta-item">
                  <span>{{ t('operation.sourceRecord') }}</span>
                  <strong>{{ currentDetail.sourceRecordId || "-" }}</strong>
                </div>
                <div class="detail-meta-item">
                  <span>{{ t('operation.queryWord') }}</span>
                  <strong>{{ currentDetail.sourceQuery || "-" }}</strong>
                </div>
                <div class="detail-meta-item">
                  <span>{{ t('operation.sourceLink') }}</span>
                  <strong>{{ getShortUrl(currentDetail.sourceUrl) }}</strong>
                </div>
              </div>
              <el-link
                v-if="currentDetail.sourceUrl"
                :href="currentDetail.sourceUrl"
                target="_blank"
                type="primary"
              >
                {{ t('operation.openSourceLink') }}
              </el-link>
            </div>

            <div class="detail-card detail-card--hero">
              <div class="detail-card__title">{{ t('operation.supplierProduct') }}</div>
              <div class="detail-card__subtitle">{{ currentDetail.title || "-" }}</div>
              <div class="detail-meta-grid">
                <div class="detail-meta-item">
                  <span>{{ t('operation.platform') }}</span>
                  <strong>{{ currentDetail.supplierPlatform || "-" }}</strong>
                </div>
                <div class="detail-meta-item">
                  <span>{{ t('operation.price') }}</span>
                  <strong>{{ currentDetail.priceText || "-" }}</strong>
                </div>
                <div class="detail-meta-item">
                  <span>{{ t('operation.shop') }}</span>
                  <strong>{{ currentDetail.shopName || "-" }}</strong>
                </div>
                <div class="detail-meta-item">
                  <span>{{ t('operation.matchScore') }}</span>
                  <strong>{{ currentDetail.matchScore ?? "-" }}</strong>
                </div>
              </div>

              <div class="detail-image-row" v-if="currentDetail.imageUrl">
                <el-image
                  :src="currentDetail.imageUrl"
                  fit="cover"
                  :preview-src-list="[currentDetail.imageUrl]"
                  preview-teleported
                  class="detail-image"
                />
              </div>

              <div class="detail-link-row">
                <el-link
                  v-if="currentDetail.supplierUrl"
                  :href="currentDetail.supplierUrl"
                  target="_blank"
                  type="primary"
                >
                  {{ t('operation.openSupplierLink') }}
                </el-link>
              </div>
            </div>
          </div>

          <div class="detail-card detail-card--compare" v-if="currentDetail.comparisonData">
            <div class="detail-card__title">{{ t('operation.comparisonInfo') }}</div>
            <pre class="mini-json">{{ formatJson(currentDetail.comparisonData) }}</pre>
          </div>

          <el-tabs>
            <el-tab-pane :label="t('operation.listingInfo')">
              <pre class="json-preview">{{ formatJson(currentDetail.listingData) }}</pre>
            </el-tab-pane>

            <el-tab-pane :label="t('operation.detailInfo')">
              <pre class="json-preview">{{ formatJson(currentDetail.detailData) }}</pre>
            </el-tab-pane>

            <el-tab-pane :label="`${t('operation.snapshot')} (${detailSnapshots.length})`">
              <div v-if="detailSnapshots.length" class="snapshot-list">
                <div
                  v-for="(item, index) in detailSnapshots"
                  :key="`${getSnapshotLabel(item, index)}-${index}`"
                  class="snapshot-card"
                >
                  <div class="snapshot-card__title">{{ getSnapshotLabel(item, index) }}</div>
                  <el-link
                    v-if="getSnapshotUrl(item)"
                    :href="getSnapshotUrl(item)"
                    target="_blank"
                    type="primary"
                  >
                    {{ t('operation.openScreenshot') }}
                  </el-link>
                  <pre class="mini-json">{{ formatJson(item) }}</pre>
                </div>
              </div>
              <el-empty v-else :description="t('operation.noScreenshotData')" />
            </el-tab-pane>

            <el-tab-pane :label="t('operation.rawPayload')">
              <pre class="json-preview">{{ formatJson(currentDetail.rawPayload) }}</pre>
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
import { useRoute } from "vue-router";
import {
  getEcomSelectionSupplyMatchItemDetail,
  getEcomSelectionSupplyMatchItemList,
  getEcomSelectionSupplyMatchRunDetail,
  getEcomSelectionSupplyMatchTaskList,
  type EcomSelectionSupplyMatchItem,
  type EcomSelectionSupplyMatchRun,
  type EcomSelectionSupplyMatchTask,
} from "@/api/operation/ecomSelectionSupplyMatch";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import type { VxeGridProps } from "vxe-table";
import {
  formatDateTime,
  formatJson,
  getRunStatusLabel,
  getShortUrl,
  getSnapshotLabel,
  getSnapshotUrl,
  normalizeSnapshotList,
} from "@/views/operation/ecom-data/shared";

const { t } = useI18n();

defineOptions({ name: "EcomSelectionSupplyMatchItemPage" });

const route = useRoute();
const loading = ref(false);
const detailLoading = ref(false);
const detailVisible = ref(false);
const total = ref(0);
const list = ref<EcomSelectionSupplyMatchItem[]>([]);
const tasks = ref<EcomSelectionSupplyMatchTask[]>([]);
const activeRun = ref<EcomSelectionSupplyMatchRun | null>(null);
const currentDetail = ref<EcomSelectionSupplyMatchItem | null>(null);

const filters = reactive({
  pageNo: 1,
  pageSize: 10,
  taskId: "",
  runId: "",
  supplierPlatform: "",
  keyword: "",
});

const syncQueryToFilters = () => {
  filters.taskId = String(route.query.taskId || "").trim();
  filters.runId = String(route.query.runId || "").trim();
  filters.supplierPlatform = String(route.query.supplierPlatform || "").trim();
};

const taskOptions = computed(() =>
  tasks.value.map((item) => ({ value: item.id, label: item.name })),
);

const supplierPlatformOptions = computed(() => {
  const values = new Set<string>();
  if (filters.supplierPlatform) {
    values.add(filters.supplierPlatform);
  }
  list.value.forEach((item) => {
    if (item.supplierPlatform) {
      values.add(item.supplierPlatform);
    }
  });
  return Array.from(values).map((value) => ({ value, label: value }));
});

const tableData = computed(() => {
  if (list.value.length <= filters.pageSize) {
    return list.value;
  }
  const start = (filters.pageNo - 1) * filters.pageSize;
  return list.value.slice(start, start + filters.pageSize);
});

const detailSnapshots = computed(() => normalizeSnapshotList(currentDetail.value?.snapshotData));

const getSnapshotCount = (value: any) => normalizeSnapshotList(value).length;

const { height } = useWindowSize();

const gridOptions = ref<VxeGridProps<EcomSelectionSupplyMatchItem>>({
  ...(commonGridOptions as VxeGridProps<EcomSelectionSupplyMatchItem>),
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: {
    ...(commonGridOptions as any).rowConfig,
    keyField: "id",
  },
  columns: [
    {
      title: t('operation.sourceProduct'),
      field: "sourceTitle",
      minWidth: 220,
      showOverflow: "tooltip",
      slots: { default: "sourceSlot" },
    },
    {
      title: t('operation.supplierProduct'),
      field: "title",
      minWidth: 260,
      showOverflow: "tooltip",
      slots: { default: "supplierSlot" },
    },
    {
      title: t('operation.matchScore'),
      field: "matchScore",
      width: 110,
      slots: { default: "scoreSlot" },
    },
    {
      title: t('operation.queryWord'),
      field: "sourceQuery",
      minWidth: 160,
      showOverflow: "tooltip",
      formatter: ({ row }) => row.sourceQuery || "-",
    },
    {
      title: t('operation.snapshotCount'),
      field: "snapshotData",
      width: 86,
      slots: { default: "snapshotSlot" },
    },
    {
      ...buildTimeColumn(t('operation.collectTime'), "capturedAt", 180),
      formatter: ({ cellValue }) => formatDateTime(cellValue as string),
    },
    buildOperationColumn("operationSlot", 88),
  ],
});

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const applyListData = (data: any) => {
  list.value = Array.isArray(data?.list) ? data.list : [];
  total.value = Number(data?.total || 0);
};

const syncRunSummary = async () => {
  const runId = String(filters.runId || "").trim();
  if (!runId) {
    activeRun.value = null;
    return;
  }

  try {
    activeRun.value = await getEcomSelectionSupplyMatchRunDetail(runId);
  } catch {
    activeRun.value = null;
  }
};

const loadList = async () => {
  loading.value = true;
  try {
    const data = await getEcomSelectionSupplyMatchItemList(filters);
    applyListData(data);
    await syncRunSummary();
  } finally {
    loading.value = false;
  }
};

const loadData = async () => {
  loading.value = true;
  try {
    const [itemData, taskData] = await Promise.all([
      getEcomSelectionSupplyMatchItemList(filters),
      getEcomSelectionSupplyMatchTaskList({ pageNo: 1, pageSize: 100 }),
    ]);
    applyListData(itemData);
    tasks.value = Array.isArray(taskData?.list) ? taskData.list : [];
    await syncRunSummary();
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
  filters.supplierPlatform = "";
  filters.keyword = "";
  await loadList();
};

const openDetail = async (row: EcomSelectionSupplyMatchItem) => {
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    currentDetail.value = await getEcomSelectionSupplyMatchItemDetail(row.id);
  } finally {
    detailLoading.value = false;
  }
};

const handleDetailClosed = () => {
  currentDetail.value = null;
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

.sidebar-card {
  padding: 16px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
}

.sidebar-card__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.sidebar-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.sidebar-metric {
  padding: 10px 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.sidebar-metric span {
  display: block;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.sidebar-metric strong {
  display: block;
  margin-top: 4px;
  font-size: 18px;
  color: var(--el-text-color-primary);
}

.sidebar-block {
  margin-top: 14px;
}

.sidebar-block__label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.sidebar-block__text,
.table-meta-text {
  font-size: 12px;
  line-height: 1.7;
  color: var(--el-text-color-secondary);
}

.table-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-shell {
  min-height: 420px;
}

.detail-overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.detail-card {
  padding: 16px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
}

.detail-card--hero {
  background: var(--el-fill-color-lighter);
}

.detail-card--compare {
  margin-bottom: 14px;
}

.detail-card__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.detail-card__subtitle {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-secondary);
}

.detail-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 14px 0;
}

.detail-meta-item {
  padding: 10px 12px;
  background: var(--el-fill-color-light);
  border-radius: 10px;
}

.detail-meta-item span {
  display: block;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.detail-meta-item strong {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
}

.detail-image-row {
  margin-top: 12px;
}

.detail-image {
  width: 100px;
  height: 100px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
}

.detail-link-row {
  margin-top: 12px;
}

.snapshot-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.snapshot-card {
  padding: 14px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
}

.snapshot-card__title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.mini-json,
.json-preview {
  padding: 14px;
  margin: 10px 0 0;
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

.json-preview {
  max-height: 460px;
}

@media (width <= 1200px) {
  .detail-overview-grid,
  .snapshot-list {
    grid-template-columns: 1fr;
  }
}

@media (width <= 768px) {
  .sidebar-metrics,
  .detail-meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
