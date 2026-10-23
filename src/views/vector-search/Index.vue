<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="vector-search-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item label="分类">
                  <el-select
                    v-model="queryParams.collection"
                    size="small"
                    placeholder="全部分类"
                    popper-class="vector-collection-select-popper"
                    clearable
                    @change="handleSearch"
                  >
                    <el-option
                      v-for="def in collectionDefs"
                      :key="def.name"
                      :label="def.label"
                      :value="def.name"
                    >
                      <div class="vector-collection-option">
                        <div class="vector-collection-option__main">
                          <span class="vector-collection-option__label">{{ def.label }}</span>
                          <el-tag size="small" effect="plain" :type="getVectorTypeTagType(def)">
                            {{ getVectorTypeLabel(def) }}
                          </el-tag>
                          <el-tag v-if="def.internal" size="small" effect="plain" type="warning">
                            内部索引
                          </el-tag>
                          <span class="vector-collection-option__name">{{ def.name }}</span>
                        </div>
                        <div class="vector-collection-option__desc">
                          {{ getCollectionOptionDescription(def) }}
                        </div>
                      </div>
                    </el-option>
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item label="搜索">
                  <el-input
                    v-model="queryParams.keyword"
                    size="small"
                    placeholder="摘要 / Source ID"
                    clearable
                    @keyup.enter="handleSearch"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :disabled="loading" @click="handleSearch">
                查询
              </el-button>
              <el-button size="small" type="success" @click="openCreateDialog">新增</el-button>

              <el-button
                size="small"
                type="danger"
                :disabled="loading || selectedIds.length === 0"
                @click="handleBatchDelete"
              >
                删除选中 ({{ selectedIds.length }})
              </el-button>
            </div>

            <div class="vector-build-overview">
              <div class="vector-build-overview__main">
                <el-tag
                  size="small"
                  :type="schedulerStatus?.enabled ? 'success' : 'info'"
                  effect="plain"
                >
                  定时{{ schedulerStatus?.enabled ? "已开启" : "未开启" }}
                </el-tag>
                <span v-if="schedulerStatus?.enabled" class="vector-build-overview__text">
                  {{ schedulerStatus.cronDescription }}
                </span>
                <span class="vector-build-overview__sep">·</span>
                <span class="vector-build-overview__text">
                  上次完成 {{ formatLastBuildTime(latestBuildFinishedAt) }}
                </span>
                <span class="vector-build-overview__sep">·</span>
                <el-tag size="small" :type="getBuildJobTagType(currentBuildStatus)" effect="plain">
                  {{ getBuildJobStatusText(currentBuildStatus) }}
                </el-tag>
                <span v-if="buildJob" class="vector-build-overview__text">
                  {{ buildJob.processed }}/{{ buildJob.total || 0 }}
                </span>
                <el-progress
                  v-if="isBuildJobActive()"
                  class="vector-build-overview__progress"
                  :percentage="buildJob?.progress || 0"
                  :show-text="false"
                  :stroke-width="4"
                />
              </div>
            </div>

            <div v-if="coverageStats" class="vector-coverage-overview">
              <span class="vector-coverage-overview__title">向量覆盖率</span>
              <span
                v-for="item in coverageStats.collections"
                :key="item.collection"
                class="vector-coverage-overview__item"
                :title="`${item.label || item.collection}：已索引 ${item.indexedAlive} / 总量 ${item.total}，缺口 ${item.missing}，最近入库 ${item.lastIndexedAt || '暂无'}（点击筛选该集合）`"
                @click="handleCoverageClick(item)"
              >
                <span class="vector-coverage-overview__label">
                  {{ item.label || item.collection }}
                </span>
                <el-tag size="small" effect="plain" :type="coverageTagType(item)">
                  {{ item.coverage ?? "—" }}%
                </el-tag>
                <span class="vector-coverage-overview__count">
                  {{ item.indexedAlive }}/{{ item.total }}
                </span>
                <span v-if="item.missing > 0" class="vector-coverage-overview__missing">
                  缺 {{ item.missing }}
                </span>
              </span>
              <span class="vector-coverage-overview__time">
                统计于 {{ formatLastBuildTime(coverageStats.generatedAt) }}
              </span>
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
                :max-height="gridOptions.maxHeight"
                :data="records"
                :loading="loading"
                @checkbox-change="checkboxChange"
                @checkbox-all="checkboxAllChange"
              >
                <template #summarySlot="{ row }">
                  <span class="table-meta-text">{{ row.summary || "-" }}</span>
                </template>
                <template #collectionSlot="{ row }">
                  <div class="vector-collection-cell">
                    <el-tag size="small" :type="getCollectionTagType(row.collection)" effect="plain">
                      {{ getCollectionLabel(row.collection) }}
                    </el-tag>
                    <span class="vector-collection-cell__name">{{ row.collection }}</span>
                  </div>
                </template>
                <template #statusSlot="{ row }">
                  <el-tag
                    v-if="row.status === 'active' || row.status === 'indexed'"
                    type="success"
                    size="small"
                    effect="plain"
                    >正常</el-tag
                  >
                  <el-tag
                    v-else-if="row.status === 'deleted'"
                    type="danger"
                    size="small"
                    effect="plain"
                    >已删除</el-tag
                  >
                  <el-tag v-else type="info" size="small" effect="plain">{{
                    row.status || "未知"
                  }}</el-tag>
                </template>
                <template #operationDefaultSlot="{ row }">
                  <div class="flex items-center">
                    <el-dropdown
                      trigger="click"
                      @command="(command: string) => handleOperationCommand(command, row)"
                      class="operation-dropdown"
                    >
                      <el-button type="primary" link size="small" class="operation-trigger-button">
                        操作
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item command="detail">
                            <span>详情</span>
                          </el-dropdown-item>
                          <el-dropdown-item
                            command="delete"
                            divided
                            class="operation-menu-item--danger"
                          >
                            <span>删除</span>
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
            :total="pagination.total"
            v-model:page="pagination.page"
            v-model:limit="pagination.pageSize"
            @pagination="loadRecords"
          />
        </div>
      </template>
    </ListPageLayout>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="记录详情" width="760px" destroy-on-close>
      <template v-if="detailRecord">
        <div class="record-detail">
          <div class="record-detail__grid">
            <div class="record-detail__field">
              <span class="record-detail__label">ID</span>
              <span class="record-detail__value">{{ detailRecord.id }}</span>
            </div>
            <div class="record-detail__field">
              <span class="record-detail__label">分类</span>
              <span class="record-detail__value">{{ getCollectionLabel(detailRecord.collection) }}</span>
            </div>
            <div class="record-detail__field">
              <span class="record-detail__label">Source ID</span>
              <span class="record-detail__value mono-text">{{ detailRecord.sourceId }}</span>
            </div>
            <div class="record-detail__field">
              <span class="record-detail__label">状态</span>
              <span class="record-detail__value">
                <el-tag :type="detailRecord.status === 'active' ? 'success' : 'info'" size="small">
                  {{ detailRecord.status }}
                </el-tag>
              </span>
            </div>
            <div class="record-detail__field">
              <span class="record-detail__label">User ID</span>
              <span class="record-detail__value">{{ detailRecord.userId || "-" }}</span>
            </div>
            <div class="record-detail__field">
              <span class="record-detail__label">索引时间</span>
              <span class="record-detail__value">{{ formatTime(detailRecord.indexedAt) }}</span>
            </div>
          </div>
          <div class="record-detail__field record-detail__field--full">
            <span class="record-detail__label">Embedding Hash</span>
            <span class="record-detail__value mono-text">{{ detailRecord.embeddingHash || "-" }}</span>
          </div>
          <div class="record-detail__field record-detail__field--full">
            <span class="record-detail__label">摘要</span>
            <span class="record-detail__value">{{ detailRecord.summary || "-" }}</span>
          </div>
          <div class="record-detail__field record-detail__field--full">
            <span class="record-detail__label">Embedding Text</span>
            <div class="embedding-text">{{ detailRecord.embeddingText || "-" }}</div>
          </div>
        </div>
      </template>
    </el-dialog>


    <!-- 新增弹窗 -->
    <el-dialog
      v-model="createVisible"
      title="新增向量记录"
      width="520px"
      destroy-on-close
      @closed="resetCreateForm"
    >
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="80px">
        <el-form-item label="分类" prop="collection">
          <el-select
            v-model="createForm.collection"
            placeholder="请选择分类"
            popper-class="vector-collection-select-popper"
            style="width: 100%"
          >
            <el-option
              v-for="def in manualCollectionDefs"
              :key="def.name"
              :label="`${def.label}（${def.name}）`"
              :value="def.name"
            >
              <div class="vector-collection-option">
                <div class="vector-collection-option__main">
                  <span class="vector-collection-option__label">{{ def.label }}</span>
                  <span class="vector-collection-option__name">{{ def.name }}</span>
                </div>
                <div class="vector-collection-option__desc">
                  {{ getCollectionOptionDescription(def) }}
                </div>
              </div>
            </el-option>
          </el-select>
          <div v-if="!manualCollectionDefs.length" class="create-form-tip">
            当前没有支持手动新增文本向量的分类。
          </div>
        </el-form-item>
        <el-form-item label="Source ID">
          <el-input v-model="createForm.sourceId" placeholder="选填，不填则自动生成" />
        </el-form-item>
        <el-form-item label="文本内容" prop="text">
          <el-input
            v-model="createForm.text"
            type="textarea"
            :rows="6"
            placeholder="用于生成向量 embedding 的文本内容"
          />
        </el-form-item>
        <el-form-item label="元数据">
          <el-input
            v-model="createForm.metadataJson"
            type="textarea"
            :rows="3"
            placeholder='选填，JSON 格式，如 { "keywords": "简约,科技" }'
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="handleCreate">确定</el-button>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import type { VxeGridProps } from "vxe-table";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import { useWindowSize } from "@vueuse/core";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import {
  getCollectionDefinitions,
  getVectorRecords,
  getVectorRecord,
  deleteVectorRecord,
  indexVectorRecord,
  getLatestBaseVectorBuildJob,
  getVectorBuildSchedulerStatus,
  getCollectionLastFinishedTimes,
  getVectorCoverageStatistics,
  type BaseVectorBuildJob,
  type BaseVectorBuildJobStatus,
  type CollectionDefinition,
  type VectorBuildSchedulerStatus,
  type VectorCollectionCoverage,
  type VectorRecord,
} from "@/api/vector-search";

