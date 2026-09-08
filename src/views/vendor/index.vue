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
                    placeholder="搜索编码/名称/联系人/电话/微信/地址"
                    clearable
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                  />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="6" :lg="4" :xl="4">
                <el-form-item label="合作状态">
                  <el-select
                    v-model="queryParams.status"
                    size="small"
                    clearable
                    placeholder="全部合作状态"
                    style="width: 100%"
                    @change="handleSearch"
                  >
                    <el-option label="全部状态" value="" />
                    <el-option label="正常合作" value="active" />
                    <el-option label="考察备选" value="evaluating" />
                    <el-option label="暂停合作" value="suspended" />
                    <el-option label="淘汰拉黑" value="blacklisted" />
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

                <template #nameSlot="{ row }">
                  <span class="vendor-name-text font-semibold tracking-wide">
                    {{ row.name || '-' }}
                  </span>
                </template>

                <template #shopUrlsSlot="{ row }">
                  <div
                    v-if="(row.shopUrls && row.shopUrls.length) || row.shopUrl"
                    class="vendor-flat-links flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
                  >
                    <template v-if="row.shopUrls && row.shopUrls.length">
                      <div
                        v-for="(item, idx) in row.shopUrls"
                        :key="idx"
                        class="inline-flex items-center"
                      >
                        <a
                          :href="getSafeLink(item.url)"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="vendor-flat-link inline-flex items-center gap-0.5 text-xs text-[var(--el-color-primary)] hover:underline"
                          @click.stop
                        >
                          <span>{{ item.name || '主页' }}</span>
                          <el-icon :size="11"><TopRight /></el-icon>
                        </a>
                        <span
                          v-if="idx < row.shopUrls.length - 1"
                          class="ml-2 text-[var(--el-border-color)] select-none"
                        >/</span>
                      </div>
                    </template>
                    <template v-else-if="row.shopUrl">
                      <a
                        :href="getSafeLink(row.shopUrl)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="vendor-flat-link inline-flex items-center gap-0.5 text-xs text-[var(--el-color-primary)] hover:underline"
                        @click.stop
                      >
                        <span>主页</span>
                        <el-icon :size="11"><TopRight /></el-icon>
                      </a>
                    </template>
                  </div>
                  <span v-else class="text-xs text-[var(--el-text-color-secondary)]">-</span>
                </template>

                <template #statusSlot="{ row }">
                  <el-tag size="small" :type="getVendorStatusTagType(row.status)">
                    {{ getVendorStatusLabel(row.status) }}
                  </el-tag>
                </template>

                <template #categoryTagsSlot="{ row }">
                  <div class="flex flex-wrap gap-1.5" v-if="row.categoryTags?.length">
                    <el-tag
                      v-for="(tag, idx) in row.categoryTags"
                      :key="idx"
                      size="small"
                      :type="getTagColorType(tag, idx)"
                      effect="light"
                      class="vendor-category-tag font-medium"
                    >
                      {{ tag }}
                    </el-tag>
                  </div>
                  <span v-else class="text-xs text-[var(--el-text-color-secondary)]">-</span>
                </template>

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

                <template #contactSlot="{ row }">
                  <div class="text-xs">
                    <div>{{ row.contactName || '-' }}</div>
                    <div v-if="row.contactPhone" class="text-[var(--el-text-color-secondary)]">
                      {{ row.contactPhone }}
                    </div>
                    <div v-if="row.wechat" class="text-[var(--el-color-primary)]">
                      微: {{ row.wechat }}
                    </div>
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
                  <div
                    class="vendor-products-summary cursor-pointer hover:text-[var(--el-color-primary)]"
                    @click="openProductsModal(row)"
                  >
                    <template v-if="row.products?.length">
                      <div class="vendor-products-summary__count font-semibold flex items-center gap-1">
                        <span>{{ buildProductSummary(row.products).countText }}</span>
                        <el-tag size="small" type="primary" effect="light">查看旗下商品</el-tag>
                      </div>
                      <div class="vendor-products-summary__names">
                        {{ buildProductSummary(row.products).previewText }}
                      </div>
                    </template>
                    <div v-else class="flex items-center gap-1 text-xs text-[var(--el-text-color-secondary)]">
                      <span>暂无商品</span>
                      <el-button link type="primary" size="small">+ 录入</el-button>
                    </div>
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
                          <el-dropdown-item command="productsModal">
                            <el-icon><Goods /></el-icon>
                            <span>旗下商品</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="edit">
                            <el-icon><Edit /></el-icon>
                            <span>编辑厂家</span>
                          </el-dropdown-item>
                          <el-dropdown-item
                            :command="isVendorDisabled(row.status) ? 'enable' : 'disable'"
                            divided
                          >
                            <el-icon v-if="isVendorDisabled(row.status)"><Unlock /></el-icon>
                            <el-icon v-else><Lock /></el-icon>
                            <span>{{ isVendorDisabled(row.status) ? '启用厂家' : '禁用厂家' }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="products">
                            <el-icon><Tickets /></el-icon>
                            <span>前往商品库</span>
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
          :total="total"
          @pagination="getList"
        />
      </template>
    </ListPageLayout>

    <VendorDialog ref="dialogRef" @success="getList" />
    <VendorProductsModal ref="productsModalRef" @updated="getList" />
  </ContentWrap>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watchEffect } from "vue";
