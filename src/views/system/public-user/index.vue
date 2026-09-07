<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="public-user-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="用户账号">
                  <el-input
                    v-model="queryParams.account"
                    size="small"
                    placeholder="请输入用户账号"
                    clearable
                    @change="
                      (val) => {
                        if (!val) getList();
                      }
                    "
                  />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="用户姓名">
                  <el-input
                    v-model="queryParams.name"
                    size="small"
                    placeholder="请输入用户姓名"
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
                >搜索</el-button
              >
              <el-button size="small" :icon="Refresh" :disabled="loading" @click="resetQuery"
                >重置</el-button
              >
              <el-button size="small" type="primary" :icon="Plus" @click="handleAdd"
                >新增</el-button
              >
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                @click="handleDelete(null)"
                :disabled="!ids.length"
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
                ref="gridRef"
                v-bind="gridOptions"
                :data="dataSource"
                :loading="loading"
                @checkbox-change="checkboxChange"
                @checkbox-all="checkboxAllChange"
              >
                <template #avatarDefaultSlot="{ row }">
                  <el-avatar :src="row.avatar" :size="36" :icon="User" />
                </template>

                <template #statusDefaultSlot="{ row }">
                  <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
                    {{ row.status === "active" ? "正常" : "禁用" }}
                  </el-tag>
                </template>

                <template #ownerUserDefaultSlot="{ row }">
                  <span>
                    {{
                      row.ownerUser?.name && row.ownerUser?.account
                        ? `${row.ownerUser.name} (${row.ownerUser.account})`
                        : row.ownerUser?.name || row.ownerUser?.account || "-"
                    }}
                  </span>
                </template>

                <template #operationDefaultSlot="{ row }">
                  <div class="flex justify-start">
                    <el-dropdown
                      trigger="click"
                      @command="(command) => handleOperationCommand(command, row)"
                      class="operation-dropdown"
                    >
                      <el-button type="primary" link size="small" class="operation-trigger-button"
                        >操作</el-button
                      >
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item command="edit">
                            <span>编辑</span>
                          </el-dropdown-item>
                          <el-dropdown-item
                            command="delete"
                            divided
                            class="operation-menu-item--danger"
                          >
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
      class="space-y-4 public-user-dialog-form"
    >
      <!-- 基础信息 -->
      <div class="list-page-dialog-section">
        <div class="list-page-dialog-section__title">基础信息</div>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="用户账号" prop="account">
              <el-input
                v-model="formData.account"
                placeholder="请输入用户账号"
                :disabled="!!formData.id"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="用户姓名" prop="name">
              <el-input v-model="formData.name" placeholder="请输入用户姓名" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="性别" prop="sex">
              <el-select v-model="formData.sex" placeholder="请选择性别" class="!w-full">
                <el-option label="男" :value="1" />
                <el-option label="女" :value="0" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出生日期" prop="birthday">
              <el-date-picker
                v-model="formData.birthday"
                type="date"
                placeholder="请选择出生日期"
                class="public-user-dialog-form__date-picker !w-full"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="头像地址" prop="avatar">
          <el-input v-model="formData.avatar" placeholder="请输入头像地址" />
        </el-form-item>
      </div>

      <!-- 联系方式 -->
      <div class="list-page-dialog-section">
        <div class="list-page-dialog-section__title">联系方式</div>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="手机号码" prop="phone">
              <el-input v-model="formData.phone" placeholder="请输入手机号码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱地址" prop="email">
              <el-input v-model="formData.email" placeholder="请输入邮箱地址" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 状态配置 -->
      <div class="list-page-dialog-section">
        <div class="list-page-dialog-section__title">状态配置</div>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="用户状态" prop="status">
              <el-select v-model="formData.status" placeholder="请选择状态" class="!w-full">
                <el-option label="正常" value="active" />
                <el-option label="禁用" value="inactive" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 登录密码 (仅新增时显示) -->
      <div v-if="!formData.id" class="list-page-dialog-section">
        <div class="list-page-dialog-section__title">安全设置</div>
        <el-form-item label="登录密码" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="请输入登录密码（至少6位）"
            show-password
          />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <div
        class="flex justify-end gap-3 border-t border-solid border-[var(--el-border-color-lighter)] pt-4"
      >
        <el-button :disabled="submitLoading" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="tsx">
import { ref, reactive, watchEffect } from "vue";
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from "@/common/table";
import { formatTimestamp } from "@/common/date";
import { useWindowSize } from "@vueuse/core";
import { defaultSortingValue } from "@/common/sort";
import { ElMessage, ElMessageBox } from "element-plus";
import { Search, Delete, Refresh, Plus, User } from "@element-plus/icons-vue";
import {
  getPublicUserList,
  createPublicUser,
  updatePublicUser,
  deletePublicUser,
} from "@/api/public-user";
import { useUserStore } from "@/store/modules/user";
import Pagination from "@/components/Pagination/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";

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
const { height } = useWindowSize();