defineOptions({ name: "VectorSearch" });

// ============ Collection 定义 ============
const collectionDefs = ref<CollectionDefinition[]>([]);
const manualCollectionDefs = computed(() =>
  collectionDefs.value.filter((def) => def.manualIndexable !== false && def.vectorType !== "image"),
);

function getCollectionLabel(name: string): string {
  const def = collectionDefs.value.find((d) => d.name === name);
  return def?.label || name;
}

function getCollectionDefinition(name: string) {
  return collectionDefs.value.find((d) => d.name === name);
}

function getVectorTypeLabel(def: CollectionDefinition): string {
  return def.vectorType === "image" ? "图片向量" : "文本向量";
}

function getVectorTypeTagType(def: CollectionDefinition) {
  return def.vectorType === "image" ? "success" : "info";
}

function getCollectionOptionDescription(def: CollectionDefinition): string {
  const role = def.role || def.description || "";
  const source = def.dataSource ? `来源：${def.dataSource}` : "";
  return [role, source].filter(Boolean).join(" / ");
}

function getCollectionTagType(name: string) {
  const def = getCollectionDefinition(name);
  if (def?.vectorType === "image") return "success";
  if (def?.internal) return "warning";
  return "info";
}

// ============ 查询参数 ============
const queryParams = reactive({
  collection: "",
  keyword: "",
});

