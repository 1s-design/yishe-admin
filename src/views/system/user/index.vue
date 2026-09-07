<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="user-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col
                class="list-page-search-form__col--base"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="5"
                :xl="4"
              >
                <el-form-item :label="t('systemUser.account')">
                  <el-input
                    v-model="queryParams.account"
                    size="small"
                    :placeholder="t('systemUser.accountPlaceholder')"
                    clearable
                    @change="
                      (val) => {
                        if (!val) getList();
                      }
                    "
                  />
                </el-form-item>
              </el-col>
              <el-col
                class="list-page-search-form__col--base"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="5"
                :xl="4"
              >
                <el-form-item :label="t('systemUser.name')">
                  <el-input
                    v-model="queryParams.name"
                    size="small"
                    :placeholder="t('systemUser.namePlaceholder')"
                    clearable
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
                @click="handleSearch"
                >{{ t('common.search') }}</el-button
              >
              <el-button size="small" :icon="Refresh" :disabled="loading" @click="resetQuery"
                >{{ t('common.reset') }}</el-button
              >
              <el-button size="small" type="primary" :icon="Plus" @click="handleAdd"
                >{{ t('common.add') }}</el-button
              >
              <el-button
                size="small"

                type="danger"
                :icon="Delete"
                @click="handleDelete(null)"
                :disabled="!ids.length"
              >
                {{ t('common.batchDelete') }}
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
                ref="gridRef"
                v-bind="gridOptions"
                :max-height="gridOptions.maxHeight"
                :data="dataSource"
                :loading="loading"
                @checkbox-change="checkboxChange"
                @checkbox-all="checkboxAllChange"
              >
                <template #avatarDefaultSlot="{ row }">
                  <el-avatar :src="row.avatar" :size="36" :icon="User" />
                </template>

                <template #statusDefaultSlot="{ row }">
                  <el-tag :type="resolveUserState(row).type">
                    {{ resolveUserState(row).label }}
                  </el-tag>
                </template>

                <template #isAdminDefaultSlot="{ row }">
                  <el-tag :type="row.isAdmin ? 'warning' : 'info'">
                    {{ row.isAdmin ? t('systemUser.admin') : t('systemUser.normalUser') }}
                  </el-tag>
                </template>

                <template #operationDefaultSlot="{ row }">
                  <div class="flex justify-start">
                    <el-dropdown
                      class="operation-dropdown"
                      placement="bottom-end"
                      @command="(command) => handleOperationCommand(command, row)"
                    >
                      <el-button type="primary" link size="small" class="operation-trigger-button"
                        >{{ t('common.operation') }}</el-button
                      >
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item command="edit">
                            <span>{{ t('common.edit') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item command="access">
                            <span>{{ row.isAdmin ? t('systemUser.permissionSetting') : t('systemUser.assignPermission') }}</span>
                          </el-dropdown-item>
                          <el-dropdown-item
                            command="resetPassword"
                            class="operation-menu-item--danger"
                          >
                            <span>{{ t('systemUser.resetPassword') }}</span>
                          </el-dropdown-item>
                          <template v-if="userStore.user?.isAdmin">
                            <el-dropdown-item
                              command="delete"
                              divided
                              class="operation-menu-item--danger"
                            >
                              <span>{{ t('common.delete') }}</span>
                            </el-dropdown-item>
                          </template>
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
        <div
          class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat"
        >
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

  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="700px"
    :center="false"
    align-center
    @close="resetForm"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      class="space-y-4 user-dialog-form"
    >
      <!-- 基础信息 -->
      <div class="list-page-dialog-section">
        <div class="list-page-dialog-section__title">{{ t('systemUser.basicInfo') }}</div>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="t('systemUser.account')" prop="account">
              <el-input v-model="formData.account" :placeholder="t('systemUser.accountPlaceholder')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('systemUser.name')" prop="name">
              <el-input v-model="formData.name" :placeholder="t('systemUser.namePlaceholder')" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="t('systemUser.sex')" prop="sex">
              <el-select v-model="formData.sex" :placeholder="t('systemUser.sexPlaceholder')" class="!w-full">
                <el-option :label="t('systemUser.male')" :value="1" />
                <el-option :label="t('systemUser.female')" :value="0" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('systemUser.birthday')" prop="birthday">
              <el-date-picker
                v-model="formData.birthday"
                type="date"
                :placeholder="t('systemUser.birthdayPlaceholder')"
                class="user-dialog-form__date-picker !w-full"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item :label="t('systemUser.avatar')" prop="avatar">
          <el-input v-model="formData.avatar" :placeholder="t('systemUser.avatarPlaceholder')" />
        </el-form-item>
      </div>

      <!-- 联系方式 -->
      <div class="list-page-dialog-section">
        <div class="list-page-dialog-section__title">{{ t('systemUser.contactInfo') }}</div>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="t('systemUser.phone')" prop="phone">
              <el-input v-model="formData.phone" :placeholder="t('systemUser.phonePlaceholder')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('systemUser.email')" prop="email">
              <el-input v-model="formData.email" :placeholder="t('systemUser.emailPlaceholder')" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 权限配置 -->
      <div class="list-page-dialog-section">
        <div class="list-page-dialog-section__title">{{ t('systemUser.permissionConfig') }}</div>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="t('systemUser.userType')" prop="isAdmin">
              <el-select v-model="formData.isAdmin" :placeholder="t('systemUser.userTypePlaceholder')" class="!w-full">
                <el-option :label="t('systemUser.normalUser')" :value="false" />
                <el-option :label="t('systemUser.admin')" :value="true" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('systemUser.status')" prop="status">
              <el-select v-model="formData.status" :placeholder="t('systemUser.statusPlaceholder')" class="!w-full">
                <el-option :label="t('systemUser.normal')" value="active" />
                <el-option :label="t('systemUser.inactive')" value="inactive" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 组织信息 -->
      <div class="list-page-dialog-section">
        <div class="list-page-dialog-section__title">{{ t('systemUser.organizationInfo') }}</div>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="t('systemUser.company')" prop="companyId">
              <el-select
                v-model="formData.companyId"
                :placeholder="t('systemUser.companyPlaceholder')"
                class="!w-full"
                @change="handleCompanyChange"
              >
                <el-option
                  v-for="company in companyList"
                  :key="company.id"
                  :label="company.name"
                  :value="company.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('systemUser.expireTime')" prop="expireTime">
              <el-date-picker
                v-model="formData.expireTime"
                type="datetime"
                :placeholder="t('systemUser.expireTimePlaceholder')"
                class="user-dialog-form__date-picker !w-full"
                :disabled-date="(date) => date.getTime() < Date.now() - 86400000"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 角色分配 -->
      <div class="list-page-dialog-section">
        <div class="list-page-dialog-section__title">角色分配</div>
        <el-row :gutter="12">
          <el-col :span="24">
            <el-form-item label="角色" prop="roleKeys" class="user-form-item--sm">
              <el-select v-model="formData.roleKeys" multiple filterable size="small" placeholder="请选择角色（可多选）" class="!w-full">
                <el-option v-for="role in roleList" :key="role.roleKey" :label="role.roleName" :value="role.roleKey" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 登录密码 (仅新增时显示) -->
      <div v-if="!formData.id" class="list-page-dialog-section">
        <div class="list-page-dialog-section__title">{{ t('systemUser.securitySettings') }}</div>
        <el-form-item :label="t('systemUser.loginPassword')" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            :placeholder="t('systemUser.loginPasswordPlaceholder')"
            show-password
          />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <div class="flex justify-end gap-3">
        <el-button :disabled="submitLoading" @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">{{ t('common.confirm') }}</el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 重置密码对话框 -->
  <el-dialog
    v-model="passwordDialogVisible"
    :title="t('systemUser.resetPassword')"
    width="400px"
    :center="false"
    align-center
  >
    <el-form
      ref="passwordFormRef"
      :model="passwordFormData"
      :rules="passwordFormRules"
      label-width="100px"
      class="user-dialog-form"
    >
      <div class="list-page-dialog-section">
        <el-form-item :label="t('systemUser.newPassword')" prop="newPassword">
          <el-input
            v-model="passwordFormData.newPassword"
            type="password"
            :placeholder="t('systemUser.newPasswordPlaceholder')"
            show-password
          />
        </el-form-item>
        <el-form-item :label="t('systemUser.confirmPassword')" prop="confirmPassword">
          <el-input
            v-model="passwordFormData.confirmPassword"
            type="password"
            :placeholder="t('systemUser.confirmPasswordPlaceholder')"
            show-password
          />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <div class="flex justify-end gap-3">
        <el-button :disabled="passwordSubmitLoading" @click="passwordDialogVisible = false"
          >{{ t('common.cancel') }}</el-button
        >
        <el-button
          type="primary"
          :loading="passwordSubmitLoading"
          @click="handleResetPasswordSubmit"
          >{{ t('common.confirm') }}</el-button
        >
      </div>
    </template>
  </el-dialog>

  <UserAccessDialog
    v-model="accessDialogVisible"
    :user-id="accessTarget.id"
    :user-name="accessTarget.name"
    :user-is-admin="accessTarget.isAdmin"
    @success="handleAccessSaved"
  />
</template>

<script setup lang="tsx">
import { ref, reactive, watchEffect } from "vue";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import { formatTimestamp } from "@/common/date";
import { useWindowSize } from "@vueuse/core";
import { defaultSortingValue } from "@/common/sort";
import { ElMessage, ElMessageBox } from "element-plus";
import { Search, Delete, Refresh, Plus, User } from "@element-plus/icons-vue";
import { useI18n } from '@/hooks/web/useI18n';
import { getUserList, createUser, updateUser, deleteUser, updateUserPassword } from "@/api/user";
import { getAllRoles } from "@/api/role";
import { useUserStore } from "@/store/modules/user";
import { getCompanyList } from "@/api/company";
import Pagination from "@/components/Pagination/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import UserAccessDialog from "./UserAccessDialog.vue";

const { t } = useI18n();

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || error?.response?.data?.msg || error?.message || fallback;
}

function resolveUserState(row: any) {
  const normalizedStatus = String(row?.status || "").trim() || "active";
  const expireTime = row?.expireTime ? new Date(row.expireTime).getTime() : 0;
  const expired = Number.isFinite(expireTime) && expireTime > 0 && expireTime <= Date.now();
  if (normalizedStatus !== "active") {
    return { label: t('systemUser.inactive'), type: "danger" as const };
  }
  if (expired) {
    return { label: t('systemUser.expired'), type: "warning" as const };
  }
  return { label: t('systemUser.normal'), type: "success" as const };
}

// 查询条件
const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  sortingFields: defaultSortingValue(),
  account: "",
  name: "",
  search: "",
});