const gridRef = ref();

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
      title: "头像",
      field: "avatar",
      width: 80,
      slots: {
        default: "avatarDefaultSlot",
      },
    },
    { title: "用户账号", field: "account", minWidth: 120, className: "font-bold" },
    { title: "用户姓名", field: "name", minWidth: 120 },
    {
      title: "归属用户",
      field: "ownerUser",
      minWidth: 180,
      showOverflow: true,
      slots: {
        default: "ownerUserDefaultSlot",
      },
    },
    { title: "手机号码", field: "phone", width: 120 },
    { title: "邮箱地址", field: "email", minWidth: 150, showOverflow: true },
    {
      title: "性别",
      field: "sex",
      width: 80,
      formatter: (e) => {
        return e.cellValue === 1 ? "男" : e.cellValue === 0 ? "女" : "-";
      },
    },
    {
      title: "用户状态",
      field: "status",
      width: 100,
      slots: {
        default: "statusDefaultSlot",
      },
    },
    buildTimeColumn("创建时间", "createTime", 150),
    buildTimeColumn("修改时间", "updateTime", 150),
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
const dialogTitle = ref("新增开放用户");
const formRef = ref();
const formData = reactive({
  id: "",
  account: "",
  name: "",
  phone: "",
  email: "",
  sex: null,
  birthday: "",
  status: "active",
  avatar: "",
  password: "",
});

const formRules = {
  account: [{ required: true, message: "请输入用户账号", trigger: "blur" }],
  password: [
    { required: true, message: "请输入登录密码", trigger: "blur" },
    { min: 6, message: "密码长度不能少于6位", trigger: "blur" },
  ],
};

const handleSearch = () => {
  queryParams.currentPage = 1;
  getList();
};

// 获取列表
async function getList() {
  loading.value = true;
  try {
    let res = await getPublicUserList({
      ...queryParams,
    });
    dataSource.value = res.list || [];
    total.value = res.total || 0;
    ids.value = [];
  } catch (error) {
    ElMessage.error("获取列表失败");
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
  dialogTitle.value = "新增开放用户";
  dialogVisible.value = true;
  resetForm();
}

// 编辑
function handleEdit(row) {
  dialogTitle.value = "编辑开放用户";
  dialogVisible.value = true;
  Object.assign(formData, row);
}

function handleOperationCommand(command, row) {
  switch (command) {
    case "edit":
      handleEdit(row);
      break;
    case "delete":
      handleDelete(row);
      break;
  }
}

// 删除用户
function handleDelete(row?) {
  if (deleteLoading.value) return;
  let delIds: string[] = [];
  if (row) {
    delIds = [row.id];
  } else if (!ids.value.length) {
    return ElMessage.warning("请选择要删除的数据");
  } else {
    delIds = [...ids.value];
  }

  ElMessageBox.confirm(`确认删除选中的${delIds.length}条数据吗`, "删除提示", {
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    type: "error",
  })
    .then(async () => {
      try {
        deleteLoading.value = true;
        for (const id of delIds) {
          await deletePublicUser(id);
        }
        ElMessage.success("删除成功");
        await getList();
      } catch (error) {
        ElMessage.error("删除失败");
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
      delete updateData.password; // 编辑时不更新密码
      await updatePublicUser(updateData);
      ElMessage.success("更新成功");
    } else {
      // 新增 - 严格清理 ID 相关字段，避免主键冲突
      delete submitData.id;
      delete submitData.createTime;
      delete submitData.updateTime;
      await createPublicUser(submitData);
      ElMessage.success("创建成功");
    }

    dialogVisible.value = false;
    await getList();
  } catch (error) {
    ElMessage.error("操作失败");
  } finally {
    submitLoading.value = false;
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
    avatar: "",
    password: "",
  });
  formRef.value?.clearValidate();
}

// 初始化
getList();
</script>

<style scoped>
:deep(.public-user-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.public-user-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.public-user-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.public-user-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}

.public-user-dialog-form :deep(.el-form-item__label) {
  display: flex;
  align-self: stretch;
  align-items: center;
  min-height: var(--ep-cover-control-height-lg, 38px);
  padding-top: 0;
  padding-bottom: 0;
  line-height: normal;
}

.public-user-dialog-form :deep(.el-form-item__content) {
  min-height: var(--ep-cover-control-height-lg, 38px);
  align-items: center;
}

.public-user-dialog-form :deep(.public-user-dialog-form__date-picker.el-date-editor) {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: var(--ep-cover-control-height-lg, 38px);
}

.public-user-dialog-form :deep(.public-user-dialog-form__date-picker .el-input__wrapper) {
  min-height: var(--ep-cover-control-height-lg, 38px);
  align-items: center;
}
</style>
