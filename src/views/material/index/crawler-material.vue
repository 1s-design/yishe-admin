<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="crawler-material-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item label="按名称搜索">
                  <el-input
                    v-model="queryParams.imageName"
                    size="small"
                    placeholder="请输入图片名称"
                    clearable
                    @change="(val) => { if (!val) getList(); }"
                  />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="3">
                <el-form-item label="ID精确查询">
                  <el-input
                    v-model="queryParams.id"
                    size="small"
                    placeholder="请输入ID"
                    clearable
                    @change="(val) => { if (!val) getList(); }"
                  />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="4">
                <el-form-item label="排序">
                  <el-select
                    v-model="queryParams.sortingFields"
                    size="small"
                    placeholder="请选择排序方式"
                    @change="getList"
                  >
                    <el-option label="创建时间倒序" value="createTime DESC" />
                    <el-option label="创建时间正序" value="createTime ASC" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="4">
                <el-form-item label="后缀">
                  <el-select
                    v-model="queryParams.suffix"
                    size="small"
                    placeholder="请选择后缀"
                    clearable
                    @change="getList"
                  >
                    <el-option label="全部" value="" />
                    <el-option label="jpg" value="jpg" />
                    <el-option label="jpeg" value="jpeg" />
                    <el-option label="png" value="png" />
                    <el-option label="gif" value="gif" />
                    <el-option label="webp" value="webp" />
                    <el-option label="svg" value="svg" />
                    <el-option label="bmp" value="bmp" />
                    <el-option label="tiff" value="tiff" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="5">
                <el-form-item label="时间范围">
                  <DateRangePicker
                    @change="
                      (val) => {
                        queryParams.startTime = val.start;
                        queryParams.endTime = val.end;
                        getList();
                      }
                    "
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading" @click="getList">搜索</el-button>
              <el-button
                size="small"
                type="success"
                :icon="Upload"
                @click="handleBatchImport"
                :loading="importLoading"
                :disabled="!canBatchImport"
                :title="!ids.length ? '请选择要入库的数据' : ''"
              >
                批量入库({{ ids.length }})
              </el-button>
              <el-button size="small" @click="handleMultiDownload">下载 ({{ ids.length }})</el-button>
              <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(null)">
                批量删除({{ ids.length }})
              </el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body">
            <div class="content-container" :style="{ width: '100%' }">
        <div class="common-table">
          <vxe-grid
            ref="gridRef"
            v-bind="gridOptions"
            :max-height="maxHeight"
            :data="dataSource"
            :loading="loading"
            @checkbox-change="checkboxChange"
            @checkbox-all="checkboxAllChange"
          >
            <template #previewDefaultSlot="{ row }">
              <div class="flex flex-col items-center justify-center p-2">
                <img
                  :key="`${row.id}_p${queryParams.currentPage}`"
                  :src="row.url"
                  :alt="row.name || '素材图片'"
                  style="
                    width: 120px;
                    height: auto;
                    cursor: pointer;
                    background: #f5f5f5;
                    object-fit: contain;
                  "
                  loading="lazy"
                  @click="openImagePreview(row.url, row.name)"
                />
              </div>
            </template>
            <template #sizeSlot="{ row }">
              <span>{{ row.size ? (row.size / 1024).toFixed(1) + " KB" : "-" }}</span>
            </template>
            <template #operationDefaultSlot="{ row }">
              <div class="flex items-center">
                <el-dropdown
                  trigger="click"
                  @command="(command) => handleOperationCommand(command, row)"
                  class="operation-dropdown"
                >
                  <el-button type="primary" link size="small" class="operation-trigger-button">
                    操作
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu class="operation-menu-compact">
                      <el-dropdown-item command="edit">
                        <el-icon><Edit /></el-icon>
                        <span>编辑</span>
                      </el-dropdown-item>
                      <el-dropdown-item command="download">
                        <el-icon><Download /></el-icon>
                        <span>下载</span>
                      </el-dropdown-item>
                      <el-dropdown-item command="import">
                        <el-icon><Upload /></el-icon>
                        <span>入库</span>
                      </el-dropdown-item>
                      <el-dropdown-item
                        command="delete"
                        divided
                        class="operation-menu-item--danger">
                        <el-icon><Delete /></el-icon>
                        <span>删除</span>
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
            <template #idSlot="{ row }">
              <span style=" font-size: 12px;color: #999">{{ row.id }}</span>
            </template>
            <template #suffixSlot="{ row }">
              <el-tag :type="getSuffixTagType(row.suffix)" size="small">{{
                row.suffix || "-"
              }}</el-tag>
            </template>
            <template #originUrlSlot="{ row }">
              <div
                v-if="row.originUrl"
                class="origin-url-cell"
                style="display: flex; align-items: center"
              >
                <img
                  :key="`${row.id}_origin_p${queryParams.currentPage}`"
                  :src="row.originUrl"
                  :alt="row.name || '原始图片'"
                  style="height: 80px; object-fit: contain; cursor: pointer"
                  loading="lazy"
                  @click="openImagePreview(row.originUrl, row.name)"
                />
                <el-link
                  :href="row.originUrl"
                  target="_blank"
                  type="primary"
                  :underline="false"
                  style="
                    display: block;
                    margin-top: 4px;
                    font-size: 12px;
                    word-break: break-all;
                  "
                >
                  {{
                    row.originUrl.length > 50
                      ? row.originUrl.substring(0, 50) + "..."
                      : row.originUrl
                  }}
                </el-link>
              </div>
            </template>
            <template #nameSlot="{ row }">
              <div class="flex items-center gap-2 flex-wrap">
                <span>{{ row.name || `素材 ${row.id}` }}</span>
              </div>
            </template>

            <template #shareTypeSlot="{ row }">
              <el-tooltip
                v-if="row.shareType === 'shared'"
                content="这是共享快捷引用，请将资源转存副本备份，防止源文件删除导致丢失"
                placement="top"
              >
                <el-tag type="warning" size="small" effect="light" style="cursor: help">
                  由【{{ row.sourceUser?.name || row.sourceUser?.account || ('用户' + row.sourceUserId) }}】共享
                </el-tag>
              </el-tooltip>
              <el-tag v-else-if="row.shareType === 'copy' || (row.sourceUserId && row.sourceUserId !== row.userId)" type="success" size="small" effect="light">
                由【{{ row.sourceUser?.name || row.sourceUser?.account || ('用户' + row.sourceUserId) }}】转存
              </el-tag>
              <el-tag v-else type="info" size="small" effect="plain">我上传的</el-tag>
            </template>
          </vxe-grid>
        </div>
            </div>
          </div>
        </div>
      </template>

      <template #pagination>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat">
          <pagination
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            :total="total"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>
    <el-dialog
      v-model="editDialogVisible"
      title="编辑素材信息"
      width="800px"
      :destroy-on-close="true"
      align-center
    >
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="名称">
          <el-input
            v-model="editForm.name"
            placeholder="请输入名称"
            style=" width: 100%; height: 48px;font-size: 16px"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="5"
            placeholder="请输入描述"
            style=" width: 100%; min-height: 100px;font-size: 16px"
          />
        </el-form-item>
        <el-form-item label="关键字">
          <el-input
            v-model="editForm.keywords"
            placeholder="请输入关键字（逗号分隔）"
            style=" width: 100%; height: 48px;font-size: 16px"
          />
        </el-form-item>
        <el-form-item label="来源">
          <el-input
            v-model="editForm.source"
            placeholder="请输入来源"
            style=" width: 100%; height: 48px;font-size: 16px"
          />
        </el-form-item>
        <el-form-item label="原始地址">
          <el-input
            v-model="editForm.originUrl"
            placeholder="请输入原始地址"
            style=" width: 100%; height: 48px;font-size: 16px"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="submitEdit"
          >保存</el-button
        >
      </template>
    </el-dialog>

    <!-- 图片预览弹窗，点击蒙层可关闭（由 ImagePreview 组件实现） -->
    <ImagePreview
      :visible="imagePreviewVisible"
      :image-url="currentImageUrl"
      @close="closeImagePreview"
    />

    <!-- 入库确认对话框 -->
    <el-dialog
      v-model="importConfirmDialogVisible"
      title="确认入库"
      width="600px"
      :destroy-on-close="true"
      align-center
    >
      <div class="import-confirm-content">
        <p style="margin-bottom: 16px">
          即将入库 {{ selectedRowsForPreview.length }} 个素材，请确认：
        </p>
        <div class="preview-list" style="max-height: 400px; overflow-y: auto">
          <div
            v-for="row in selectedRowsForPreview"
            :key="row.id"
            class="preview-item"
            style="
              display: flex;
              align-items: center;
              padding: 12px;
              border-bottom: 1px solid #eee;
              gap: 12px;
            "
          >
            <img
              :src="row.url"
              :alt="row.name"
              style="width: 80px; height: 80px; object-fit: contain; background: #f5f5f5"
            />
            <div style="flex: 1; min-width: 0">
              <div style=" margin-bottom: 4px;font-weight: 500">{{ row.name || "未命名" }}</div>
              <div style="font-size: 12px; color: #999">ID: {{ row.id }}</div>
              <div v-if="row.description" style=" margin-top: 4px;font-size: 12px; color: #666">
                {{ row.description }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="importConfirmDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="importLoading" @click="confirmBatchImport"
          >确认入库</el-button
        >
      </template>
    </el-dialog>
  </ContentWrap>
</template>
<script setup lang="tsx">
import { ref, reactive, watchEffect, computed } from "vue";
import { CrawlerMaterialApi } from "@/api/crawler-material";
import { getUserList } from "@/api/user";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import { formatTimestamp } from "@/common/date";
import { ElNotification, ElMessage, ElMessageBox } from "element-plus";
import {
  Delete,
  Search,
  Upload,
  Edit,
  Download,
} from "@element-plus/icons-vue";
import { useWindowSize } from "@vueuse/core";
import { downloadImage } from "@/common/download";
import { useUserStore } from "@/store/modules/user";
import ContentWrap from '@/components/ContentWrap/src/ContentWrap.vue'
import ListPageLayout from '@/components/ListPageLayout/index.vue'
import Pagination from '@/components/Pagination/index.vue'
import DateRangePicker from '@/components/DateRangePicker.vue'

const userStore = useUserStore();

// 判断是否为管理员
const isAdmin = computed(() => userStore.user?.isAdmin ?? false);

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  imageName: "",
  startTime: "",
  endTime: "",
  sortingFields: "createTime DESC", // 默认倒序
  suffix: "", // 新增后缀参数
  id: "", // 新增ID精确查询参数
});
const gridRef = ref();