import { useWindowSize } from "@vueuse/core";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Check, Close, Delete, Edit, Goods, Lock, Plus, Refresh, Search, Switch, Tickets, TopRight, Unlock } from "@element-plus/icons-vue";
import type { PageResult, Vendor, VendorProductItem } from "@/api/vendor";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import { batchDeleteVendor, deleteVendor, getVendorList, updateVendor } from "@/api/vendor";
import VendorDialog from "./components/VendorDialog.vue";
import VendorProductsModal from "./components/VendorProductsModal.vue";
import { formatDate } from "@/utils/formatTime";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import Pagination from "@/components/Pagination/index.vue";

const loading = ref(false);
const list = ref<Vendor[]>([]);
const total = ref(0);
const dialogRef = ref();
const productsModalRef = ref();
const selectedIds = ref<number[]>([]);
const router = useRouter();

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  search: "",
  status: "",
});

const isVendorDisabled = (status?: string) => {
  return status === "suspended" || status === "blacklisted";
};

const getVendorStatusLabel = (status?: string) => {
  const map: Record<string, string> = {
    active: "正常合作",
    evaluating: "考察备选",
    suspended: "暂停合作 (已禁用)",
    blacklisted: "淘汰拉黑",
  };
  return (status && map[status]) || status || "正常合作";
};

const getVendorStatusTagType = (status?: string): "success" | "warning" | "info" | "danger" => {
  const map: Record<string, "success" | "warning" | "info" | "danger"> = {
    active: "success",
    evaluating: "warning",
    suspended: "info",
    blacklisted: "danger",
  };
  return (status && map[status]) || "success";
};

const tagColorPalette: Array<"" | "success" | "warning" | "danger" | "info"> = [
  "",
  "success",
  "warning",
  "danger",
  "info",
];

const getTagColorType = (tag: string, index: number): "" | "success" | "warning" | "danger" | "info" => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash << 5) - hash + tag.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash + index) % tagColorPalette.length;
  return tagColorPalette[idx];
};

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
    countText: `${productNames.length} 款商品 / ${products.length} 个规格`,
    previewText: productNames.slice(0, 3).join("、") + (productNames.length > 3 ? "..." : ""),
  };
};

const { height } = useWindowSize();

