<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="tti-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="搜索提示词">
                  <el-input
                    v-model="queryParams.search"
                    size="small"
                    clearable
                    placeholder="请输入提示词内容"
                    @keyup.enter="getList"
                    @clear="getList"
                  />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--base" :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item label="图片尺寸">
                  <el-select v-model="queryParams.size" size="small" clearable placeholder="全部">
                    <el-option
                      v-for="item in sizeOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
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
                >搜索</el-button
              >
              <el-button
                size="small"
                :icon="Refresh"
                :disabled="loading || deleteLoading"
                @click="resetQuery"
                >重置</el-button
              >
              <el-button
                size="small"
                type="primary"
                :icon="Plus"
                :disabled="loading || deleteLoading"
                @click="handleAdd"
                >创建生成</el-button
              >
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                :loading="deleteLoading"
                :disabled="!selectedIds.length"
                @click="handleBatchDelete"
              >
                批量删除{{ selectedIds.length ? `(${selectedIds.length})` : "" }}
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
                :data="dataSource"
                :loading="loading"
                @checkbox-change="checkboxChange"
                @checkbox-all="checkboxAllChange"
              >
                <template #imageSlot="{ row }">
                  <el-image
                    v-if="row.url || row.resultUrl"
                    :src="row.url || row.resultUrl"
                    :preview-src-list="[row.url || row.resultUrl]"
                    :preview-teleported="true"
                    fit="cover"
                    class="h-16 w-16 rounded"
                  />
                  <div
                    v-else-if="row.status === 'processing'"
                    class="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded text-[11px]"
                  >
                    <el-icon class="is-loading text-base">
                      <Loading />
                    </el-icon>
                    <span>生成中</span>
                  </div>
                  <el-tooltip
                    v-else-if="row.status === 'failed'"
                    :content="getErrorMessage(row)"
                    placement="top"
                    :show-after="200"
                  >
                    <span class="tti-error-text">失败</span>
                  </el-tooltip>
                  <span v-else>-</span>
                </template>

                <template #promptSlot="{ row }">
                  <el-tooltip
                    v-if="row.prompt"
                    :content="row.prompt"
                    placement="top"
                    :show-after="500"
                  >
                    <div class="line-clamp-2 cursor-pointer text-xs leading-5">
                      {{ row.prompt }}
                    </div>
                  </el-tooltip>
                  <span v-else>-</span>
                </template>

                <template #statusSlot="{ row }">
                  <el-tooltip
                    v-if="row.status === 'failed'"
                    :content="getErrorMessage(row)"
                    placement="top"
                    :show-after="200"
                  >
                    <el-tag :type="getStatusType(row.status)" size="small" class="cursor-help">
                      {{ formatStatus(row.status) }}
                    </el-tag>
                  </el-tooltip>
                  <el-tag v-else :type="getStatusType(row.status)" size="small">
                    {{ formatStatus(row.status) }}
                  </el-tag>
                </template>

                <template #configParamsSlot="{ row }">
                  <div v-if="row.configParams" class="flex flex-wrap gap-1 text-[11px]">
                    <span
                      v-if="row.configParams.specCode"
                      class="tti-spec-badge"
                    >
                      {{ getSpecLabel(row.configParams.specCode) }}
                    </span>
                    <span
                      v-if="row.configParams.model"
                      class="tti-model-badge"
                    >
                      {{ row.configParams.model }}
                    </span>
                    <span
                      v-if="getConfigParamValue(row, 'size')"
                      class="tti-param-badge"
                    >
                      <i class="mdi mdi-aspect-ratio mr-0.5"></i>{{ getConfigParamValue(row, 'size') }}
                    </span>
                    <span
                      v-if="getConfigParamValue(row, 'style')"
                      class="tti-param-badge"
                    >
                      {{ currentStyleLabelMap[getConfigParamValue(row, 'style')] || getConfigParamValue(row, 'style') }}
                    </span>
                    <span
                      v-if="getConfigParamValue(row, 'quality')"
                      class="tti-param-badge"
                    >
                      {{ getConfigParamValue(row, 'quality') }}
                    </span>
                  </div>
                  <span v-else>-</span>
                </template>

                <template #operationSlot="{ row }">
                  <div class="flex justify-start">
                    <el-dropdown class="operation-dropdown" placement="bottom-end">
                      <el-button type="primary" link size="small" class="operation-trigger-button"
                        >操作</el-button
                      >
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item
                            v-if="row.status === 'failed'"
                            @click="showErrorDetail(row)"
                          >
                            查看失败原因
                          </el-dropdown-item>
                          <el-dropdown-item
                            divided
                            @click="handleDelete(row)"
                            class="operation-menu-item--danger"
                            >删除</el-dropdown-item
                          >
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
            v-model:page="queryParams.page"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>

    <el-dialog
      v-model="dialogVisible"
      class="tti-fullscreen-dialog"
      :fullscreen="true"
      :destroy-on-close="true"
      align-center
    >
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-4 py-1 pr-6 border-b pb-3 tti-dialog-header">
          <div>
            <div class="text-lg font-bold tti-dialog-title">AI 文字生图</div>
            <div class="mt-0.5 text-xs tti-dialog-subtitle">选择生图规范，进入对应模型专属交互界面完成创作</div>
          </div>
          <!-- 规范选择器 -->
          <div class="flex items-center gap-2">
            <span class="text-sm tti-dialog-label whitespace-nowrap">生图规范:</span>
            <el-select v-model="activeSpecCode" class="tti-spec-select" style="width: 260px;" size="default">
              <el-option
                v-for="item in specOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </div>
        </div>
      </template>

      <!-- 根据选中的规范展示对应专属 UI 交互视图 -->
      <div class="pt-2">
        <OpenAiTtiForm
          v-if="activeSpecCode === 'openai.image'"
          :loading="submitLoading"
          @submit="handleSpecFormSubmit"
          @cancel="dialogVisible = false"
        />
        <DashScopeTtiForm
          v-else-if="activeSpecCode === 'dashscope.image'"
          :loading="submitLoading"
          @submit="handleSpecFormSubmit"
          @cancel="dialogVisible = false"
        />
        <VolcengineSeedreamTtiForm
          v-else-if="activeSpecCode === 'volcengine.seedream'"
          :loading="submitLoading"
          @submit="handleSpecFormSubmit"
          @cancel="dialogVisible = false"
        />
      </div>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watchEffect, computed, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Search, Refresh, Delete, Loading } from "@element-plus/icons-vue";
