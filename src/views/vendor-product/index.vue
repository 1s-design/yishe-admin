<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="vendor-product-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <div class="resource-toolbar">
            <div class="resource-toolbar__meta">
              <div class="resource-toolbar__actions vendor-product-toolbar">
                <el-select
                  v-model="queryVendorId"
                  clearable
                  filterable
                  size="small"
                  placeholder="全部厂家"
                  style="width: 220px"
                >
                  <el-option
                    v-for="vendor in vendors"
                    :key="vendor.id"
                    :label="vendor.name"
                    :value="vendor.id"
                  />
                </el-select>
                <el-input
                  v-model="queryCode"
                  clearable
                  size="small"
                  placeholder="按编码搜索，如 PRO / PRO3YOUI"
                  style="width: 240px"
                />
                <el-button size="small" type="primary" @click="openDialog()"
                  >新增供应商商品</el-button
                >
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
            </div>
          </div>
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
                :data="filteredList"
                :loading="loading"
                @checkbox-change="handleCheckboxChange"
                @checkbox-all="handleCheckboxAll"
              >
                <template #vendorSlot="{ row }">
                  <span>{{ row.vendor?.name || getVendorName(row.vendorId) }}</span>
                </template>
                <template #priceSlot="{ row }">
                  <span>{{
                    row.price === null || row.price === undefined || row.price === ""
                      ? "-"
                      : `¥${Number(row.price).toFixed(2)}`
                  }}</span>
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
    </ListPageLayout>

    <el-dialog
      v-model="dialogVisible"
      :title="formData.id ? '编辑供应商商品' : '新增供应商商品'"
      fullscreen
      :destroy-on-close="false"
      class="vendor-product-fullscreen-dialog"
    >
      <div class="vendor-product-dialog-layout" v-loading="formLoading">
        <div class="vendor-product-dialog-main">
          <el-form
            ref="formRef"
            :model="formData"
            :rules="formRules"
            label-width="96px"
            class="vendor-product-form"
          >
            <div class="dialog-section dialog-section-basic">
              <div class="dialog-section-title">基础信息</div>
              <el-row :gutter="16">
                <el-col :span="8">
                  <el-form-item label="供应商" prop="vendorId">
                    <el-select v-model="formData.vendorId" filterable placeholder="请选择供应商">
                      <el-option
                        v-for="vendor in vendors"
                        :key="vendor.id"
                        :label="vendor.name"
                        :value="vendor.id"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col v-if="formData.code" :span="8">
                  <el-form-item label="唯一编码" prop="code">
                    <el-input v-model="formData.code" disabled />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="商品名称" prop="name">
                    <el-input v-model="formData.name" placeholder="例如：鼠标垫" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="型号" prop="model">
                    <el-input v-model="formData.model" placeholder="例如：标准方垫" />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>

            <div class="dialog-section dialog-section-spec">
              <div class="dialog-section-title">规格与价格</div>
              <el-row :gutter="16">
                <el-col :span="8">
                  <el-form-item label="规格/尺寸" prop="size">
                    <el-input v-model="formData.size" placeholder="例如：240x200mm" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="产品尺寸" prop="productSize">
                    <el-input v-model="formData.productSize" placeholder="例如：240x200mm" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="包装尺寸" prop="packageSize">
                    <el-input v-model="formData.packageSize" placeholder="例如：260x220x20mm" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="参考价格" prop="price">
                    <el-input-number v-model="formData.price" :min="0" :precision="2" :step="0.1" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="单位" prop="unit">
                    <el-input v-model="formData.unit" placeholder="例如：个、套、张" />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>

            <div class="dialog-section dialog-section-assets">
              <div class="dialog-section-title">产品图片</div>
              <el-form-item label="产品图" prop="images" class="asset-form-item">
                <div class="asset-block">
                  <el-upload
                    v-model:file-list="imageFileList"
                    action="#"
                    list-type="picture-card"
                    :auto-upload="false"
                    :multiple="true"
                    :limit="20"
                    :before-upload="beforeImageUpload"
                    :on-change="handleImageChange"
                    :on-remove="handleImageRemove"
                    :on-preview="handleImagePreview"
                    class="vendor-product-image-upload"
                  >
                    <el-icon><Plus /></el-icon>
                  </el-upload>
                  <div class="vendor-product-form__hint">支持多张产品图。</div>
                </div>
              </el-form-item>
            </div>

            <div class="dialog-section dialog-section-remark">
              <div class="dialog-section-title">备注信息</div>
              <el-form-item label="备注" prop="remark">
                <el-input
                  v-model="formData.remark"
                  type="textarea"
                  :rows="4"
                  placeholder="可填写起订量、打样周期等"
                />
              </el-form-item>
            </div>
          </el-form>
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="formLoading" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, unref, watch, watchEffect } from "vue";
import { useWindowSize } from "@vueuse/core";
import { useRoute } from "vue-router";
import {
  ElMessage,
  ElMessageBox,
  ElNotification,
  type FormInstance,
  type FormRules,
  type UploadProps,
  type UploadUserFile,
} from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import {
  batchDeleteVendorProduct,
  createVendorProduct,
  deleteVendorProduct,
  getVendorList,
  getVendorProductList,
  updateVendorProduct,
  type Vendor,
  type VendorProductItem,
} from "@/api/vendor";
import { formatDate } from "@/utils/formatTime";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import { createImageViewer } from "@/components/ImageViewer";
import { uploadToCOS } from "@/api/cos";
import { useUserStore } from "@/store/modules/user";