// ============ 列表数据 ============
const loading = ref(false);
const records = ref<VectorRecord[]>([]);
const selectedIds = ref<number[]>([]);

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const { height } = useWindowSize();

// ============ vxe-grid 配置 ============
const gridOptions = computed<VxeGridProps>(() => ({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  columns: [
    { type: "checkbox", width: 50 },
    { field: "id", title: "ID", width: 70 },
    { field: "summary", title: "摘要", minWidth: 260, slots: { default: "summarySlot" } },
    { field: "collection", title: "分类", width: 120, slots: { default: "collectionSlot" } },
    { field: "userId", title: "User ID", width: 100 },
    { field: "status", title: "状态", width: 90, slots: { default: "statusSlot" } },
    buildTimeColumn("索引时间", "indexedAt", 170),
    buildOperationColumn(),
  ],
  rowConfig: { keyField: "id" },
  checkboxConfig: { reserve: true },
}));

// ============ 选中逻辑 ============
function checkboxChange({ records: checkedRecords }: { records: VectorRecord[] }) {
  syncSelection(checkedRecords);
}
function checkboxAllChange({ records: checkedRecords }: { records: VectorRecord[] }) {
  syncSelection(checkedRecords);
}
function syncSelection(checkedRecords: VectorRecord[]) {
  selectedIds.value = checkedRecords.map((r) => r.id);
}

