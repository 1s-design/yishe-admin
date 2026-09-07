<script setup lang="ts">
import { computed, onMounted, reactive, ref, watchEffect } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useWindowSize } from "@vueuse/core";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import { formatTimestamp } from "@/common/date";
import { productGenerationTemplateApi } from "@/api/product-generation-template";
import { psdTemplateApi } from "@/api/psdTemplate";
import { normalizeProductType } from "@/utils/product-type";

const loading = ref(false);
const submitLoading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const psdTemplateBindingHydrating = ref(false);
const selectedPsdTemplateBinding = ref<any | null>(null);
const psdTemplateConfigText = ref("");
const psdTemplatePickerVisible = ref(false);
const psdTemplatePickerLoading = ref(false);
const psdTemplatePickerSearchText = ref("");
const psdTemplatePickerPage = ref(1);
const psdTemplatePickerPageSize = ref(12);
const psdTemplatePickerTotal = ref(0);
const psdTemplatePickerRows = ref<any[]>([]);
const queryParams = reactive({
  page: 1,
  pageSize: 20,
  searchText: "",
});

const { height } = useWindowSize();
const gridMaxHeight = ref(0);
const psdTemplatePickerTableHeight = computed(() => Math.max(420, height.value - 188));
watchEffect(() => {
  gridMaxHeight.value = Math.max(height.value - 280, 360);
});

const formatMoney = (value: any) => {
  const amount = Number(value || 0);
  return amount > 0 ? amount.toFixed(2) : "-";
};

const pricingModeOptions = [
  { label: "固定价格", value: "fixed" },
  { label: "AI 生成", value: "ai" },
];

const formatPriceConfig = (row: any) => {
  if (row?.pricingMode === "ai") {
    const min = Number(row.aiPriceMin || 0) > 0 ? formatMoney(row.aiPriceMin) : "不限";
    const max = Number(row.aiPriceMax || 0) > 0 ? formatMoney(row.aiPriceMax) : "不限";
    return `${min} - ${max}`;
  }
  return `${formatMoney(row?.salePrice)} / ${formatMoney(row?.price)} / ${formatMoney(row?.compareAtPrice)}`;
};

const formatPsdTemplate = (id: any) => {
  const normalizedId = String(id || "").trim();
  if (!normalizedId) return "未绑定";
  return "已绑定";
};

const currentPsdTemplateBindingId = computed(() =>
  String(selectedPsdTemplateBinding.value?.id || "").trim(),
);

const psdTemplateDefaultConfigText = computed(() =>
  formatPsdTemplateConfig(selectedPsdTemplateBinding.value?.psdTemplateConfig),
);

function formatPsdTemplateConfig(config: any): string {
  if (config === undefined || config === null || config === "") return "";
  if (typeof config === "string") return config.trim();
  try {
    return JSON.stringify(config, null, 2);
  } catch {
    return String(config);
  }
}

function parsePsdTemplateConfig(text: string): any {
  if (!text || !text.trim()) return undefined;
  const normalizedText = text.trim();
  try {
    return JSON.parse(normalizedText);
  } catch {
    try {
      const value = new Function(`return (${normalizedText})`)();
      if (value && typeof value === "object") return value;
    } catch {
      // 统一在下方抛出可读错误。
    }
    throw new Error("PSD 配置格式错误，请输入有效的 JSON 或 JS 对象格式");
  }
}

function normalizePsdTemplateBinding(template: any) {
  if (!template?.id) return null;
  return {
    id: String(template.id),
    name: String(template.name || "").trim(),
    thumbnail: String(template.thumbnail || template.preview || template.image || "").trim(),
    description: String(template.description || "").trim(),
    psdTemplateConfig: template.psdTemplateConfig ?? null,
    createTime:
      template.createTime || template.uploadTime || template.createdAt || template.updateTime,
    enabled: template.enabled !== false,
    missing: Boolean(template.missing),
  };
}