const route = useRoute();
const userStore = useUserStore();
const loading = ref(false);
const formLoading = ref(false);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const list = ref<VendorProductItem[]>([]);
const vendors = ref<Vendor[]>([]);
const queryVendorId = ref<number | undefined>();
const queryCode = ref("");
const selectedIds = ref<number[]>([]);
const imageFileList = ref<UploadUserFile[]>([]);
const existingImages = ref<string[]>([]);

const userAccount = computed(
  () =>
    (userStore.user as any)?.account ||
    userStore.user?.shortName ||
    userStore.user?.name ||
    "anonymous",
);

const createEmptyForm = (): VendorProductItem => ({
  code: "",
  vendorId: undefined,
  name: "",
  model: "",
  size: "",
  productSize: "",
  packageSize: "",
  price: null,
  images: [],
  unit: "",
  remark: "",
});

const formData = reactive<VendorProductItem>(createEmptyForm());

const formRules: FormRules = {
  vendorId: [{ required: true, message: "请选择供应商", trigger: "change" }],
  name: [{ required: true, message: "请输入商品名称", trigger: "blur" }],
};

const filteredList = computed(() => {
  const codeKeyword = String(queryCode.value || "")
    .trim()
    .toLowerCase();
  return list.value.filter((item) => {
    const vendorMatched =
      !queryVendorId.value || Number(item.vendorId) === Number(queryVendorId.value);
    if (!vendorMatched) return false;
    if (!codeKeyword) return true;
    return String(item.code || "")
      .toLowerCase()
      .includes(codeKeyword);
  });
});

