<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="vendor-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col
                class="list-page-search-form__col--wide"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="6"
                :xl="5"
              >
                <el-form-item label="关键词">
                  <el-input
                    v-model="queryParams.search"
                    size="small"
                    placeholder="搜索编码/名称/联系人/电话/地址"
                    clearable
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button
                size="small"
                type="primary"
                :icon="Search"
                :loading="loading"
                @click="handleSearch"
                >搜索</el-button
              >
              <el-button size="small" :icon="Refresh" :disabled="loading" @click="resetQuery"
                >重置</el-button
              >
              <el-button size="small" type="primary" :icon="Plus" @click="openDialog()"
                >新增厂家</el-button
              >
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
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
                :data="pagedList"
                :loading="loading"
                @checkbox-change="handleCheckboxChange"
                @checkbox-all="handleCheckboxAll"
              >
                <template #imagesSlot="{ row }">
                  <div class="table-image-group">
                    <template v-if="row.images?.length">
                      <el-image
                        v-for="image in row.images.slice(0, 3)"
                        :key="image"
                        :src="image"
                        fit="cover"
                        :preview-src-list="row.images"
                        preview-teleported
                        class="table-thumb table-thumb--sm"
                      />
                      <span v-if="row.images.length > 3" class="table-thumb-count"
                        >+{{ row.images.length - 3 }}</span
                      >
                    </template>
                    <span v-else class="text-xs text-[var(--el-text-color-secondary)]">-</span>
                  </div>
                </template>

                <template #createTimeSlot="{ row }">
                  <span class="table-time-text">{{ formatDate(row.createTime) }}</span>
                </template>

                <template #uploaderSlot="{ row }">
                  <span>{{
                    row?.uploader?.account || row?.uploader?.name || row?.userId || "-"
                  }}</span>
                </template>

                <template #productsSlot="{ row }">
                  <div class="vendor-products-summary">
                    <template v-if="row.products?.length">
                      <div class="vendor-products-summary__count">
                        {{ buildProductSummary(row.products).countText }}
                      </div>
                      <div class="vendor-products-summary__names">
                        {{ buildProductSummary(row.products).previewText }}
                      </div>
                    </template>
                    <span v-else class="text-xs text-[var(--el-text-color-secondary)]">-</span>
                  </div>
                </template>

                <template #operationSlot="{ row }">
                  <div class="flex justify-start">
                    <el-dropdown
                      class="operation-dropdown"
                      placement="bottom-end"
                      @command="(command) => handleOperationCommand(String(command), row)"
                    >
                      <el-button type="primary" link size="small" class="operation-trigger-button"
                        >操作</el-button
                      >
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item command="edit">
                            <el-icon><Edit /></el-icon>
                            <span>编辑</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="products">
                            <el-icon><Goods /></el-icon>
                            <span>商品</span>
                          </el-dropdown-item>
                          <el-dropdown-item
                            command="delete"
                            divided
                            class="operation-menu-item--danger"
                          >
                            <el-icon><Delete /></el-icon>
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
        <Pagination
          v-model:page="queryParams.currentPage"
          v-model:limit="queryParams.pageSize"
          :total="list.length"
          @pagination="handlePaginationChange"
        />
      </template>
    </ListPageLayout>

    <VendorDialog ref="dialogRef" @success="getList" />
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watchEffect } from "vue";
import { useWindowSize } from "@vueuse/core";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Goods, Plus, Refresh, Search } from "@element-plus/icons-vue";
import type { VendorProductItem } from "@/api/vendor";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import { batchDeleteVendor, deleteVendor, getVendorList } from "@/api/vendor";
import VendorDialog from "./components/VendorDialog.vue";
import { formatDate } from "@/utils/formatTime";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import Pagination from "@/components/Pagination/index.vue";

const loading = ref(false);
const list = ref<any[]>([]);
const dialogRef = ref();
const selectedIds = ref<number[]>([]);
const router = useRouter();
const queryParams = reactive({
  currentPage: 1,
  pageSize: 10,
  search: "",
});

