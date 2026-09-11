<script setup lang="ts">
import { ref, reactive, onMounted, computed, watchEffect, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { useUserStore } from "@/store/modules/user";
import {
  getPublishConfigPageApi,
  createPublishConfigApi,
  updatePublishConfigApi,
  deletePublishConfigApi,
} from "@/api/product/publishConfig";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import { formatTime } from "@/utils";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import { useWindowSize } from "@vueuse/core";
import {
  getTaskTypeConfig,
  getTaskTypeDefaultData,
  resolveTaskTypePlatform,
  type TaskTypeConfig,
} from "./task-types";
import {
  validateTaskTypeConfig,
  formatTaskTypeConfigForSubmit,
  formatTaskTypeConfigForEdit,
  executeTaskTypeBeforeSubmit,
} from "./task-types";
import { getVendorList, getVendorProductsByVendor, type Vendor, type VendorProductItem } from "@/api/vendor";
import { derivePublishTaskTypeByPlatform, getTaskTypeLabel } from "@/config/task-types";
import {
  publishTaskTypeOptions,
  refreshPublishTaskTypeOptions,
} from "@/services/publishTaskCapabilityOptions";
import { psdTemplateApi } from "@/api/psdTemplate";
import { getPromptList } from "@/api/prompt";
import TemuProductTemplateInspector from "./components/platform-inspectors/TemuProductTemplateInspector.vue";
import { useI18n } from "@/hooks/web/useI18n";

const { t } = useI18n();
const userStore = useUserStore();
const loading = ref(false);
const deleteLoading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const selectedIds = ref<(string | number)[]>([]);

const queryParams = reactive({
  page: 1,
  pageSize: 20,
  keyword: "",
  taskType: "",
  isActive: "" as "" | boolean,
  sortType: "" as "" | "createTime_DESC" | "createTime_ASC" | "updateTime_DESC" | "updateTime_ASC",
});

const { height } = useWindowSize();
const gridMaxHeight = ref<number>(0);

watchEffect(() => {
  gridMaxHeight.value = Math.max(height.value - 280, 360);
});

const gridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: gridMaxHeight.value,
  rowConfig: { keyField: "id" },
  rowClassName: ({ row }: any) => (row?.isActive === false ? "publish-config-row--disabled" : ""),
  sortConfig: {
    trigger: "cell" as const,
    orders: ["ascending" as const, "descending" as const, null],
    showIcon: true,
    remote: true,
  },
  columns: [
    { type: "checkbox", width: 48, fixed: "left" as const },
    { field: "name", title: t("publishConfig.configName"), minWidth: 170, slots: { default: "nameSlot" } },
    {
      field: "taskType",
      title: t("publishConfig.taskType"),
      minWidth: 160,
      slots: { default: "taskTypeSlot" },
    },
    { field: "vendor", title: "关联厂家/商品", minWidth: 220, slots: { default: "vendorSlot" } },
    { field: "templateBinding", title: "关联主图模板", minWidth: 150, slots: { default: "templateSlot" } },
    { field: "description", title: t("common.description"), minWidth: 160, showOverflow: "tooltip" },
    {
      field: "isActive",
      title: t("common.status"),
      width: 95,
      slots: { default: "statusSlot" },
    },
    {
      field: "uploader",
      title: t("publishConfig.creator"),
      width: 120,
      slots: { default: "uploaderSlot" },
    },
    {
      field: "createTime",
      title: t("common.createTime"),
      width: 150,
      sortable: true,
      slots: { default: "createTimeSlot" },
    },
    {
      field: "updateTime",
      title: t("common.updateTime"),
      width: 150,
      sortable: true,
      slots: { default: "updateTimeSlot" },
    },
    buildOperationColumn("action"),
  ],
}));

const getPlatformBadgeStyle = (platform?: string) => {
  const p = String(platform || "").toLowerCase();
  if (p.includes("douyin") || p.includes("doudian")) {
    return { bg: "rgba(254, 44, 85, 0.12)", color: "#fe2c55", border: "rgba(254, 44, 85, 0.3)" };
  }
  if (p.includes("temu")) {
    return { bg: "rgba(251, 119, 1, 0.12)", color: "#fb7701", border: "rgba(251, 119, 1, 0.3)" };
  }
  if (p.includes("xhs") || p.includes("xiaohongshu")) {
    return { bg: "rgba(255, 36, 66, 0.12)", color: "#ff2442", border: "rgba(255, 36, 66, 0.3)" };
  }
  if (p.includes("wechat") || p.includes("shipinhao")) {
    return { bg: "rgba(7, 193, 96, 0.12)", color: "#07c160", border: "rgba(7, 193, 96, 0.3)" };
  }
  if (p.includes("taobao") || p.includes("tmall")) {
    return { bg: "rgba(255, 80, 0, 0.12)", color: "#ff5000", border: "rgba(255, 80, 0, 0.3)" };
  }
  if (p.includes("kuaishou")) {
    return { bg: "rgba(255, 54, 0, 0.12)", color: "#ff3600", border: "rgba(255, 54, 0, 0.3)" };
  }
  return { bg: "var(--el-fill-color-light)", color: "var(--el-color-primary)", border: "var(--el-color-primary-light-5)" };
};

const handleToggleActive = async (row: any) => {
  const nextStatus = !row.isActive;
  const actionText = nextStatus ? t("publishConfig.enabled") : t("publishConfig.disabled");
  try {
    await updatePublishConfigApi(row.id, {
      ...row,
      isActive: nextStatus,
    });
    row.isActive = nextStatus;
    ElMessage.success(`${actionText}成功`);
  } catch (err: any) {
    ElMessage.error(err?.message || "切换状态失败");
  }
};

const normalizePublishConfigListResponse = (res: any) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.list)) return res.list;
  if (Array.isArray(res?.data?.list)) return res.data.list;
  return [];
};

const sortType = ref<"" | "createTime_DESC" | "createTime_ASC" | "updateTime_DESC" | "updateTime_ASC">("");

watchEffect(() => {
  sortType.value = queryParams.sortType || "";
});

const handleSortTypeChange = (val: "" | "createTime_DESC" | "createTime_ASC" | "updateTime_DESC" | "updateTime_ASC") => {
  queryParams.sortType = val || "";
  queryParams.page = 1;
  getList();
};

const handleSortChange = (sortInfo: any) => {
  const field = sortInfo?.field;
  const order = sortInfo?.order;
  if (field === "createTime" || field === "updateTime") {
    const suffix = order === "ascending" ? "ASC" : "DESC";
    queryParams.sortType = `${field}_${suffix}`;
  } else {
    queryParams.sortType = "";
  }
  sortType.value = queryParams.sortType;
  queryParams.page = 1;
  getList();
};