const { height } = useWindowSize();

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: { keyField: "id" },
  checkboxConfig: {
    reserve: true,
  },
  columns: [
    { type: "checkbox", width: 48 },
    { title: "ID", field: "id", width: 80 },
    { title: "唯一编码", field: "code", width: 120 },
    {
      title: "供应商",
      field: "vendorId",
      minWidth: 180,
      slots: { default: "vendorSlot" },
    },
    { title: "商品名称", field: "name", minWidth: 160 },
    { title: "型号", field: "model", minWidth: 140, showOverflow: "tooltip" },
    {
      title: "规格/尺寸",
      field: "size",
      minWidth: 140,
      showOverflow: "tooltip",
    },
    {
      title: "产品尺寸",
      field: "productSize",
      minWidth: 140,
      showOverflow: "tooltip",
    },
    {
      title: "包装尺寸",
      field: "packageSize",
      minWidth: 150,
      showOverflow: "tooltip",
    },
    {
      title: "参考价格",
      field: "price",
      width: 120,
      slots: { default: "priceSlot" },
    },
    {
      title: "产品图",
      field: "images",
      width: 170,
      slots: { default: "imagesSlot" },
    },
    { title: "单位", field: "unit", width: 90 },
    { title: "备注", field: "remark", minWidth: 220, showOverflow: "tooltip" },
    {
      ...buildTimeColumn("创建时间", "createTime", 180),
      slots: { default: "createTimeSlot" },
    },
    buildOperationColumn("operationSlot"),
  ],
});

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const getVendorName = (vendorId?: number) =>
  vendors.value.find((item) => Number(item.id) === Number(vendorId))?.name || "-";

const updateSelectedIds = (records: VendorProductItem[] = []) => {
  selectedIds.value = (records || [])
    .map((item) => Number(item.id))
    .filter((id) => Number.isInteger(id) && id > 0);
};

const resetForm = () => {
  revokeLocalPreviewUrls();
  Object.assign(formData, createEmptyForm());
  existingImages.value = [];
  imageFileList.value = [];
  formRef.value?.clearValidate();
};

const revokeLocalPreviewUrls = () => {
  imageFileList.value.forEach((file) => {
    if (file.raw && typeof file.url === "string" && file.url.startsWith("blob:")) {
      URL.revokeObjectURL(file.url);
    }
  });
};

const buildExistingFileList = (images: string[]) =>
  images.map((url) => ({
    name: url.substring(url.lastIndexOf("/") + 1),
    url,
  }));

const loadData = async () => {
  loading.value = true;
  try {
    const [vendorData, productData] = await Promise.all([getVendorList(), getVendorProductList()]);
    vendors.value = Array.isArray(vendorData) ? vendorData : [];
    list.value = Array.isArray(productData) ? productData : [];
    selectedIds.value = [];
  } finally {
    loading.value = false;
  }
};

const openDialog = (row?: VendorProductItem) => {
  resetForm();
  if (row?.id) {
    const images = Array.isArray(row.images) ? row.images : [];
    Object.assign(formData, {
      ...row,
      price: row.price === undefined ? null : row.price,
      images,
    });
    existingImages.value = [...images];
    imageFileList.value = buildExistingFileList(images);
  } else if (queryVendorId.value) {
    formData.vendorId = queryVendorId.value;
  }
  dialogVisible.value = true;
};

const beforeImageUpload: UploadProps["beforeUpload"] = (rawFile) => {
  const supportedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const isImage = supportedTypes.includes(rawFile.type);
  const isLt5M = rawFile.size / 1024 / 1024 < 5;

  if (!isImage) {
    ElNotification({
      title: "温馨提示",
      message: "仅支持 JPG、PNG、GIF、WEBP 图片格式",
      type: "warning",
    });
  }

  if (!isLt5M) {
    ElNotification({
      title: "温馨提示",
      message: "单张图片大小不能超过 5MB",
      type: "warning",
    });
  }

  return isImage && isLt5M;
};

const handleImageChange: UploadProps["onChange"] = (uploadFile, uploadFiles) => {
  if (uploadFile.raw && (!uploadFile.url || !uploadFile.url.startsWith("blob:"))) {
    uploadFile.url = URL.createObjectURL(uploadFile.raw);
  }
  imageFileList.value = uploadFiles as UploadUserFile[];
};

const handleImageRemove: UploadProps["onRemove"] = (uploadFile, uploadFiles) => {
  if (uploadFile.raw && typeof uploadFile.url === "string" && uploadFile.url.startsWith("blob:")) {
    URL.revokeObjectURL(uploadFile.url);
  }
  if (!uploadFile.raw && uploadFile.url) {
    existingImages.value = existingImages.value.filter((url) => url !== uploadFile.url);
  }
  imageFileList.value = uploadFiles as UploadUserFile[];
};