const getSafeLink = (url?: string) => {
  if (!url) return "#";
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: {
    keyField: "id",
  },
  rowClassName: ({ row }: any) => {
    return isVendorDisabled(row?.status) ? "vendor-row--disabled" : "";
  },
  checkboxConfig: {
    reserve: true,
  },
  columns: [
    { type: "checkbox", width: 48 },
    { title: "ID", field: "id", width: 70 },
    { title: "厂家编码", field: "code", width: 120, slots: { default: "codeSlot" } },
    { title: "图片", field: "images", width: 140, slots: { default: "imagesSlot" } },
    { title: "厂家名称", field: "name", minWidth: 150, slots: { default: "nameSlot" } },
    { title: "主页/网店", field: "shopUrls", minWidth: 140, slots: { default: "shopUrlsSlot" } },
    { title: "状态", field: "status", width: 130, slots: { default: "statusSlot" } },
    { title: "主营标签", field: "categoryTags", minWidth: 140, slots: { default: "categoryTagsSlot" } },
    { title: "联系方式", field: "contactName", width: 140, slots: { default: "contactSlot" } },
    { title: "账期结算", field: "settlementType", width: 110, showOverflow: "tooltip" },
    { title: "旗下商品", field: "products", minWidth: 220, slots: { default: "productsSlot" } },
    { title: "地址", field: "address", minWidth: 180, showOverflow: "tooltip" },
    { title: "创建者", field: "uploader", width: 110, slots: { default: "uploaderSlot" } },
    { ...buildTimeColumn("创建时间", "createTime", 170), slots: { default: "createTimeSlot" } },
    buildOperationColumn("operationSlot"),
  ],
});

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const getList = async () => {
  loading.value = true;
  try {
    const res = await getVendorList({
      page: queryParams.currentPage,
      pageSize: queryParams.pageSize,
      search: queryParams.search.trim() || undefined,
      status: queryParams.status || undefined,
    });

    if (res && typeof res === "object" && "list" in res && "total" in res) {
      const paged = res as PageResult<Vendor>;
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
  getList();
};

const resetQuery = () => {
  queryParams.search = "";
  queryParams.status = "";
  handleSearch();
};

const openDialog = (id?: number) => {
  dialogRef.value?.open(id);
};

const openProductsModal = (row: Vendor) => {
  productsModalRef.value?.open(row);
};

const handleToggleStatus = async (row: Vendor) => {
  const willDisable = !isVendorDisabled(row.status);
  const actionText = willDisable ? "禁用" : "启用";
  const targetStatus = willDisable ? "suspended" : "active";

  try {
    await ElMessageBox.confirm(
      `确认${actionText}厂家「${row.name}」吗？${willDisable ? "禁用后该厂家在列表中将置灰半透明显示。" : "启用后状态将恢复为正常合作。"}`,
      "提示",
      {
        type: willDisable ? "warning" : "info",
        confirmButtonText: `确认${actionText}`,
      },
    );
    await updateVendor(row.id, {
      ...row,
      status: targetStatus,
    });
    ElMessage.success(`${actionText}成功`);
    await getList();
  } catch {}
};

const handleOperationCommand = (command: string, row: any) => {
  switch (command) {
    case "productsModal":
      openProductsModal(row);
      break;
    case "edit":
      openDialog(row.id);
      break;
    case "enable":
    case "disable":
      handleToggleStatus(row);
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
    await ElMessageBox.confirm("确认删除该厂家吗？删除后会同步清理对应的旗下商品与 COS 图片。", "提示", {
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
      `确认批量删除 ${selectedIds.value.length} 个厂家吗？删除后会同步清理对应的旗下商品与 COS 图片。`,
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

.vendor-name-cell {
  line-height: 1.35;
}

.vendor-name-text {
  font-size: 13px;
  color: var(--el-text-color-primary, #e2e8f0);
}

.vendor-flat-link {
  color: var(--el-color-primary, #409eff);
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.15s ease, color 0.15s ease;

  &:hover {
    color: var(--el-color-primary-light-3, #79bbff);
    text-decoration: underline;
  }
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

/* 禁用/暂停合作厂商的视觉减弱效果：半透明、略微去色，悬停时恢复辨识度 */
:deep(.vendor-row--disabled) {
  opacity: 0.45;
  filter: grayscale(25%);
  transition: opacity 0.2s ease, filter 0.2s ease;

  &:hover {
    opacity: 0.88;
    filter: grayscale(0%);
  }
}

.vendor-category-tag {
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  letter-spacing: 0.2px;
  padding: 0 7px;
  height: 22px;
  line-height: 20px;
}
</style>