const getList = async () => {
  loading.value = true;
  try {
    const [sortField, sortOrder] = queryParams.sortType
      ? (queryParams.sortType.split("_") as [string, "ASC" | "DESC"])
      : [undefined, undefined];
    const res: any = await getPublishConfigPageApi({
      pageNo: queryParams.page,
      pageSize: queryParams.pageSize,
      searchKeyword: queryParams.keyword.trim() || undefined,
      taskType: queryParams.taskType || undefined,
      isActive: queryParams.isActive === "" ? undefined : queryParams.isActive,
      sortField: sortField as "createTime" | "updateTime" | undefined,
      sortOrder,
    });
    const payload = res?.data && !Array.isArray(res.data) ? res.data : res;
    tableData.value = Array.isArray(payload?.list)
      ? payload.list
      : normalizePublishConfigListResponse(payload);
    total.value = Number(payload?.total ?? tableData.value.length);
    selectedIds.value = [];
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const loadVendorOptions = async () => {
  try {
    const res = await getVendorList();
    const list = Array.isArray(res)
      ? res
      : Array.isArray((res as any)?.list)
        ? (res as any).list
        : [];
    vendorRows.value = list;
    vendorOptions.value = list
      .map((item: Vendor) => ({
        label: `${item.name}${item.code ? ` (${item.code})` : ""}`,
        value: Number(item.id),
      }))
      .filter((item) => Number.isFinite(item.value));
  } catch (err) {
    console.error(err);
    vendorRows.value = [];
    vendorOptions.value = [];
  }
};

const handleSearch = () => {
  queryParams.page = 1;
  getList();
};

const resetQuery = () => {
  queryParams.keyword = "";
  queryParams.taskType = "";
  queryParams.isActive = "";
  queryParams.sortType = "";
  handleSearch();
};

const handleRefresh = () => {
  queryParams.page = 1;
  getList();
};

const handlePagination = () => {
  getList();
};

const handleSelectionChange = (e: any) => {
  selectedIds.value = (e?.records || []).map((item: any) => item.id);
};

const handleBatchDelete = () => {
  if (!userStore.user?.isAdmin) {
    return ElMessage.warning(t("publishConfig.noPermissionDelete"));
  }
  if (!selectedIds.value.length) {
    ElMessage.warning(t("publishConfig.selectDeleteTarget"));
    return;
  }

  ElMessageBox.confirm(
    t("publishConfig.batchDeleteConfirm", { count: selectedIds.value.length }),
    t("common.batchDelete"),
    {
      confirmButtonText: t("common.confirm"),
      cancelButtonText: t("common.cancel"),
      type: "warning",
    },
  ).then(async () => {
    try {
      deleteLoading.value = true;
      // 并发删除所有选中的配置
      await Promise.all(selectedIds.value.map((id) => deletePublishConfigApi(String(id))));
      ElMessage.success(t("publishConfig.batchDeleteSuccess", { count: selectedIds.value.length }));
      selectedIds.value = [];
      await getList();
    } catch (err) {
      console.error(err);
      ElMessage.error(t("publishConfig.batchDeleteFailed"));
    } finally {
      deleteLoading.value = false;
    }
  });
};

// Dialog
const dialogVisible = ref(false);
const temuTemplateInspectorVisible = ref(false);
const dialogTitle = ref("");
const formRef = ref();
const submitLoading = ref(false);
const templateBindingHydrating = ref(false);
const selectedTemplateBinding = ref<any | null>(null);
const templateBindingConfigText = ref("");
const templateBindingDialogVisible = ref(false);
const templateBindingDialogLoading = ref(false);
const templateBindingDialogSearchText = ref("");
const templateBindingDialogPage = ref(1);
const templateBindingDialogPageSize = ref(12);
const templateBindingDialogTotal = ref(0);
const templateBindingDialogRows = ref<any[]>([]);
const templateBindingDialogTableHeight = computed(() => Math.max(420, height.value - 188));
const titlePromptDialogVisible = ref(false);
const titlePromptDialogLoading = ref(false);
const titlePromptDialogSearchText = ref("");
const titlePromptDialogPage = ref(1);
const titlePromptDialogPageSize = ref(10);
const titlePromptDialogTotal = ref(0);
const titlePromptDialogRows = ref<any[]>([]);
const titlePromptDialogTableHeight = computed(() => Math.max(360, Math.min(720, height.value - 300)));

// 动态平台配置
const currentPlatformConfig = ref<TaskTypeConfig | null>(null);
const platformConfigData = ref<Record<string, any>>({});
const vendorRows = ref<Vendor[]>([]);
const vendorOptions = ref<Array<{ label: string; value: number }>>([]);
const fixedTitleSupportedPlatforms = new Set(["doudian", "kuaishou_shop", "temu", "taobao", "pdd"]);

const form = reactive({
  id: undefined,
  name: "",
  taskType: "",
  description: "",
  isActive: true,
});

const currentTemplateBindingId = computed(() =>
  String(selectedTemplateBinding.value?.id || "").trim(),
);

const templateBindingDefaultConfigText = computed(() =>
  formatTemplateBindingConfig(selectedTemplateBinding.value?.psdTemplateConfig),
);

// 检查器编辑的是模板原文，这里直接把树编辑结果回写到 platformConfigData.productTemplate。
const temuProductTemplateValue = computed({
  get: () => String(platformConfigData.value?.productTemplate || ""),
  set: (value: string) => {
    platformConfigData.value = {
      ...(platformConfigData.value || {}),
      productTemplate: value,
    };
  },
});

const titleConfigForm = reactive({
  mode: "ai" as "ai" | "fixed",
  fixedTitle: "",
  templateContent: "",
  maxLength: undefined as number | undefined,
  style: "",
  tone: "",
  includeEmoji: null as boolean | null,
  requiredKeywords: [] as string[],
  avoidWords: [] as string[],
});

const supportsFixedTitle = computed(() =>
  fixedTitleSupportedPlatforms.has(resolveTaskTypePlatform(form.taskType)),
);

const isFixedTitleMode = computed(
  () => supportsFixedTitle.value && titleConfigForm.mode === "fixed",
);

const titleConfigPanelTitle = computed(() =>
  supportsFixedTitle.value ? t("publishConfig.titleConfig") : t("publishConfig.aiTitleConfig"),
);

const titleConfigPanelDesc = computed(() => {
  if (!supportsFixedTitle.value) {
    return t("publishConfig.titleConfigDesc");
  }
  return isFixedTitleMode.value ? t("publishConfig.fixedTitlePriority") : t("publishConfig.switchToAiTitle");
});

const appendImageUrlValidation = computed(() => {
  if (!["doudian", "taobao"].includes(resolveTaskTypePlatform(form.taskType))) {
    return {
      hasError: false,
      invalidUrls: [] as Array<{ index: number; value: string }>,
    };
  }

  const rawValue = platformConfigData.value?.appendImageUrls;
  const lines = Array.isArray(rawValue)
    ? rawValue
    : typeof rawValue === "string"
      ? rawValue.split(/\r?\n/)
      : [];

  const invalidUrls = lines
    .map((item: any, index: number) => ({
      index,
      value: String(item || "").trim(),
    }))
    .filter((item) => item.value)
    .filter((item) => !/^https?:\/\//i.test(item.value));

  return {
    hasError: invalidUrls.length > 0,
    invalidUrls,
  };
});

const platformImageLimitTip = computed(() => {
  const platform = resolveTaskTypePlatform(form.taskType);

  if (platform === "doudian") {
    return t("publishConfig.doudianImageLimit");
  }

  if (platform === "kuaishou_shop") {
    return t("publishConfig.kuaishouImageLimit");
  }

  return "";
});

const selectedVendor = computed(() => {
  const vendorId = Number(platformConfigData.value?.vendorId);
  if (!Number.isFinite(vendorId)) return null;
  return vendorRows.value.find((item) => Number(item.id) === vendorId) || null;
});

// 厂家商品实时查询（选厂家后加载）
const vendorProductsList = ref<VendorProductItem[]>([]);
const vendorProductsLoading = ref(false);

async function loadVendorProducts(vendorId: number) {
  if (!Number.isFinite(vendorId) || vendorId <= 0) {
    vendorProductsList.value = [];
    return;
  }
  vendorProductsLoading.value = true;
  try {
    const res = await getVendorProductsByVendor(vendorId);
    const list = Array.isArray(res) ? res : Array.isArray((res as any)?.list) ? (res as any).list : [];
    vendorProductsList.value = list;
  } catch (err) {
    console.error("加载厂家商品失败:", err);
    vendorProductsList.value = [];
  } finally {
    vendorProductsLoading.value = false;
  }
}

const selectedVendorProducts = computed<VendorProductItem[]>(() =>
  vendorProductsList.value.length > 0
    ? vendorProductsList.value
    : Array.isArray(selectedVendor.value?.products)
      ? selectedVendor.value.products || []
      : [],
);

const vendorProductOptions = computed(() =>
  selectedVendorProducts.value
    .map((item) => ({
      label: [item.code || "-", item.name, item.model, item.productSize || item.size]
        .map((part) => String(part || "").trim())
        .filter(Boolean)
        .join(" / "),
      value: Number(item.id),
      product: item,
    }))
    .filter((item) => Number.isFinite(item.value)),
);

const temuFirstSkcSkuCount = computed(() => {
  const template = parseTemuTemplateForUi(platformConfigData.value?.productTemplate);
  const firstSkc = Array.isArray(template?.productSkcReqs) ? template.productSkcReqs[0] : null;
  return Array.isArray(firstSkc?.productSkuReqs) ? firstSkc.productSkuReqs.length : 0;
});

function parseTemuTemplateForUi(value: any) {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return Function(`"use strict"; return (${raw});`)();
    } catch {
      return null;
    }
  }
}

function ensureVendorProductMappings() {
  if (!Array.isArray(platformConfigData.value.vendorProductMappings)) {
    platformConfigData.value.vendorProductMappings = [];
  }
}

function buildVendorProductSnapshot(product?: VendorProductItem | null, sort = 1) {
  return {
    vendorProductId: product?.id ? Number(product.id) : undefined,
    code: String(product?.code || "").trim(),
    name: String(product?.name || "").trim(),
    model: String(product?.model || "").trim(),
    size: String(product?.size || "").trim(),
    productSize: String(product?.productSize || "").trim(),
    packageSize: String(product?.packageSize || "").trim(),
    sort,
  };
}

function refreshVendorSnapshot() {
  const vendor = selectedVendor.value;
  platformConfigData.value.vendorCode = String(vendor?.code || "").trim();
  platformConfigData.value.vendorName = String(vendor?.name || "").trim();
}

function normalizeVendorProductMappingSort() {
  ensureVendorProductMappings();
  platformConfigData.value.vendorProductMappings = platformConfigData.value.vendorProductMappings.map(
    (item: any, index: number) => ({
      ...item,
      sort: index + 1,
    }),
  );
}

function addVendorProductMapping() {
  ensureVendorProductMappings();
  const usedIds = new Set(
    platformConfigData.value.vendorProductMappings
      .map((item: any) => Number(item?.vendorProductId))
      .filter((id: number) => Number.isFinite(id)),
  );
  const nextProduct =
    vendorProductOptions.value.find((item) => !usedIds.has(item.value))?.product ||
    vendorProductOptions.value[0]?.product ||
    null;
  platformConfigData.value.vendorProductMappings.push(
    buildVendorProductSnapshot(nextProduct, platformConfigData.value.vendorProductMappings.length + 1),
  );
}

function removeVendorProductMapping(index: number) {
  ensureVendorProductMappings();
  platformConfigData.value.vendorProductMappings.splice(index, 1);
  normalizeVendorProductMappingSort();
}

function moveVendorProductMapping(index: number, direction: -1 | 1) {
  ensureVendorProductMappings();
  const list = platformConfigData.value.vendorProductMappings;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= list.length) return;
  const [item] = list.splice(index, 1);
  list.splice(nextIndex, 0, item);
  normalizeVendorProductMappingSort();
}

function handleVendorProductChange(index: number, vendorProductId: number) {
  ensureVendorProductMappings();
  const product = selectedVendorProducts.value.find(
    (item) => Number(item.id) === Number(vendorProductId),
  );
  platformConfigData.value.vendorProductMappings[index] = buildVendorProductSnapshot(
    product,
    index + 1,
  );
}

function applyVendorSnapshotBeforeSubmit() {
  refreshVendorSnapshot();
  ensureVendorProductMappings();
  platformConfigData.value.vendorProductMappings = platformConfigData.value.vendorProductMappings
    .map((item: any, index: number) => {
      const product = selectedVendorProducts.value.find(
        (candidate) => Number(candidate.id) === Number(item?.vendorProductId),
      );
      return product
        ? buildVendorProductSnapshot(product, index + 1)
        : {
            ...item,
            code: String(item?.code || "").trim(),
            sort: index + 1,
          };
    })
    .filter((item: any) => item.vendorProductId !== undefined || item.code || item.name || item.model);
}

function normalizePublishConfigData(taskType: string, value: Record<string, any> = {}) {
  const normalized = {
    ...getTaskTypeDefaultData(taskType),
    ...(value || {}),
  };

  const platformConfig = getTaskTypeConfig(taskType);
  if (platformConfig?.fields?.length) {
    platformConfig.fields.forEach((field) => {
      const currentValue = normalized[field.key];
      if (
        field.defaultValue !== undefined &&
        (currentValue === undefined || currentValue === null || currentValue === "")
      ) {
        normalized[field.key] = Array.isArray(field.defaultValue)
          ? [...field.defaultValue]
          : typeof field.defaultValue === "object" && field.defaultValue !== null
            ? JSON.parse(JSON.stringify(field.defaultValue))
            : field.defaultValue;
      }

      if (field.type === "url-list" && !Array.isArray(normalized[field.key])) {
        normalized[field.key] = normalized[field.key] ? [String(normalized[field.key])] : [];
      }
    });
  }

  return normalized;
}

function ensureUrlListField(fieldKey: string) {
  const currentValue = platformConfigData.value?.[fieldKey];
  if (!Array.isArray(currentValue)) {
    platformConfigData.value[fieldKey] = currentValue ? [String(currentValue)] : [];
  }
}

async function loadTitlePromptDialogPrompts() {
  titlePromptDialogLoading.value = true;
  try {
    const res: any = await getPromptList({
      currentPage: titlePromptDialogPage.value,
      pageSize: titlePromptDialogPageSize.value,
      search: titlePromptDialogSearchText.value.trim() || undefined,
    });
    const payload = res?.data && !Array.isArray(res.data) ? res.data : res;
    const list = Array.isArray(payload) ? payload : Array.isArray(payload?.list) ? payload.list : [];
    titlePromptDialogRows.value = list;
    titlePromptDialogTotal.value = Number(payload?.total ?? list.length);
  } catch (error) {
    console.error("加载标题提示词失败:", error);
    ElMessage.error(t("publishConfig.loadTitlePromptFailed"));
  } finally {
    titlePromptDialogLoading.value = false;
  }
}

function openTitlePromptDialog() {
  titlePromptDialogPage.value = 1;
  titlePromptDialogVisible.value = true;
  void loadTitlePromptDialogPrompts();
}

function handleTitlePromptDialogSearch() {
  titlePromptDialogPage.value = 1;
  void loadTitlePromptDialogPrompts();
}

function resetTitlePromptDialogSearch() {
  titlePromptDialogSearchText.value = "";
  titlePromptDialogPage.value = 1;
  void loadTitlePromptDialogPrompts();
}

function handleTitlePromptDialogPageChange(page: number) {
  titlePromptDialogPage.value = page;
  void loadTitlePromptDialogPrompts();
}

function handleTitlePromptDialogSizeChange(size: number) {
  titlePromptDialogPageSize.value = size;
  titlePromptDialogPage.value = 1;
  void loadTitlePromptDialogPrompts();
}

function selectTitlePrompt(prompt: any) {
  const content = String(prompt?.content || "").trim();
  if (!content) {
    ElMessage.warning(t("publishConfig.promptEmpty"));
    return;
  }
  titleConfigForm.templateContent = content;
  titlePromptDialogVisible.value = false;
  ElMessage.success(t("publishConfig.promptFilled"));
}