const handleImagePreview: UploadProps["onPreview"] = (uploadFile) => {
  if (!uploadFile.url) return;
  createImageViewer({
    zIndex: 9999999,
    urlList: [uploadFile.url],
  });
};

const uploadPendingImages = async () => {
  const uploadedUrls = new Map<UploadUserFile, string>();

  for (const file of imageFileList.value) {
    if (!file.raw) continue;

    const result = await uploadToCOS({
      file: file.raw as File,
      category: "vendor-product",
      account: userAccount.value,
      userId: (userStore.user as any)?.id || (userStore as any).userInfo?.id,
    });
    uploadedUrls.set(file, result.url);
  }

  return imageFileList.value
    .map((file) => {
      if (file.raw) {
        return uploadedUrls.get(file) || "";
      }
      return file.url || "";
    })
    .filter(Boolean);
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

const submitForm = async () => {
  const form = unref(formRef);
  if (!form) return;
  await form.validate(async (valid) => {
    if (!valid) return;
    formLoading.value = true;
    try {
      const images = await uploadPendingImages();
      const payload = {
        ...formData,
        vendorId: Number(formData.vendorId),
        price: formData.price === undefined ? null : formData.price,
        images,
      };
      if (payload.id) {
        await updateVendorProduct(payload.id, payload);
        ElMessage.success("修改成功");
      } else {
        await createVendorProduct(payload);
        ElMessage.success("新增成功");
      }
      dialogVisible.value = false;
      await loadData();
    } finally {
      formLoading.value = false;
    }
  });
};

watch(
  () => route.query.vendorId,
  (vendorId) => {
    const numericVendorId = Number(vendorId);
    queryVendorId.value =
      Number.isInteger(numericVendorId) && numericVendorId > 0 ? numericVendorId : undefined;
  },
  { immediate: true },
);

onMounted(() => {
  loadData();
});
</script>

<style scoped lang="scss">
:deep(.vendor-product-page) {
  gap: 10px;
  padding: 8px 0 0;
}

.vendor-product-toolbar {
  align-items: center;
  gap: 10px;
}

.vendor-product-fullscreen-dialog {
  :deep(.el-dialog) {
    display: flex;
    flex-direction: column;
    height: 100vh;
    margin: 0;
  }

  :deep(.el-dialog__header) {
    padding: 16px 20px 10px;
    margin-right: 0;
  }

  :deep(.el-dialog__body) {
    flex: 1;
    min-height: 0;
    padding: 0;
    overflow: hidden;
  }

  :deep(.el-dialog__footer) {
    padding: 10px 20px 14px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}

.vendor-product-dialog-layout {
  height: 100%;
  padding: 0 12px 16px;
  box-sizing: border-box;
}

.vendor-product-dialog-main {
  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  flex-direction: column;
  gap: 12px;
}

.vendor-product-form {
  display: flex;
  flex-direction: column;
  gap: 12px;

  :deep(.el-form-item__label) {
    color: var(--el-text-color-secondary);
  }

  :deep(.el-form-item) {
    margin-bottom: 0;
  }

  :deep(.el-form-item__content) {
    min-width: 0;
  }

  :deep(.el-input),
  :deep(.el-select),
  :deep(.el-input-number),
  :deep(.el-textarea) {
    width: 100%;
  }

  :deep(.el-row) {
    row-gap: 12px;
  }
}

.dialog-section {
  min-height: 0;
  padding: 14px 12px;
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 8px;
}

.dialog-section-title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--el-text-color-primary);
}

.asset-form-item {
  margin-bottom: 0 !important;
}

.asset-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.vendor-product-form__hint {
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}

@media (width <= 768px) {
  .vendor-product-dialog-layout {
    padding: 0 8px 12px;
  }

  .dialog-section {
    padding: 14px 12px;
  }

  .vendor-product-form :deep(.el-col) {
    max-width: 100%;
    flex: 0 0 100%;
  }
}
</style>
