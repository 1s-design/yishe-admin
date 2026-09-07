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
                      v-if="row.configParams.size"
                      class="inline-flex items-center rounded px-2 py-1"
                    >
                      <i class="mdi mdi-aspect-ratio mr-1"></i>{{ row.configParams.size }}
                    </span>
                    <span
                      v-if="row.configParams.style"
                      class="inline-flex items-center rounded px-2 py-1"
                    >
                      {{ currentStyleLabelMap[row.configParams.style] || row.configParams.style }}
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
        <div class="py-2">
          <div>
            <div class="text-lg font-semibold">AI 文字生图</div>
            <div class="mt-1 text-sm">选择提示词模板或手动输入，完成参数配置后直接提交生成</div>
          </div>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="flex h-[calc(100vh-180px)] gap-4 overflow-y-auto py-4">
          <div class="flex min-w-0 flex-1 flex-col gap-4">
            <div class="rounded-lg border p-4">
              <div class="mb-4 text-base font-medium">提示词来源</div>
              <el-radio-group v-model="promptMode">
                <el-radio label="manual">手动输入</el-radio>
                <el-radio label="template">AI 提示词模块</el-radio>
              </el-radio-group>
              <div v-if="promptMode === 'template'" class="mt-4">
                <div class="flex flex-wrap items-end gap-3">
                  <el-select
                    v-model="selectedPromptId"
                    clearable
                    filterable
                    placeholder="请选择提示词模板"
                    :loading="promptLoading"
                    class="min-w-[360px]"
                    @visible-change="handlePromptDropdownVisible"
                    @change="handlePromptChange"
                  >
                    <el-option
                      v-for="item in promptOptions"
                      :key="item.id"
                      :label="item.title"
                      :value="item.id"
                    />
                  </el-select>
                </div>
                <div v-if="selectedPromptContent" class="mt-4 rounded-lg border p-4">
                  <div class="mb-2 text-sm font-medium">模板内容预览</div>
                  <div class="max-h-40 overflow-auto whitespace-pre-wrap text-sm leading-6">
                    {{ selectedPromptContent }}
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-lg border p-4">
              <el-form-item label="画面提示词" prop="prompt" class="mb-4">
                <el-input
                  v-model="form.prompt"
                  type="textarea"
                  resize="none"
                  :rows="18"
                  placeholder="请输入图片描述，支持在模板基础上继续微调"
                />
              </el-form-item>
              <el-form-item label="负向提示词" prop="negativePrompt" class="mb-0">
                <el-input
                  v-model="form.negativePrompt"
                  type="textarea"
                  :rows="8"
                  resize="none"
                  placeholder="可选，不需要可留空"
                />
              </el-form-item>
            </div>
          </div>

          <div class="flex w-[360px] flex-shrink-0 flex-col gap-4">
            <div class="rounded-lg border p-4">
              <div class="mb-4 text-base font-medium">生成参数</div>
              <el-form-item label="图片尺寸" prop="size">
                <el-select v-model="form.size" class="w-full">
                  <el-option
                    v-for="item in sizeOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="风格" prop="style">
                <el-select v-model="form.style" class="w-full" clearable placeholder="默认">
                  <el-option label="通用" value="" />
                  <el-option label="写实" value="photography" />
                  <el-option label="插画" value="illustration" />
                  <el-option label="二次元" value="anime" />
                </el-select>
              </el-form-item>
              <el-form-item label="生成数量" prop="n" class="mb-0">
                <el-input-number v-model="form.n" :min="1" :max="4" class="w-full" />
              </el-form-item>
            </div>

            <div class="rounded-lg border p-4">
              <div class="mb-3 text-base font-medium">使用建议</div>
              <div class="space-y-2 text-sm leading-6">
                <div>主体、材质、光线、构图和风格描述越明确，结果越稳定。</div>
                <div>选择模板后可以继续在左侧输入框里修改，适合快速微调。</div>
                <div>如果生成结果杂乱，优先补充负向提示词。</div>
              </div>
            </div>
          </div>
        </div>
      </el-form>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :icon="MagicStick" :loading="submitLoading" @click="submitForm">
            立即生成
          </el-button>
        </div>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watchEffect, computed, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Search, Refresh, Delete, Loading, MagicStick } from "@element-plus/icons-vue";