const { height } = useWindowSize();
const maxHeight = ref(Math.max(height.value - 280, 360));

watchEffect(() => {
  maxHeight.value = Math.max(height.value - 280, 360);
});

const gridOptions = computed(() => {
  const baseColumns = [
    {
      type: "checkbox" as const,
      field: "_selection",
      title: "",
      width: 50,
      ellipsis: true,
      reserve: true,
    },
    {
      title: "图片预览",
      field: "url",
      width: 160,
      slots: { default: "previewDefaultSlot" },
    },
    { title: "图片名称", field: "name", minWidth: 180, className: "font-bold", slots: { default: "nameSlot" } },
    {
      title: "资源类型",
      field: "shareType",
      width: 200,
      slots: { default: "shareTypeSlot" },
    },
    { title: "描述", field: "description", minWidth: 200 },
    { title: "关键词", field: "keywords", minWidth: 160 },
    { title: "后缀", field: "suffix", width: 80 },
  ]

  // 只有管理员显示的字段
  const adminOnlyColumns = [

    { title: "来源", field: "source", minWidth: 160 }, // 新增来源列
    {
      title: "上传者",
      field: "uploader",
      width: 140,
      formatter: ({ row }) => row?.uploader?.account || row?.uploader?.name || row?.userId || "-",
    },
    {
      title: "原始地址",
      field: "originUrl",
      width: 200,
      slots: { default: "originUrlSlot" },
    }, // 原始地址列
        { title: "ID", field: "id", width: 80 },
    {
      title: "创建时间",
      field: "createTime",
      width: 150,
      ellipsis: true,
      formatter: (e) => formatTimestamp(e.cellValue),
    },
    {
      title: "修改时间",
      field: "updateTime",
      width: 150,
      ellipsis: true,
      formatter: (e) => formatTimestamp(e.cellValue),
    },
  ]

  const operationColumn = buildOperationColumn("operationDefaultSlot")

  return {
    ...commonGridOptions,
    maxHeight: maxHeight.value,
    rowConfig: { keyField: "id" },
    checkboxConfig: { reserve: true },
    columns: [
      ...baseColumns,
      ...(isAdmin.value ? adminOnlyColumns : []),
      operationColumn
    ] as any,
  }
});
const dataSource = ref([]);
const loading = ref(false);
const importLoading = ref(false);
const ids = ref<string[]>([]);
const selectedRowMap = ref<Map<string, any>>(new Map());
const total = ref(0);
const editDialogVisible = ref(false);
const editForm = ref({
  id: "",
  name: "",
  description: "",
  keywords: "",
  source: "",
  originUrl: "",
});
const editLoading = ref(false);
const hasSelection = computed(() => ids.value.length > 0);
const canBatchImport = computed(() => hasSelection.value);

