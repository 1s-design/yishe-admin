<template>
  <ContentWrap :plain="true">
    <ListPageLayout
      class="prompt-page"
      :sidebar-width="folderTreeCollapsed ? '28px' : '280px'"
    >
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col
                class="list-page-search-form__col--wide"
                :xs="24"
                :sm="12"
                :md="10"
                :lg="8"
              >
                <el-form-item label="提示词标题">
                  <el-input
                    v-model="queryParams.search"
                    size="small"
                    placeholder="请输入提示词标题关键词"
                    clearable
                    @keyup.enter="getList"
                    @change="
                      (val) => {
                        if (!val) getList();
                      }
                    "
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
                @click="getList"
              >
                搜索
              </el-button>
              <el-button size="small" type="primary" :icon="Plus" @click="handleAdd">
                添加提示词
              </el-button>
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                :loading="deleteLoading"
                @click="handleDelete(null)"
              >
                批量删除({{ ids.length }})
              </el-button>
              <el-button
                v-if="isAdmin"
                size="small"
                type="warning"
                :disabled="!ids.length"
                @click="handleBatchPublishToLibrary"
              >
                发布到库 ({{ ids.length }})
              </el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #sidebar>
        <div class="list-page-panel list-page-panel--flat list-page-sidebar prompt-sidebar folder-sidebar-shell">
          <div class="list-page-sidebar__body folder-sidebar-body">
            <div v-show="!folderTreeCollapsed" class="folder-sidebar-tree">
              <FolderTree
                v-model="selectedFolderId"
                width="100%"
                :folder-category="FOLDER_CATEGORY"
                :show-count="false"
                :drag-state="dragState"
                @change="handleFolderChange"
                @reloaded="handleFolderTreeReloaded"
                @folder-drag-over="handleFolderDragOver"
                @folder-drag-leave="handleFolderDragLeave"
                @folder-drop="handleFolderDrop"
              />
            </div>
          </div>

          <button
            type="button"
            class="folder-sidebar-toggle"
            @click="folderTreeCollapsed = !folderTreeCollapsed"
          >
            <el-icon :size="14">
              <DArrowRight v-if="folderTreeCollapsed" />
              <DArrowLeft v-else />
            </el-icon>
          </button>
        </div>
      </template>

      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat material-dnd-grid">
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid
                v-bind="gridOptions"
                :max-height="gridOptions.maxHeight"
                :data="dataSource"
                :loading="loading"
                @checkbox-change="checkboxChange"
                @checkbox-all="checkboxAllChange"
              >
                <template #dragHandleSlot>
                  <TableRowDragHandle />
                </template>

                <template #operationDefaultSlot="{ row }">
                  <div class="flex justify-start">
                    <el-dropdown
                      trigger="click"
                      placement="bottom-end"
                      @command="(command) => handleOperationCommand(command, row)"
                      class="operation-dropdown"
                    >
                      <el-button type="primary" link size="small" class="operation-trigger-button">
                        操作
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item command="edit">编辑</el-dropdown-item>
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

                <template #titleSlot="{ row }">
                  <div class="prompt-title">{{ row.title }}</div>
                </template>

                <template #contentSlot="{ row }">
                  <el-tooltip
                    v-if="row.content"
                    :content="row.content"
                    placement="top"
                    effect="light"
                    :show-after="300"
                    transition=""
                    popper-class="prompt-content-tooltip"
                  >
                    <div
                      class="prompt-content"
                      role="button"
                      tabindex="0"
                      @click.stop="copyPromptContent(row.content)"
                      @keydown.enter.stop.prevent="copyPromptContent(row.content)"
                    >
                      <span class="prompt-content__text">{{ row.content }}</span>
                      <el-icon class="prompt-content__copy"><DocumentCopy /></el-icon>
                    </div>
                  </el-tooltip>
                  <div v-else class="prompt-content prompt-content--empty">-</div>
                </template>

                <template #descriptionSlot="{ row }">
                  <div class="text-wrap prompt-description">{{ row.description || "-" }}</div>
                </template>

                <template #folderSlot="{ row }">
                  <div class="prompt-folder">{{ row.folder || "未分组" }}</div>
                </template>

                <template #tagsSlot="{ row }">
                  <div class="tags-container">
                    <el-tag
                      v-for="tag in getTagsArray(row.tags)"
                      :key="tag"
                      size="small"
                      class="prompt-tag"
                    >
                      {{ tag }}
                    </el-tag>
                    <span v-if="!row.tags">-</span>
                  </div>
                </template>

                <template #createdAtSlot="{ row }">
                  <span>{{ formatDateTime(row.createdAt) }}</span>
                </template>

                <template #updatedAtSlot="{ row }">
                  <span>{{ formatDateTime(row.updatedAt) }}</span>
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
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>

    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      fullscreen
      class="prompt-editor-dialog"
      @close="dialogClose"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" class="prompt-editor-form">
        <el-row :gutter="16">
          <el-col :xs="24" :md="12">
            <el-form-item label="提示词标题" prop="title">
              <el-input
                v-model="form.title"
                placeholder="请输入提示词标题"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="所属文件夹">
              <el-select
                v-model="form.folderId"
                placeholder="请选择文件夹"
                filterable
                :loading="folderOptionsLoading"
              >
                <el-option label="未分组" :value="FOLDER_FILTER.NOT_GROUP" />
                <el-option
                  v-for="folder in folderOptions"
                  :key="folder.id"
                  :label="folder.path || folder.name"
                  :value="folder.id"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="提示词内容" prop="content">
              <el-input
                v-model="form.content"
                class="prompt-editor-content-input"
                type="textarea"
                :rows="24"
                placeholder="请输入提示词内容"
                maxlength="5000"
                show-word-limit
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="描述" prop="description">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="3"
                placeholder="请输入描述（可选）"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="标签" prop="tags">
              <el-input
                v-model="form.tags"
                placeholder="请输入标签，多个标签用逗号分隔（可选）"
                maxlength="200"
                show-word-limit
              />
              <div class="prompt-form-tip">例如：AI,文本生成,内容创作</div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitLoading">
          确定
        </el-button>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watchEffect } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { DArrowLeft, DArrowRight, Delete, DocumentCopy, Plus, Search } from "@element-plus/icons-vue";