async function hydratePsdTemplateBinding(id?: string | null) {
  const normalizedId = String(id || "").trim();
  if (!normalizedId) {
    selectedPsdTemplateBinding.value = null;
    return;
  }

  psdTemplateBindingHydrating.value = true;
  try {
    const detail: any = await psdTemplateApi.getPsdTemplateDetail(normalizedId);
    selectedPsdTemplateBinding.value = normalizePsdTemplateBinding(detail) || {
      id: normalizedId,
      name: "模板信息加载失败",
      thumbnail: "",
      description: "",
      psdTemplateConfig: null,
      createTime: "",
      enabled: false,
      missing: true,
    };
    if (!psdTemplateConfigText.value.trim()) {
      psdTemplateConfigText.value = formatPsdTemplateConfig(
        selectedPsdTemplateBinding.value?.psdTemplateConfig,
      );
    }
  } catch {
    selectedPsdTemplateBinding.value = {
      id: normalizedId,
      name: "模板不存在或无权访问",
      thumbnail: "",
      description: "",
      psdTemplateConfig: null,
      createTime: "",
      enabled: false,
      missing: true,
    };
  } finally {
    psdTemplateBindingHydrating.value = false;
  }
}

async function loadPsdTemplatePickerRows() {
  psdTemplatePickerLoading.value = true;
  try {
    const res: any = await psdTemplateApi.getPsdTemplatePage({
      currentPage: psdTemplatePickerPage.value,
      pageSize: psdTemplatePickerPageSize.value,
      searchKeyword: psdTemplatePickerSearchText.value.trim() || undefined,
      enabled: true,
    });
    const list = Array.isArray(res) ? res : Array.isArray(res?.list) ? res.list : [];
    psdTemplatePickerRows.value = list.map(normalizePsdTemplateBinding).filter(Boolean);
    psdTemplatePickerTotal.value = Number(res?.total ?? list.length);
  } catch (error) {
    console.error("加载PSD模板失败:", error);
    ElMessage.error("加载PSD模板失败");
  } finally {
    psdTemplatePickerLoading.value = false;
  }
}

function openPsdTemplatePicker() {
  psdTemplatePickerVisible.value = true;
  psdTemplatePickerPage.value = 1;
  void loadPsdTemplatePickerRows();
}

function handlePsdTemplatePickerSearch() {
  psdTemplatePickerPage.value = 1;
  void loadPsdTemplatePickerRows();
}

function resetPsdTemplatePickerSearch() {
  psdTemplatePickerSearchText.value = "";
  psdTemplatePickerPage.value = 1;
  void loadPsdTemplatePickerRows();
}

function handlePsdTemplatePickerPageChange(page: number) {
  psdTemplatePickerPage.value = page;
  void loadPsdTemplatePickerRows();
}

function handlePsdTemplatePickerSizeChange(size: number) {
  psdTemplatePickerPageSize.value = size;
  psdTemplatePickerPage.value = 1;
  void loadPsdTemplatePickerRows();
}

function selectPsdTemplateBinding(template: any) {
  const normalized = normalizePsdTemplateBinding(template);
  if (!normalized?.id) {
    ElMessage.warning("模板数据异常，无法选择");
    return;
  }
  selectedPsdTemplateBinding.value = normalized;
  psdTemplateConfigText.value = formatPsdTemplateConfig(normalized.psdTemplateConfig);
  psdTemplatePickerVisible.value = false;
}

function clearPsdTemplateBinding() {
  selectedPsdTemplateBinding.value = null;
  psdTemplateConfigText.value = "";
}

function applyPsdTemplateDefaultConfig() {
  psdTemplateConfigText.value = psdTemplateDefaultConfigText.value;
}

function resetPsdTemplateBindingState() {
  selectedPsdTemplateBinding.value = null;
  psdTemplateConfigText.value = "";
  psdTemplatePickerVisible.value = false;
}

const gridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: gridMaxHeight.value,
  columns: [
    { field: "name", title: "模板名称", minWidth: 160 },
    {
      field: "productType",
      title: "商品类型",
      minWidth: 120,
      formatter: ({ cellValue }) => normalizeProductType(cellValue),
    },
    {
      field: "pricingMode",
      title: "价格策略",
      width: 100,
      formatter: ({ cellValue }) => (cellValue === "ai" ? "AI 生成" : "固定价格"),
    },
    {
      field: "psdTemplateId",
      title: "绑定PSD模板",
      minWidth: 160,
      formatter: ({ cellValue }) => formatPsdTemplate(cellValue),
    },
    {
      field: "priceConfig",
      title: "价格配置",
      minWidth: 180,
      formatter: ({ row }) => formatPriceConfig(row),
    },
    { field: "stock", title: "库存", width: 90 },
    { field: "tags", title: "标签", minWidth: 180, showOverflow: true },
    {
      field: "autoPublish",
      title: "自动发布",
      width: 100,
      formatter: ({ cellValue }) => (cellValue === false ? "否" : "是"),
    },
    {
      field: "isActive",
      title: "状态",
      width: 90,
      formatter: ({ cellValue }) => (cellValue === false ? "停用" : "启用"),
    },
    {
      field: "uploader",
      title: "创建者",
      minWidth: 110,
      formatter: ({ row }) => row?.uploader?.account || row?.uploader?.name || row?.userId || "-",
    },
    {
      field: "createTime",
      title: "创建时间",
      width: 160,
      formatter: ({ cellValue }) => formatTimestamp(cellValue),
    },
    buildOperationColumn("action"),
  ],
}));

const getList = async () => {
  loading.value = true;
  try {
    const res = await productGenerationTemplateApi.getList(queryParams);
    tableData.value = Array.isArray(res?.list) ? res.list : [];
    total.value = Number(res?.total || 0);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  queryParams.page = 1;
  getList();
};

const resetQuery = () => {
  queryParams.searchText = "";
  handleSearch();
};

const dialogVisible = ref(false);
const dialogTitle = ref("");
const formRef = ref();
const form = reactive<any>({
  id: "",
  name: "",
  productType: "",
  titlePrompt: "",
  descriptionPrompt: "",
  keywordPrompt: "",
  seoPrompt: "",
  tags: "",
  pricingMode: "fixed",
  price: 0,
  salePrice: 0,
  compareAtPrice: 0,
  aiPriceMin: 0,
  aiPriceMax: 0,
  stock: 0,
  psdImageIndexes: "",
  autoPublish: true,
  isActive: true,
});

const rules = {
  name: [{ required: true, message: "请输入模板名称", trigger: "blur" }],
};

const resetForm = () => {
  Object.assign(form, {
    id: "",
    name: "",
    productType: "",
    titlePrompt: "",
    descriptionPrompt: "",
    keywordPrompt: "",
    seoPrompt: "",
    tags: "",
    pricingMode: "fixed",
    price: 0,
    salePrice: 0,
    compareAtPrice: 0,
    aiPriceMin: 0,
    aiPriceMax: 0,
    stock: 0,
    psdImageIndexes: "",
    autoPublish: true,
    isActive: true,
  });
};

const handleAdd = () => {
  resetForm();
  resetPsdTemplateBindingState();
  dialogTitle.value = "新增商品生成模板";
  dialogVisible.value = true;
};

const handleEdit = (row: any) => {
  resetForm();
  resetPsdTemplateBindingState();
  psdTemplateConfigText.value = formatPsdTemplateConfig(row.psdTemplateConfig);
  void hydratePsdTemplateBinding(row.psdTemplateId);
  Object.assign(form, {
    id: row.id || "",
    name: row.name || "",
    productType: normalizeProductType(row.productType),
    titlePrompt: row.titlePrompt || "",
    descriptionPrompt: row.descriptionPrompt || "",
    keywordPrompt: row.keywordPrompt || "",
    seoPrompt: row.seoPrompt || "",
    tags: row.tags || "",
    pricingMode: row.pricingMode === "ai" ? "ai" : "fixed",
    price: Number(row.price || 0),
    salePrice: Number(row.salePrice || 0),
    compareAtPrice: Number(row.compareAtPrice || 0),
    aiPriceMin: Number(row.aiPriceMin || 0),
    aiPriceMax: Number(row.aiPriceMax || 0),
    stock: Number(row.stock || 0),
    imagePolicy: row.imagePolicy || null,
    psdImageIndexes: String(
      row.imagePolicy?.psdImageIndexes ||
        row.imagePolicy?.imageIndexes ||
        row.imagePolicy?.indexes ||
        "",
    ),
    autoPublish: row.autoPublish !== false,
    isActive: row.isActive !== false,
  });
  dialogTitle.value = "编辑商品生成模板";
  dialogVisible.value = true;
};

const submitForm = async () => {
  if (!formRef.value) return;
  submitLoading.value = true;
  try {
    await formRef.value.validate();
    const imagePolicy =
      form.imagePolicy && typeof form.imagePolicy === "object" && !Array.isArray(form.imagePolicy)
        ? { ...form.imagePolicy }
        : {};
    if (form.psdImageIndexes) {
      imagePolicy.psdImageIndexes = String(form.psdImageIndexes).trim();
    } else {
      delete imagePolicy.psdImageIndexes;
    }
    const pricingMode = form.pricingMode === "ai" ? "ai" : "fixed";
    let salePrice = Math.max(0, Number(form.salePrice || 0));
    let price = Math.max(0, Number(form.price || 0));
    let compareAtPrice = Math.max(0, Number(form.compareAtPrice || 0));
    const aiPriceMin = Math.max(0, Number(form.aiPriceMin || 0));
    const aiPriceMax = Math.max(0, Number(form.aiPriceMax || 0));
    if (pricingMode === "fixed") {
      salePrice = salePrice > 0 ? salePrice : price;
      if (salePrice <= 0) throw new Error("请配置有效的固定价格");
      price = Math.max(price, salePrice);
      compareAtPrice = Math.max(compareAtPrice, price);
    } else if (aiPriceMin > 0 && aiPriceMax > 0 && aiPriceMin > aiPriceMax) {
      throw new Error("AI 最低售价不能高于最高售价");
    }
    const payload = {
      id: form.id,
      name: form.name,
      productType: normalizeProductType(form.productType),
      psdTemplateId: currentPsdTemplateBindingId.value || null,
      psdTemplateConfig: currentPsdTemplateBindingId.value
        ? parsePsdTemplateConfig(psdTemplateConfigText.value) ?? null
        : null,
      titlePrompt: form.titlePrompt,
      descriptionPrompt: form.descriptionPrompt,
      keywordPrompt: form.keywordPrompt,
      seoPrompt: form.seoPrompt,
      tags: form.tags,
      pricingMode,
      price,
      salePrice,
      compareAtPrice,
      aiPriceMin,
      aiPriceMax,
      stock: form.stock,
      autoPublish: form.autoPublish,
      isActive: form.isActive,
      imagePolicy: Object.keys(imagePolicy).length ? imagePolicy : null,
    };
    if (payload.id) {
      await productGenerationTemplateApi.update(payload);
      ElMessage.success("更新成功");
    } else {
      delete payload.id;
      await productGenerationTemplateApi.add(payload);
      ElMessage.success("创建成功");
    }
    dialogVisible.value = false;
    getList();
  } catch (error: any) {
    ElMessage.error(error?.message || "保存失败");
  } finally {
    submitLoading.value = false;
  }
};

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm(`确认删除商品生成模板“${row.name}”吗？`, "提示", {
    type: "warning",
    confirmButtonText: "确定",
    cancelButtonText: "取消",
  });
  await productGenerationTemplateApi.delete(row.id);
  ElMessage.success("删除成功");
  getList();
};