// 图片预览相关状态
const imagePreviewVisible = ref(false);
const currentImageUrl = ref("");

// 入库确认对话框相关
const importConfirmDialogVisible = ref(false);
const selectedRowsForPreview = ref<any[]>([]);
const importIds = ref<string[]>([]); // 用于存储要入库的ID列表



// 删除isMobile、filterDialogVisible、onMobileFilterSubmit相关逻辑

function getList() {
  loading.value = true;
  dataSource.value = []; // 清空旧数据，避免切换页数时旧图残留
  CrawlerMaterialApi.getCrawlerMaterialPage({ ...queryParams })
    .then((res) => {
      dataSource.value = res.list;
      total.value = res.total;
    })
    .finally(() => {
      loading.value = false;
    });
}



function syncSelectionState(records: any[], reserves: any[]) {
  const map = new Map<string, any>();
  [...records, ...reserves].forEach((item) => {
    if (item?.id) {
      map.set(String(item.id), item);
    }
  });
  selectedRowMap.value = map;
  ids.value = Array.from(map.keys());
}

function clearSelection() {
  ids.value = [];
  selectedRowMap.value = new Map();
  gridRef.value?.clearCheckboxRow?.();
  gridRef.value?.clearCheckboxReserve?.();
}

function checkboxChange(e) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  syncSelectionState(records, reserves);
  console.log("checkboxChange - ids:", ids.value); // 添加调试信息
}