const userStore = useUserStore();

const gridRef = ref();
const companyList = ref([]); // 公司列表
const roleList = ref<{ id: number; roleKey: string; roleName: string }[]>([]); // 角色列表

// 获取公司列表
async function getCompanyListData() {
  try {
    const res = await getCompanyList({
      currentPage: 1,
      pageSize: 1000, // 获取所有公司
    });
    companyList.value = res.list || [];
  } catch (error) {
    console.error("获取公司列表失败:", error);
    companyList.value = [];
  }
}

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
    { type: "checkbox", width: 50, ellipsis: true, reserve: true },
    {
      title: t('systemUser.avatar'),
      field: "avatar",
      width: 80,
      slots: {
        default: "avatarDefaultSlot",
      },
    },
    { title: t('systemUser.account'), field: "account", minWidth: 120, className: "font-bold" },
    { title: t('systemUser.name'), field: "name", minWidth: 120 },
    { title: t('systemUser.phone'), field: "phone", width: 120 },
    { title: t('systemUser.email'), field: "email", minWidth: 150, showOverflow: true },
    {
      title: t('systemUser.sex'),
      field: "sex",
      width: 80,
      formatter: (e) => {
        return e.cellValue === 1 ? t('systemUser.male') : e.cellValue === 0 ? t('systemUser.female') : "-";
      },
    },
    {
      title: t('systemUser.company'),
      field: "company.name",
      width: 150,
      showOverflow: true,
      formatter: (e) => {
        return e.cellValue || "-";
      },
    },
    {
      title: t('systemUser.expireTime'),
      field: "expireTime",
      width: 180,
      showOverflow: true,
      formatter: (e) => {
        return e.cellValue ? formatTimestamp(e.cellValue) : "-";
      },
    },
    {
      title: t('systemUser.status'),
      field: "status",
      width: 100,
      slots: {
        default: "statusDefaultSlot",
      },
    },
    {
      title: t('systemUser.userType'),
      field: "isAdmin",
      width: 100,
      slots: {
        default: "isAdminDefaultSlot",
      },
    },
    buildTimeColumn(t('common.createTime'), "createTime", 150),
    buildTimeColumn(t('common.updateTime'), "updateTime", 150),
    buildOperationColumn("operationDefaultSlot"),
  ],
});

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const dataSource = ref([]);
const loading = ref(false);
const ids = ref([]);
const total = ref(0);
const submitLoading = ref(false);
const deleteLoading = ref(false);

