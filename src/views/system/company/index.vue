<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="company-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="公司名称">
                  <el-input
                    v-model="queryParams.name"
                    size="small"
                    placeholder="请输入公司名称"
                    clearable
                    @change="(val) => { if (!val) getList(); }"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading" @click="handleSearch">搜索</el-button>
              <el-button size="small" :icon="Refresh" :disabled="loading" @click="resetQuery">重置</el-button>
              <el-button size="small" type="primary" :icon="Plus" @click="handleAdd">新增</el-button>
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
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
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
                <template #operationDefaultSlot="{ row }">
                  <div class="flex justify-start">
                    <el-dropdown
                      class="operation-dropdown"
                      placement="bottom-end"
                      @command="(command) => handleOperationCommand(command, row)"
                    >
                      <el-button type="primary" link size="small" class="operation-trigger-button">操作</el-button>
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item command="edit">
                            <span>编辑</span>
                          </el-dropdown-item>
                          <template v-if="userStore.user?.isAdmin">
                            <el-dropdown-item command="delete" divided class="operation-menu-item--danger">
                              <span>删除</span>
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

  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="420px"
    align-center
    :close-on-click-modal="false"
    @close="resetForm"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-position="top"
    >
      <el-form-item label="公司名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入公司名称" maxlength="50" show-word-limit />
      </el-form-item>
      <el-form-item label="公司简介（可选）" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="2"
          placeholder="简单描述"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="过期时间（可选）" prop="expireTime">
        <el-date-picker
          v-model="formData.expireTime"
          type="datetime"
          placeholder="不设置则永久有效"
          class="!w-full"
          :disabled-date="(date) => date.getTime() < Date.now() - 86400000"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="submitLoading" @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
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
import { Search, Delete, Refresh, Plus } from "@element-plus/icons-vue";
import { getCompanyList, createCompany, updateCompany, deleteCompany } from "@/api/company";
import { useUserStore } from "@/store/modules/user";
import Pagination from "@/components/Pagination/index.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";

// 查询条件
const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  sortingFields: defaultSortingValue(),
  name: "",
  search: "",
});

const userStore = useUserStore();

const gridRef = ref();

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
    { title: "公司名称", field: "name", minWidth: 180, className: "font-bold" },
    {
      title: "创建人",
      field: "uploader",
      width: 140,
      showOverflow: true,
      formatter: ({ row }) => row?.uploader?.account || row?.uploader?.name || row?.userId || "-",
    },
    { title: "邀请码", field: "inviteCode", width: 150 },
    { title: "公司描述", field: "description", minWidth: 200, showOverflow: true },
    {
      title: "过期时间",
      field: "expireTime",
      width: 180,
      showOverflow: true,
      formatter: (e) => {
        return e.cellValue ? formatTimestamp(e.cellValue) : "-";
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
const dialogTitle = ref("新增公司");
const formRef = ref();
const formData = reactive({
  id: "",
  name: "",
  inviteCode: "",
  description: "",
  expireTime: "",
});

const formRules = {
  name: [{ required: true, message: "请输入公司名称", trigger: "blur" }],
};

// 获取列表
async function getList() {
  loading.value = true;
  try {
    let res = await getCompanyList({
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

// 搜索
const handleSearch = () => {
  queryParams.currentPage = 1;
  getList();
};

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

// 重置查询
const resetQuery = () => {
  queryParams.currentPage = 1;
  queryParams.pageSize = 20;
  queryParams.name = "";
  queryParams.search = "";
  queryParams.sortingFields = defaultSortingValue();
  getList();
};

// 生成邀请码函数
function generateInviteCode() {
  // 8位随机码，可根据需要自定义
  return Math.random().toString(36).slice(-8);
}

// 新增
function handleAdd() {
  dialogTitle.value = "新增公司";
  dialogVisible.value = true;
  resetForm();
  formData.inviteCode = generateInviteCode(); // 新增时自动生成邀请码
}

// 编辑
function handleEdit(row) {
  dialogTitle.value = "编辑公司";
  dialogVisible.value = true;
  Object.assign(formData, row);
}

// 删除公司
function handleDelete(row?) {
  if (deleteLoading.value) return
  const userStore = useUserStore();
  if (!userStore.user?.isAdmin) {
    return ElMessage.warning("无权限：仅管理员可执行删除操作");
  }
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
        deleteLoading.value = true
        for (const id of delIds) {
          await deleteCompany(id);
        }
        ElMessage.success("删除成功");
        await getList();
      } catch (error) {
        ElMessage.error("删除失败");
      } finally {
        deleteLoading.value = false
      }
    })
    .catch(() => {});
}

// 提交表单
async function handleSubmit() {
  if (submitLoading.value) return
  try {
    submitLoading.value = true
    await formRef.value.validate();

    if (formData.id) {
      // 编辑
      await updateCompany(formData);
      ElMessage.success("更新成功");
    } else {
      // 新增
      await createCompany(formData);
      ElMessage.success("创建成功");
    }

    dialogVisible.value = false;
    await getList();
  } catch (error) {
    ElMessage.error("操作失败");
  } finally {
    submitLoading.value = false
  }
}

// 重置表单
function resetForm() {
  Object.assign(formData, {
    id: "",
    name: "",
    inviteCode: generateInviteCode(), // 重置时也生成新邀请码
    description: "",
    expireTime: "",
  });
  formRef.value?.clearValidate();
}

// 初始化
getList();
</script>

<style scoped>
:deep(.company-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.company-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.company-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.company-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}
</style>