import {
  getTtiRecordPage,
  createTtiRecord,
  deleteTtiRecord,
  batchDeleteTtiRecord,
} from "@/api/ai/tti";
import OpenAiTtiForm from "./components/tti/OpenAiTtiForm.vue";
import DashScopeTtiForm from "./components/tti/DashScopeTtiForm.vue";
import VolcengineSeedreamTtiForm from "./components/tti/VolcengineSeedreamTtiForm.vue";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import { useWindowSize } from "@vueuse/core";
import Pagination from "@/components/Pagination/index.vue";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import { formatTimestamp } from "@/common/date";

const currentStyleLabelMap: Record<string, string> = {
  "": "通用",
  photography: "写实",
  illustration: "插画",
  anime: "二次元",
  vivid: "生动",
  natural: "自然",
};

const specLabelMap: Record<string, string> = {
  "dashscope.image": "DashScope",
  "openai.image": "OpenAI",
  "volcengine.seedream": "火山豆包",
};

const getSpecLabel = (code?: string) => {
  if (!code) return "";
  return specLabelMap[code] || code;
};

const getConfigParamValue = (row: any, key: string) => {
  return row.configParams?.[key] || row.configParams?.providerParams?.[key];
};

const loading = ref(false);
const submitLoading = ref(false);
const deleteLoading = ref(false);
const dialogVisible = ref(false);
const total = ref(0);
const dataSource = ref<any[]>([]);
const selectedIds = ref<string[]>([]);

const specOptions = [
  { label: "OpenAI 兼容 (DALL-E)", value: "openai.image" },
  { label: "通义万相 (Qwen)", value: "dashscope.image" },
  { label: "火山引擎豆包 (Seedream)", value: "volcengine.seedream" },
];

// 记忆用户最后选择的生图规范（默认优先推荐 OpenAI 兼容模式）
const activeSpecCode = ref<string>(localStorage.getItem("preferred_tti_spec") || "openai.image");

watch(activeSpecCode, (val) => {
  if (val) localStorage.setItem("preferred_tti_spec", val);
});

const sizeOptions = [
  { label: "1024x1024 (正方形 1:1)", value: "1024x1024" },
  { label: "1024x1792 (竖屏 9:16)", value: "1024x1792" },
  { label: "1792x1024 (横屏 16:9)", value: "1792x1024" },
  { label: "768*1024 (3:4)", value: "768*1024" },
  { label: "1024*768 (4:3)", value: "1024*768" },
  { label: "1664*928 (16:9)", value: "1664*928" },
  { label: "928*1664 (9:16)", value: "928*1664" },
];

const queryParams = reactive({
  page: 1,
  pageSize: 20,
  search: "",
  size: "",
});

const { height } = useWindowSize();
const gridOptions = reactive({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  checkboxConfig: {
    reserve: true,
  },
  columns: [
    { type: "checkbox", width: 45 },
    { type: "seq", title: "#", width: 50 },
    { title: "成品图", field: "url", width: 100, slots: { default: "imageSlot" } },
    { title: "提示词", field: "prompt", minWidth: 240, slots: { default: "promptSlot" } },
    {
      title: "配置参数",
      field: "configParams",
      width: 180,
      slots: { default: "configParamsSlot" },
    },
    { title: "状态", field: "status", width: 100, slots: { default: "statusSlot" } },
    {
      title: "创建时间",
      field: "createTime",
      width: 160,
      formatter: ({ cellValue }: any) => (cellValue ? formatTimestamp(cellValue) : "-"),
    },
    buildOperationColumn("operationSlot"),
  ] as any[],
});

watchEffect(() => {
  gridOptions.maxHeight = Math.max(height.value - 280, 360);
});

