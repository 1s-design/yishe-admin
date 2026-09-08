<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="vendor-product-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col :xs="24" :sm="12" :md="6" :lg="5" :xl="4">
                <el-form-item label="所属厂家">
                  <el-select
                    v-model="queryParams.vendorId"
                    clearable
                    filterable
                    size="small"
                    placeholder="全部厂家"
                    style="width: 100%"
                    @change="handleSearch"
                  >
                    <el-option
                      v-for="vendor in vendors"
                      :key="vendor.id"
                      :label="vendor.name"
                      :value="vendor.id"
                    />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="6" :lg="4" :xl="3">
                <el-form-item label="供货状态">
                  <el-select
                    v-model="queryParams.status"
                    clearable
                    size="small"
                    placeholder="全部状态"
                    style="width: 100%"
                    @change="handleSearch"
                  >
                    <el-option label="全部状态" value="" />
                    <el-option label="正常供货" value="normal" />
                    <el-option label="库存紧张" value="low_stock" />
                    <el-option label="暂时缺货" value="out_of_stock" />
                    <el-option label="已停产" value="discontinued" />
                    <el-option label="打样开发中" value="sampling" />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="5">
                <el-form-item label="关键词">
                  <el-input
                    v-model="queryParams.search"
                    clearable
                    size="small"
                    placeholder="按编码(PRO)/名称/型号/规格搜索"
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                  />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :sm="12" :md="6" :lg="5" :xl="4">
                <el-form-item label="参考价格区间 (¥)">
                  <div class="flex items-center gap-1">
                    <el-input-number
                      v-model="queryParams.minPrice"
                      :min="0"
                      :precision="2"
                      :controls="false"
                      placeholder="最低"
                      size="small"
                      style="width: 100%"
                    />
                    <span class="text-xs text-[var(--el-text-color-secondary)]">-</span>
                    <el-input-number
                      v-model="queryParams.maxPrice"
                      :min="0"
                      :precision="2"
                      :controls="false"
                      placeholder="最高"
                      size="small"
                      style="width: 100%"
                    />
                  </div>
                </el-form-item>
              </el-col>
            </el-row>

            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading" @click="handleSearch">
                搜索
              </el-button>
              <el-button size="small" :icon="Refresh" :disabled="loading" @click="resetQuery">
                重置
              </el-button>
              <el-button size="small" type="primary" :icon="Plus" @click="openDialog()">
                新增供应商商品
              </el-button>
              <el-button
                size="small"
                type="danger"
                plain
                :disabled="!selectedIds.length"
                @click="handleBatchDelete"
              >
                批量删除
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
                :data="list"
                :loading="loading"
                @checkbox-change="handleCheckboxChange"
                @checkbox-all="handleCheckboxAll"
              >
                <template #codeSlot="{ row }">
                  <span class="font-mono text-xs font-semibold text-[var(--el-color-primary)]">
                    {{ row.code || '-' }}
                  </span>
                </template>

                <template #vendorSlot="{ row }">
                  <span
                    class="cursor-pointer hover:text-[var(--el-color-primary)] font-medium"
                    @click="filterByVendor(row.vendorId)"
                  >
                    {{ row.vendor?.name || getVendorName(row.vendorId) }}
                  </span>
                </template>

                <template #statusSlot="{ row }">
                  <el-tag size="small" :type="getProductStatusTagType(row.status)">
                    {{ getProductStatusLabel(row.status) }}
                  </el-tag>
                </template>

                <template #priceSlot="{ row }">
                  <div class="text-xs">
                    <span class="font-semibold text-amber-500">
                      {{
                        row.price === null || row.price === undefined || row.price === ""
                          ? "-"
                          : `¥${Number(row.price).toFixed(2)}`
                      }}
                    </span>
                    <div class="text-[10px] text-[var(--el-text-color-secondary)] flex gap-1">
                      <span v-if="row.taxIncluded">含税</span>
                      <span v-if="row.shippingIncluded">包邮</span>
                    </div>
                  </div>
                </template>

                <template #leadTimeSlot="{ row }">
                  <div class="text-xs text-[var(--el-text-color-secondary)]">
                    <div v-if="row.sampleLeadTime !== null && row.sampleLeadTime !== undefined">
                      打样: {{ row.sampleLeadTime }}天
                    </div>
                    <div v-if="row.productionLeadTime !== null && row.productionLeadTime !== undefined">
                      大货: {{ row.productionLeadTime }}天
                    </div>
                    <span v-if="row.sampleLeadTime == null && row.productionLeadTime == null">-</span>
                  </div>
                </template>

                <template #customAttributesSlot="{ row }">
                  <div class="flex flex-wrap gap-1" v-if="row.customAttributes?.length">
                    <el-tooltip
                      v-for="(attr, i) in row.customAttributes"
                      :key="i"
                      :content="`${attr.name}: ${attr.value}`"
                      placement="top"
                    >
                      <el-tag size="small" type="info" effect="plain" class="text-xs">
                        {{ attr.name }}: {{ attr.value }}
                      </el-tag>
                    </el-tooltip>
                  </div>
                  <span v-else class="text-xs text-[var(--el-text-color-secondary)]">-</span>
                </template>

                <template #imagesSlot="{ row }">
                  <div class="vendor-product-images" v-if="row.images?.length">
                    <el-image
                      v-for="(image, index) in row.images.slice(0, 3)"
                      :key="`${image}-${index}`"
                      :src="image"
                      fit="cover"
                      class="vendor-product-images__item"
                      :preview-src-list="row.images"
                      :initial-index="Number(index)"
                      preview-teleported
                    />
                    <span v-if="row.images.length > 3" class="vendor-product-images__more"
                      >+{{ row.images.length - 3 }}</span
                    >
                  </div>
                  <span v-else>-</span>
                </template>

                <template #createTimeSlot="{ row }">
                  <span class="table-time-text">{{ formatDate(row.createTime) }}</span>
                </template>

                <template #operationSlot="{ row }">
                  <el-dropdown
                    placement="bottom-end"
                    @command="(command) => handleOperationCommand(String(command), row)"
                  >
                    <el-button type="primary" link size="small">操作</el-button>
                    <template #dropdown>
                      <el-dropdown-menu class="operation-menu-compact">
                        <el-dropdown-item command="edit">编辑</el-dropdown-item>
                        <el-dropdown-item
                          command="delete"
                          divided
                          class="operation-menu-item--danger"
                          >删除</el-dropdown-item
                        >
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
        <Pagination
          v-model:page="queryParams.currentPage"
          v-model:limit="queryParams.pageSize"
          :total="total"
          @pagination="loadData"
        />
      </template>
    </ListPageLayout>

    <!-- Fullscreen Product Add/Edit Dialog (Shared Component) -->
    <VendorProductDialog ref="productDialogRef" @success="loadData" />
  </ContentWrap>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch, watchEffect } from "vue";
