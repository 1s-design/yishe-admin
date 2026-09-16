<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="mind-map-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="6" :xl="5">
                <el-form-item label="搜索">
                  <el-input
                    v-model="queryParams.search"
                    size="small"
                    placeholder="搜索思维导图名称"
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
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading" @click="handleSearch">搜索</el-button>
              <el-button size="small" :disabled="loading" @click="handleReset">重置</el-button>
              <el-button size="small" type="primary" :icon="Plus" @click="handleAdd">新建思维导图</el-button>
              <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(null)" :disabled="!ids.length">
                批量删除 ({{ ids.length }})
              </el-button>
              <el-button
                size="small"
                type="success"
                :disabled="!ids.length"
                @click="openShareDialog('share')"
              >
                分享 ({{ ids.length }})
              </el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid
                class="mind-map-grid"
                v-bind="gridOptions"
                :max-height="gridOptions.maxHeight"
                :data="dataSource"
                :loading="loading"
                @checkbox-change="checkboxChange"
                @checkbox-all="checkboxAllChange"
              >
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
                          <el-dropdown-item command="share-to-user">
                            <el-icon><Share /></el-icon>
                            <span>分享给用户</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="delete" divided class="operation-menu-item--danger">
                            <el-icon><Delete /></el-icon>
                            <span>删除</span>
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </template>
                <template #nameSlot="{ row }">
                  <span class="mind-map-name" @click="handleEdit(row)">{{ row.name }}</span>
                </template>
                <template #shareTypeSlot="{ row }">
                  <el-tag v-if="row.shareType === 'shared' || row.shareType === 'copy' || (row.sourceUserId && row.sourceUserId !== row.userId)" type="success" size="small" effect="light">
                    来自【{{ row.sourceUser?.name || row.sourceUser?.account || ('用户' + row.sourceUserId) }}】分享
                  </el-tag>
                  <el-tag v-else type="info" size="small" effect="plain">个人自建</el-tag>
                </template>
                <template #createdAtSlot="{ row }">
                  <span>{{ formatDateTime(row.createTime) }}</span>
                </template>
                <template #updatedAtSlot="{ row }">
                  <span>{{ formatDateTime(row.updateTime) }}</span>
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

    <!-- 新建思维导图弹窗 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建思维导图"
      width="500px"
      align-center
      :close-on-click-modal="false"
      @close="resetCreateForm"
    >
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="100px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="名称" prop="name">
              <el-input v-model="createForm.name" placeholder="请输入思维导图名称" maxlength="100" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="描述" prop="description">
              <el-input
                v-model="createForm.description"
                type="textarea"
                :rows="3"
                placeholder="请输入描述（可选）"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreate" :loading="createLoading">确定</el-button>
      </template>
    </el-dialog>

    <!-- 用户分享弹窗 -->
    <el-dialog
      v-model="shareDialogVisible"
      title="分享思维导图给用户"
      width="520px"
      align-center
      :close-on-click-modal="false"
      @closed="resetShareDialog"
    >
      <el-form label-width="96px" class="mt-4">
        <el-form-item label="目标用户" required>
          <el-select
            v-model="shareTargetUserId"
            class="w-full"
            filterable
            clearable
            :loading="shareUsersLoading"
            placeholder="请选择目标用户"
          >
            <el-option
              v-for="item in shareUserOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="已选导图">
          <div class="sticker-user-transfer-selected-count">
            共选定
            <el-tag type="info">{{ shareIds.length }}</el-tag>
            条资源
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shareDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="shareSubmitting" @click="submitShare">确认分享</el-button>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Search,
  Delete,
  Plus,
  Edit,
  Share,
} from "@element-plus/icons-vue";
import { commonGridOptions } from "@/common/table";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import Pagination from "@/components/Pagination/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import { useWindowSize } from "@vueuse/core";
import { useUserStore } from "@/store/modules/user";
import {
  createMindMapApi,
  getMindMapPageApi,
  deleteMindMapApi,
  shareMindMapApi,
  type MindMapItem,
} from "@/api/mind-map";
import { getUserList } from "@/api/user";

