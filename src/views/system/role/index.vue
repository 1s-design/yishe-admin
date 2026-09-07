<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="role-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col
                class="list-page-search-form__col--wide"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="5"
                :xl="4"
              >
                <el-form-item label="角色名称 / 标识" class="list-page-search-form__item">
                  <el-input
                    v-model="queryParams.keyword"
                    size="small"
                    placeholder="请输入角色名称或标识"
                    clearable
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading" @click="handleSearch">搜索</el-button>
              <el-button size="small" :icon="Refresh" :disabled="loading" @click="resetQuery">重置</el-button>
              <el-button size="small" type="primary" :icon="Plus" @click="handleCreate">新建角色</el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid
                ref="gridRef"
                v-bind="gridOptions"
                :max-height="gridOptions.maxHeight"
                :data="dataSource"
                :loading="loading"
              >
                <template #operationDefaultSlot="{ row }">
                  <el-dropdown
                    class="operation-dropdown"
                    placement="bottom-end"
                    @command="(command) => handleOperationCommand(command, row)"
                  >
                    <el-button type="primary" link size="small" class="operation-trigger-button">
                      操作<el-icon class="el-icon--right"><arrow-down /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu class="operation-menu-compact">
                        <el-dropdown-item command="edit">编辑</el-dropdown-item>
                        <el-dropdown-item command="menu">菜单权限</el-dropdown-item>
                        <el-dropdown-item command="delete" class="operation-menu-item--danger" divided>
                          删除
                        </el-dropdown-item>
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
  </ContentWrap>

  <!-- 新建 / 编辑角色 -->
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="520px"
    align-center
    @close="resetForm"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      class="space-y-4"
    >
      <el-form-item label="角色名称" prop="roleName">
        <el-input v-model="formData.roleName" placeholder="例如：运营" maxlength="50" />
      </el-form-item>
      <el-form-item label="角色标识" prop="roleKey">
        <el-input
          v-model="formData.roleKey"
          placeholder="小写字母/数字/中划线，例如：operator"
          maxlength="64"
          :disabled="!!formData.id"
        />
      </el-form-item>
      <el-form-item label="备注">
        <el-input
          v-model="formData.remark"
          type="textarea"
          :rows="3"
          placeholder="角色用途说明（可选）"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="flex justify-end gap-3">
        <el-button :disabled="submitLoading" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmitRole">确定</el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 菜单权限配置 -->
  <el-dialog
    v-model="menuDialogVisible"
    :title="`菜单权限 - ${menuForm.roleName || ''}`"
    width="760px"
    align-center
  >
    <div class="role-menu-dialog">
      <div class="role-menu-dialog__heading">
        <div>
          <div class="role-menu-dialog__title">角色可访问菜单</div>
          <div class="role-menu-dialog__desc">
            该角色被分配给用户后，用户可在「角色权限 ∪ 个人权限」范围内访问菜单；管理员专属菜单不可分配给角色。
          </div>
        </div>
        <div class="role-menu-dialog__toolbar">
          <el-button link type="primary" @click="handleSelectAllMenu">全选</el-button>
          <el-button link type="primary" @click="handleInvertMenuSelection">反选</el-button>
        </div>
      </div>
      <div
        v-for="group in MENU_ACCESS_GROUPS"
        :key="group.label"
        class="role-menu-dialog__group"
      >
        <div class="role-menu-dialog__group-title">{{ t(group.label) }}</div>
        <el-checkbox-group v-model="menuForm.menuKeys" class="role-menu-dialog__checkboxes">
          <el-checkbox
            v-for="option in group.options"
            :key="option.key"
            :label="option.key"
            :disabled="option.adminOnly"
            border
          >
            {{ t(option.label) }}<span v-if="option.adminOnly">（仅管理员）</span>
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-3">
        <el-button :disabled="menuSubmitting" @click="menuDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="menuSubmitting" @click="handleSubmitMenus">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="tsx">
import { ref, reactive, watchEffect } from "vue";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import { useWindowSize } from "@vueuse/core";
import { useI18n } from "@/hooks/web/useI18n";
import { ElMessage, ElMessageBox } from "element-plus";
import { Search, Refresh, Plus, ArrowDown } from "@element-plus/icons-vue";
import {
  getRolePage,
  createRole,
  updateRole,
  deleteRole,
} from "@/api/role";
import { MENU_ACCESS_GROUPS, MENU_ACCESS_OPTIONS } from "@/router/menu-access-options";
import Pagination from "@/components/Pagination/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";

const { t } = useI18n();

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  keyword: "",
});

const { height } = useWindowSize();

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: {
    keyField: "id",
  },
  columns: [
    { title: "角色名称", field: "roleName", minWidth: 140, className: "font-bold" },
    {
      title: "角色标识",
      field: "roleKey",
      width: 140,
      showOverflow: true,
      formatter: ({ cellValue }) => (cellValue ? `@${cellValue}` : "-"),
    },
    {
      title: "菜单权限数",
      field: "menuKeys",
      width: 110,
      formatter: ({ row }) => `${Array.isArray(row?.menuKeys) ? row.menuKeys.length : 0} 项`,
    },
    { title: "备注", field: "remark", minWidth: 200, showOverflow: true },
    buildTimeColumn("创建时间", "createTime", 150),
    buildOperationColumn("operationDefaultSlot", 200),
  ],
});

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const dataSource = ref([]);
const loading = ref(false);
const total = ref(0);
const submitLoading = ref(false);