function resetTitlePromptDialogState() {
  titlePromptDialogVisible.value = false;
  titlePromptDialogSearchText.value = "";
  titlePromptDialogPage.value = 1;
  titlePromptDialogRows.value = [];
  titlePromptDialogTotal.value = 0;
}

function getAppendImageMaxLimit(fieldKey: string) {
  if (fieldKey !== "appendImageUrls") return Infinity;
  const platform = resolveTaskTypePlatform(form.taskType);
  return platform === "doudian" ? 5 : 9;
}

function isAppendImageLimitReached(fieldKey: string) {
  if (fieldKey !== "appendImageUrls") return false;
  const maxLimit = getAppendImageMaxLimit(fieldKey);
  const currentCount = Array.isArray(platformConfigData.value?.[fieldKey])
    ? platformConfigData.value[fieldKey].length
    : 0;
  return currentCount >= maxLimit;
}

function addUrlListItem(fieldKey: string) {
  ensureUrlListField(fieldKey);
  if (isAppendImageLimitReached(fieldKey)) {
    const maxLimit = getAppendImageMaxLimit(fieldKey);
    ElMessage.warning(`最多添加 ${maxLimit} 张附加图片`);
    return;
  }
  platformConfigData.value[fieldKey].push("");
}

function removeUrlListItem(fieldKey: string, index: number) {
  ensureUrlListField(fieldKey);
  const nextList = [...platformConfigData.value[fieldKey]];
  nextList.splice(index, 1);
  platformConfigData.value[fieldKey] = nextList;
}

function getUrlListItemError(fieldKey: string, index: number) {
  if (fieldKey !== "appendImageUrls") {
    return "";
  }
  const invalidItem = appendImageUrlValidation.value.invalidUrls.find(
    (item) => item.index === index,
  );
  return invalidItem ? t("publishConfig.onlyHttpUrl") : "";
}

function onImagePreviewError(event: Event, fieldKey: string, index: number) {
  const img = event.target as HTMLImageElement;
  img.style.display = "none";
}

function isTemuProductTemplateField(field: { key?: string; type?: string }) {
  return (
    resolveTaskTypePlatform(form.taskType) === "temu" &&
    String(field?.key || "").trim() === "productTemplate" &&
    field?.type === "textarea"
  );
}

function openTemuTemplateInspector() {
  temuTemplateInspectorVisible.value = true;
}

// 监听任务类型变化，更新配置字段
watch(
  () => form.taskType,
  (newTaskType) => {
    if (newTaskType) {
      currentPlatformConfig.value = getTaskTypeConfig(newTaskType);
      platformConfigData.value = normalizePublishConfigData(newTaskType, platformConfigData.value);
    } else {
      currentPlatformConfig.value = null;
      platformConfigData.value = {};
    }
  },
  { immediate: true },
);

watch(dialogVisible, (value) => {
  if (!value) {
    temuTemplateInspectorVisible.value = false;
    titlePromptDialogVisible.value = false;
  }
});

watch(
  () => platformConfigData.value?.vendorId,
  (vendorId, previousVendorId) => {
    refreshVendorSnapshot();
    if (previousVendorId !== undefined && vendorId !== previousVendorId) {
      platformConfigData.value.vendorProductMappings = [];
    }
    // 实时加载厂家商品
    const numericVendorId = Number(vendorId);
    if (Number.isFinite(numericVendorId) && numericVendorId > 0) {
      loadVendorProducts(numericVendorId);
    } else {
      vendorProductsList.value = [];
    }
  },
);

const taskTypeOptions = computed(() => {
  const baseTaskTypeOptions = publishTaskTypeOptions.value
    .filter((item) => !!getTaskTypeConfig(item.value))
    .map((item) => ({
      label: item.label,
      value: item.value,
      platform: item.platform || resolveTaskTypePlatform(item.value),
      taskKind: item.taskKind,
    }));
  const currentTaskType = String(form.taskType || "").trim();
  if (!currentTaskType || baseTaskTypeOptions.some((item) => item.value === currentTaskType)) {
    return baseTaskTypeOptions;
  }

  const currentPlatform = resolveTaskTypePlatform(currentTaskType);
  const currentTaskConfig = getTaskTypeConfig(currentTaskType);
  if (!currentPlatform || !currentTaskConfig) {
    return baseTaskTypeOptions;
  }

  return [
    {
      label: t("publishConfig.historicalConfig", {
        label: getTaskTypeLabel(currentTaskType, currentPlatform),
      }),
      value: currentTaskType,
      platform: currentPlatform,
      taskKind: currentTaskConfig.taskKind,
    },
    ...baseTaskTypeOptions,
  ];
});

const rules = {
  name: [{ required: true, message: t("publishConfig.enterConfigName"), trigger: "blur" }],
  taskType: [{ required: true, message: t("publishConfig.selectTaskType"), trigger: "change" }],
};

function resetTemplateBindingState() {
  selectedTemplateBinding.value = null;
  templateBindingConfigText.value = "";
  templateBindingDialogVisible.value = false;
}

function formatTemplateBindingConfig(config: any): string {
  if (config === undefined || config === null || config === "") {
    return "";
  }

  if (typeof config === "string") {
    return config.trim();
  }

  try {
    return JSON.stringify(config, null, 2);
  } catch {
    return String(config);
  }
}

function parseTemplateBindingConfigText(text: string): any {
  if (!text || !text.trim()) return undefined;

  const trimmedText = text.trim();
  try {
    return JSON.parse(trimmedText);
  } catch {
    try {
      const func = new Function("return " + trimmedText);
      const result = func();
      if (typeof result === "object" && result !== null) {
        return result;
      }
      throw new Error(t("publishConfig.psdParseNotObject"));
    } catch {
      throw new Error(t("publishConfig.psdFormatError"));
    }
  }
}

function normalizeTemplateBindingTemplate(template: any) {
  if (!template?.id) {
    return null;
  }

  return {
    id: String(template.id),
    name: String(template.name || "").trim(),
    thumbnail: String(template.thumbnail || template.preview || template.image || "").trim(),
    description: String(template.description || "").trim(),
    psdTemplateConfig: template?.psdTemplateConfig ?? null,
    createTime:
      template?.createTime || template?.uploadTime || template?.createdAt || template?.updateTime,
    enabled: template.enabled !== false,
    missing: Boolean(template?.missing),
  };
}

async function hydrateTemplateBinding(psdTemplateId?: string | null) {
  const normalizedId = String(psdTemplateId || "").trim();
  if (!normalizedId) {
    selectedTemplateBinding.value = null;
    return;
  }

  templateBindingHydrating.value = true;
  try {
    const detail = await psdTemplateApi.getPsdTemplateDetail(normalizedId);
    selectedTemplateBinding.value = normalizeTemplateBindingTemplate(detail) || {
      id: normalizedId,
      name: t("publishConfig.templateLoadFailed"),
      thumbnail: "",
      description: "",
      psdTemplateConfig: null,
      createTime: "",
      enabled: false,
      missing: true,
    };
    if (!templateBindingConfigText.value.trim()) {
      templateBindingConfigText.value = formatTemplateBindingConfig(
        selectedTemplateBinding.value?.psdTemplateConfig,
      );
    }
  } catch (error) {
    console.error("加载绑定模板详情失败:", error);
    selectedTemplateBinding.value = {
      id: normalizedId,
      name: t("publishConfig.templateNotFound"),
      thumbnail: "",
      description: "",
      psdTemplateConfig: null,
      createTime: "",
      enabled: false,
      missing: true,
    };
  } finally {
    templateBindingHydrating.value = false;
  }
}

async function loadTemplateBindingDialogTemplates() {
  templateBindingDialogLoading.value = true;
  try {
    const res: any = await psdTemplateApi.getPsdTemplatePage({
      currentPage: templateBindingDialogPage.value,
      pageSize: templateBindingDialogPageSize.value,
      searchKeyword: templateBindingDialogSearchText.value.trim() || undefined,
      enabled: true,
    });
    const list = Array.isArray(res) ? res : Array.isArray(res?.list) ? res.list : [];
    templateBindingDialogRows.value = list
      .map((item: any) => normalizeTemplateBindingTemplate(item))
      .filter(Boolean);
    templateBindingDialogTotal.value = Number(res?.total ?? list.length);
  } catch (error) {
    console.error("加载套图模板失败:", error);
    ElMessage.error(t("publishConfig.loadTemplateFailed"));
  } finally {
    templateBindingDialogLoading.value = false;
  }
}

function openTemplateBindingDialog() {
  templateBindingDialogVisible.value = true;
  templateBindingDialogPage.value = 1;
  loadTemplateBindingDialogTemplates();
}

function handleTemplateBindingDialogSearch() {
  templateBindingDialogPage.value = 1;
  loadTemplateBindingDialogTemplates();
}

function resetTemplateBindingDialogSearch() {
  templateBindingDialogSearchText.value = "";
  templateBindingDialogPage.value = 1;
  loadTemplateBindingDialogTemplates();
}

function handleTemplateBindingDialogPageChange(page: number) {
  templateBindingDialogPage.value = page;
  loadTemplateBindingDialogTemplates();
}

function handleTemplateBindingDialogSizeChange(size: number) {
  templateBindingDialogPageSize.value = size;
  templateBindingDialogPage.value = 1;
  loadTemplateBindingDialogTemplates();
}

function selectTemplateBinding(template: any) {
  const normalized = normalizeTemplateBindingTemplate(template);
  if (!normalized?.id) {
    ElMessage.warning(t("publishConfig.templateDataInvalid"));
    return;
  }

  selectedTemplateBinding.value = normalized;
  templateBindingConfigText.value = formatTemplateBindingConfig(normalized.psdTemplateConfig);
  templateBindingDialogVisible.value = false;
}

function clearTemplateBinding() {
  selectedTemplateBinding.value = null;
  templateBindingConfigText.value = "";
}

function applyTemplateBindingDefaultConfig() {
  templateBindingConfigText.value = templateBindingDefaultConfigText.value;
}

const handleAdd = () => {
  dialogTitle.value = t("publishConfig.addConfig");
  form.id = undefined;
  form.name = "";
  form.taskType = "";
  form.description = "";
  form.isActive = true;
  titleConfigForm.mode = "ai";
  titleConfigForm.fixedTitle = "";
  titleConfigForm.templateContent = "";
  titleConfigForm.maxLength = undefined;
  titleConfigForm.style = "";
  titleConfigForm.tone = "";
  titleConfigForm.includeEmoji = null;
  titleConfigForm.requiredKeywords = [];
  titleConfigForm.avoidWords = [];
  resetTitlePromptDialogState();
  platformConfigData.value = {};
  currentPlatformConfig.value = null;
  temuTemplateInspectorVisible.value = false;
  resetTemplateBindingState();
  dialogVisible.value = true;
};