const router = useRouter();
const userStore = useUserStore();
const isAdmin = computed(() => userStore.user?.isAdmin ?? false);
const { height } = useWindowSize();

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  search: "",
});

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: { keyField: "id" },
  checkboxConfig: { reserve: true },
  columns: [
    { type: "checkbox", width: 42, ellipsis: true, reserve: true },
    { title: "ID", field: "id", width: 80 },
    {
      title: "名称",
      field: "name",
      minWidth: 200,
      slots: { default: "nameSlot" },
    },
    {
      title: "描述",
      field: "description",
      minWidth: 200,
      formatter: ({ row }) => row.description || "-",
    },
    {
      title: "资源类型",
      field: "shareType",
      width: 200,
      slots: { default: "shareTypeSlot" },
    },
    {
      title: "创建时间",
      field: "createTime",
      width: 160,
      slots: { default: "createdAtSlot" },
    },
    {
      title: "更新时间",
      field: "updateTime",
      width: 160,
      slots: { default: "updatedAtSlot" },
    },
    {
      title: "操作",
      field: "operation",
      width: 100,
      fixed: "right",
      slots: { default: "operationDefaultSlot" },
    },
  ],
} as any);

const dataSource = ref<MindMapItem[]>([]);
const loading = ref(false);
const ids = ref<string[]>([]);
const total = ref(0);

// 新建弹窗
const createDialogVisible = ref(false);
const createLoading = ref(false);
const createFormRef = ref();
const createForm = reactive({
  name: "",
  description: "",
});
const createRules = {
  name: [
    { required: true, message: "请输入思维导图名称", trigger: "blur" },
    { min: 1, max: 100, message: "名称长度在 1 到 100 个字符", trigger: "blur" },
  ],
  description: [{ max: 500, message: "描述长度不能超过 500 个字符", trigger: "blur" }],
};

// 分享弹窗
const shareDialogVisible = ref(false);
const shareSubmitting = ref(false);
const shareUsersLoading = ref(false);
const shareUsersLoaded = ref(false);
const shareIds = ref<string[]>([]);
const shareTargetUserId = ref<number | string>("");
const shareUserOptions = ref<{ value: number; label: string }[]>([]);

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
    const res: any = await getMindMapPageApi({ ...queryParams });
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

function handleSearch() {
  queryParams.currentPage = 1;
  getList();
}

function handleReset() {
  queryParams.search = "";
  queryParams.currentPage = 1;
  getList();
}

function handleAdd() {
  createDialogVisible.value = true;
  createForm.name = "";
  createForm.description = "";
}

function resetCreateForm() {
  createForm.name = "";
  createForm.description = "";
  createFormRef.value?.resetFields();
}

async function submitCreate() {
  if (!createFormRef.value) return;
  try {
    await createFormRef.value.validate();
    createLoading.value = true;
    const res: any = await createMindMapApi({
      name: createForm.name,
      description: createForm.description,
    });
    ElMessage.success("创建成功");
    createDialogVisible = false;
    // 跳转到编辑器
    router.push(`/mind-map/editor/${res.id || res}`);
  } catch (error) {
    console.error("创建失败:", error);
    ElMessage.error("创建失败");
  } finally {
    createLoading.value = false;
  }
}

function handleEdit(row: MindMapItem) {
  router.push(`/mind-map/editor/${row.id}`);
}

function checkboxChange(e: any) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  ids.value = [...records.map((item: any) => item.id), ...reserves.map((item: any) => item.id)];
}

function checkboxAllChange(e: any) {
  const records = Array.isArray(e.records) ? e.records : [];
  const reserves = Array.isArray(e.reserves) ? e.reserves : [];
  ids.value = [...records.map((item: any) => item.id), ...reserves.map((item: any) => item.id)];
}