import { useLocalStorage, useWindowSize } from "@vueuse/core";
import {
  batchMovePrompt,
  createPrompt,
  deletePrompt,
  getPromptList,
  updatePrompt,
} from "@/api/prompt";
import { ResourceLibraryApi } from "@/api/resource-library";
import { getStickerFolderList } from "@/api/material";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import FolderTree from "@/components/material/FolderTree.vue";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import Pagination from "@/components/Pagination/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import TableRowDragHandle from "@/components/TableRowDragHandle/index.vue";
import { FOLDER_FILTER, convertFolderIdToApiParam } from "@/constants/folder";
import { useUserStore } from "@/store/modules/user";
import { useFolderRowDrag } from "@/hooks/useFolderRowDrag";

defineOptions({ name: "AiPromptIndex" });

const FOLDER_CATEGORY = "prompt";

const userStore = useUserStore();
const isAdmin = computed(() => userStore.user?.isAdmin ?? false);
const { height } = useWindowSize();

const folderTreeCollapsed = useLocalStorage("prompt_folder_collapsed", false);
const selectedFolderId = ref<string | null>(FOLDER_FILTER.ALL);
const folderOptions = ref<any[]>([]);
const folderOptionsLoading = ref(false);

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  search: "",
  folderId: FOLDER_FILTER.ALL as string | null | undefined,
});