const handleEdit = async (row: any) => {
  dialogTitle.value = t("publishConfig.editConfig");
  form.id = row.id;
  form.name = row.name;
  form.taskType = row.taskType || derivePublishTaskTypeByPlatform(row.platform);
  form.description = row.description;
  form.isActive = row.isActive;

  const configData = row.configData || {};
  titleConfigForm.mode =
    configData.titleConfig?.mode === "fixed" || configData.titleConfig?.fixedTitle ? "fixed" : "ai";
  titleConfigForm.fixedTitle = configData.titleConfig?.fixedTitle || "";
  titleConfigForm.templateContent = configData.titleTemplate || "";
  titleConfigForm.maxLength =
    typeof configData.titleConfig?.maxLength === "number"
      ? configData.titleConfig.maxLength
      : undefined;
  titleConfigForm.style = configData.titleConfig?.style || "";
  titleConfigForm.tone = configData.titleConfig?.tone || "";
  titleConfigForm.includeEmoji =
    typeof configData.titleConfig?.includeEmoji === "boolean"
      ? configData.titleConfig.includeEmoji
      : null;
  titleConfigForm.requiredKeywords = Array.isArray(configData.titleConfig?.requiredKeywords)
    ? configData.titleConfig.requiredKeywords
    : Array.isArray(configData.titleConfig?.keywords)
      ? configData.titleConfig.keywords
      : [];
  titleConfigForm.avoidWords = Array.isArray(configData.titleConfig?.avoidWords)
    ? configData.titleConfig.avoidWords
    : [];

  // 加载任务类型配置数据
  currentPlatformConfig.value = getTaskTypeConfig(form.taskType);
  platformConfigData.value = normalizePublishConfigData(
    form.taskType,
    formatTaskTypeConfigForEdit(form.taskType, configData),
  );
  // 加载厂家商品（编辑回显）
  const editVendorId = Number(platformConfigData.value?.vendorId);
  if (Number.isFinite(editVendorId) && editVendorId > 0) {
    loadVendorProducts(editVendorId);
  }
  temuTemplateInspectorVisible.value = false;
  resetTemplateBindingState();
  await hydrateTemplateBinding(configData?.templateBinding?.psdTemplateId);
  templateBindingConfigText.value = formatTemplateBindingConfig(
    configData?.templateBinding?.psdTemplateConfig ??
      selectedTemplateBinding.value?.psdTemplateConfig,
  );
  dialogVisible.value = true;
};

const submitForm = async () => {
  if (!formRef.value || submitLoading.value) return;

  submitLoading.value = true;
  try {
    await formRef.value.validate();
    applyVendorSnapshotBeforeSubmit();

    // 校验任务类型配置
    const validation = validateTaskTypeConfig(form.taskType, platformConfigData.value);
    if (!validation.valid) {
      ElMessage.error(validation.errors.join("；"));
      return;
    }

    if (appendImageUrlValidation.value.hasError) {
      ElMessage.error(t("publishConfig.appendImageInvalid"));
      return;
    }

    // 格式化任务类型配置
    const formattedConfigData = formatTaskTypeConfigForSubmit(
      form.taskType,
      platformConfigData.value,
    );
    const resolvedPlatform = resolveTaskTypePlatform(form.taskType);

    if (!resolvedPlatform) {
      ElMessage.error(t("publishConfig.taskTypeNoPlatform"));
      return;
    }

    if (supportsFixedTitle.value && titleConfigForm.mode === "fixed") {
      const fixedTitle = titleConfigForm.fixedTitle?.trim() || "";
      if (!fixedTitle) {
        ElMessage.error(t("publishConfig.fixedTitleRequired"));
        return;
      }
      const titleLimit = Number(currentPlatformConfig.value?.titleMaxLength || 0);
      if (titleLimit > 0 && Array.from(fixedTitle).length > titleLimit) {
        ElMessage.error(t("publishConfig.fixedTitleMaxLength", { count: titleLimit }));
        return;
      }
    }

    if (selectedTemplateBinding.value?.missing) {
      ElMessage.error(t("publishConfig.templateUnavailable"));
      return;
    }

    const parsedTitleConfig = {
      mode: supportsFixedTitle.value ? titleConfigForm.mode : undefined,
      fixedTitle: isFixedTitleMode.value
        ? titleConfigForm.fixedTitle?.trim() || undefined
        : undefined,
      maxLength:
        !isFixedTitleMode.value && typeof titleConfigForm.maxLength === "number"
          ? titleConfigForm.maxLength
          : undefined,
      style: !isFixedTitleMode.value ? titleConfigForm.style?.trim() || undefined : undefined,
      tone: !isFixedTitleMode.value ? titleConfigForm.tone?.trim() || undefined : undefined,
      includeEmoji:
        !isFixedTitleMode.value && typeof titleConfigForm.includeEmoji === "boolean"
          ? titleConfigForm.includeEmoji
          : undefined,
      requiredKeywords:
        !isFixedTitleMode.value && Array.isArray(titleConfigForm.requiredKeywords)
          ? titleConfigForm.requiredKeywords
          : undefined,
      avoidWords:
        !isFixedTitleMode.value && Array.isArray(titleConfigForm.avoidWords)
          ? titleConfigForm.avoidWords
          : undefined,
    };

    let data = {
      name: form.name,
      taskType: form.taskType,
      platform: resolvedPlatform,
      description: form.description,
      isActive: form.isActive,
      configData: {
        ...formattedConfigData,
        titleTemplate: titleConfigForm.templateContent?.trim() || undefined,
        titleConfig: parsedTitleConfig,
        templateBinding: currentTemplateBindingId.value
          ? {
              psdTemplateId: currentTemplateBindingId.value,
              psdTemplateConfig: parseTemplateBindingConfigText(templateBindingConfigText.value),
            }
          : undefined,
      },
    };

    // 执行任务类型特定的提交前钩子
    data = executeTaskTypeBeforeSubmit(form.taskType, data);

    if (form.id) {
      await updatePublishConfigApi(form.id, data);
      ElMessage.success(t("common.updateSuccess"));
    } else {
      await createPublishConfigApi(data);
      ElMessage.success(t("common.createSuccess"));
    }
    dialogVisible.value = false;
    temuTemplateInspectorVisible.value = false;
    getList();
  } catch (err: any) {
    console.error(err);
    const message = String(err?.message || "");
    if (message && !message.toLowerCase().includes("validation")) {
      ElMessage.error(err.message || t("common.operationFailed"));
    }
  } finally {
    submitLoading.value = false;
  }
};

const handleCopy = async (row: any) => {
  dialogTitle.value = t("publishConfig.copyConfig");
  form.id = undefined;
  form.name = t("publishConfig.copyName", { name: row.name });
  form.taskType = row.taskType || derivePublishTaskTypeByPlatform(row.platform);
  form.description = row.description;
  form.isActive = row.isActive;

  const configData = row.configData || {};
  titleConfigForm.mode =
    configData.titleConfig?.mode === "fixed" || configData.titleConfig?.fixedTitle ? "fixed" : "ai";
  titleConfigForm.fixedTitle = configData.titleConfig?.fixedTitle || "";
  titleConfigForm.templateContent = configData.titleTemplate || "";
  titleConfigForm.maxLength =
    typeof configData.titleConfig?.maxLength === "number"
      ? configData.titleConfig.maxLength
      : undefined;
  titleConfigForm.style = configData.titleConfig?.style || "";
  titleConfigForm.tone = configData.titleConfig?.tone || "";
  titleConfigForm.includeEmoji =
    typeof configData.titleConfig?.includeEmoji === "boolean"
      ? configData.titleConfig.includeEmoji
      : null;
  titleConfigForm.requiredKeywords = Array.isArray(configData.titleConfig?.requiredKeywords)
    ? configData.titleConfig.requiredKeywords
    : Array.isArray(configData.titleConfig?.keywords)
      ? configData.titleConfig.keywords
      : [];
  titleConfigForm.avoidWords = Array.isArray(configData.titleConfig?.avoidWords)
    ? configData.titleConfig.avoidWords
    : [];

  // 加载任务类型配置数据
  currentPlatformConfig.value = getTaskTypeConfig(form.taskType);
  platformConfigData.value = normalizePublishConfigData(
    form.taskType,
    formatTaskTypeConfigForEdit(form.taskType, configData),
  );
  // 加载厂家商品（复制回显）
  const copyVendorId = Number(platformConfigData.value?.vendorId);
  if (Number.isFinite(copyVendorId) && copyVendorId > 0) {
    loadVendorProducts(copyVendorId);
  }
  temuTemplateInspectorVisible.value = false;
  resetTemplateBindingState();
  await hydrateTemplateBinding(configData?.templateBinding?.psdTemplateId);
  templateBindingConfigText.value = formatTemplateBindingConfig(
    configData?.templateBinding?.psdTemplateConfig ??
      selectedTemplateBinding.value?.psdTemplateConfig,
  );
  dialogVisible.value = true;
};

const handleDelete = (row: any) => {
  if (!userStore.user?.isAdmin) {
    return ElMessage.warning(t("publishConfig.noPermissionDelete"));
  }
  ElMessageBox.confirm(t("publishConfig.deleteConfirm"), t("common.tip"), {
    confirmButtonText: t("common.confirm"),
    cancelButtonText: t("common.cancel"),
    type: "warning",
  }).then(async () => {
    try {
      deleteLoading.value = true;
      await deletePublishConfigApi(row.id);
      ElMessage.success(t("common.deleteSuccess"));
      await getList();
    } catch (err) {
      console.error(err);
    } finally {
      deleteLoading.value = false;
    }
  });
};

onMounted(() => {
  void refreshPublishTaskTypeOptions();
  getList();
  loadVendorOptions();
});
</script>