import { useWindowSize } from "@vueuse/core";
import { useRoute } from "vue-router";
import {
  ElMessage,
  ElMessageBox,
} from "element-plus";
import { Delete, Plus, Refresh, Search } from "@element-plus/icons-vue";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import {
  batchDeleteVendorProduct,
  deleteVendorProduct,
  getVendorList,
  getVendorProductList,
  type PageResult,
  type Vendor,
  type VendorProductItem,
} from "@/api/vendor";
import { formatDate } from "@/utils/formatTime";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import { createImageViewer } from "@/components/ImageViewer";
import VendorProductDialog from "./components/VendorProductDialog.vue";

const route = useRoute();
const loading = ref(false);
const productDialogRef = ref();
const list = ref<VendorProductItem[]>([]);
const total = ref(0);
const vendors = ref<Vendor[]>([]);
const selectedIds = ref<number[]>([]);

const queryParams = reactive({
  currentPage: 1,
  pageSize: 10,
  vendorId: undefined as number | undefined,
  status: "",
  search: "",
  minPrice: undefined as number | undefined,
  maxPrice: undefined as number | undefined,
});

const getProductStatusLabel = (status?: string) => {
  const map: Record<string, string> = {
    normal: "正常供货",
    low_stock: "库存紧张",
    out_of_stock: "暂时缺货",
    discontinued: "已停产",
    sampling: "打样中",
  };
  return (status && map[status]) || status || "正常供货";
};

const getProductStatusTagType = (status?: string): "success" | "warning" | "info" | "danger" => {
  const map: Record<string, "success" | "warning" | "info" | "danger"> = {
    normal: "success",
    low_stock: "warning",
    out_of_stock: "danger",
    discontinued: "info",
    sampling: "warning",
  };
  return (status && map[status]) || "success";
};

const { height } = useWindowSize();

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: { keyField: "id" },
  checkboxConfig: { reserve: true },
  columns: [
    { type: "checkbox", width: 48 },
    { title: "ID", field: "id", width: 70 },
    { title: "唯一编码", field: "code", width: 120, slots: { default: "codeSlot" } },
    { title: "产品图", field: "images", width: 130, slots: { default: "imagesSlot" } },
    { title: "供应商", field: "vendorId", minWidth: 150, slots: { default: "vendorSlot" } },
    { title: "商品名称", field: "name", minWidth: 150 },
    { title: "型号", field: "model", width: 110, showOverflow: "tooltip" },
    { title: "供货状态", field: "status", width: 95, slots: { default: "statusSlot" } },
    { title: "参考单价", field: "price", width: 110, slots: { default: "priceSlot" } },
    { title: "起订量(MOQ)", field: "moq", width: 100 },
    { title: "交期", width: 110, slots: { default: "leadTimeSlot" } },
    { title: "规格/尺寸", field: "size", width: 120, showOverflow: "tooltip" },
    { title: "扩展属性", minWidth: 160, slots: { default: "customAttributesSlot" } },
    { title: "单位", field: "unit", width: 70 },
    { title: "备注", field: "remark", minWidth: 160, showOverflow: "tooltip" },
    { ...buildTimeColumn("创建时间", "createTime", 170), slots: { default: "createTimeSlot" } },
    buildOperationColumn("operationSlot"),
  ],
});

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const getVendorName = (vendorId?: number) =>
  vendors.value.find((item) => Number(item.id) === Number(vendorId))?.name || "-";