function getRowClassName({ row }) {
  if (dragState.dragging && dragState.draggingIds.includes(String(row.id))) {
    return "is-dragging-row";
  }
  return "";
}

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: { keyField: "id" },
  checkboxConfig: { reserve: true },
  columns: [
    {
      title: "",
      field: "dragHandle",
      width: 34,
      showOverflow: false,
      align: "center",
      slots: { default: "dragHandleSlot" },
    },
    { type: "checkbox", width: 42, ellipsis: true, reserve: true },
    { title: "ID", field: "id", width: 80 },
    {
      title: "标题",
      field: "title",
      minWidth: 200,
      slots: { default: "titleSlot" },
    },
    {
      title: "提示词内容",
      field: "content",
      minWidth: 440,
      showOverflow: false,
      className: "prompt-content-cell",
      slots: { default: "contentSlot" },
    },
    {
      title: "描述",
      field: "description",
      minWidth: 220,
      slots: { default: "descriptionSlot" },
    },
    {
      title: "文件夹",
      field: "folder",
      minWidth: 180,
      slots: { default: "folderSlot" },
    },
    {
      title: "标签",
      field: "tags",
      minWidth: 150,
      slots: { default: "tagsSlot" },
    },
    {
      title: "上传者",
      field: "uploader",
      width: 140,
      formatter: ({ row }) => row?.uploader?.account || row?.uploader?.name || row?.userId || "-",
    },
    {
      title: "创建时间",
      field: "createdAt",
      width: 160,
      slots: { default: "createdAtSlot" },
    },
    {
      title: "更新时间",
      field: "updatedAt",
      width: 160,
      slots: { default: "updatedAtSlot" },
    },
    buildOperationColumn("operationDefaultSlot"),
  ],
} as any);

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const dataSource = ref<any[]>([]);
const loading = ref(false);
const ids = ref<number[]>([]);
const total = ref(0);
const formRef = ref();
const dialogTitle = ref("");
const dialogVisible = ref(false);
const isEdit = ref(false);
const submitLoading = ref(false);
const deleteLoading = ref(false);
const editId = ref<number | null>(null);

const form = ref({
  title: "",
  content: "",
  description: "",
  tags: "",
  folderId: FOLDER_FILTER.NOT_GROUP as string | null,
});

const {
  dragState,
  setupRowDrag,
  handleFolderDragOver,
  handleFolderDragLeave,
  resetAfterDrop,
  markExternalFolderDropHandled,
} = useFolderRowDrag({
  gridClass: "material-dnd-grid",
  handleSelector: ".row-drag-handle",
  dataSource,
  selectedIds: ids,
  onDropToFolder: handleFolderDrop,
});

async function handleFolderDrop({ data }) {
  if (!dragState.draggingIds.length) return;
  
  // 不允许拖拽到"全部"文件夹
  if (data.id === FOLDER_FILTER.ALL) {
    ElMessage.warning("不能移动到全部文件夹");
    resetAfterDrop();
    return;
  }

  const targetFolderId = data.id === FOLDER_FILTER.NOT_GROUP ? null : (data.id || null);
  const movingIds = [...dragState.draggingIds].map((id) => Number(id));

  try {
    await batchMovePrompt({
      ids: movingIds,
      folderId: targetFolderId,
    });
    
    markExternalFolderDropHandled();
    ElMessage.success(`已将 ${movingIds.length} 条提示词移动到"${data.name || "未分组"}"`);
    await getList();
  } catch (error) {
    console.error("移动提示词失败:", error);
    ElMessage.error("移动提示词失败");
  } finally {
    resetAfterDrop();
  }
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getTagsArray(tags?: string) {
  if (!tags) return [];
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag);
}

async function copyPromptContent(content?: string) {
  const text = String(content || "").trim();
  if (!text) {
    ElMessage.warning("暂无可复制内容");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("提示词内容已复制");
  } catch (error) {
    console.error("复制提示词内容失败:", error);
    ElMessage.error("复制失败");
  }
}

function getDefaultFormFolderId() {
  return selectedFolderId.value && selectedFolderId.value !== FOLDER_FILTER.ALL
    ? selectedFolderId.value
    : FOLDER_FILTER.NOT_GROUP;
}

async function loadFolderOptions() {
  folderOptionsLoading.value = true;
  try {
    const res = await getStickerFolderList({ folderCategory: FOLDER_CATEGORY });
    folderOptions.value = Array.isArray(res) ? res : [];
  } catch (error) {
    console.error("获取文件夹列表失败:", error);
    folderOptions.value = [];
  } finally {
    folderOptionsLoading.value = false;
  }
}

async function getList() {
  loading.value = true;
  try {
    const params = {
      ...queryParams,
      folderId: convertFolderIdToApiParam(queryParams.folderId),
    };
    const res = await getPromptList(params);
    dataSource.value = res.list || [];
    total.value = res.total || 0;
    ids.value = [];
  } catch (error) {
    console.error("获取列表失败:", error);
    ElMessage.error("获取列表失败");
  } finally {
    loading.value = false;
  }
}