const extractSubmitErrorMessage = (error: any) => {
  return String(
    error?.message || error?.response?.data?.message || error?.data?.message || error || "提交失败",
  ).trim();
};

const getList = async () => {
  loading.value = true;
  try {
    const res = await getTtiRecordPage(queryParams);
    dataSource.value = res.list || [];
    total.value = res.total || 0;
    selectedIds.value = [];
  } catch (error) {
    console.error("加载记录失败:", error);
    ElMessage.error({ message: "加载失败", duration: 4000 });
  } finally {
    loading.value = false;
  }
};

const resetQuery = () => {
  queryParams.page = 1;
  queryParams.search = "";
  queryParams.size = "";
  getList();
};

const checkboxChange = (event: any) => {
  selectedIds.value = event.records.map((row: any) => row.id);
};

const checkboxAllChange = (event: any) => {
  selectedIds.value = event.records.map((row: any) => row.id);
};

const handleAdd = () => {
  dialogVisible.value = true;
};

const handleSpecFormSubmit = async (payload: any) => {
  submitLoading.value = true;
  try {
    const record: any = await createTtiRecord(payload);
    await getList();
    if (record?.status === "failed") {
      ElMessage.error({ message: getErrorMessage(record), duration: 4000 });
      return;
    }
    ElMessage.success({ message: "任务提交成功", duration: 3000 });
    dialogVisible.value = false;
  } catch (error) {
    ElMessage.error({ message: extractSubmitErrorMessage(error), duration: 4000 });
  } finally {
    submitLoading.value = false;
  }
};

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm("确定要删除这条记录吗？", "提示", {
      type: "warning",
      confirmButtonText: "确定",
      cancelButtonText: "取消",
    });
    deleteLoading.value = true;
    await deleteTtiRecord(row.id);
    ElMessage.success({ message: "删除成功", duration: 3000 });
    await getList();
  } catch {
  } finally {
    deleteLoading.value = false;
  }
};

const handleBatchDelete = async () => {
  if (!selectedIds.value.length) {
    ElMessage.warning({ message: "请选择要删除的记录", duration: 3000 });
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${selectedIds.value.length} 条记录吗？`,
      "批量删除",
      {
        type: "warning",
        confirmButtonText: "确定",
        cancelButtonText: "取消",
      },
    );
    deleteLoading.value = true;
    await batchDeleteTtiRecord(selectedIds.value);
    ElMessage.success({ message: "批量删除完成", duration: 3000 });
    await getList();
  } catch {
  } finally {
    deleteLoading.value = false;
  }
};

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    success: "success",
    failed: "danger",
    processing: "warning",
    pending: "info",
  };
  return map[status] || "info";
};

const formatStatus = (status: string) => {
  const map: Record<string, string> = {
    success: "已生成",
    failed: "失败",
    processing: "生成中",
    pending: "排队中",
  };
  return map[status] || status;
};

const getErrorMessage = (row: any) => {
  const responseMessage =
    row?.responseData?.message ||
    row?.responseData?.error ||
    row?.responseData?.details?.message ||
    row?.responseData?.details?.error?.message ||
    "";
  return String(row?.errorMessage || responseMessage || "生成失败，暂无具体原因").trim();
};

const showErrorDetail = (row: any) => {
  const message = getErrorMessage(row);
  const details = row?.responseData ? JSON.stringify(row.responseData, null, 2) : "";
  ElMessageBox.alert(details ? `${message}\n\n${details}` : message, "失败原因", {
    confirmButtonText: "知道了",
    customClass: "tti-error-dialog",
  });
};

onMounted(() => {
  getList();
});
</script>

<style scoped>
:deep(.tti-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.tti-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.tti-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.tti-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}

.tti-error-text {
  font-size: 12px;
  color: var(--el-color-danger);
  cursor: help;
}

:global(.tti-error-dialog .el-message-box__message) {
  word-break: break-word;
  white-space: pre-wrap;
}

.tti-dialog-header {
  border-color: var(--el-border-color-light, #e4e7ed);
}

:global(html.dark) .tti-dialog-header {
  border-color: var(--el-border-color-lighter, #363637);
}

.tti-dialog-title {
  color: var(--el-text-color-primary, #303133);
}

.tti-dialog-subtitle {
  color: var(--el-text-color-secondary, #909399);
}

.tti-dialog-label {
  color: var(--el-text-color-regular, #606266);
}

.tti-spec-select {
  width: 260px;
}

.tti-spec-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  padding: 2px 6px;
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
}

.tti-model-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  padding: 2px 6px;
  background-color: var(--el-fill-color, #f0f2f5);
  color: var(--el-text-color-regular, #606266);
}

.tti-param-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  padding: 2px 6px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  background-color: var(--el-fill-color-light, #fafafa);
  color: var(--el-text-color-secondary, #909399);
}

:global(html.dark) .tti-param-badge {
  background-color: var(--el-fill-color, #262727);
  border-color: var(--el-border-color-lighter, #363637);
  color: var(--el-text-color-secondary, #a8abb2);
}
</style>