import {
  getTtiRecordPage,
  createTtiRecord,
  deleteTtiRecord,
  batchDeleteTtiRecord,
} from "@/api/ai/tti";
import { getPromptList } from "@/api/prompt";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import { useWindowSize } from "@vueuse/core";
import Pagination from "@/components/Pagination/index.vue";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import { formatTimestamp } from "@/common/date";

const sizeOptions = [
  { label: "正方形 1024 x 1024", value: "1024*1024" },
  { label: "竖图 768 x 1024", value: "768*1024" },
  { label: "横图 1024 x 768", value: "1024*768" },
  { label: "横屏 1664 x 928", value: "1664*928" },
  { label: "竖屏 928 x 1664", value: "928*1664" },
];

const currentStyleLabelMap: Record<string, string> = {
  "": "通用",
  photography: "写实",
  illustration: "插画",
  anime: "二次元",
};

const loading = ref(false);
const submitLoading = ref(false);
const deleteLoading = ref(false);
const dialogVisible = ref(false);
const total = ref(0);
const dataSource = ref<any[]>([]);
const formRef = ref();
const selectedIds = ref<string[]>([]);
const promptMode = ref<"manual" | "template">("manual");
const selectedPromptId = ref<number | null>(null);
const promptLoading = ref(false);
const promptOptions = ref<any[]>([]);

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

const form = reactive({
  prompt: "",
  negativePrompt: "",
  size: "1024*1024",
  n: 1,
  style: "",
});

const rules = {
  prompt: [{ required: true, message: "提示词不能为空", trigger: "blur" }],
};

const selectedPrompt = computed(() => {
  return (
    promptOptions.value.find((item: any) => Number(item.id) === Number(selectedPromptId.value)) ||
    null
  );
});

const selectedPromptContent = computed(() => {
  return selectedPrompt.value?.content ? String(selectedPrompt.value.content).trim() : "";
});

const resolvedPrompt = computed(() => form.prompt.trim());

const extractSubmitErrorMessage = (error: any) => {
  return String(
    error?.message || error?.response?.data?.message || error?.data?.message || error || "提交失败",
  ).trim();
};

watch(promptMode, (mode) => {
  if (mode === "template") {
    loadPromptOptions();
    form.prompt = selectedPromptContent.value;
    return;
  }
  selectedPromptId.value = null;
  form.prompt = "";
});

watch(selectedPromptContent, (value) => {
  if (promptMode.value === "template") {
    form.prompt = value;
  }
});

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
  Object.assign(form, {
    prompt: "",
    negativePrompt: "",
    size: "1024*1024",
    n: 1,
    style: "",
  });
  promptMode.value = "manual";
  selectedPromptId.value = null;
  dialogVisible.value = true;
};

const submitForm = async () => {
  await formRef.value.validate();
  submitLoading.value = true;
  try {
    const record: any = await createTtiRecord({
      prompt: resolvedPrompt.value,
      negativePrompt: form.negativePrompt || undefined,
      size: form.size,
      n: form.n,
      style: form.style || undefined,
    });
    await getList();
    if (record?.status === "failed") {
      ElMessage.error({ message: getErrorMessage(record), duration: 4000 });
      return;
    }
    ElMessage.success({ message: "提交成功", duration: 3000 });
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

const loadPromptOptions = async () => {
  if (promptLoading.value) return;
  promptLoading.value = true;
  try {
    const res = await getPromptList({
      currentPage: 1,
      pageSize: 100,
    });
    promptOptions.value = Array.isArray((res as any)?.list) ? res.list : [];
  } catch (error) {
    console.error("加载提示词模板失败:", error);
    ElMessage.error({ message: "加载提示词模板失败", duration: 4000 });
  } finally {
    promptLoading.value = false;
  }
};

const handlePromptDropdownVisible = (visible: boolean) => {
  if (visible) {
    loadPromptOptions();
  }
};

const handlePromptChange = () => {
  if (promptMode.value === "template") {
    form.prompt = selectedPromptContent.value;
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
</style>