const pagedList = computed(() => {
  const currentPage = Math.max(1, Number(queryParams.currentPage) || 1);
  const pageSize = Math.max(1, Number(queryParams.pageSize) || 10);
  const start = (currentPage - 1) * pageSize;
  return list.value.slice(start, start + pageSize);
});

const updateSelectedIds = (records: any[]) => {
  selectedIds.value = (records || [])
    .map((item) => Number(item.id))
    .filter((id) => Number.isInteger(id) && id > 0);
};

const buildProductSummary = (products: VendorProductItem[] = []) => {
  const productNames = Array.from(
    new Set(products.map((item) => String(item?.name || "").trim()).filter(Boolean)),
  );
  return {
    countText: `${productNames.length} 个商品 / ${products.length} 个型号`,
    previewText: productNames.slice(0, 3).join("、") + (productNames.length > 3 ? "..." : ""),
  };
};

const { height } = useWindowSize();

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: {
    keyField: "id",
  },
  checkboxConfig: {
    reserve: true,
  },
  columns: [
    { type: "checkbox", width: 48 },
    { title: "ID", field: "id", width: 80 },
    { title: "厂家编码", field: "code", width: 140 },
    { title: "厂家名称", field: "name", minWidth: 180 },
    { title: "联系人", field: "contactName", width: 120 },
    { title: "联系电话", field: "contactPhone", width: 140 },
    { title: "商品概览", field: "products", minWidth: 240, slots: { default: "productsSlot" } },
    { title: "图片", field: "images", width: 180, slots: { default: "imagesSlot" } },
    { title: "地址", field: "address", minWidth: 220, showOverflow: "tooltip" },
    { title: "描述", field: "description", minWidth: 240, showOverflow: "tooltip" },
    { title: "创建者", field: "uploader", width: 120, slots: { default: "uploaderSlot" } },
    { ...buildTimeColumn("创建时间", "createTime", 180), slots: { default: "createTimeSlot" } },
    buildOperationColumn("operationSlot"),
  ],
});

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const getList = async () => {
  loading.value = true;
  try {
    const data = await getVendorList({
      search: queryParams.search.trim() || undefined,
    });
    list.value = Array.isArray(data) ? data : [];
    const maxPage = Math.max(1, Math.ceil(list.value.length / queryParams.pageSize));
    if (queryParams.currentPage > maxPage) {
      queryParams.currentPage = maxPage;
    }
    selectedIds.value = [];
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  queryParams.currentPage = 1;
  getList();
};

const resetQuery = () => {
  queryParams.search = "";
  handleSearch();
};

const handlePaginationChange = () => {
  selectedIds.value = [];
};

const openDialog = (id?: number) => {
  dialogRef.value?.open(id);
};

const handleOperationCommand = (command: string, row: any) => {
  switch (command) {
    case "edit":
      openDialog(row.id);
      break;
    case "products":
      router.push({ path: "/operation/vendor-product", query: { vendorId: row.id } });
      break;
    case "delete":
      handleDelete(row.id);
      break;
  }
};

const handleCheckboxChange = ({ records }: any) => {
  updateSelectedIds(records);
};

const handleCheckboxAll = ({ records }: any) => {
  updateSelectedIds(records);
};

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm("确认删除该厂家吗？删除后会同步清理对应的 COS 图片。", "提示", {
      type: "warning",
    });
    await deleteVendor(id);
    ElMessage.success("删除成功");
    await getList();
  } catch {}
};

const handleBatchDelete = async () => {
  if (!selectedIds.value.length) return;
  try {
    await ElMessageBox.confirm(
      `确认批量删除 ${selectedIds.value.length} 个厂家吗？删除后会同步清理对应的 COS 图片。`,
      "提示",
      { type: "warning" },
    );
    await batchDeleteVendor(selectedIds.value);
    ElMessage.success("批量删除成功");
    await getList();
  } catch {}
};

onMounted(() => {
  getList();
});
</script>

<style scoped lang="scss">
:deep(.vendor-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.vendor-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.vendor-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

.vendor-products-summary__count {
  font-size: 12px;
  color: var(--el-text-color-primary);
}

.vendor-products-summary__names {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}
</style>