// 新建 / 编辑
const dialogVisible = ref(false);
const dialogTitle = ref("新建角色");
const formRef = ref();
const formData = reactive({
  id: 0,
  roleName: "",
  roleKey: "",
  remark: "",
});

const formRules = {
  roleName: [{ required: true, message: "请输入角色名称", trigger: "blur" }],
  roleKey: [
    { required: true, message: "请输入角色标识", trigger: "blur" },
    {
      pattern: /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/,
      message: "仅支持字母、数字、下划线、中划线，且不能以符号开头",
      trigger: "blur",
    },
  ],
};

// 菜单权限
const menuDialogVisible = ref(false);
const menuSubmitting = ref(false);
const menuForm = reactive<{ id: number; roleName: string; roleKey: string; menuKeys: string[] }>({
  id: 0,
  roleName: "",
  roleKey: "",
  menuKeys: [],
});

const selectableMenuOptions = MENU_ACCESS_OPTIONS.filter((option) => !option.adminOnly);

async function getList() {
  loading.value = true;
  try {
    const res: any = await getRolePage({ ...queryParams });
    dataSource.value = res.list || [];
    total.value = res.total || 0;
  } catch (error) {
    ElMessage.error("获取角色列表失败");
    dataSource.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

const handleSearch = () => {
  queryParams.currentPage = 1;
  getList();
};

const resetQuery = () => {
  queryParams.currentPage = 1;
  queryParams.pageSize = 20;
  queryParams.keyword = "";
  getList();
};

function resetForm() {
  formData.id = 0;
  formData.roleName = "";
  formData.roleKey = "";
  formData.remark = "";
}

function handleCreate() {
  resetForm();
  dialogTitle.value = "新建角色";
  dialogVisible.value = true;
}

function handleEdit(row: any) {
  formData.id = row.id;
  formData.roleName = row.roleName || "";
  formData.roleKey = row.roleKey || "";
  formData.remark = row.remark || "";
  dialogTitle.value = "编辑角色";
  dialogVisible.value = true;
}

function openMenuDialog(row: any) {
  menuForm.id = row.id;
  menuForm.roleName = row.roleName || "";
  menuForm.roleKey = row.roleKey || "";
  menuForm.menuKeys = Array.isArray(row.menuKeys) ? [...row.menuKeys] : [];
  menuDialogVisible.value = true;
}

function handleSelectAllMenu() {
  menuForm.menuKeys = selectableMenuOptions.map((option) => option.key);
}

function handleInvertMenuSelection() {
  const selectedSet = new Set(menuForm.menuKeys);
  menuForm.menuKeys = selectableMenuOptions
    .filter((option) => !selectedSet.has(option.key))
    .map((option) => option.key);
}

async function handleSubmitRole() {
  await formRef.value?.validate();
  submitLoading.value = true;
  try {
    if (formData.id) {
      await updateRole({ ...formData });
      ElMessage.success("角色已更新");
    } else {
      await createRole({ ...formData });
      ElMessage.success("角色已创建");
    }
    dialogVisible.value = false;
    getList();
  } catch (error) {
    if (error !== "cancel" && error !== "close") {
      ElMessage.error(
        typeof (error as any)?.message === "string"
          ? (error as any).message
          : "保存角色失败",
      );
    }
  } finally {
    submitLoading.value = false;
  }
}

async function handleSubmitMenus() {
  menuSubmitting.value = true;
  try {
    await updateRole({
      id: menuForm.id,
      roleKey: menuForm.roleKey,
      roleName: menuForm.roleName,
      menuKeys: [...menuForm.menuKeys],
    });
    ElMessage.success("菜单权限已保存");
    menuDialogVisible.value = false;
    getList();
  } catch (error) {
    ElMessage.error("保存菜单权限失败");
  } finally {
    menuSubmitting.value = false;
  }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(
    `确定删除角色「${row.roleName}」吗？已分配该角色的用户将失去对应菜单权限。`,
    "删除角色",
    { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning", confirmButtonClass: "el-button--danger" },
  );
  try {
    await deleteRole(row.id);
    ElMessage.success("角色已删除");
    getList();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") {
      ElMessage.error(error?.message || "删除角色失败");
    }
  }
}

function handleOperationCommand(command: string, row: any) {
  if (command === "edit") {
    handleEdit(row);
  } else if (command === "menu") {
    openMenuDialog(row);
  } else if (command === "delete") {
    handleDelete(row);
  }
}

getList();
</script>

<style scoped>
.role-menu-dialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}

.role-menu-dialog__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.role-menu-dialog__title {
  font-size: 15px;
  font-weight: 600;
}

.role-menu-dialog__desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.role-menu-dialog__toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.role-menu-dialog__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.role-menu-dialog__group-title {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.role-menu-dialog__checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.role-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.role-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.role-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.role-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}
</style>