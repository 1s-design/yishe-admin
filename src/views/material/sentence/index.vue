<template>
  <ContentWrap :plain="true">
    <ListPageLayout
      class="sentence-page"
      :sidebar-width="folderTreeCollapsed ? '28px' : '280px'"
    >
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="6" :xl="5">
                <el-form-item label="搜索">
                  <el-input
                    v-model="queryParams.search"
                    size="small"
                    placeholder="搜索句子内容、描述、关键词"
                    clearable
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                  >
                    <template #prefix>
                      <el-icon><Search /></el-icon>
                    </template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="8" :lg="4" :xl="3">
                <el-form-item label="发布状态">
                  <el-select
                    v-model="queryParams.isPublish"
                    size="small"
                    placeholder="请选择状态"
                    clearable
                    @change="handleSearch"
                  >
                    <el-option label="全部" :value="null" />
                    <el-option label="已发布" :value="true" />
                    <el-option label="未发布" :value="false" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading" @click="handleSearch">搜索</el-button>
              <el-button size="small" :disabled="loading" @click="handleReset">重置</el-button>
              <el-button size="small" type="primary" :icon="Plus" @click="handleAdd">添加句子</el-button>
              <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(null)">
                批量删除 ({{ ids.length }})
              </el-button>
              <el-button v-if="isAdmin" size="small" type="warning" :loading="batchActionLoading" @click="handleBatchPublish" :disabled="!ids.length">
                批量发布({{ ids.length }})
              </el-button>
              <el-button v-if="isAdmin" size="small" type="info" :loading="batchActionLoading" @click="handleBatchUnpublish" :disabled="!ids.length">
                批量下架({{ ids.length }})
              </el-button>
              <el-button
                size="small"
                type="success"
                :disabled="!ids.length"
                @click="openSentenceUserTransferDialog('share')"
              >
                分享 ({{ ids.length }})
              </el-button>
              <el-button
                v-if="isAdmin"
                size="small"
                type="warning"
                :disabled="!ids.length"
                @click="handleBatchPublishToPublicLibrary"
              >
                发布到库 ({{ ids.length }})
              </el-button>
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                :loading="deleteLoading"
                @click="handleDelete(null)"
                :disabled="!ids.length"
              >
                批量删除
              </el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #sidebar>
        <div
          class="list-page-panel list-page-panel--flat list-page-sidebar sentence-sidebar folder-sidebar-shell"
        >
          <div class="list-page-sidebar__body folder-sidebar-body">
            <div v-show="!folderTreeCollapsed" class="folder-sidebar-tree">
              <FolderTree
                v-model="selectedFolderId"
                width="100%"
                :folder-category="FOLDER_CATEGORY"
                :show-count="false"
                :drag-state="dragState"
                @change="handleFolderChange"
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
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body">
            <div class="common-table">
      <vxe-grid
        class="sentence-dnd-grid dnd-text-selectable"
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
          <div class="flex items-center">
            <el-dropdown
              trigger="click"
              @command="(command) => handleOperationCommand(command, row)"
              class="operation-dropdown"
            >
              <el-button type="primary" link size="small" class="operation-trigger-button">操作</el-button>
              <template #dropdown>
                <el-dropdown-menu class="operation-menu-compact">
                  <el-dropdown-item command="edit">
                    <el-icon><Edit /></el-icon>
                    <span>编辑</span>
                  </el-dropdown-item>
                  <el-dropdown-item command="ai-analyze" :disabled="aiTableLoading?.[row?.id]">
                    <el-icon><MagicStick /></el-icon>
                    <span>AI分析</span>
                    <el-icon v-if="aiTableLoading?.[row?.id]" class="is-loading ml-1"><Loading /></el-icon>
                  </el-dropdown-item>
                  <template v-if="isAdmin && !row.isPublish">
                    <el-dropdown-item command="publish">
                      <el-icon><Upload /></el-icon>
                      <span>发布</span>
                    </el-dropdown-item>
                  </template>
                  <template v-if="isAdmin && row.isPublish">
                    <el-dropdown-item command="unpublish">
                      <el-icon><Download /></el-icon>
                      <span>下架</span>
                    </el-dropdown-item>
                  </template>
                  <el-dropdown-item command="share-to-user">
                    <el-icon><Share /></el-icon>
                    <span>分享给用户</span>
                  </el-dropdown-item>
                  <el-dropdown-item v-if="isAdmin" command="move-to-user">
                    <el-icon><User /></el-icon>
                    <span>转移给用户</span>
                  </el-dropdown-item>
                  <el-dropdown-item command="view-shared">
                    <el-icon><Connection /></el-icon>
                    <span>查看分享</span>
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided class="operation-menu-item--danger">
                    <el-icon><Delete /></el-icon>
                    <span>删除</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-icon
              v-if="aiTableLoading?.[row?.id]"
              class="is-loading ml-2"
              style=" font-size: 18px;color: var(--el-color-primary)"
            />
          </div>
        </template>
        <template #contentSlot="{ row }">
          <div class="sentence-content flex items-center gap-1.5">
            <span>{{ row.content }}</span>
          </div>
        </template>

        <template #shareTypeSlot="{ row }">
          <el-tag v-if="row.shareType === 'shared' || row.shareType === 'copy' || (row.sourceUserId && row.sourceUserId !== row.userId)" type="success" size="small" effect="light">
            来自【{{ row.sourceUser?.name || row.sourceUser?.account || ('用户' + row.sourceUserId) }}】分享
          </el-tag>
          <el-tag v-else type="info" size="small" effect="plain">个人自建</el-tag>
        </template>
        <template #descriptionSlot="{ row }">
          <div class="text-wrap" style="max-width: 200px; word-break: break-all">
            {{ row.description || "-" }}
          </div>
        </template>
        <template #keywordsSlot="{ row }">
          <div class="text-wrap" style="max-width: 200px; word-break: break-all">
            {{ row.keywords || "-" }}
          </div>
        </template>
        <template #isPublishSlot="{ row }">
          <el-tag :type="row.isPublish ? 'success' : 'info'" size="small">
            {{ row.isPublish ? "已发布" : "未发布" }}
          </el-tag>
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
        <div class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat">
          <pagination
            :total="total"
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>

    <!-- AI分析句子弹窗 -->
    <el-dialog
      v-model="aiAnalyzeDialogVisible"
      title="AI分析句子"
      width="500px"
      align-center
      :destroy-on-close="true"
    >
      <div style="margin-bottom: 16px; font-size: 15px; color: #888">
        请输入你希望AI分析的角度或要求（可选，留空则使用默认分析标准）
      </div>
      <el-input
        v-model="aiAnalyzePrompt"
        type="textarea"
        :rows="4"
        placeholder="如：请重点关注句子的情感色彩和主题..."
        style=" width: 100%; min-height: 100px;font-size: 16px; resize: vertical"
      />
      <template #footer>
        <el-button @click="aiAnalyzeDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="aiAnalyzeLoading"
          @click="submitAiAnalyzeDialog"
          >确定</el-button
        >
      </template>
    </el-dialog>

    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="600px"
      @close="dialogClose"
      align-center
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="句子内容" prop="content">
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="4"
                placeholder="请输入句子内容"
                maxlength="1000"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
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
          <el-col :span="24">
            <el-form-item label="关键词" prop="keywords">
              <el-input
                v-model="form.keywords"
                type="textarea"
                :rows="2"
                placeholder="请输入关键词，多个关键词用逗号分隔（可选）"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="发布状态">
              <el-select
                v-model="form.isPublish"
                placeholder="请选择发布状态"
                style="width: 100%"
              >
                <el-option label="未发布" :value="false" />
                <el-option label="已发布" :value="true" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitLoading"
          >确定</el-button
        >
      </template>
    </el-dialog>

    <!-- 用户转移 / 资源分享弹窗 -->
    <el-dialog
      v-model="sentenceUserTransferDialogVisible"
      :title="sentenceUserTransferDialogTitle"
      width="520px"
      align-center
      :close-on-click-modal="false"
      @closed="resetSentenceUserTransferDialog"
    >
      <div class="sticker-user-transfer-dialog">



        <el-form label-width="96px" class="sticker-user-transfer-form mt-4">
          <el-form-item label="目标用户" required>
            <el-select
              v-model="sentenceUserTransferTargetUserId"
              class="sticker-user-transfer-form__select w-full"
              filterable
              clearable
              :loading="sentenceUserTransferUsersLoading"
              placeholder="请选择目标用户"
            >
              <el-option
                v-for="item in sentenceUserTransferUserOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="已选例句">
            <div class="sticker-user-transfer-selected-count">
              共选定
              <el-tag type="info">{{ sentenceUserTransferIds.length }}</el-tag>
              条资源
            </div>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="sentenceUserTransferDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="sentenceUserTransferSubmitting"
          @click="submitSentenceUserTransfer"
        >
          {{ sentenceUserTransferSubmitText }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看分享记录弹窗 -->
    <el-dialog
      v-model="shareRecordsDialogVisible"
      :title="`分享记录 - ${shareRecordsResourceName}`"
      width="600px"
      destroy-on-close
    >
      <div v-loading="shareRecordsLoading">
        <el-empty v-if="!shareRecordsLoading && shareRecordsList.length === 0" description="暂无分享记录" />
        <el-table v-else :data="shareRecordsList" style="width: 100%">
          <el-table-column prop="userName" label="分享给" min-width="120">
            <template #default="{ row }">
              <span>{{ row.userName || row.userId }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="shareType" label="分享类型" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.shareType === 'shared'" type="warning" size="small" effect="light">快捷共享</el-tag>
              <el-tag v-else-if="row.shareType === 'copy'" type="success" size="small" effect="light">物理副本</el-tag>
              <el-tag v-else type="info" size="small" effect="plain">{{ row.shareType || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="分享时间" width="180">
            <template #default="{ row }">
              {{ formatTimestamp(row.createTime) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watchEffect, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Search,
  Delete,
  Plus,
  MagicStick,
  Edit,
  Upload,
  Download,
  Loading,
  DArrowLeft,
  DArrowRight,
  Share,
  DocumentCopy,
  User,
  TopRight,
  ArrowDown,
  Connection,
} from "@element-plus/icons-vue";
import {
  getSentenceList,
  createSentence,
  updateSentence,
  deleteSentence,
  aiAnalyzeSentence,
  batchMoveSentence,
  shareSentenceToUser,
  copySentenceToUser,
  moveSentenceToUser,
  getSentenceSharedRecords,
} from "@/api/sentence";
import { ResourceLibraryApi } from "@/api/resource-library";
import { formatTimestamp } from "@/common/date";
import { getUserList } from "@/api/user";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import Pagination from "@/components/Pagination/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import FolderTree from "@/components/material/FolderTree.vue";
import TableRowDragHandle from "@/components/TableRowDragHandle/index.vue";
import { useWindowSize, useLocalStorage } from "@vueuse/core";
import { useUserStore } from "@/store/modules/user";
import { computed } from "vue";
import { useFolderRowDrag } from "@/hooks/useFolderRowDrag";
import { FOLDER_FILTER, convertFolderIdToApiParam } from "@/constants/folder";

const FOLDER_CATEGORY = "sentence";
const folderTreeCollapsed = useLocalStorage("sentence_folder_collapsed", false);
const selectedFolderId = ref<string | null>("__all__");

const userStore = useUserStore();
const isAdmin = computed(() => userStore.user?.isAdmin ?? false);
const { height } = useWindowSize();

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  search: "",
  isPublish: null,
  folderId: null as string | null,
});

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
      title: "句子内容",
      field: "content",
      minWidth: 300,
      slots: { default: "contentSlot" },
    },
    {
      title: "资源类型",
      field: "shareType",
      width: 200,
      slots: { default: "shareTypeSlot" },
    },
    {
      title: "描述",
      field: "description",
      minWidth: 200,
      slots: { default: "descriptionSlot" },
    },
    {
      title: "关键词",
      field: "keywords",
      minWidth: 150,
      slots: { default: "keywordsSlot" },
    },
    {
      title: "发布状态",
      field: "isPublish",
      width: 100,
      slots: { default: "isPublishSlot" },
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

const dataSource = ref([]);
const loading = ref(false);
const ids = ref([]);
const total = ref(0);
const formRef = ref();
const dialogTitle = ref("");
const dialogVisible = ref(false);
const isEdit = ref(false);
const form = ref({
  content: "",
  description: "",
  keywords: "",
  isPublish: false,
});
const submitLoading = ref(false);
const deleteLoading = ref(false);
const batchActionLoading = ref(false);
const editId = ref<string | null>(null);

// 拖拽状态（拖文案 -> 文件夹）
const {
  dragState,
  setupRowDrag,
  handleFolderDragOver,
  handleFolderDragLeave,
  resetAfterDrop,
  markExternalFolderDropHandled,
} = useFolderRowDrag({
  gridClass: "sentence-dnd-grid",
  dataSource,
  selectedIds: ids,
  onDropToFolder: handleFolderDrop,
});

// 查看分享记录
const shareRecordsDialogVisible = ref(false);
const shareRecordsLoading = ref(false);
const shareRecordsList = ref<any[]>([]);
const shareRecordsTotal = ref(0);
const shareRecordsResourceName = ref('');

// AI分析相关
const aiAnalyzeDialogVisible = ref(false);
const aiAnalyzePrompt = ref("");
const aiAnalyzeLoading = ref(false);
const aiTableLoading = ref<Record<string, boolean>>({});
let aiAnalyzeRow = null;

// 格式化日期时间
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

async function getList() {
  loading.value = true;
  try {
    const params = {
      ...queryParams,
      folderId: convertFolderIdToApiParam(queryParams.folderId) as string | null | undefined,
    };
    const res = await getSentenceList(params);
    dataSource.value = res.list || [];
    total.value = res.total || 0;
    ids.value = [];
  } catch (error) {
    console.error("获取列表失败:", error);
    ElMessage.error("获取列表失败");
  } finally {
    loading.value = false;
    nextTick(setupRowDrag);
  }
}

function handleSearch() {
  queryParams.currentPage = 1;
  getList();
}

function handleReset() {
  queryParams.search = "";
  queryParams.isPublish = null;
  queryParams.currentPage = 1;
  getList();
}

function handleFolderChange(payload: { folderId: string | null }) {
  if (payload.folderId === "__all__") {
    queryParams.folderId = FOLDER_FILTER.ALL;
  } else if (payload.folderId === null) {
    queryParams.folderId = FOLDER_FILTER.NOT_GROUP;
  } else {
    queryParams.folderId = payload.folderId;
  }
  queryParams.currentPage = 1;
  getList();
}

async function handleFolderDrop(payload: { data: any }) {
  markExternalFolderDropHandled();
  if (!dragState.draggingIds.length) return;
  if (payload.data.id === FOLDER_FILTER.ALL) return;

  const targetFolderId =
    payload.data.id === FOLDER_FILTER.NOT_GROUP ? FOLDER_FILTER.NOT_GROUP : payload.data.id;
  const targetPath = payload.data.path || "";
  const movingIds = [...dragState.draggingIds];

  try {
    await batchMoveSentence({
      ids: movingIds.map(Number),
      folderId: convertFolderIdToApiParam(targetFolderId) as string,
    });
    ElMessage.success(`已移动 ${movingIds.length} 条文案到 ${targetPath || "未分组"}`);
    await getList();
    ids.value = [];
  } catch (error) {
    ElMessage.error((error as Error).message || "移动失败");
  } finally {
    resetAfterDrop();
  }
}

function handleAdd() {
  isEdit.value = false;
  dialogVisible.value = true;
  dialogTitle.value = "新增句子";
  form.value = {
    content: "",
    description: "",
    keywords: "",
    isPublish: false,
  };
}

onMounted(getList);

function checkboxChange(e) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  ids.value = [...records.map((item) => item.id), ...reserves.map((item) => item.id)];
  console.log("checkboxChange - ids:", ids.value); // 添加调试信息
}

function checkboxAllChange(e) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  ids.value = [...records.map((item) => item.id), ...reserves.map((item) => item.id)];
  console.log("checkboxAllChange - ids:", ids.value); // 添加调试信息
}

function handleEdit(row) {
  isEdit.value = true;
  dialogVisible.value = true;
  dialogTitle.value = "编辑句子";
  editId.value = row.id;
  form.value = {
    content: row.content,
    description: row.description || "",
    keywords: row.keywords || "",
    isPublish: row.isPublish || false,
  };
}

async function handleBatchPublishToPublicLibrary() {
  if (!ids.value.length) {
    return ElMessage.warning("请选择要发布的数据");
  }
  try {
    await ElMessageBox.confirm(`确认将选中的 ${ids.value.length} 条文案发布到公共资源广场吗？`, "发布提示", {
      confirmButtonText: "确认发布",
      cancelButtonText: "取消",
      type: "info",
    });
    await ResourceLibraryApi.batchPublish({
      resourceType: "sentence",
      ids: [...ids.value],
    });
    ElMessage.success("已成功发布到公共文案库");
  } catch {
    // cancel
  }
}

async function handleDelete(row?) {
  let delIds = null;
  if (row) {
    delIds = [row.id];
  } else if (!ids.value.length) {
    return ElMessage.warning("请选择要删除的数据");
  } else {
    delIds = [...ids.value];
  }

  const targetItems = delIds.map(
    (id: any) =>
      dataSource.value.find((item: any) => String(item.id) === String(id)) ||
      (row && String(row.id) === String(id) ? row : null),
  ).filter(Boolean);

  const sharedItems = targetItems.filter(
    (item: any) =>
      item.isShared ||
      item.resourceLibraryId ||
      item.shareType ||
      (item.sourceUserId && String(item.sourceUserId) !== String(item.userId)),
  );

  let confirmMsg = `确认删除选中的 ${delIds.length} 条数据吗？`;
  if (sharedItems.length > 0) {
    const sampleNames = sharedItems
      .slice(0, 3)
      .map((i: any) => `「${i.text || i.content || i.id}」`)
      .join("、");
    const moreText = sharedItems.length > 3 ? ` 等共 ${sharedItems.length} 项` : "";
    confirmMsg = `选中的例句文案中包含已发布到素材中心或已共享给其他用户的资源（如 ${sampleNames}${moreText}）。删除后相关记录将被移除，是否确认继续删除？`;
  }

  try {
    await ElMessageBox.confirm(confirmMsg, "删除提示", {
      confirmButtonText: "确认",
      cancelButtonText: "取消",
      type: sharedItems.length > 0 ? "warning" : "error",
    });

    deleteLoading.value = true;
    for (const id of delIds) {
      await deleteSentence(id);
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

// AI分析句子
function handleAiAnalyze(row) {
  if (aiTableLoading.value[row.id]) return;
  aiAnalyzeRow = row;
  aiAnalyzePrompt.value = "";
  aiAnalyzeDialogVisible.value = true;
}

async function submitAiAnalyzeDialog() {
  if (!aiAnalyzeRow) return;
  aiAnalyzeLoading.value = true;
  aiTableLoading.value = { ...aiTableLoading.value, [aiAnalyzeRow.id]: true };
  try {
    await handleAiAnalyzeSentence(
      aiAnalyzeRow,
      () => {
        aiTableLoading.value = { ...aiTableLoading.value, [aiAnalyzeRow.id]: false };
        aiAnalyzeLoading.value = false;
        aiAnalyzeDialogVisible.value = false;
        aiAnalyzeRow = null;
      },
      aiAnalyzePrompt.value
    );
  } catch (e) {
    aiTableLoading.value = { ...aiTableLoading.value, [aiAnalyzeRow.id]: false };
    aiAnalyzeLoading.value = false;
    aiAnalyzeDialogVisible.value = false;
    aiAnalyzeRow = null;
  }
}

async function handleAiAnalyzeSentence(row, cb, prompt) {
  try {
    const res = await aiAnalyzeSentence(row.id, prompt || "");
    // 更新行数据
    if (res) {
      row.description = res.description;
      row.keywords = res.keywords;
    }
    ElMessage.success("AI分析完成");
    if (typeof cb === "function") cb();
    getList();
  } catch (e) {
    ElMessage.error(`AI分析失败：${e.message || "未知错误"}`);
    if (typeof cb === "function") cb();
  }
}

// 发布句子
async function handlePublish(row) {
  try {
    await updateSentence(row.id, {
      isPublish: true,
    });
    row.isPublish = true;
    ElMessage.success("发布成功");
    getList();
  } catch (e) {
    ElMessage.error("发布失败");
  }
}

// 下架句子
async function handleUnpublish(row) {
  try {
    await updateSentence(row.id, {
      isPublish: false,
    });
    row.isPublish = false;
    ElMessage.success("下架成功");
    getList();
  } catch (e) {
    ElMessage.error("下架失败");
  }
}

// 批量发布
async function handleBatchPublish() {
  if (!ids.value.length) {
    return ElMessage.warning("请选择要发布的句子");
  }

  try {
    batchActionLoading.value = true;
    const promises = ids.value.map((id) => updateSentence(id, { isPublish: true }));
    await Promise.all(promises);
    ElMessage.success(`成功发布 ${ids.value.length} 个句子`);
    ids.value = [];
    await getList();
  } catch (e) {
    ElMessage.error("批量发布失败");
  } finally {
    batchActionLoading.value = false;
  }
}

// 批量下架
async function handleBatchUnpublish() {
  if (!ids.value.length) {
    return ElMessage.warning("请选择要下架的句子");
  }

  try {
    batchActionLoading.value = true;
    const promises = ids.value.map((id) => updateSentence(id, { isPublish: false }));
    await Promise.all(promises);
    ElMessage.success(`成功下架 ${ids.value.length} 个句子`);
    ids.value = [];
    await getList();
  } catch (e) {
    ElMessage.error("批量下架失败");
  } finally {
    batchActionLoading.value = false;
  }
}

async function openShareRecordsDialog(row: any) {
  shareRecordsResourceName.value = row.content || `ID: ${row.id}`;
  shareRecordsDialogVisible.value = true;
  shareRecordsLoading.value = true;
  shareRecordsList.value = [];
  try {
    const res = await getSentenceSharedRecords(row.id);
    shareRecordsList.value = res?.list || [];
    shareRecordsTotal.value = res?.total || 0;
  } catch (e: any) {
    ElMessage.error(e?.message || '获取分享记录失败');
  } finally {
    shareRecordsLoading.value = false;
  }
}

// 处理dropdown操作命令
function handleOperationCommand(command: string, row: any) {
  switch (command) {
    case "edit":
      handleEdit(row);
      break;
    case "ai-analyze":
      handleAiAnalyze(row);
      break;
    case "publish":
      handlePublish(row);
      break;
    case "unpublish":
      handleUnpublish(row);
      break;
    case "share-to-user":
      openSentenceUserTransferDialog("share", row);
      break;
    case "copy-to-user":
      openSentenceUserTransferDialog("copy", row);
      break;
    case "move-to-user":
      openSentenceUserTransferDialog("move", row);
      break;
    case "view-shared":
      openShareRecordsDialog(row);
      break;
    case "delete":
      handleDelete(row);
      break;
    default:
      console.warn("未知的操作命令:", command);
  }
}

// 资源转移/分享
type SentenceUserTransferAction = "share" | "move";
type SentenceUserTransferUserOption = {
  value: number;
  label: string;
  account?: string;
  isAdmin?: boolean;
};

const sentenceUserTransferDialogVisible = ref(false);
const sentenceUserTransferSubmitting = ref(false);
const sentenceUserTransferUsersLoading = ref(false);
const sentenceUserTransferUsersLoaded = ref(false);
const sentenceUserTransferAction = ref<SentenceUserTransferAction>("share");
const sentenceUserTransferIds = ref<Array<number | string>>([]);
const sentenceUserTransferTargetUserId = ref<number | string>("");
const sentenceUserTransferUserOptions = ref<SentenceUserTransferUserOption[]>([]);

const sentenceUserTransferDialogTitle = computed(() => {
  if (sentenceUserTransferAction.value === "share") return "分享例句给用户";
  return "转移例句给用户";
});

const sentenceUserTransferSubmitText = computed(() => {
  if (sentenceUserTransferAction.value === "share") return "确认分享";
  return "确认转移";
});

async function loadSentenceTransferUserOptions() {
  if (sentenceUserTransferUsersLoaded.value || sentenceUserTransferUsersLoading.value) return;
  sentenceUserTransferUsersLoading.value = true;
  try {
    const res: any = await getUserList({ currentPage: 1, pageSize: 1000 });
    const list = Array.isArray(res) ? res : res?.list || [];
    sentenceUserTransferUserOptions.value = list.map((item: any) => ({
      value: Number(item.id),
      label: item.name ? `${item.name} (${item.account || item.id})` : item.account || `用户 ${item.id}`,
      account: item.account,
      isAdmin: Boolean(item.isAdmin),
    }));
    sentenceUserTransferUsersLoaded.value = true;
  } catch (error) {
    ElMessage.error("获取用户列表失败");
  } finally {
    sentenceUserTransferUsersLoading.value = false;
  }
}

function resetSentenceUserTransferDialog() {
  sentenceUserTransferSubmitting.value = false;
  sentenceUserTransferAction.value = "share";
  sentenceUserTransferIds.value = [];
  sentenceUserTransferTargetUserId.value = "";
}

async function openSentenceUserTransferDialog(action: SentenceUserTransferAction, row?: any) {
  sentenceUserTransferAction.value = action;
  if (row?.id != null) {
    sentenceUserTransferIds.value = [row.id];
  } else {
    sentenceUserTransferIds.value = [...ids.value];
  }
  if (!sentenceUserTransferIds.value.length) {
    ElMessage.warning("请至少选择一条例句");
    return;
  }
  sentenceUserTransferDialogVisible.value = true;
  await loadSentenceTransferUserOptions();
}

async function submitSentenceUserTransfer() {
  if (!sentenceUserTransferTargetUserId.value) {
    ElMessage.warning("请选择目标用户");
    return;
  }
  sentenceUserTransferSubmitting.value = true;
  try {
    const payload = {
      ids: sentenceUserTransferIds.value,
      targetUserId: sentenceUserTransferTargetUserId.value,
    };
    let res: any;
    if (sentenceUserTransferAction.value === "share") {
      res = await shareSentenceToUser(payload as any);
    } else {
      res = await moveSentenceToUser(payload as any);
    }
    const failed = res?.failed || [];
    if (failed.length) {
      ElMessage.warning(`操作完成，其中 ${failed.length} 条失败`);
    } else {
      ElMessage.success(
        sentenceUserTransferAction.value === "share"
          ? "分享成功"
          : "转移成功"
      );
    }
    sentenceUserTransferDialogVisible.value = false;
    ids.value = [];
    getList();
  } catch (error: any) {
    ElMessage.error(error?.message || "操作失败");
  } finally {
    sentenceUserTransferSubmitting.value = false;
  }
}

const rules = {
  content: [
    { required: true, message: "请输入句子内容", trigger: "blur" },
    { min: 1, max: 1000, message: "句子内容长度在 1 到 1000 个字符", trigger: "blur" },
  ],
  description: [{ max: 500, message: "描述长度不能超过 500 个字符", trigger: "blur" }],
  keywords: [{ max: 200, message: "关键词长度不能超过 200 个字符", trigger: "blur" }],
};

const dialogClose = () => {
  dialogVisible.value = false;
  submitLoading.value = false;
  formRef.value?.resetFields();
};

const submitForm = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitLoading.value = true;

    if (isEdit.value) {
      await updateSentence(editId.value, {
        content: form.value.content,
        description: form.value.description,
        keywords: form.value.keywords,
        isPublish: form.value.isPublish,
      });
      ElMessage.success("更新成功");
    } else {
      await createSentence({
        content: form.value.content,
        description: form.value.description,
        keywords: form.value.keywords,
        isPublish: form.value.isPublish,
      });
      ElMessage.success("新增成功");
    }

    getList();
    dialogVisible.value = false;
  } catch (error) {
    console.error("提交失败:", error);
    ElMessage.error("操作失败");
  } finally {
    submitLoading.value = false;
  }
};
</script>

<style scoped>


@media (width <= 600px) {
  .shrink-0 {
    width: 100%;
  }

  .shrink-0 > * {
    width: 100% !important;
    min-width: 0 !important;
    margin-bottom: 6px !important;
  }

  .el-input,
  .el-select,
  .el-button,
  .el-date-editor {
    width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box;
  }

  .sentence-content {
    max-width: 100%;
    margin: 0 4px;
  }
}

:deep(.sentence-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.sentence-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.sentence-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.sentence-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}

.sentence-sidebar {
  min-height: 100%;
}

/* 句子内容样式优化 */
.sentence-content {
  max-width: 300px;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.6;
  word-break: break-all;
}

/* 操作列样式优化 */
</style>