function checkboxAllChange(e) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  syncSelectionState(records, reserves);
  console.log("checkboxAllChange - ids:", ids.value); // 添加调试信息
}

function handleDownload(row) {
  try {
    const downloadUrl = row.url;
    const fileName = row.name || `image_${row.id}.jpg`;
    if (!downloadUrl) {
      ElMessage.error(`图片 ${fileName} 下载失败：缺少下载链接`);
      return;
    }
    downloadImage(downloadUrl, fileName);
    ElNotification.success(`图片 ${fileName} 下载成功`);
  } catch (error) {
    ElMessage.error("图片下载失败");
  }
}

function handleMultiDownload() {
  if (!ids.value.length) {
    return ElMessage.warning("请选择要下载的数据");
  }
  // 处理批量下载逻辑
  ids.value.forEach((id, index) => {
    const row =
      selectedRowMap.value.get(id) || dataSource.value.find((item) => item.id === id);
    if (row) {
      setTimeout(() => {
        handleDownload(row);
      }, 500 * index);
    }
  });
}

function handleDelete(row?) {
  let delIds: any = null;
  if (row) {
    delIds = [row.id];
  } else {
    delIds = Array.isArray(ids.value) ? [...ids.value] : [];
    if (!delIds.length) {
      return ElMessage.warning("请选择要删除的数据");
    }
  }
  ElMessageBox.confirm("确认删除该数据吗", "删除提示", {
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    type: "error",
  })
    .then(async () => {
      delIds = delIds.map((id) => String(id));
      console.log("删除参数:", { ids: delIds }); // 添加调试信息
      console.log("ids.value:", ids.value); // 添加调试信息
      console.log("delIds:", delIds); // 添加调试信息
      try {
        const result = await CrawlerMaterialApi.deleteCrawlerMaterial({ ids: delIds });
        console.log("删除结果:", result); // 添加调试信息
        ElNotification.success("删除成功");
        clearSelection();
        getList();
      } catch (error) {
        console.error("删除失败:", error); // 添加调试信息
        ElNotification.error("删除失败: " + error.message);
      }
    })
    .catch(() => {});
}

function handleEdit(row) {
  editForm.value = {
    id: row.id,
    name: row.name,
    description: row.description,
    keywords: row.keywords,
    source: row.source,
    originUrl: row.originUrl || "",
  };
  editDialogVisible.value = true;
}