const filterByVendor = (vendorId?: number) => {
  queryParams.vendorId = vendorId;
  handleSearch();
};

const updateSelectedIds = (records: VendorProductItem[] = []) => {
  selectedIds.value = (records || [])
    .map((item) => Number(item.id))
    .filter((id) => Number.isInteger(id) && id > 0);
};

const loadVendors = async () => {
  try {
    const res = await getVendorList();
    if (res && typeof res === "object" && "list" in res) {
      vendors.value = (res as PageResult<Vendor>).list || [];
    } else if (Array.isArray(res)) {
      vendors.value = res;
    }
  } catch {}
};

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getVendorProductList({
      page: queryParams.currentPage,
      pageSize: queryParams.pageSize,
      vendorId: queryParams.vendorId || undefined,
      status: queryParams.status || undefined,
      search: queryParams.search.trim() || undefined,
      minPrice: queryParams.minPrice,
      maxPrice: queryParams.maxPrice,
    });

    if (res && typeof res === "object" && "list" in res && "total" in res) {
      const paged = res as PageResult<VendorProductItem>;
      list.value = Array.isArray(paged.list) ? paged.list : [];
      total.value = Number(paged.total) || 0;
    } else if (Array.isArray(res)) {
      list.value = res;
      total.value = res.length;
    } else {
      list.value = [];
      total.value = 0;
    }

    selectedIds.value = [];
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  queryParams.currentPage = 1;
  loadData();
};

const resetQuery = () => {
  queryParams.vendorId = undefined;
  queryParams.status = "";
  queryParams.search = "";
  queryParams.minPrice = undefined;
  queryParams.maxPrice = undefined;
  handleSearch();
};

const openDialog = (row?: VendorProductItem) => {
  productDialogRef.value?.open(row, queryParams.vendorId);
};

const handleOperationCommand = (command: string, row: VendorProductItem) => {
  if (command === "edit") {
    openDialog(row);
    return;
  }
  if (command === "delete") {
    handleDelete(row.id);
  }
};

const handleDelete = async (id?: number) => {
  if (!id) return;
  try {
    await ElMessageBox.confirm("确认删除该供应商商品吗？", "提示", {
      type: "warning",
    });
    await deleteVendorProduct(id);
    ElMessage.success("删除成功");
    await loadData();
  } catch {}
};

const handleCheckboxChange = ({ records }: any) => {
  updateSelectedIds(records);
};

const handleCheckboxAll = ({ records }: any) => {
  updateSelectedIds(records);
};

const handleBatchDelete = async () => {
  if (!selectedIds.value.length) return;
  try {
    await ElMessageBox.confirm(
      `确认批量删除 ${selectedIds.value.length} 个供应商商品吗？`,
      "提示",
      { type: "warning" },
    );
    await batchDeleteVendorProduct(selectedIds.value);
    ElMessage.success("批量删除成功");
    await loadData();
  } catch {}
};

watch(
  () => route.query.vendorId,
  (vendorId) => {
    const numericVendorId = Number(vendorId);
    queryParams.vendorId =
      Number.isInteger(numericVendorId) && numericVendorId > 0 ? numericVendorId : undefined;
  },
  { immediate: true },
);

onMounted(async () => {
  await loadVendors();
  await loadData();
});
</script>

<style scoped lang="scss">
:deep(.vendor-product-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.vendor-product-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.vendor-product-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

.vendor-product-fullscreen-dialog :deep(.el-dialog__body) {
  padding: 16px 24px;
}

.dialog-section {
  padding: 16px 18px 10px;
  margin-bottom: 16px;
  background: var(--app-content-surface-color);
  border: 1px solid var(--app-content-border-color);
  border-radius: 12px;
}

.dialog-section-title {
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.vendor-product-form__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 6px;
}

.vendor-product-image-upload :deep(.el-upload--picture-card),
.vendor-product-image-upload :deep(.el-upload-list__item) {
  width: 110px;
  height: 110px;
  border-radius: 10px;
}

.vendor-product-images {
  display: flex;
  align-items: center;
  gap: 4px;
}

.vendor-product-images__item {
  width: 36px;
  height: 36px;
  border-radius: 4px;
}

.vendor-product-images__more {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
</style>