onMounted(() => {
  getList();
});
</script>

<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="product-generation-template-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="5">
                <el-form-item label="关键词">
                  <el-input
                    v-model="queryParams.searchText"
                    size="small"
                    clearable
                    placeholder="搜索模板名称/商品类型/标签"
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :loading="loading" @click="handleSearch">搜索</el-button>
              <el-button size="small" :disabled="loading" @click="resetQuery">重置</el-button>
              <el-button size="small" type="primary" @click="handleAdd">新增模板</el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid v-bind="gridOptions" :data="tableData" :loading="loading">
                <template #action="{ row }">
                  <div class="template-row-actions">
                    <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
                    <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
                  </div>
                </template>
              </vxe-grid>
            </div>
          </div>
        </div>
      </template>

      <template #pagination>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat">
          <pagination
            v-model:page="queryParams.page"
            v-model:limit="queryParams.pageSize"
            :total="total"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="76%" top="5vh">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="模板名称" prop="name">
              <el-input v-model="form.name" placeholder="例如：鼠标垫独立站模板" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="商品类型">
              <el-input
                v-model="form.productType"
                clearable
                placeholder="输入商品类型"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="绑定PSD模板">
              <div class="generation-template-psd-binding">
                <div
                  v-if="currentPsdTemplateBindingId"
                  class="generation-template-psd-binding__selected"
                >
                  <div class="generation-template-psd-option">
                    <div class="generation-template-psd-option__preview">
                      <el-image
                        v-if="selectedPsdTemplateBinding?.thumbnail"
                        :src="selectedPsdTemplateBinding.thumbnail"
                        :preview-src-list="[selectedPsdTemplateBinding.thumbnail]"
                        :initial-index="0"
                        preview-teleported
                        hide-on-click-modal
                        fit="cover"
                        class="generation-template-psd-option__image"
                      />
                      <div v-else class="generation-template-psd-option__placeholder">
                        暂无图
                      </div>
                    </div>
                    <div class="generation-template-psd-option__main">
                      <div class="generation-template-psd-option__name-row">
                        <span class="generation-template-psd-option__name">
                          {{ selectedPsdTemplateBinding?.name || "未命名模板" }}
                        </span>
                        <el-tag
                          v-if="selectedPsdTemplateBinding?.missing"
                          size="small"
                          type="danger"
                          effect="plain"
                        >
                          不可用
                        </el-tag>
                        <el-tag v-else size="small" type="success" effect="plain">
                          已选择
                        </el-tag>
                      </div>
                      <div class="generation-template-psd-option__id">
                        ID：{{ selectedPsdTemplateBinding?.id }}
                      </div>
                      <div
                        v-if="selectedPsdTemplateBinding?.createTime"
                        class="generation-template-psd-option__meta"
                      >
                        上传时间：{{ formatTimestamp(selectedPsdTemplateBinding.createTime) }}
                      </div>
                      <div
                        v-if="selectedPsdTemplateBinding?.description"
                        class="generation-template-psd-option__desc"
                      >
                        {{ selectedPsdTemplateBinding.description }}
                      </div>
                    </div>
                  </div>
                  <div class="generation-template-psd-binding__actions">
                    <el-button
                      size="small"
                      type="primary"
                      :loading="psdTemplateBindingHydrating"
                      @click="openPsdTemplatePicker"
                    >
                      更换模板
                    </el-button>
                    <el-button
                      size="small"
                      :disabled="psdTemplateBindingHydrating"
                      @click="clearPsdTemplateBinding"
                    >
                      清空
                    </el-button>
                  </div>
                </div>
                <div v-else class="generation-template-psd-binding__empty">
                  <span>未绑定PSD模板</span>
                  <el-button
                    type="primary"
                    :loading="psdTemplateBindingHydrating"
                    @click="openPsdTemplatePicker"
                  >
                    选择PSD模板
                  </el-button>
                </div>
              </div>
            </el-form-item>
          </el-col>
          <el-col v-if="currentPsdTemplateBindingId" :span="24">
            <el-form-item label="PSD配置">
              <div class="generation-template-psd-config">
                <el-input
                  v-model="psdTemplateConfigText"
                  type="textarea"
                  :autosize="{ minRows: 6, maxRows: 16 }"
                  placeholder='请输入PSD配置快照，支持JSON或JS对象格式，例如：{"images":[]}'
                />
                <el-button
                  size="small"
                  text
                  type="primary"
                  @click="applyPsdTemplateDefaultConfig"
                >
                  恢复模板默认配置
                </el-button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="价格策略">
              <el-segmented v-model="form.pricingMode" :options="pricingModeOptions" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="库存">
              <el-input-number v-model="form.stock" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <template v-if="form.pricingMode === 'fixed'">
            <el-col :span="8">
              <el-form-item label="售价">
                <el-input-number v-model="form.salePrice" :min="0" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="原价">
                <el-input-number v-model="form.price" :min="0" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="划线价">
                <el-input-number
                  v-model="form.compareAtPrice"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </template>
          <template v-else>
            <el-col :span="12">
              <el-form-item label="AI 最低售价">
                <el-input-number v-model="form.aiPriceMin" :min="0" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="AI 最高售价">
                <el-input-number v-model="form.aiPriceMax" :min="0" :precision="2" style="width: 100%" />
              </el-form-item>
            </el-col>
          </template>
          <el-col :span="24">
            <el-form-item label="标签">
              <el-input v-model="form.tags" placeholder="多个标签用逗号分隔" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="套图图片序号">
              <el-input
                v-model="form.psdImageIndexes"
                placeholder="例如：1,3,5 或 2-4；留空则使用全部套图图片"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="标题提示词">
              <el-input v-model="form.titlePrompt" type="textarea" :rows="3" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="描述提示词">
              <el-input v-model="form.descriptionPrompt" type="textarea" :rows="3" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关键词提示词">
              <el-input v-model="form.keywordPrompt" type="textarea" :rows="3" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="SEO提示词">
              <el-input
                v-model="form.seoPrompt"
                type="textarea"
                :rows="3"
                placeholder="补充SEO标题、描述和URL别名的专项要求"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生成后发布">
              <el-switch v-model="form.autoPublish" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="启用">
              <el-switch v-model="form.isActive" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="psdTemplatePickerVisible"
      title="选择PSD模板"
      :fullscreen="true"
      append-to-body
      class="generation-template-psd-picker-dialog"
    >
      <div class="generation-template-psd-picker">
        <div class="generation-template-psd-picker__toolbar">
          <el-input
            v-model="psdTemplatePickerSearchText"
            clearable
            placeholder="搜索模板名称、描述或ID"
            class="generation-template-psd-picker__search"
            @keyup.enter="handlePsdTemplatePickerSearch"
            @clear="resetPsdTemplatePickerSearch"
          />
          <el-button
            type="primary"
            :loading="psdTemplatePickerLoading"
            @click="handlePsdTemplatePickerSearch"
          >
            搜索
          </el-button>
          <el-button
            :disabled="psdTemplatePickerLoading"
            @click="resetPsdTemplatePickerSearch"
          >
            重置
          </el-button>
        </div>

        <div class="generation-template-psd-picker__body common-table">
          <vxe-table
            border="inner"
            size="mini"
            :height="psdTemplatePickerTableHeight"
            :loading="psdTemplatePickerLoading"
            :data="psdTemplatePickerRows"
            empty-text="没有找到可用PSD模板"
            row-id="id"
            header-cell-class-name="common-table__header-cell"
            cell-class-name="common-table__body-cell"
            class="generation-template-psd-picker__table"
          >
            <vxe-column title="预览" field="thumbnail" width="132">
              <template #default="{ row }">
                <div class="generation-template-psd-picker-preview">
                  <el-image
                    v-if="row.thumbnail"
                    :src="row.thumbnail"
                    :preview-src-list="[row.thumbnail]"
                    :initial-index="0"
                    preview-teleported
                    hide-on-click-modal
                    fit="cover"
                    class="generation-template-psd-picker-preview__image"
                  />
                  <span v-else>暂无图</span>
                </div>
              </template>
            </vxe-column>
            <vxe-column title="模板信息" field="name" min-width="320">
              <template #default="{ row }">
                <div class="generation-template-psd-picker-info">
                  <div class="generation-template-psd-picker-info__name-row">
                    <strong>{{ row.name || "未命名模板" }}</strong>
                    <el-tag
                      v-if="currentPsdTemplateBindingId === row.id"
                      size="small"
                      type="success"
                      effect="plain"
                    >
                      当前
                    </el-tag>
                  </div>
                  <div class="generation-template-psd-picker-info__secondary">
                    ID：{{ row.id }}
                  </div>
                  <div
                    v-if="row.description"
                    class="generation-template-psd-picker-info__description"
                  >
                    {{ row.description }}
                  </div>
                </div>
              </template>
            </vxe-column>
            <vxe-column title="上传时间" field="createTime" width="180">
              <template #default="{ row }">
                {{ row.createTime ? formatTimestamp(row.createTime) : "-" }}
              </template>
            </vxe-column>
            <vxe-column title="操作" width="110" fixed="right" align="center">
              <template #default="{ row }">
                <el-button
                  size="small"
                  type="primary"
                  :plain="currentPsdTemplateBindingId !== row.id"
                  @click="selectPsdTemplateBinding(row)"
                >
                  {{ currentPsdTemplateBindingId === row.id ? "已选择" : "选择" }}
                </el-button>
              </template>
            </vxe-column>
          </vxe-table>
        </div>
      </div>
      <template #footer>
        <div class="generation-template-psd-picker__footer">
          <span class="generation-template-psd-picker__total">
            共 {{ psdTemplatePickerTotal }} 个模板
          </span>
          <el-pagination
            v-model:current-page="psdTemplatePickerPage"
            v-model:page-size="psdTemplatePickerPageSize"
            background
            layout="sizes, prev, pager, next, jumper"
            :page-sizes="[12, 24, 48]"
            :total="psdTemplatePickerTotal"
            @current-change="handlePsdTemplatePickerPageChange"
            @size-change="handlePsdTemplatePickerSizeChange"
          />
          <el-button @click="psdTemplatePickerVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<style scoped>