async function submitEdit() {
  editLoading.value = true;
  try {
    await CrawlerMaterialApi.updateCrawlerMaterial(editForm.value);
    ElNotification.success("保存成功");
    editDialogVisible.value = false;
    getList();
  } catch (e) {
    ElNotification.error("保存失败");
  } finally {
    editLoading.value = false;
  }
}

// 批量入库到贴纸
async function handleBatchImport() {
  if (!ids.value.length) {
    return ElMessage.warning("请选择要入库的数据");
  }
  const selectedRows = Array.from(selectedRowMap.value.values());
  if (!selectedRows.length) {
    return ElMessage.warning("选中的数据暂不可用，请重新选择");
  }

  // 显示带预览的确认对话框
  selectedRowsForPreview.value = selectedRows.slice(0, 10); // 最多显示10个预览
  importIds.value = [...ids.value]; // 保存要入库的ID列表
  importConfirmDialogVisible.value = true;
}

// 确认批量入库
async function confirmBatchImport() {
  if (!importIds.value.length) {
    return ElMessage.warning("没有要入库的数据");
  }
  importLoading.value = true;
  try {
    const result = await CrawlerMaterialApi.batchImportToSticker({
      ids: importIds.value,
      userId: String(userStore.user.id),
    });

    ElNotification.success({
      title: "已提交入库任务",
      message: result.message || `已提交 ${importIds.value.length} 个素材，正在后台入库`,
      duration: 3200,
    });

    // 关闭对话框
    importConfirmDialogVisible.value = false;
    // 清空选择
    clearSelection();
    importIds.value = [];
    // 刷新一次列表，让用户尽快看到最新状态；最终结果走全局通知
    getList();
  } catch (error) {
    ElNotification.error("入库失败：" + error.message);
  } finally {
    importLoading.value = false;
  }
}

// 单个入库到贴纸
async function handleSingleImport(row) {
  // 显示带预览的确认对话框
  selectedRowsForPreview.value = [row];
  importIds.value = [String(row.id)]; // 保存单个入库的ID
  importConfirmDialogVisible.value = true;
}

// 图片预览相关方法
function openImagePreview(imageUrl: string, _imageName?: string) {
  currentImageUrl.value = imageUrl;
  imagePreviewVisible.value = true;
}

function closeImagePreview() {
  imagePreviewVisible.value = false;
  currentImageUrl.value = "";
}

function getSuffixTagType(suffix) {
  switch ((suffix || "").toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "warning";
    case "png":
      return "success";
    case "gif":
      return "danger";
    case "svg":
      return "info";
    case "webp":
      return "primary";
    case "bmp":
      return "info";
    case "tiff":
      return "info";
    default:
      return "primary";
  }
}

// 处理dropdown操作命令
function handleOperationCommand(command: string, row: any) {
  switch (command) {
    case "edit":
      handleEdit(row);
      break;
    case "download":
      handleDownload(row);
      break;
    case "import":
      handleSingleImport(row);
      break;
    case "delete":
      handleDelete(row);
      break;
    default:
      console.warn("未知的操作命令:", command);
  }
}

getList();
</script>
<style scoped>

@media (width <= 600px) {
  .pb-4.flex,
  .search-bar {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 8px !important;
    padding-bottom: 8px !important;
  }

  .pb-4.flex > *,
  .search-bar > * {
    width: 100% !important;
    min-width: 0 !important;
    margin-right: 0 !important;
    margin-bottom: 8px !important;
  }

  .el-input,
  .el-select,
  .el-button,
  .el-date-editor {
    width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box;
  }

  .date-range-picker {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box;
  }

  .date-range-picker .el-date-editor,
  .date-range-picker .el-range-editor {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }

  .content-container {
    padding: 0 4px !important;
  }
}

.crawler-material-page {
  gap: 10px;
  padding: 8px 0 0;
}

.crawler-material-page .list-page-layout__main {
  gap: 10px;
}

.crawler-material-page .list-page-filter--flat {
  gap: 10px;
  padding-bottom: 10px;
}

.crawler-material-page .list-page-table-panel__pagination--flat {
  padding-top: 10px;
}

/* PC端优化 */
.pb-4.flex,
.search-bar {
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.pb-4.flex > *,
.search-bar > * {
  margin-bottom: 0;
}

/* 操作dropdown样式 */

</style>