function handleFolderChange(payload: { folderId: string | null }) {
  selectedFolderId.value = payload.folderId || FOLDER_FILTER.ALL;
  queryParams.folderId = payload.folderId || FOLDER_FILTER.ALL;
  queryParams.currentPage = 1;
  void getList();
}

function handleFolderTreeReloaded() {
  void loadFolderOptions();
}

function handleAdd() {
  isEdit.value = false;
  dialogVisible.value = true;
  dialogTitle.value = "新增提示词";
  form.value = {
    title: "",
    content: "",
    description: "",
    tags: "",
    folderId: getDefaultFormFolderId(),
  };
}

async function handleBatchPublishToLibrary() {
  if (!ids.value.length) {
    return ElMessage.warning("请选择要发布的提示词");
  }
  try {
    await ElMessageBox.confirm(`确认将选中的 ${ids.value.length} 条提示词发布到公共资源广场吗？`, "发布提示", {
      confirmButtonText: "确认发布",
      cancelButtonText: "取消",
      type: "info",
    });
    await ResourceLibraryApi.batchPublish({
      resourceType: "prompt",
      ids: ids.value.map(String),
    });
    ElMessage.success("已成功发布到公共提示词库");
  } catch {
    // cancel
  }
}

function checkboxChange(e) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  ids.value = [...records.map((item) => Number(item.id)), ...reserves.map((item) => Number(item.id))];
}

function checkboxAllChange(e) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  ids.value = [...records.map((item) => Number(item.id)), ...reserves.map((item) => Number(item.id))];
}

function handleEdit(row: any) {
  isEdit.value = true;
  dialogVisible.value = true;
  dialogTitle.value = "编辑提示词";
  editId.value = Number(row.id);
  form.value = {
    title: row.title || "",
    content: row.content || "",
    description: row.description || "",
    tags: row.tags || "",
    folderId: row.folderId || FOLDER_FILTER.NOT_GROUP,
  };
}

async function handleDelete(row?: any) {
  let delIds: number[] = [];
  if (row) {
    delIds = [Number(row.id)];
  } else if (!ids.value.length) {
    ElMessage.warning("请选择要删除的数据");
    return;
  } else {
    delIds = [...ids.value];
  }

  const targetItems = delIds.map(
    (id: any) =>
      dataSource.value.find((item: any) => Number(item.id) === Number(id)) ||
      (row && Number(row.id) === Number(id) ? row : null),
  ).filter(Boolean);

  const sharedItems = targetItems.filter(
    (item: any) =>
      item.isShared ||
      item.resourceLibraryId ||
      item.shareType ||
      (item.sourceUserId && String(item.sourceUserId) !== String(item.userId)),
  );

  let confirmMsg = `确认删除选中的 ${delIds.length} 条提示词吗？`;
  if (sharedItems.length > 0) {
    const sampleNames = sharedItems
      .slice(0, 3)
      .map((i: any) => `「${i.title || i.name || i.id}」`)
      .join("、");
    const moreText = sharedItems.length > 3 ? ` 等共 ${sharedItems.length} 项` : "";
    confirmMsg = `选中的提示词中包含已发布到素材中心或已共享给其他用户的资源（如 ${sampleNames}${moreText}）。删除后相关记录将被移除，是否确认继续删除？`;
  }

  try {
    await ElMessageBox.confirm(confirmMsg, "删除提示", {
      confirmButtonText: "确认",
      cancelButtonText: "取消",
      type: sharedItems.length > 0 ? "warning" : "error",
    });

    deleteLoading.value = true;
    for (const id of delIds) {
      await deletePrompt(id);
    }
    ElMessage.success("删除成功");
    ids.value = ids.value.filter((id: any) => !delIds.includes(id));
    await getList();
  } catch (error: any) {
    if (error === "cancel" || error === "close" || error?.action === "cancel" || error?.action === "close") {
      return;
    }
    console.error("删除失败:", error);
    ElMessage.error(error?.message || "删除失败");
  } finally {
    deleteLoading.value = false;
  }
}

function handleOperationCommand(command: string, row: any) {
  switch (command) {
    case "edit":
      handleEdit(row);
      break;
    case "delete":
      handleDelete(row);
      break;
    default:
      console.warn("未知的操作命令:", command);
  }
}