:deep(.product-generation-template-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.product-generation-template-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.product-generation-template-page .list-page-filter--flat) {
  padding-bottom: 10px;
}

:deep(.product-generation-template-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}

.template-row-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
  white-space: nowrap;
}

:deep(.generation-template-psd-picker-dialog) {
  display: flex;
  height: 100vh;
  margin: 0;
  flex-direction: column;
}

:deep(.generation-template-psd-picker-dialog .el-dialog__header) {
  flex-shrink: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.generation-template-psd-picker-dialog .el-dialog__body) {
  flex: 1;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  background: var(--el-fill-color-light);
}

:deep(.generation-template-psd-picker-dialog .el-dialog__footer) {
  flex-shrink: 0;
  padding: 12px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.generation-template-psd-binding {
  width: 100%;
}

.generation-template-psd-binding__selected {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: flex-start;
}

.generation-template-psd-binding__actions {
  display: flex;
  gap: 8px;
  padding-top: 14px;
}

.generation-template-psd-binding__empty {
  display: flex;
  padding: 14px;
  color: var(--el-text-color-secondary);
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.generation-template-psd-option {
  display: flex;
  min-width: 0;
  padding: 14px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  align-items: flex-start;
  gap: 14px;
}

.generation-template-psd-option__preview {
  width: 60px;
  height: 60px;
  overflow: hidden;
  background: var(--el-fill-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  flex: 0 0 60px;
}

.generation-template-psd-option__image,
.generation-template-psd-option__preview :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.generation-template-psd-option__placeholder {
  display: flex;
  width: 100%;
  height: 100%;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  align-items: center;
  justify-content: center;
}

.generation-template-psd-option__main {
  flex: 1;
  min-width: 0;
}

.generation-template-psd-option__name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.generation-template-psd-option__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.generation-template-psd-option__id,
.generation-template-psd-option__meta,
.generation-template-psd-option__desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.generation-template-psd-option__id {
  word-break: break-all;
}

.generation-template-psd-option__desc {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.generation-template-psd-config {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
}

.generation-template-psd-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  padding: 12px 16px;
  box-sizing: border-box;
}

.generation-template-psd-picker__toolbar,
.generation-template-psd-picker__footer {
  display: flex;
  align-items: center;
  gap: 10px;
}

.generation-template-psd-picker__toolbar {
  flex-shrink: 0;
}

.generation-template-psd-picker__search {
  width: min(100%, 460px);
}

.generation-template-psd-picker__body {
  min-height: 0;
  overflow: hidden;
  background: var(--el-bg-color);
  border-radius: 8px;
  flex: 1;
}

.generation-template-psd-picker-preview {
  display: flex;
  width: 96px;
  height: 96px;
  overflow: hidden;
  color: var(--el-text-color-placeholder);
  background: var(--el-fill-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  align-items: center;
  justify-content: center;
}

.generation-template-psd-picker-preview__image,
.generation-template-psd-picker-preview :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.generation-template-psd-picker-info {
  min-width: 0;
  padding: 4px 0;
}

.generation-template-psd-picker-info__name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.generation-template-psd-picker-info__secondary,
.generation-template-psd-picker-info__description {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.generation-template-psd-picker-info__secondary {
  word-break: break-all;
}

.generation-template-psd-picker-info__description {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.generation-template-psd-picker__footer {
  justify-content: flex-end;
  gap: 14px;
}

.generation-template-psd-picker__total {
  margin-right: auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

@media (width <= 768px) {
  .generation-template-psd-binding__selected {
    grid-template-columns: 1fr;
  }

  .generation-template-psd-binding__actions,
  .generation-template-psd-picker__toolbar,
  .generation-template-psd-picker__footer {
    flex-wrap: wrap;
  }

  .generation-template-psd-picker__search {
    width: 100%;
  }
}
</style>