// 对话框相关
const dialogVisible = ref(false);
const dialogTitle = ref(t('systemUser.addUser'));
const formRef = ref();
const formData = reactive<Record<string, any>>({
  id: "",
  account: "",
  name: "",
  phone: "",
  email: "",
  sex: null,
  birthday: "",
  status: "active",
  isAdmin: false,
  avatar: "",
  password: "",
  companyId: "", // 新增公司ID字段
  expireTime: "", // 过期时间
  roleKeys: [], // 角色标识列表
});

const formRules = {
  account: [{ required: true, message: t('systemUser.accountPlaceholder'), trigger: "blur" }],
  name: [{ required: true, message: t('systemUser.namePlaceholder'), trigger: "blur" }],
  password: [{ required: true, message: t('systemUser.loginPasswordPlaceholder'), trigger: "blur" }],
};

// 重置密码对话框
const passwordDialogVisible = ref(false);
const passwordFormRef = ref();
const currentUserId = ref("");
const passwordSubmitLoading = ref(false);
const accessDialogVisible = ref(false);
const accessTarget = reactive({
  id: "",
  name: "",
  isAdmin: false,
});
const passwordFormData = reactive({
  newPassword: "",
  confirmPassword: "",
});

const passwordFormRules = {
  newPassword: [
    { required: true, message: t('systemUser.newPasswordPlaceholder'), trigger: "blur" },
    { min: 6, message: t('systemUser.passwordMinLength'), trigger: "blur" },
  ],
  confirmPassword: [
    { required: true, message: t('systemUser.confirmPasswordPlaceholder'), trigger: "blur" },
    {
      validator: (_rule, value, callback) => {
        if (value !== passwordFormData.newPassword) {
          callback(new Error(t('systemUser.passwordMismatch')));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
};

// 获取列表
async function getList() {
  loading.value = true;
  try {
    let res = await getUserList({
      ...queryParams,
    });
    dataSource.value = res.list || [];
    total.value = res.total || 0;
    ids.value = [];
  } catch (error) {
    ElMessage.error(t('systemUser.getListFailed'));
    dataSource.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

// 复选框变化
function checkboxChange(e) {
  ids.value = e.records.map((item) => item.id);
}

function checkboxAllChange(e) {
  ids.value = e.records.map((item) => item.id);
}

// 搜索
const handleSearch = () => {
  queryParams.currentPage = 1;
  getList();
};

// 重置查询
const resetQuery = () => {
  queryParams.currentPage = 1;
  queryParams.pageSize = 20;
  queryParams.account = "";
  queryParams.name = "";
  queryParams.search = "";
  queryParams.sortingFields = defaultSortingValue();
  getList();
};

// 新增
function handleAdd() {
  dialogTitle.value = t('systemUser.addUser');
  dialogVisible.value = true;
  resetForm();
}

// 编辑
function handleEdit(row) {
  dialogTitle.value = t('systemUser.editUser');
  dialogVisible.value = true;
  Object.assign(formData, row, { roleKeys: row.roleKeys ?? [] });
}

// 重置密码
function handleResetPassword(row) {
  currentUserId.value = row.id;
  passwordDialogVisible.value = true;
  passwordFormData.newPassword = "";
  passwordFormData.confirmPassword = "";
}

function handleOperationCommand(command, row) {
  switch (command) {
    case "edit":
      handleEdit(row);
      break;
    case "resetPassword":
      handleResetPassword(row);
      break;
    case "access":
      handleAssignAccess(row);
      break;
    case "delete":
      handleDelete(row);
      break;
  }
}

function handleAssignAccess(row) {
  if (!userStore.user?.isAdmin) {
    ElMessage.warning(t('systemUser.adminOnlyAssign'));
    return;
  }
  accessTarget.id = String(row.id || "");
  accessTarget.name = row.name || row.account || "";
  accessTarget.isAdmin = !!row.isAdmin;
  accessDialogVisible.value = true;
}

function handleAccessSaved() {
  getList();
}

// 删除用户
function handleDelete(row?) {
  if (deleteLoading.value) return;
  const userStore = useUserStore();
  if (!userStore.user?.isAdmin) {
    return ElMessage.warning(t('systemUser.noPermissionDelete'));
  }
  let delIds: string[] = [];
  if (row) {
    delIds = [row.id];
  } else if (!ids.value.length) {
    return ElMessage.warning(t('systemUser.selectDeleteData'));
  } else {
    delIds = [...ids.value];
  }

  ElMessageBox.confirm(t('systemUser.deleteConfirm', { count: delIds.length }), t('systemUser.deleteTitle'), {
    confirmButtonText: t('common.confirm'),
    cancelButtonText: t('common.cancel'),
    type: "error",
  })
    .then(async () => {
      try {
        deleteLoading.value = true;
        for (const id of delIds) {
          await deleteUser(id);
        }
        ElMessage.success(t('common.deleteSuccess'));
        await getList();
      } catch (error) {
        ElMessage.error(t('common.deleteFailed'));
      } finally {
        deleteLoading.value = false;
      }
    })
    .catch(() => {});
}

// 提交表单
async function handleSubmit() {
  if (submitLoading.value) return;
  try {
    submitLoading.value = true;
    await formRef.value.validate();

    const submitData = { ...formData };

    if (formData.id) {
      // 编辑 - 传递 id 和需要更新的字段
      const updateData = { ...submitData };
      delete updateData.createTime;
      delete updateData.updateTime;
      await updateUser(updateData);
      ElMessage.success(t('common.updateSuccess'));
    } else {
      // 新增 - 严格清理 ID 相关字段，避免主键冲突
      delete submitData.id;
      delete submitData.createTime;
      delete submitData.updateTime;
      await createUser(submitData);
      ElMessage.success(t('common.createSuccess'));
    }

    dialogVisible.value = false;
    await getList();
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('common.operationFailed')));
  } finally {
    submitLoading.value = false;
  }
}

// 重置密码提交
async function handleResetPasswordSubmit() {
  if (passwordSubmitLoading.value) return;
  try {
    passwordSubmitLoading.value = true;
    await passwordFormRef.value.validate();

    await updateUserPassword({
      id: currentUserId.value,
      newPassword: passwordFormData.newPassword,
    });

    ElMessage.success(t('systemUser.resetPasswordSuccess'));
    passwordDialogVisible.value = false;
  } catch (error) {
    ElMessage.error(t('systemUser.resetPasswordFailed'));
  } finally {
    passwordSubmitLoading.value = false;
  }
}

// 处理公司变化，继承公司过期时间
function handleCompanyChange(companyId) {
  if (companyId && !formData.id) {
    // 只有新增用户时才自动继承
    const selectedCompany = companyList.value.find((c) => c.id === companyId);
    if (selectedCompany && selectedCompany.expireTime) {
      formData.expireTime = selectedCompany.expireTime;
    }
  }
}

// 重置表单
function resetForm() {
  Object.assign(formData, {
    id: "",
    account: "",
    name: "",
    phone: "",
    email: "",
    sex: null,
    birthday: "",
    status: "active",
    isAdmin: false,
    avatar: "",
    password: "",
    companyId: "", // 重置公司ID
    expireTime: "", // 重置过期时间
    roleKeys: [], // 重置角色
  });
  formRef.value?.clearValidate();
}

// 初始化
getList();
getCompanyListData();

// 加载角色列表
async function initRoleList() {
  try {
    roleList.value = await getAllRoles();
  } catch {
    roleList.value = [];
  }
}

initRoleList();
</script>

<style scoped>
.user-dialog-form :deep(.el-form-item__label) {
  display: flex;
  align-self: stretch;
  align-items: center;
  min-height: var(--ep-cover-control-height-lg, 38px);
  padding-top: 0;
  padding-bottom: 0;
  line-height: normal;
}

.user-dialog-form :deep(.el-form-item__content) {
  min-height: var(--ep-cover-control-height-lg, 38px);
  align-items: center;
}

.user-dialog-form :deep(.user-dialog-form__date-picker.el-date-editor) {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: var(--ep-cover-control-height-lg, 38px);
}

.user-dialog-form :deep(.user-dialog-form__date-picker .el-input__wrapper) {
  min-height: var(--ep-cover-control-height-lg, 38px);
  align-items: center;
}

.user-dialog-form :deep(.user-form-item--sm .el-form-item__label) {
  min-height: 32px;
  font-size: 13px;
}

.user-dialog-form :deep(.user-form-item--sm .el-form-item__content) {
  min-height: 32px;
}

.user-dialog-form :deep(.user-form-item--sm .el-select__wrapper) {
  min-height: 32px;
}

:deep(.user-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.user-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.user-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.user-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}
</style>