// ============ 操作分发 ============
async function handleOperationCommand(command: string, row: VectorRecord) {
  if (command === "detail") {
    await handleViewDetail(row);
  } else if (command === "delete") {
    await handleDelete(row);
  }
}

async function loadRecords() {
  loading.value = true;
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
    if (queryParams.collection) {
      params.collection = queryParams.collection;
    }
    const data = await getVectorRecords(params);

    let items = data?.items ?? [];
    if (queryParams.keyword) {
      const kw = queryParams.keyword.toLowerCase();
      items = items.filter(
        (item) =>
          (item.summary && item.summary.toLowerCase().includes(kw)) ||
          (item.sourceId && item.sourceId.toLowerCase().includes(kw)),
      );
    }

    records.value = items;
    pagination.total = data?.total ?? 0;
  } catch (error: any) {
    ElMessage.error(error?.message || "加载记录失败");
    records.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  selectedIds.value = [];
  loadRecords();
}

// ============ 删除 ============
async function handleDelete(row: VectorRecord) {
  try {
    await deleteVectorRecord(String(row.id));
    ElMessage.success("删除成功");
    if (records.value.length === 1 && pagination.page > 1) {
      pagination.page--;
    }
    await loadRecords();
  } catch (error: any) {
    ElMessage.error(error?.message || "删除失败");
  }
}