const rules = {
  title: [
    { required: true, message: "请输入提示词标题", trigger: "blur" },
    { min: 1, max: 200, message: "标题长度在 1 到 200 个字符", trigger: "blur" },
  ],
  content: [
    { required: true, message: "请输入提示词内容", trigger: "blur" },
    { min: 1, max: 5000, message: "内容长度在 1 到 5000 个字符", trigger: "blur" },
  ],
  description: [{ max: 500, message: "描述长度不能超过 500 个字符", trigger: "blur" }],
  tags: [{ max: 200, message: "标签长度不能超过 200 个字符", trigger: "blur" }],
};

function dialogClose() {
  dialogVisible.value = false;
  submitLoading.value = false;
  editId.value = null;
  formRef.value?.resetFields();
}

async function submitForm() {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitLoading.value = true;

    const payload = {
      title: form.value.title,
      content: form.value.content,
      description: form.value.description,
      tags: form.value.tags,
      folderId: form.value.folderId,
    };

    if (isEdit.value && editId.value !== null) {
      await updatePrompt(editId.value, payload);
      ElMessage.success("更新成功");
    } else {
      await createPrompt(payload);
      ElMessage.success("新增成功");
    }

    await getList();
    dialogVisible.value = false;
  } catch (error) {
    console.error("提交失败:", error);
    ElMessage.error("操作失败");
  } finally {
    submitLoading.value = false;
  }
}

onMounted(async () => {
  await loadFolderOptions();
  await getList();
  nextTick(setupRowDrag);
});
</script>

<style scoped>


@media (width <= 600px) {
  .prompt-content,
  .prompt-description,
  .prompt-folder {
    max-width: 100%;
  }
}

:deep(.prompt-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.prompt-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.prompt-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.prompt-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}

.prompt-title {
  max-width: 220px;
  overflow: hidden;
  font-weight: 500;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt-content {
  display: flex;
  width: 100%;
  max-width: none;
  min-width: 0;
  padding: 4px 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
  cursor: pointer;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  box-sizing: border-box;
  align-items: center;
  gap: 6px;
}

.prompt-content:hover {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.prompt-content__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt-content__copy {
  flex: 0 0 auto;
  color: var(--el-text-color-secondary);
}

.prompt-content--empty {
  color: var(--el-text-color-secondary);
  cursor: default;
}

:global(.prompt-content-tooltip) {
  max-width: min(720px, 80vw);
  max-height: 50vh;
  overflow: auto;
  color: var(--el-text-color-primary) !important;
  word-break: break-word;
  white-space: pre-wrap;
  background: var(--el-bg-color-overlay) !important;
  border: 1px solid var(--el-border-color-light) !important;
  box-shadow: var(--el-box-shadow-light);
  animation: none !important;
  transition: none !important;
}

:global(.prompt-content-tooltip.el-popper.is-light .el-popper__arrow::before) {
  background: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color-light) !important;
}

.prompt-description {
  max-width: 220px;
  word-break: break-all;
}

.prompt-folder {
  max-width: 180px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  word-break: break-all;
}

.tags-container {
  display: flex;
  max-width: 220px;
  flex-wrap: wrap;
  align-items: center;
}

.prompt-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.prompt-form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.prompt-editor-dialog :deep(.el-dialog__body) {
  height: calc(100vh - 104px);
  padding: 18px 22px;
  overflow: auto;
  box-sizing: border-box;
}

.prompt-editor-form {
  max-width: 1280px;
  margin: 0 auto;
}

.prompt-editor-dialog :deep(.prompt-editor-content-input .el-textarea__inner) {
  min-height: calc(100vh - 320px) !important;
}

/* 拖拽样式 */
:deep(.material-dnd-grid .vxe-table--body tbody tr.is-dragging-row) {
  background: var(--el-color-primary-light-9);
  opacity: 0.5;
}

:deep(.material-drag-ghost) {
  background: var(--el-bg-color-overlay);
  opacity: 0.8;
  transform: rotate(2deg);
  box-shadow: var(--el-box-shadow-light);
}

:deep(.material-drag-chosen) {
  background: var(--el-color-primary-light-9);
}
</style>