async function handleDelete(row?: MindMapItem) {
  let delIds: string[] = [];
  if (row) {
    delIds = [row.id];
  } else if (!ids.value.length) {
    return ElMessage.warning("请选择要删除的数据");
  } else {
    delIds = [...ids.value];
  }

  try {
    await ElMessageBox.confirm(`确认删除选中的 ${delIds.length} 条数据吗？`, "删除提示", {
      confirmButtonText: "确认",
      cancelButtonText: "取消",
      type: "error",
    });
    let successCount = 0;
    for (const id of delIds) {
      try {
        await deleteMindMapApi(id);
        successCount++;
      } catch (e: any) {
        console.error(`删除思维导图 ${id} 失败:`, e);
      }
    }
    if (successCount === delIds.length) {
      ElMessage.success("删除成功");
    } else {
      ElMessage.warning(`已删除 ${successCount} 条，${delIds.length - successCount} 条失败`);
    }
    await getList();
  } catch {
    // cancel
  }
}

async function loadShareUserOptions() {
  if (shareUsersLoaded.value || shareUsersLoading.value) return;
  shareUsersLoading.value = true;
  try {
    const res: any = await getUserList({ currentPage: 1, pageSize: 1000 });
    const list = Array.isArray(res) ? res : res?.list || [];
    shareUserOptions.value = list.map((item: any) => ({
      value: Number(item.id),
      label: item.name ? `${item.name} (${item.account || item.id})` : item.account || `用户 ${item.id}`,
    }));
    shareUsersLoaded.value = true;
  } catch (error) {
    ElMessage.error("获取用户列表失败");
  } finally {
    shareUsersLoading.value = false;
  }
}

function openShareDialog(row?: MindMapItem) {
  if (row) {
    shareIds.value = [row.id];
  } else {
    shareIds.value = [...ids.value];
  }
  if (!shareIds.value.length) {
    ElMessage.warning("请至少选择一条思维导图");
    return;
  }
  shareDialogVisible.value = true;
  void loadShareUserOptions();
}

function resetShareDialog() {
  shareSubmitting.value = false;
  shareIds.value = [];
  shareTargetUserId.value = "";
}

async function submitShare() {
  if (!shareTargetUserId.value) {
    ElMessage.warning("请选择目标用户");
    return;
  }
  shareSubmitting.value = true;
  try {
    await shareMindMapApi({
      ids: shareIds.value,
      targetUserId: Number(shareTargetUserId.value),
    });
    ElMessage.success("分享成功");
    shareDialogVisible.value = false;
    ids.value = [];
    await getList();
  } catch (error: any) {
    ElMessage.error(error?.message || "分享失败");
  } finally {
    shareSubmitting.value = false;
  }
}

function handleOperationCommand(command: string, row: MindMapItem) {
  switch (command) {
    case "edit":
      handleEdit(row);
      break;
    case "share-to-user":
      openShareDialog(row);
      break;
    case "delete":
      handleDelete(row);
      break;
    default:
      console.warn("未知的操作命令:", command);
  }
}

onMounted(getList);
</script>

<style scoped>
:deep(.mind-map-page) {
  padding: 0;
  margin: 0;
  height: 100%;
}

:deep(.mind-map-page .list-page-layout__main) {
  gap: 0;
}

:deep(.mind-map-page .list-page-filter--flat) {
  padding: 8px 0;
}

:deep(.mind-map-page .list-page-table-panel) {
  padding: 0;
}

.mind-map-name {
  color: var(--el-color-primary);
  cursor: pointer;
  font-weight: 500;
}
.mind-map-name:hover {
  text-decoration: underline;
}

@media (width <= 600px) {
  :deep(.mind-map-page .list-page-filter--flat) {
    padding-bottom: 10px;
  }
}
</style>