async function handleBatchDelete() {
  if (selectedIds.value.length === 0) return;
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 条记录？`, "批量删除", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }
  let successCount = 0;
  let failCount = 0;
  for (const id of selectedIds.value) {
    try {
      await deleteVectorRecord(String(id));
      successCount++;
    } catch {
      failCount++;
    }
  }
  if (failCount === 0) {
    ElMessage.success(`成功删除 ${successCount} 条记录`);
  } else {
    ElMessage.warning(`删除完成：成功 ${successCount} 条，失败 ${failCount} 条`);
  }
  selectedIds.value = [];
  pagination.page = 1;
  await loadRecords();
}

// ============ 详情弹窗 ============
const detailVisible = ref(false);
const detailRecord = ref<VectorRecord | null>(null);

async function handleViewDetail(row: VectorRecord) {
  try {
    const data = await getVectorRecord(String(row.id));
    detailRecord.value = data ?? row;
  } catch {
    detailRecord.value = row;
  }
  detailVisible.value = true;
}

// ============ 定时任务状态 ============
const schedulerStatus = ref<VectorBuildSchedulerStatus | null>(null);

async function loadSchedulerStatus() {
  try {
    schedulerStatus.value = await getVectorBuildSchedulerStatus();
  } catch {
    schedulerStatus.value = null;
  }
}

const collectionLastFinished = ref<Record<string, string>>({});

// ============ 覆盖率/缺口统计（全集合） ============
const coverageStats = ref<{
  generatedAt: string;
  collections: VectorCollectionCoverage[];
  summary: string;
} | null>(null);

async function loadCoverageStatistics() {
  try {
    coverageStats.value = await getVectorCoverageStatistics();
  } catch {
    coverageStats.value = null;
  }
}

function coverageTagType(item: VectorCollectionCoverage) {
  if (item.total <= 0) return "info";
  if ((item.coverage || 0) >= 99.9) return "success";
  if ((item.coverage || 0) >= 60) return "warning";
  return "danger";
}

function handleCoverageClick(item: VectorCollectionCoverage) {
  queryParams.collection = item.collection;
  handleSearch();
}


const latestBuildFinishedAt = computed(() => {
  const times = Object.values(collectionLastFinished.value);
  if (!times.length) {
    return buildJob.value?.finishedAt || "";
  }
  return times.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
});

async function loadCollectionLastFinished() {
  try {
    collectionLastFinished.value = (await getCollectionLastFinishedTimes()) || {};
  } catch {
    collectionLastFinished.value = {};
  }
}

function formatLastBuildTime(val?: string | null) {
  if (!val) return "暂无";
  return formatTime(val);
}

// ============ 构建基础向量索引（仅监控：任务状态在顶部信息条实时展示） ============
const buildJob = ref<BaseVectorBuildJob | null>(null);
let buildJobPollTimer: number | undefined;

const buildJobStaleMs = 2 * 60 * 1000;

const currentBuildStatus = computed<BaseVectorBuildJobStatus>(() => {
  if (!buildJob.value) return "idle";
  if (buildJob.value.status === "running" && isBuildJobStale(buildJob.value)) return "stale";
  return buildJob.value.status;
});

function getJobItem(collectionName: string) {
  return buildJob.value?.items?.find((i) => i.collection === collectionName);
}

function getJobItemProgress(collectionName: string): string {
  const item = getJobItem(collectionName);
  if (!item) return "未构建";
  return `${item.processed}/${item.total || 0}`;
}

function getJobItemStatusText(collectionName: string): string {
  const item = getJobItem(collectionName);
  if (!item) return "就绪";
  return getBuildJobStatusText(item.status as BaseVectorBuildJobStatus);
}

function getJobItemTagType(collectionName: string) {
  const item = getJobItem(collectionName);
  if (!item) return "info";
  return getBuildJobTagType(item.status as BaseVectorBuildJobStatus);
}

function getBuildJobStatusText(status: BaseVectorBuildJobStatus) {
  return {
    idle: "未执行",
    pending: "等待中",
    running: "构建中",
    stale: "待恢复",
    paused: "已暂停",
    completed: "已完成",
    failed: "失败",
    canceled: "已取消",
  }[status];
}

function getBuildJobTagType(status: BaseVectorBuildJobStatus) {
  if (status === "completed") return "success";
  if (status === "failed" || status === "canceled") return "danger";
  if (status === "paused" || status === "stale") return "warning";
  if (status === "idle") return "info";
  return "primary";
}

function isBuildJobActive(job = buildJob.value) {
  return !!job && ["pending", "running", "paused"].includes(job.status);
}

function isBuildJobStale(job: BaseVectorBuildJob) {
  const updatedAt = new Date(job.updatedAt || job.startedAt || job.createdAt).getTime();
  if (!Number.isFinite(updatedAt)) return false;
  return Date.now() - updatedAt > buildJobStaleMs;
}

async function loadLatestBuildJob() {
  try {
    buildJob.value = await getLatestBaseVectorBuildJob();
    if (isBuildJobActive()) startBuildJobPolling();
  } catch {
    buildJob.value = null;
  }
}

function startBuildJobPolling() {
  if (buildJobPollTimer) return;
  buildJobPollTimer = window.setInterval(async () => {
    await loadLatestBuildJob();
    if (!isBuildJobActive()) {
      stopBuildJobPolling();
      if (buildJob.value?.status === "completed") {
        await Promise.all([loadRecords(), loadCollectionLastFinished()]);
      }
    }
  }, 1500);
}

function stopBuildJobPolling() {
  if (buildJobPollTimer) {
    window.clearInterval(buildJobPollTimer);
    buildJobPollTimer = undefined;
  }
}

// ============ 新增弹窗 ============
const createVisible = ref(false);
const createLoading = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  collection: "",
  sourceId: "",
  text: "",
  metadataJson: "",
});

const createRules: FormRules = {
  collection: [{ required: true, message: "请选择分类", trigger: "change" }],
  text: [{ required: true, message: "请输入文本内容", trigger: "blur" }],
};

function openCreateDialog() {
  createForm.collection = "";
  createForm.sourceId = "";
  createForm.text = "";
  createForm.metadataJson = "";
  createVisible.value = true;
}

function resetCreateForm() {
  createFormRef.value?.resetFields();
}

async function handleCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  createLoading.value = true;
  try {
    let metadata: Record<string, any> | undefined;
    if (createForm.metadataJson.trim()) {
      metadata = JSON.parse(createForm.metadataJson);
    }
    await indexVectorRecord({
      collection: createForm.collection,
      sourceId: createForm.sourceId,
      text: createForm.text,
      metadata,
    });
    ElMessage.success("新增成功");
    createVisible.value = false;
    await loadRecords();
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      ElMessage.error("元数据 JSON 格式不正确");
    } else {
      ElMessage.error(error?.message || "新增失败");
    }
  } finally {
    createLoading.value = false;
  }
}

// ============ 工具方法 ============
function formatTime(val: string | undefined) {
  if (!val) return "-";
  try {
    const date = new Date(val);
    if (isNaN(date.getTime())) return val;
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return val;
  }
}

// ============ 初始化 ============
onMounted(async () => {
  try {
    const data = await getCollectionDefinitions();
    collectionDefs.value = data?.definitions ?? [];
  } catch {
    // 静默失败
  }
  await Promise.all([
    loadRecords(),
    loadLatestBuildJob(),
    loadSchedulerStatus(),
    loadCollectionLastFinished(),
    loadCoverageStatistics(),
  ]);
  startBuildJobPolling();
});

onUnmounted(() => {
  stopBuildJobPolling();
});
</script>

<style scoped lang="scss">
.vector-search-page {
  gap: 10px;
  padding: 8px 0 0;

  :deep(.list-page-layout__main) {
    gap: 10px;
  }

  :deep(.list-page-filter--flat) {
    gap: 10px;
    padding-bottom: 10px;
  }

  :deep(.list-page-table-panel__pagination--flat) {
    padding-top: 10px;
  }
}

.vector-collection-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
}

.vector-collection-cell__name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  line-height: 14px;
  color: var(--el-text-color-placeholder);
}

.vector-collection-option {
  min-width: 0;
  padding-right: 8px;
  line-height: 1.2;
}

.vector-collection-option__main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.vector-collection-option__label {
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vector-collection-option__name {
  min-width: 0;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vector-collection-option__desc {
  margin-top: 3px;
  font-size: 11px;
  line-height: 15px;
  color: var(--el-text-color-secondary);
}

.vector-build-overview {
  display: flex;
  padding: 8px 10px;
  margin-top: 8px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.vector-coverage-overview {
  display: flex;
  padding: 8px 10px;
  margin-top: 6px;
  background: var(--el-color-success-light-9);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.vector-coverage-overview__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  flex: 0 0 auto;
}

.vector-coverage-overview__item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  border-radius: 4px;
  padding: 0 4px;
  transition: background-color 0.15s;

  &:hover {
    background: var(--el-fill-color);
  }
}

.vector-coverage-overview__label {
  font-size: 12px;
  color: var(--el-text-color-primary);
}

.vector-coverage-overview__count {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}

.vector-coverage-overview__missing {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--el-color-danger);
}

.vector-coverage-overview__time {
  margin-left: auto;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  flex: 0 0 auto;
}

.vector-build-overview__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.vector-build-overview__text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.vector-build-overview__sep {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.vector-build-overview__progress {
  width: 80px;
  margin-left: 4px;
}

.vector-build-overview__actions {
  flex-shrink: 0;
}

.vector-build-simple-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.vector-build-simple-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.vector-build-simple-row:last-child {
  border-bottom: none;
}

.vector-build-simple-row__info {
  min-width: 0;
  flex: 1;
}

.vector-build-simple-row__label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.vector-build-simple-row__time {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.vector-build-status {
  display: grid;
  width: min(520px, 100%);
  padding: 6px 8px;
  margin-top: 8px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  grid-template-columns: auto auto auto minmax(90px, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.vector-build-status__title {
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  white-space: nowrap;
}

.vector-build-status__meta,
.vector-build-status__link {
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.vector-build-status__link {
  color: var(--el-color-primary);
}

.vector-build-status__progress {
  min-width: 90px;
}

@media (width <= 640px) {
  .vector-build-status {
    grid-template-columns: auto 1fr auto;
  }

  .vector-build-status__progress {
    grid-column: 1 / -1;
  }
}

.create-form-tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}

.vector-operation-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
  min-height: 180px;
}

.vector-operation-item {
  display: flex;
  min-height: 104px;
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.vector-operation-item__main {
  flex: 1;
  min-width: 0;
}

.vector-operation-item__title {
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  color: var(--el-text-color-primary);
}

.vector-operation-item__desc {
  margin-top: 2px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}

@media (width <= 768px) {
  .vector-operation-list {
    grid-template-columns: 1fr;
    min-height: 120px;
  }

  .vector-operation-item {
    min-height: auto;
  }
}


.build-sticker-vector-tip {
  margin-top: 4px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}

.build-sticker-vector-result {
  padding: 10px 12px;
  margin-top: 12px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}

.build-sticker-vector-result__summary {
  display: flex;
  font-size: 12px;
  line-height: 20px;
  color: var(--el-text-color-regular);
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
}

.build-sticker-vector-result__details {
  display: flex;
  margin-top: 8px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
  flex-direction: column;
  gap: 4px;
}

.build-sticker-vector-progress {
  margin-top: 8px;
}

.build-sticker-vector-result__item {
  display: grid;
  grid-template-columns: minmax(92px, 1fr) repeat(4, minmax(64px, auto));
  gap: 8px;
  align-items: center;
}

.build-sticker-vector-error {
  margin-top: 8px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-color-danger);
  word-break: break-word;
}

.mono-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
}

.record-detail {
  max-height: min(68vh, 640px);
  padding-right: 4px;
  overflow: auto;
}

.record-detail__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
}

.record-detail__field {
  min-width: 0;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.record-detail__field--full {
  margin-top: 4px;
}

.record-detail__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  line-height: 16px;
  color: var(--el-text-color-secondary);
}

.record-detail__value {
  display: block;
  min-width: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--el-text-color-primary);
  overflow-wrap: anywhere;
}

.embedding-text {
  max-height: 280px;
  padding: 8px 10px;
  overflow: auto;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
  overflow-wrap: anywhere;
}





@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgb(103 194 58 / 70%);
  }

  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgb(103 194 58 / 0%);
  }

  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgb(103 194 58 / 0%);
  }
}

.progress-wrapper {
  .progress-details {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}


.vector-collections-section {
  .section-title {
    margin: 8px 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.vector-collections-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.vector-collection-row {
  display: flex;
  padding: 12px 16px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  transition: all 0.25s ease;
  align-items: center;
  justify-content: space-between;

  &:hover {
    background: var(--el-fill-color-lighter);
    border-color: var(--el-color-primary-light-7);
  }

  &.is-building {
    background: color-mix(in srgb, var(--el-color-primary) 2%, transparent);
    border-color: var(--el-color-primary-light-4);
  }
}

.row-info-col {
  flex: 2;
  min-width: 0;
}

.row-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
  
  .row-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .row-name {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
    color: var(--el-text-color-placeholder);
  }
}

.row-meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.row-progress-col {
  flex: 1.5;
  padding: 0 12px;
  font-size: 13px;
  text-align: center;
  
  .mini-progress-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    
    span {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      color: var(--el-text-color-regular);
    }
  }
}



@media (width <= 720px) {
  .record-detail__grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>

<style lang="scss">
.vector-collection-select-popper {
  .el-select-dropdown__item {
    height: auto;
    min-height: 46px;
    padding: 6px 12px;
    line-height: normal;
    white-space: normal;
  }

  .vector-collection-option {
    width: min(560px, calc(100vw - 64px));
    min-width: 0;
    padding-right: 4px;
    line-height: 1.2;
  }

  .vector-collection-option__main {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 6px;
  }

  .vector-collection-option__label {
    font-size: 13px;
    font-weight: 600;
    line-height: 18px;
    color: var(--el-text-color-primary);
    flex: 0 0 auto;
  }

  .vector-collection-option__name {
    min-width: 0;
    overflow: hidden;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
    line-height: 16px;
    color: var(--el-text-color-placeholder);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .vector-collection-option__desc {
    display: -webkit-box;
    margin-top: 3px;
    overflow: hidden;
    font-size: 11px;
    line-height: 15px;
    color: var(--el-text-color-secondary);
    white-space: normal;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
}
</style>