<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="publish-config-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item :label="t('publishConfig.keyword')">
                  <el-input
                    v-model="queryParams.keyword"
                    size="small"
                    clearable
                    :placeholder="t('publishConfig.searchConfigPlaceholder')"
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                  />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--base" :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item :label="t('publishConfig.taskType')">
                  <el-select
                    v-model="queryParams.taskType"
                    size="small"
                    clearable
                    filterable
                    :placeholder="t('publishConfig.allTypes')"
                    @change="handleSearch"
                  >
                    <el-option
                      v-for="item in taskTypeOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="4">
                <el-form-item :label="t('common.status')">
                  <el-select
                    v-model="queryParams.isActive"
                    size="small"
                    clearable
                    :placeholder="t('publishConfig.allStatus')"
                    @change="handleSearch"
                  >
                    <el-option :label="t('publishConfig.enabled')" :value="true" />
                    <el-option :label="t('publishConfig.disabled')" :value="false" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="7" :xl="8">
                <el-form-item :label="t('publishConfig.sortType')">
                  <el-select
                    v-model="sortType"
                    size="small"
                    :placeholder="t('publishConfig.selectSort')"
                    @change="handleSortTypeChange"
                  >
                    <el-option :label="t('publishConfig.createTimeDesc')" value="createTime_DESC" />
                    <el-option :label="t('publishConfig.createTimeAsc')" value="createTime_ASC" />
                    <el-option :label="t('publishConfig.updateTimeDesc')" value="updateTime_DESC" />
                    <el-option :label="t('publishConfig.updateTimeAsc')" value="updateTime_ASC" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :loading="loading" @click="handleSearch"
                >{{ t('common.search') }}</el-button
              >
              <el-button size="small" :disabled="loading" @click="resetQuery">{{ t('common.reset') }}</el-button>
              <el-button size="small" :loading="loading" @click="handleRefresh">{{ t('common.refresh') }}</el-button>
              <el-button
                size="small"
                type="primary"
                :disabled="loading || deleteLoading"
                @click="handleAdd"
                >{{ t('publishConfig.addConfig') }}</el-button
              >
              <el-button
                v-if="userStore.user?.isAdmin"
                size="small"
                type="danger"
                :loading="deleteLoading"
                :disabled="selectedIds.length === 0"
                @click="handleBatchDelete"
              >
                {{ t('common.batchDelete') }} <span v-if="selectedIds.length > 0">({{ selectedIds.length }})</span>
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
                @checkbox-change="handleSelectionChange"
                @checkbox-all="handleSelectionChange"
                @sort-change="handleSortChange"
              >
                <!-- 配置名称 -->
                <template #nameSlot="{ row }">
                  <div class="publish-config-name-cell">
                    <div
                      class="publish-config-name-text cursor-pointer hover:text-[var(--el-color-primary)] font-medium"
                      @click="handleEdit(row)"
                    >
                      {{ row.name || '-' }}
                    </div>
                    <div v-if="row.platform" class="publish-config-sub-platform mt-0.5">
                      <span
                        class="publish-config-platform-pill"
                        :style="getPlatformBadgeStyle(row.platform)"
                      >
                        {{ row.platform }}
                      </span>
                    </div>
                  </div>
                </template>

                <!-- 任务类型 -->
                <template #taskTypeSlot="{ row }">
                  <div class="publish-config-tasktype-cell">
                    <el-tag size="small" type="primary" effect="plain" class="font-medium">
                      {{ getTaskTypeLabel(row?.taskType || derivePublishTaskTypeByPlatform(row?.platform), row?.platform) }}
                    </el-tag>
                  </div>
                </template>

                <!-- 关联厂家 / 旗下商品 -->
                <template #vendorSlot="{ row }">
                  <div class="publish-config-vendor-cell text-xs">
                    <template v-if="row?.configData?.vendorName || row?.configData?.vendorCode">
                      <div class="flex items-center gap-1 font-medium text-[var(--el-text-color-primary)]">
                        <span>{{ row.configData.vendorName || '未命名厂家' }}</span>
                        <span v-if="row.configData.vendorCode" class="text-[var(--el-text-color-secondary)] font-mono text-[11px]">
                          ({{ row.configData.vendorCode }})
                        </span>
                      </div>
                      <div v-if="row?.configData?.vendorProductMappings?.length" class="text-[11px] text-[var(--el-text-color-secondary)] mt-0.5">
                        绑定 {{ row.configData.vendorProductMappings.length }} 款商品
                      </div>
                    </template>
                    <span v-else class="text-[var(--el-text-color-placeholder)]">-</span>
                  </div>
                </template>

                <!-- 关联套图模板 -->
                <template #templateSlot="{ row }">
                  <div class="publish-config-template-cell text-xs">
                    <template v-if="row?.configData?.templateBinding?.psdTemplateId">
                      <el-tag size="small" type="warning" effect="light" class="inline-flex items-center gap-1">
                        <span>PSD 模板</span>
                        <span class="font-mono text-[10px]">#{{ String(row.configData.templateBinding.psdTemplateId).slice(0, 8) }}</span>
                      </el-tag>
                    </template>
                    <span v-else class="text-[var(--el-text-color-placeholder)]">-</span>
                  </div>
                </template>

                <!-- 状态与开关 -->
                <template #statusSlot="{ row }">
                  <el-switch
                    :model-value="row.isActive !== false"
                    size="small"
                    inline-prompt
                    active-text="启"
                    inactive-text="停"
                    @change="handleToggleActive(row)"
                  />
                </template>

                <!-- 创建人 -->
                <template #uploaderSlot="{ row }">
                  <div class="text-xs text-[var(--el-text-color-regular)]">
                    {{ row?.uploader?.account || row?.uploader?.name || row?.creator || row?.userId || '-' }}
                  </div>
                </template>

                <!-- 创建时间 -->
                <template #createTimeSlot="{ row }">
                  <span class="table-time-text text-xs text-[var(--el-text-color-secondary)]">
                    {{ formatTime(row.createTime, 'yyyy-MM-dd HH:mm') }}
                  </span>
                </template>

                <!-- 修改时间 -->
                <template #updateTimeSlot="{ row }">
                  <span class="table-time-text text-xs text-[var(--el-text-color-secondary)]">
                    {{ formatTime(row.updateTime, 'yyyy-MM-dd HH:mm') }}
                  </span>
                </template>

                <template #action="{ row }">
                  <el-dropdown class="operation-dropdown" placement="bottom-end">
                    <el-button type="primary" link size="small" class="operation-trigger-button"
                      >{{ t('common.operation') }}</el-button
                    >
                    <template #dropdown>
                      <el-dropdown-menu class="operation-menu-compact">
                        <el-dropdown-item @click="handleEdit(row)">{{ t('common.edit') }}</el-dropdown-item>
                        <el-dropdown-item @click="handleCopy(row)">{{ t('common.copy') }}</el-dropdown-item>
                        <template v-if="userStore.user?.isAdmin">
                          <el-dropdown-item
                            divided
                            @click="handleDelete(row)"
                            class="operation-menu-item--danger"
                            >{{ t('common.delete') }}</el-dropdown-item
                          >
                        </template>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
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
          <pagination
            v-model:page="queryParams.page"
            v-model:limit="queryParams.pageSize"
            :total="total"
            @pagination="handlePagination"
          />
        </div>
      </template>
    </ListPageLayout>

    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      :fullscreen="true"
      class="publish-config-dialog"
    >
      <div class="publish-config-dialog__body">
        <div class="publish-config-form-shell">
          <el-form
            :model="form"
            :rules="rules"
            ref="formRef"
            label-width="104px"
            class="publish-config-form"
          >
            <section class="publish-config-panel publish-config-panel--basic">
              <div class="publish-config-panel__header">
                <div>
                  <div class="publish-config-panel__title">{{ t('publishConfig.basicInfo') }}</div>
                  <div class="publish-config-panel__desc">{{ t('publishConfig.basicInfoDesc') }}</div>
                </div>
              </div>
              <el-row :gutter="10" class="publish-config-basic-row">
                <el-col :span="10" class="publish-config-basic-col">
                  <el-form-item :label="t('publishConfig.configName')" prop="name">
                    <el-input
                      v-model="form.name"
                      :placeholder="t('publishConfig.configNamePlaceholder')"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="8" class="publish-config-basic-col">
                  <el-form-item :label="t('publishConfig.taskType')" prop="taskType">
                    <el-select
                      v-model="form.taskType"
                      :placeholder="t('publishConfig.selectTaskType')"
                    >
                      <el-option
                        v-for="item in taskTypeOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="6" class="publish-config-basic-col publish-config-basic-col--switch">
                  <el-form-item :label="t('publishConfig.enabledStatus')" prop="isActive">
                    <div class="publish-config-switch">
                      <el-switch v-model="form.isActive" />
                      <span class="publish-config-switch__text">{{
                        form.isActive ? t('publishConfig.enabling') : t('publishConfig.disabledStatus')
                      }}</span>
                    </div>
                  </el-form-item>
                </el-col>
                <el-col :span="24" class="publish-config-basic-col publish-config-basic-col--full">
                  <el-form-item
                    :label="t('common.description')"
                    prop="description"
                    class="publish-config-form-item--stacked"
                  >
                    <el-input
                      v-model="form.description"
                      type="textarea"
                      :autosize="{ minRows: 2, maxRows: 4 }"
                      :placeholder="t('publishConfig.descriptionPlaceholder')"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </section>

            <section class="publish-config-panel publish-config-panel--template">
              <div class="publish-config-panel__header">
                <div>
                  <div class="publish-config-panel__title">{{ t('publishConfig.psdTemplate') }}</div>
                </div>
              </div>
              <el-form-item
                :label="t('publishConfig.psdTemplate')"
                class="publish-config-form-item--stacked"
              >
                <div class="publish-config-template-binding">
                  <div
                    v-if="currentTemplateBindingId"
                    class="publish-config-template-binding__selected"
                  >
                    <div class="publish-config-template-option">
                      <div class="publish-config-template-option__preview">
                        <el-image
                          v-if="selectedTemplateBinding?.thumbnail"
                          :src="selectedTemplateBinding.thumbnail"
                          :preview-src-list="[selectedTemplateBinding.thumbnail]"
                          :initial-index="0"
                          preview-teleported
                          hide-on-click-modal
                          fit="cover"
                          class="publish-config-template-option__image"
                        />
                        <div v-else class="publish-config-template-option__preview-placeholder">
                          {{ t('publishConfig.noImage') }}
                        </div>
                      </div>
                      <div class="publish-config-template-option__main">
                        <div class="publish-config-template-option__name-row">
                          <span class="publish-config-template-option__name">
                            {{ selectedTemplateBinding?.name || t('publishConfig.unnamedTemplate') }}
                          </span>
                          <el-tag
                            v-if="selectedTemplateBinding?.missing"
                            size="small"
                            type="danger"
                            effect="plain"
                          >
                            {{ t('publishConfig.unavailable') }}
                          </el-tag>
                          <el-tag v-else size="small" type="success" effect="plain"
                            >{{ t('publishConfig.selected') }}</el-tag
                          >
                        </div>
                        <div class="publish-config-template-option__id">
                          {{ t('publishConfig.idLabel', { id: selectedTemplateBinding?.id }) }}
                        </div>
                        <div
                          v-if="selectedTemplateBinding?.createTime"
                          class="publish-config-template-option__meta"
                        >
                          {{ t('publishConfig.uploadTime', {
                            time: formatTime(selectedTemplateBinding.createTime, "yyyy-MM-dd HH:mm")
                          }) }}
                        </div>
                        <div
                          v-if="selectedTemplateBinding?.description"
                          class="publish-config-template-option__desc"
                        >
                          {{ selectedTemplateBinding.description }}
                        </div>
                      </div>
                    </div>
                    <div class="publish-config-template-binding__actions">
                      <el-button
                        size="small"
                        type="primary"
                        :loading="templateBindingHydrating"
                        @click="openTemplateBindingDialog"
                      >
                        {{ t('publishConfig.replaceTemplate') }}
                      </el-button>
                      <el-button
                        size="small"
                        :disabled="templateBindingHydrating"
                        @click="clearTemplateBinding"
                      >
                        {{ t('common.clear') }}
                      </el-button>
                    </div>
                  </div>
                  <div v-else class="publish-config-template-binding__empty">
                    <div class="publish-config-template-binding__empty-text">
                      {{ t('publishConfig.noTemplateBound') }}
                    </div>
                    <el-button
                      type="primary"
                      :loading="templateBindingHydrating"
                      @click="openTemplateBindingDialog"
                    >
                      {{ t('publishConfig.selectTemplate') }}
                    </el-button>
                  </div>
                </div>
              </el-form-item>
              <el-form-item
                v-if="currentTemplateBindingId"
                :label="t('publishConfig.psdConfig')"
                class="publish-config-form-item--stacked"
              >
                <el-input
                  v-model="templateBindingConfigText"
                  type="textarea"
                  :autosize="{ minRows: 8, maxRows: 18 }"
                  :placeholder="t('publishConfig.psdConfigPlaceholder')"
                />
                <div class="publish-config-template-config-toolbar">
                  <el-button
                    size="small"
                    text
                    type="primary"
                    @click="applyTemplateBindingDefaultConfig"
                  >
                    {{ t('publishConfig.restoreDefaultConfig') }}
                  </el-button>
                </div>
              </el-form-item>
            </section>

            <div class="publish-config-workspace">
              <section class="publish-config-panel publish-config-panel--platform">
                <div class="publish-config-panel__header">
                  <div>
                    <div class="publish-config-panel__title">{{ t('publishConfig.taskTypeConfig') }}</div>
                    <div class="publish-config-panel__desc">{{ t('publishConfig.taskTypeConfigDesc') }}</div>
                  </div>
                  <el-tag v-if="currentPlatformConfig" type="info" effect="plain" round>
                    {{ currentPlatformConfig.label }}
                  </el-tag>
                </div>

                <template v-if="currentPlatformConfig && form.taskType">
                  <div
                    v-if="platformImageLimitTip"
                    class="publish-config-field-note publish-config-platform__notice"
                  >
                    {{ platformImageLimitTip }}
                  </div>

                  <el-row
                    v-if="currentPlatformConfig.fields.length > 0"
                    :gutter="10"
                    class="publish-config-fields-row"
                  >
                    <el-col
                      v-for="field in currentPlatformConfig.fields"
                      :key="field.key"
                      :span="field.span || 24"
                      :class="[
                        'publish-config-field-col',
                        { 'publish-config-field-col--full': (field.span || 24) >= 24 },
                      ]"
                    >
                      <el-form-item
                        :label="field.label"
                        :required="field.required"
                        :class="{
                          'publish-config-form-item--stacked':
                            field.type === 'textarea' ||
                            field.type === 'url-list' ||
                            (field.type === 'select' &&
                              field.key === 'vendorId' &&
                              Boolean(field.tooltip)),
                        }"
                      >
                        <el-input
                          v-if="field.type === 'input'"
                          v-model="platformConfigData[field.key]"
                          :type="field.inputType || 'text'"
                          :placeholder="field.placeholder"
                        />

                        <template v-else-if="field.type === 'textarea'">
                          <el-input
                            v-model="platformConfigData[field.key]"
                            type="textarea"
                            :rows="field.rows || 3"
                            :placeholder="field.placeholder"
                          />

                          <div
                            v-if="isTemuProductTemplateField(field)"
                            class="publish-config-temu-template-actions"
                          >
                            <el-button
                              size="small"
                              type="primary"
                              plain
                              @click="openTemuTemplateInspector"
                            >
                              {{ t('publishConfig.auxiliaryTemplateParse') }}
                            </el-button>
                          </div>
                        </template>

                        <div v-else-if="field.type === 'url-list'">
                          <div class="publish-config-url-list">
                            <div
                              v-for="(_, index) in Array.isArray(platformConfigData[field.key])
                                ? platformConfigData[field.key]
                                : []"
                              :key="`${field.key}-${index}`"
                              class="publish-config-url-list__item"
                            >
                              <div class="publish-config-url-list__input-wrap">
                                <el-input
                                  v-model="platformConfigData[field.key][index]"
                                  :placeholder="field.placeholder"
                                />
                                <div
                                  v-if="getUrlListItemError(String(field.key), Number(index))"
                                  class="publish-config-field-error"
                                >
                                  {{ getUrlListItemError(String(field.key), Number(index)) }}
                                </div>
                              </div>
                              <div class="publish-config-url-list__preview">
                                <img
                                  v-if="platformConfigData[field.key][index]"
                                  :src="platformConfigData[field.key][index]"
                                  class="publish-config-url-list__thumb"
                                  @error="onImagePreviewError($event, String(field.key), index)"
                                />
                              </div>
                              <el-button
                                text
                                type="danger"
                                @click="removeUrlListItem(String(field.key), Number(index))"
                              >
                                {{ t('common.delete') }}
                              </el-button>
                            </div>
                          </div>
                          <el-button
                            text
                            type="primary"
                            :icon="Plus"
                            :disabled="isAppendImageLimitReached(String(field.key))"
                            @click="addUrlListItem(String(field.key))"
                          >
                            {{ field.buttonText || (field.key === 'appendImageUrls' ? '添加附加图片' : `${t('common.add')} ${field.label || ''}`) }}
                            <span v-if="field.key === 'appendImageUrls' && isAppendImageLimitReached(String(field.key))" class="ml-1 text-xs opacity-75">
                              (已达上限 {{ getAppendImageMaxLimit(String(field.key)) }} 张)
                            </span>
                          </el-button>
                          <div v-if="field.tooltip" class="publish-config-field-tip">
                            {{ field.tooltip }}
                          </div>
                          <div
                            v-if="field.key === 'appendImageUrls'"
                            class="publish-config-field-note"
                          >
                            {{ t('publishConfig.appendImageTip') }}
                          </div>
                        </div>

                        <div v-else-if="field.type === 'vendor-products'" class="temu-vendor-products">
                          <div v-if="resolveTaskTypePlatform(form.taskType) === 'temu' && temuFirstSkcSkuCount > 0" class="publish-config-field-note">
                            {{ t('publishConfig.temuSkcSkuTip', { count: temuFirstSkcSkuCount }) }}
                          </div>
                          <div v-if="!platformConfigData.vendorId" class="publish-config-field-tip">
                            {{ t('publishConfig.selectVendorFirst') }}
                          </div>
                          <div v-else-if="!vendorProductOptions.length" class="publish-config-field-tip">
                            {{ t('publishConfig.vendorNoProducts') }}
                          </div>
                          <div
                            v-for="(mapping, index) in Array.isArray(platformConfigData.vendorProductMappings)
                              ? platformConfigData.vendorProductMappings
                              : []"
                            :key="`temu-vendor-product-${index}`"
                            class="temu-vendor-products__row"
                          >
                            <span class="temu-vendor-products__index">{{ index + 1 }}</span>
                            <el-select
                              v-model="mapping.vendorProductId"
                              filterable
                              :loading="vendorProductsLoading"
                              :placeholder="t('publishConfig.selectVendorProduct')"
                              @change="(value) => handleVendorProductChange(index, Number(value))"
                            >
                              <el-option
                                v-for="option in vendorProductOptions"
                                :key="option.value"
                                :label="option.label"
                                :value="option.value"
                              />
                            </el-select>
                            <code class="temu-vendor-products__code">{{ mapping.code || "-" }}</code>
                            <el-button text :disabled="index === 0" @click="moveVendorProductMapping(index, -1)">
                              {{ t('publishConfig.moveUp') }}
                            </el-button>
                            <el-button
                              text
                              :disabled="index >= platformConfigData.vendorProductMappings.length - 1"
                              @click="moveVendorProductMapping(index, 1)"
                            >
                              {{ t('publishConfig.moveDown') }}
                            </el-button>
                            <el-button text type="danger" @click="removeVendorProductMapping(index)">
                              {{ t('common.delete') }}
                            </el-button>
                          </div>
                          <el-button
                            text
                            type="primary"
                            :disabled="!platformConfigData.vendorId || !vendorProductOptions.length"
                            @click="addVendorProductMapping"
                          >
                            {{ t('publishConfig.addVendorProduct') }}
                          </el-button>
                          <div v-if="field.tooltip" class="publish-config-field-tip">
                            {{ field.tooltip }}
                          </div>
                        </div>

                        <el-input-number
                          v-else-if="field.type === 'number'"
                          v-model="platformConfigData[field.key]"
                          :placeholder="field.placeholder"
                        />

                        <template v-else-if="field.type === 'select'">
                          <el-select
                            v-model="platformConfigData[field.key]"
                            :placeholder="field.placeholder || t('common.selectText')"
                            :clearable="field.key === 'vendorId'"
                            :filterable="field.key === 'vendorId'"
                          >
                            <el-option
                              v-for="option in field.key === 'vendorId'
                                ? vendorOptions
                                : field.options"
                              :key="option.value"
                              :label="option.label"
                              :value="option.value"
                            />
                          </el-select>
                          <div
                            v-if="field.key === 'vendorId' && field.tooltip"
                            class="publish-config-field-tip"
                          >
                            {{ field.tooltip }}
                          </div>
                        </template>

                        <div v-else-if="field.type === 'switch'" class="publish-config-switch">
                          <el-switch v-model="platformConfigData[field.key]" />
                          <span v-if="field.tooltip" class="publish-config-switch__hint">{{
                            field.tooltip
                          }}</span>
                        </div>

                        <div
                          v-if="
                            field.tooltip &&
                            field.type !== 'url-list' &&
                            field.type !== 'vendor-products' &&
                            field.type !== 'switch' &&
                            !(field.type === 'select' && field.key === 'vendorId')
                          "
                          class="publish-config-field-tip"
                        >
                          {{ field.tooltip }}
                        </div>
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-empty
                    v-else
                    :description="t('publishConfig.noFieldsDefined')"
                    :image-size="88"
                  />
                </template>

                <el-empty
                  v-else
                  :description="t('publishConfig.selectTaskTypeFirst')"
                  :image-size="92"
                />
              </section>

              <section class="publish-config-panel publish-config-panel--ai">
                <div class="publish-config-panel__header">
                  <div>
                    <div class="publish-config-panel__title">{{ titleConfigPanelTitle }}</div>
                    <div class="publish-config-panel__desc">{{ titleConfigPanelDesc }}</div>
                  </div>
                </div>

                <div class="publish-config-ai-grid">
                  <div class="publish-config-ai-grid__main">
                    <el-form-item v-if="supportsFixedTitle" :label="t('publishConfig.titleMode')">
                      <el-radio-group v-model="titleConfigForm.mode">
                        <el-radio label="fixed">{{ t('publishConfig.fixedTitle') }}</el-radio>
                        <el-radio label="ai">{{ t('publishConfig.aiGeneration') }}</el-radio>
                      </el-radio-group>
                    </el-form-item>

                    <el-form-item
                      v-if="isFixedTitleMode"
                      :label="t('publishConfig.fixedTitle')"
                      class="publish-config-ai-grid__editor publish-config-form-item--stacked"
                    >
                      <el-input
                        v-model="titleConfigForm.fixedTitle"
                        type="textarea"
                        :autosize="{ minRows: 4, maxRows: 6 }"
                        :placeholder="t('publishConfig.fixedTitlePlaceholder')"
                      />
                      <div class="publish-config-field-tip">
                        {{ t('publishConfig.fixedTitleDirectUse') }}
                        {{
                          currentPlatformConfig
                            ? t('publishConfig.titleLimit', {
                                limit:
                                  currentPlatformConfig.titleMaxLength || t('publishConfig.none'),
                              })
                            : ""
                        }}
                      </div>
                    </el-form-item>

                    <el-form-item
                      v-else
                      :label="t('publishConfig.titleTemplate')"
                      class="publish-config-ai-grid__editor publish-config-form-item--stacked"
                    >
                      <div class="publish-config-title-prompt-picker">
                        <el-button
                          type="primary"
                          plain
                          :loading="titlePromptDialogLoading"
                          @click="openTitlePromptDialog"
                        >
                          {{ t('publishConfig.selectPromptPlaceholder') }}
                        </el-button>
                        <span
                          v-if="titleConfigForm.templateContent"
                          class="publish-config-title-prompt-picker__status"
                        >
                          {{ t('publishConfig.promptConfigured') }}
                        </span>
                      </div>
                      <el-input
                        v-model="titleConfigForm.templateContent"
                        type="textarea"
                        :autosize="{ minRows: 10, maxRows: 16 }"
                        :placeholder="t('publishConfig.titleTemplatePlaceholder')"
                      />
                      <div class="publish-config-field-tip">
                        {{ t('publishConfig.promptIdNote') }}
                        {{
                          currentPlatformConfig
                            ? t('publishConfig.titleLimit', {
                                limit:
                                  currentPlatformConfig.titleMaxLength || t('publishConfig.none'),
                              })
                            : ""
                        }}
                      </div>
                    </el-form-item>
                  </div>

                  <div v-if="!isFixedTitleMode" class="publish-config-ai-grid__side">
                    <el-form-item :label="t('publishConfig.maxWords')">
                      <el-input-number
                        v-model="titleConfigForm.maxLength"
                        :min="1"
                        :max="200"
                        :placeholder="t('publishConfig.maxWordsPlaceholder')"
                      />
                    </el-form-item>
                    <el-form-item :label="t('publishConfig.style')">
                      <el-input
                        v-model="titleConfigForm.style"
                        :placeholder="t('publishConfig.stylePlaceholder')"
                      />
                    </el-form-item>
                    <el-form-item :label="t('publishConfig.tone')">
                      <el-input
                        v-model="titleConfigForm.tone"
                        :placeholder="t('publishConfig.tonePlaceholder')"
                      />
                    </el-form-item>
                    <el-form-item :label="t('publishConfig.includeEmoji')">
                      <el-radio-group v-model="titleConfigForm.includeEmoji">
                        <el-radio :label="true">{{ t('publishConfig.allow') }}</el-radio>
                        <el-radio :label="false">{{ t('publishConfig.forbid') }}</el-radio>
                        <el-radio :label="null">{{ t('publishConfig.unlimited') }}</el-radio>
                      </el-radio-group>
                    </el-form-item>
                    <el-form-item :label="t('publishConfig.requiredKeywords')">
                      <el-select
                        v-model="titleConfigForm.requiredKeywords"
                        multiple
                        filterable
                        allow-create
                        default-first-option
                        :placeholder="t('publishConfig.enterToAdd')"
                      />
                    </el-form-item>
                    <el-form-item :label="t('publishConfig.avoidWords')">
                      <el-select
                        v-model="titleConfigForm.avoidWords"
                        multiple
                        filterable
                        allow-create
                        default-first-option
                        :placeholder="t('publishConfig.enterToAdd')"
                      />
                    </el-form-item>
                  </div>
                </div>
              </section>
            </div>
          </el-form>
        </div>
      </div>
      <template #footer>
        <div class="publish-config-dialog__footer">
          <div class="publish-config-dialog__footer-actions">
            <el-button :disabled="submitLoading" @click="dialogVisible = false"
              >{{ t('common.cancel') }}</el-button
            >
            <el-button type="primary" :loading="submitLoading" @click="submitForm"
              >{{ t('publishConfig.saveConfig') }}</el-button
            >
          </div>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="titlePromptDialogVisible"
      :title="t('publishConfig.selectTitlePrompt')"
      :fullscreen="true"
      append-to-body
      class="publish-config-title-prompt-dialog"
    >
      <div class="publish-config-title-prompt-dialog__toolbar">
        <el-input
          v-model="titlePromptDialogSearchText"
          clearable
          :placeholder="t('publishConfig.searchTitlePromptPlaceholder')"
          @keyup.enter="handleTitlePromptDialogSearch"
          @clear="resetTitlePromptDialogSearch"
        />
        <el-button
          type="primary"
          :loading="titlePromptDialogLoading"
          @click="handleTitlePromptDialogSearch"
        >
          {{ t('common.search') }}
        </el-button>
        <el-button
          :disabled="titlePromptDialogLoading"
          @click="resetTitlePromptDialogSearch"
        >
          {{ t('common.reset') }}
        </el-button>
      </div>
      <div class="publish-config-title-prompt-dialog__table common-table">
        <vxe-table
          border="inner"
          size="mini"
          :height="titlePromptDialogTableHeight"
          :loading="titlePromptDialogLoading"
          :data="titlePromptDialogRows"
          :empty-text="t('publishConfig.noTitlePromptFound')"
          row-id="id"
          header-cell-class-name="common-table__header-cell"
          cell-class-name="common-table__body-cell"
        >
          <vxe-column :title="t('publishConfig.titlePromptName')" field="title" min-width="260">
            <template #default="{ row }">
              <div class="publish-config-title-prompt-dialog__name">
                {{ row.title || t('publishConfig.promptWithId', { id: row.id }) }}
              </div>
              <div v-if="row.description" class="publish-config-title-prompt-dialog__desc">
                {{ row.description }}
              </div>
            </template>
          </vxe-column>
          <vxe-column :title="t('publishConfig.titlePromptPreview')" min-width="520">
            <template #default="{ row }">
              <div class="publish-config-title-prompt-dialog__content" :title="row.content">
                {{ row.content || '-' }}
              </div>
            </template>
          </vxe-column>
          <vxe-column :title="t('common.operation')" width="120" fixed="right" align="center">
            <template #default="{ row }">
              <el-button size="small" type="primary" @click="selectTitlePrompt(row)">
                {{ t('publishConfig.select') }}
              </el-button>
            </template>
          </vxe-column>
        </vxe-table>
      </div>
      <template #footer>
        <div class="publish-config-title-prompt-dialog__footer">
          <span>{{ t('publishConfig.totalTitlePrompts', { count: titlePromptDialogTotal }) }}</span>
          <el-pagination
            v-model:current-page="titlePromptDialogPage"
            v-model:page-size="titlePromptDialogPageSize"
            background
            layout="sizes, prev, pager, next, jumper"
            :page-sizes="[10, 20, 40]"
            :total="titlePromptDialogTotal"
            @current-change="handleTitlePromptDialogPageChange"
            @size-change="handleTitlePromptDialogSizeChange"
          />
          <el-button @click="titlePromptDialogVisible = false">{{ t('common.close') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="templateBindingDialogVisible"
      :title="t('publishConfig.selectTemplate')"
      :fullscreen="true"
      append-to-body
      class="publish-config-template-picker-dialog"
    >
      <div class="publish-config-template-picker">
        <div class="publish-config-template-picker__toolbar">
          <el-input
            v-model="templateBindingDialogSearchText"
            clearable
            :placeholder="t('publishConfig.searchTemplatePlaceholder')"
            class="publish-config-template-picker__search"
            @keyup.enter="handleTemplateBindingDialogSearch"
            @clear="resetTemplateBindingDialogSearch"
          />
          <div class="publish-config-template-picker__toolbar-actions">
            <el-button
              type="primary"
              :loading="templateBindingDialogLoading"
              @click="handleTemplateBindingDialogSearch"
            >
              {{ t('common.search') }}
            </el-button>
            <el-button
              :disabled="templateBindingDialogLoading"
              @click="resetTemplateBindingDialogSearch"
            >
              {{ t('common.reset') }}
            </el-button>
          </div>
        </div>

        <div class="publish-config-template-picker__body common-table">
          <vxe-table
            border="inner"
            size="mini"
            :height="templateBindingDialogTableHeight"
            :loading="templateBindingDialogLoading"
            :data="templateBindingDialogRows"
            :empty-text="t('publishConfig.noTemplateFound')"
            row-id="id"
            header-cell-class-name="common-table__header-cell"
            cell-class-name="common-table__body-cell"
            class="publish-config-template-picker__table"
          >
            <vxe-column :title="t('publishConfig.preview')" field="thumbnail" width="132">
              <template #default="{ row }">
                <div class="publish-config-template-table-preview">
                  <el-image
                    v-if="row.thumbnail"
                    :src="row.thumbnail"
                    :preview-src-list="[row.thumbnail]"
                    :initial-index="0"
                    preview-teleported
                    hide-on-click-modal
                    fit="cover"
                    class="publish-config-template-table-preview__image"
                  />
                  <div v-else class="publish-config-template-table-preview__placeholder">
                    {{ t('publishConfig.noImage') }}
                  </div>
                </div>
              </template>
            </vxe-column>

            <vxe-column :title="t('publishConfig.templateInfo')" field="name" min-width="320">
              <template #default="{ row }">
                <div class="publish-config-template-table-info">
                  <div class="publish-config-template-table-info__name-row">
                    <span class="publish-config-template-table-info__name">
                      {{ row.name || t('publishConfig.unnamedTemplate') }}
                    </span>
                    <el-tag
                      v-if="currentTemplateBindingId === row.id"
                      size="small"
                      type="success"
                      effect="plain"
                    >
                      {{ t('publishConfig.current') }}
                    </el-tag>
                  </div>
                  <div class="publish-config-template-table-info__id">
                    {{ t('publishConfig.idLabel', { id: row.id }) }}
                  </div>
                  <div v-if="row.description" class="publish-config-template-table-info__desc">
                    {{ row.description }}
                  </div>
                </div>
              </template>
            </vxe-column>

            <vxe-column :title="t('publishConfig.uploadTimeTitle')" field="createTime" width="180">
              <template #default="{ row }">
                <span v-if="row.createTime">
                  {{ formatTime(row.createTime, "yyyy-MM-dd HH:mm") }}
                </span>
                <span v-else>-</span>
              </template>
            </vxe-column>

            <vxe-column :title="t('common.operation')" width="110" fixed="right" align="center">
              <template #default="{ row }">
                <el-button
                  size="small"
                  type="primary"
                  :plain="currentTemplateBindingId !== row.id"
                  @click="selectTemplateBinding(row)"
                >
                  {{
                    currentTemplateBindingId === row.id
                      ? t('publishConfig.selected')
                      : t('publishConfig.select')
                  }}
                </el-button>
              </template>
            </vxe-column>
          </vxe-table>
        </div>
      </div>
      <template #footer>
        <div class="publish-config-template-picker__footer">
          <div class="publish-config-template-picker__total">
            {{ t('publishConfig.totalTemplates', { count: templateBindingDialogTotal }) }}
          </div>
          <el-pagination
            v-model:current-page="templateBindingDialogPage"
            v-model:page-size="templateBindingDialogPageSize"
            background
            layout="sizes, prev, pager, next, jumper"
            :page-sizes="[12, 24, 48]"
            :total="templateBindingDialogTotal"
            @current-change="handleTemplateBindingDialogPageChange"
            @size-change="handleTemplateBindingDialogSizeChange"
          />
          <el-button @click="templateBindingDialogVisible = false">{{ t('common.close') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="temuTemplateInspectorVisible"
      :title="t('publishConfig.auxiliaryTemplateParse')"
      :fullscreen="true"
      append-to-body
      class="publish-config-temu-inspector-dialog"
    >
      <div class="publish-config-temu-inspector">
        <TemuProductTemplateInspector v-model="temuProductTemplateValue" />
      </div>
    </el-dialog>
  </ContentWrap>
</template>

<style scoped lang="less">
:deep(.publish-config-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.publish-config-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.publish-config-page .list-page-filter--flat) {
  padding-bottom: 10px;
}

:deep(.publish-config-temu-inspector-dialog .el-dialog__body) {
  padding: 14px 16px 16px;
}

:deep(.publish-config-template-picker-dialog) {
  height: 100vh;
  margin: 0;
  display: flex;
  flex-direction: column;
}

:deep(.publish-config-template-picker-dialog .el-dialog__header) {
  flex-shrink: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.publish-config-template-picker-dialog .el-dialog__body) {
  flex: 1;
  min-height: 0;
  padding: 0;
  background: var(--el-fill-color-light);
  overflow: hidden;
}

:deep(.publish-config-template-picker-dialog .el-dialog__footer) {
  flex-shrink: 0;
  padding: 12px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

:deep(.publish-config-page .common-table .vxe-body--column),
:deep(.publish-config-page .common-table .common-table__body-cell) {
  vertical-align: middle !important;
}

:deep(.publish-config-page .common-table .common-table__body-cell .vxe-cell),
:deep(.publish-config-page .common-table .common-table__body-cell .vxe-cell--wrapper) {
  display: flex;
  align-items: center;
  min-height: 100%;
}

:deep(.publish-config-page .common-table .common-table__body-cell .vxe-cell--wrapper) {
  width: 100%;
}

.publish-config-name-cell {
  line-height: 1.35;
}

.publish-config-name-text {
  font-size: 13px;
  color: var(--el-text-color-primary, #e2e8f0);
}

.publish-config-platform-pill {
  display: inline-block;
  padding: 1px 7px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-radius: 9999px;
  border: 1px solid transparent;
}

.publish-config-vendor-cell {
  line-height: 1.35;
}

/* 停用配置行的半透明淡化效果 */
:deep(.publish-config-row--disabled) {
  opacity: 0.45;
  filter: grayscale(20%);
  transition: opacity 0.2s ease, filter 0.2s ease;

  &:hover {
    opacity: 0.88;
    filter: grayscale(0%);
  }
}

.publish-config-dialog {
  :deep(.el-dialog) {
    height: 100vh;
    margin: 0;
    display: flex;
    flex-direction: column;
  }

  :deep(.el-dialog__header) {
    flex-shrink: 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background: var(--el-bg-color);
  }

  :deep(.el-dialog__body) {
    flex: 1;
    padding: 0;
    background: var(--el-fill-color-light);
    overflow: hidden;
  }

  :deep(.el-dialog__footer) {
    flex-shrink: 0;
    padding: 14px 24px 18px;
    border-top: 1px solid var(--el-border-color-lighter);
    background: var(--el-bg-color);
  }
}

.publish-config-dialog__body {
  height: 100%;
  padding: 0;
  box-sizing: border-box;
  overflow-y: auto;
}

.publish-config-form-shell {
  width: 100%;
  min-height: 100%;
}

.publish-config-form {
  min-height: 100%;
  width: 100%;

  :deep(.el-form-item__content) {
    min-width: 0;
    justify-content: flex-start;
    align-items: center;
    flex-wrap: wrap;
  }

  :deep(.el-form-item__label) {
    color: var(--el-text-color-primary);
    font-weight: 500;
  }

  :deep(.el-form-item__content > .el-input),
  :deep(.el-form-item__content > .el-select),
  :deep(.el-form-item__content > .el-input-number) {
    flex: 0 0 auto;
    width: min(100%, 280px);
  }

  :deep(.el-form-item__content > .el-textarea) {
    flex: 0 0 auto;
    width: min(100%, 440px);
  }

  :deep(.el-form-item__content > .el-radio-group) {
    flex: 0 0 auto;
    max-width: 420px;
    min-height: 32px;
    display: inline-flex;
    align-items: center;
  }
}

.publish-config-form-item--stacked {
  :deep(.el-form-item__content) {
    display: block;
    align-items: flex-start;
  }
}

.publish-config-panel {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 14px 14px 2px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);

  :deep(.el-form-item) {
    margin-bottom: 14px;
  }
}

.publish-config-panel--basic {
  margin-bottom: 10px;
}

.publish-config-panel--template {
  margin-bottom: 10px;
}

.publish-config-basic-row,
.publish-config-fields-row {
  justify-content: flex-start;
  align-items: flex-start;
}

.publish-config-basic-row :deep(.publish-config-basic-col),
.publish-config-fields-row :deep(.publish-config-field-col) {
  flex: 0 0 auto;
  width: auto;
  max-width: none;
}

.publish-config-basic-row :deep(.publish-config-basic-col .el-form-item),
.publish-config-fields-row :deep(.publish-config-field-col .el-form-item) {
  margin-right: 0;
}

.publish-config-basic-row :deep(.publish-config-basic-col) {
  width: min(100%, 430px) !important;
}

.publish-config-basic-row :deep(.publish-config-basic-col--switch) {
  width: min(100%, 260px) !important;
}

.publish-config-basic-row :deep(.publish-config-basic-col--full),
.publish-config-fields-row :deep(.publish-config-field-col--full) {
  flex-basis: 100% !important;
  width: 100% !important;
}

.publish-config-fields-row
  :deep(.publish-config-field-col--full .el-form-item__content > .el-textarea) {
  width: min(100%, 760px);
}

.publish-config-fields-row :deep(.publish-config-field-col) {
  width: min(100%, 430px) !important;
}

.publish-config-workspace {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.publish-config-template-option {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  width: 100%;
  min-width: 0;
  padding: 14px;
  box-sizing: border-box;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.publish-config-template-option__preview {
  width: 60px;
  height: 60px;
  flex: 0 0 60px;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color);
}

.publish-config-template-option__image {
  width: 100%;
  height: 100%;
  cursor: zoom-in;
}

.publish-config-template-option__preview :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.publish-config-template-option__preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.publish-config-template-option__main {
  flex: 1;
  min-width: 0;
}

.publish-config-template-option__name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.publish-config-template-option__name {
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 600;
  word-break: break-word;
}

.publish-config-template-option__id,
.publish-config-template-option__meta,
.publish-config-template-option__desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.publish-config-template-option__id {
  word-break: break-all;
}

.publish-config-template-option__desc {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.publish-config-template-binding {
  width: min(100%, 760px);
}

.publish-config-template-binding__selected {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: flex-start;
  width: 100%;
}

.publish-config-template-binding__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-top: 14px;
}

.publish-config-template-binding__empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 14px;
  box-sizing: border-box;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}

.publish-config-template-binding__empty-text {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.publish-config-template-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  padding: 12px 16px;
  box-sizing: border-box;
}

.publish-config-template-picker__toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.publish-config-template-picker__search {
  width: min(100%, 460px);
}

.publish-config-template-picker__toolbar-actions {
  display: flex;
  gap: 8px;
}

.publish-config-template-picker__body {
  flex: 1;
  min-height: 0;
  background: var(--el-bg-color);
  border-radius: 8px;
  overflow: hidden;
}

.publish-config-template-picker__table {
  :deep(.vxe-cell) {
    line-height: 1.4;
  }

  :deep(.vxe-body--row.row--hover) {
    background: var(--el-fill-color-light);
  }
}

.publish-config-template-table-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color);
}

.publish-config-template-table-preview__image {
  width: 100%;
  height: 100%;
  cursor: zoom-in;
}

.publish-config-template-table-preview :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.publish-config-template-table-preview__placeholder {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

.publish-config-template-table-info {
  min-width: 0;
  padding: 4px 0;
}

.publish-config-template-table-info__name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.publish-config-template-table-info__name {
  color: var(--el-text-color-primary);
  font-weight: 600;
  line-height: 1.4;
  word-break: break-word;
}

.publish-config-template-table-info__id,
.publish-config-template-table-info__desc {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.publish-config-template-table-info__id {
  word-break: break-all;
}

.publish-config-template-table-info__desc {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.publish-config-template-picker__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
}

.publish-config-template-picker__total {
  margin-right: auto;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.publish-config-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.publish-config-panel__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.3;
}

.publish-config-panel__desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.publish-config-platform__notice {
  margin-bottom: 12px;
}

.publish-config-ai-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.publish-config-panel--ai {
  padding-bottom: 12px;
}

.publish-config-panel--ai .publish-config-ai-grid__main {
  :deep(.el-form-item__content > .el-textarea) {
    flex: 0 0 auto;
    width: min(100%, 680px);
  }
}

.publish-config-ai-grid__side {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 320px));
  justify-content: flex-start;
  gap: 0 12px;
}

.publish-config-ai-grid__editor {
  :deep(.el-form-item__content) {
    display: block;
    align-items: flex-start;
  }
}

.publish-config-title-prompt-picker {
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(100%, 420px);
  margin-bottom: 8px;
}

.publish-config-title-prompt-picker__status {
  color: var(--el-color-success);
  font-size: 12px;
}

:deep(.publish-config-title-prompt-dialog) {
  height: 100vh;
  margin: 0;
  display: flex;
  flex-direction: column;
}

:deep(.publish-config-title-prompt-dialog .el-dialog__header) {
  flex-shrink: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.publish-config-title-prompt-dialog .el-dialog__body) {
  flex: 1;
  min-height: 0;
  padding: 16px 20px;
  overflow: hidden;
  background: var(--el-fill-color-light);
}

:deep(.publish-config-title-prompt-dialog .el-dialog__footer) {
  flex-shrink: 0;
  padding: 12px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.publish-config-title-prompt-dialog__toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.publish-config-title-prompt-dialog__toolbar :deep(.el-input) {
  flex: 1;
}

.publish-config-title-prompt-dialog__table {
  height: calc(100% - 52px);
  min-height: 360px;
}

.publish-config-title-prompt-dialog__name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.publish-config-title-prompt-dialog__desc {
  margin-top: 4px;
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.publish-config-title-prompt-dialog__content {
  display: -webkit-box;
  overflow: hidden;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: pre-wrap;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.publish-config-title-prompt-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.publish-config-title-prompt-dialog__footer > span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

@media (max-width: 700px) {
  .publish-config-title-prompt-dialog__toolbar {
    flex-wrap: wrap;
  }

  .publish-config-title-prompt-dialog__toolbar :deep(.el-input) {
    flex-basis: 100%;
  }

  .publish-config-title-prompt-dialog__footer {
    flex-wrap: wrap;
  }
}

.publish-config-field-tip {
  margin: 4px;
  font-size: 10px;
  line-height: 1.45;
  color: var(--el-text-color-secondary);
}

.publish-config-temu-template-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 8px;
}

.temu-vendor-products {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.temu-vendor-products__row {
  display: grid;
  grid-template-columns: 32px minmax(220px, 1fr) 150px auto auto auto;
  gap: 8px;
  align-items: center;
}

.temu-vendor-products__index {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  text-align: center;
}

.temu-vendor-products__code {
  min-width: 0;
  height: 28px;
  padding: 0 8px;
  overflow: hidden;
  color: var(--el-text-color-regular);
  font-size: 12px;
  line-height: 28px;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.publish-config-temu-inspector {
  height: calc(100vh - 72px);
  min-height: 0;
}

.publish-config-field-note {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 18%, transparent);
  color: var(--el-color-primary);
  font-size: 12px;
  line-height: 1.5;

  :global(html.dark) & {
    background: color-mix(in srgb, var(--el-color-primary) 15%, transparent);
    border-color: color-mix(in srgb, var(--el-color-primary) 30%, transparent);
    color: var(--el-color-primary-light-3);
  }
}

.publish-config-template-config-toolbar {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 8px;
}

.publish-config-url-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 560px;
}

.publish-config-url-list__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px auto;
  gap: 10px;
  align-items: center;
}

.publish-config-url-list__input-wrap {
  min-width: 0;
}

.publish-config-url-list__preview {
  width: 90px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  overflow: hidden;
  background: var(--el-fill-color-blank);
  flex-shrink: 0;
}

.publish-config-url-list__thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.publish-config-field-error {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-color-danger);
  word-break: break-all;
}

.publish-config-switch {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 32px;
  justify-content: flex-start;
}

.publish-config-switch__text,
.publish-config-switch__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.publish-config-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.publish-config-dialog__footer-actions {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

@media (max-width: 1200px) {
  .publish-config-ai-grid__side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .publish-config-ai-grid__side {
    grid-template-columns: 1fr;
  }

  .publish-config-template-binding__selected,
  .publish-config-template-binding__empty,
  .publish-config-template-picker__toolbar,
  .publish-config-template-picker__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .publish-config-template-binding__selected {
    display: flex;
  }

  .publish-config-template-binding__actions,
  .publish-config-template-picker__toolbar-actions {
    justify-content: flex-start;
  }

  .publish-config-template-picker__search {
    width: 100%;
  }

  .publish-config-template-picker__total {
    margin-right: 0;
  }

  .publish-config-dialog__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .publish-config-dialog__footer-actions {
    justify-content: flex-end;
  }

  .publish-config-temu-inspector {
    height: auto;
    min-height: calc(100vh - 72px);
  }
}
</style>
