<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="shop-category-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--base" :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item :label="t('shop.categorySearchName')">
                  <el-input
                    v-model="queryParams.categoryName"
                    clearable
                    :placeholder="t('shop.categoryNamePlaceholder')"
                    @change="(val) => {
                      if (!val) {
                        getList()
                      }
                    }"
                  />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--base" :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item :label="t('shop.sortType')">
                  <el-select v-model="queryParams.sortingFields" @change="getList">
                    <el-option v-for="item in sortTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button type="primary" @click="getList" :icon="Search" :loading="loading">{{ t('common.search') }}</el-button>
              <el-button type="primary" :disabled="single" @click="handleAdd" :icon="Plus">{{ t('common.add') }}</el-button>
              <el-button type="danger" :icon="Delete" :loading="deleteLoading" @click="handleDelete(null)">{{ t('common.batchDelete') }}</el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
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
                <template #operationDefaultSlot="{ row }">
                  <div class="flex justify-start">
                    <el-dropdown class="operation-dropdown" placement="bottom-end">
                      <el-button type="primary" link size="small" class="operation-trigger-button">{{ t('common.operation') }}</el-button>
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item @click="handleEdit(row)">{{ t('common.edit') }}</el-dropdown-item>
                          <template v-if="userStore.user?.isAdmin">
                            <el-dropdown-item divided @click="handleDelete(row)" class="operation-menu-item--danger">{{ t('common.delete') }}</el-dropdown-item>
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

    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="600px" @cancel="dialogClose" align-center>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row>
          <el-col :span="24">
            <el-form-item :label="t('shop.categoryName')" prop="categoryName">
              <el-input v-model="form.categoryName" :placeholder="t('shop.categoryNamePlaceholder')" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitLoading">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>
</template>

<script setup lang="tsx">
import { ref, reactive, computed, onMounted, onUnmounted, watchEffect } from "vue";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import { formatTimestamp } from "@/common/date";
import { useUserStore } from "@/store/modules/user";
import { sortTypeOptions, defaultSortingValue } from "@/common/sort";
import { ElMessage, ElMessageBox } from "element-plus";
import { ShopCategoryApi } from "@/api/shop/category"; // 实际接口导入
import { Search, Plus, Delete } from "@element-plus/icons-vue";
import { useWindowSize } from "@vueuse/core";
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";
import ListPageLayout from "@/components/ListPageLayout/index.vue";
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 查询条件
const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  categoryName: '',
  sortingFields: defaultSortingValue(),
});


const userStore = useUserStore();

const { height } = useWindowSize();

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  columns: [
    { type: "checkbox", width: 50, showOverflow: true },
    buildOperationColumn("operationDefaultSlot", undefined, {
      showOverflow: false,
    }),
  ],
});

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
});

const dataSource = ref([]);
const loading = ref(false);
const open = ref(false);
const title = ref("");
const ids = ref([]);
const single = ref(false);
const multiple = ref(true);
const total = ref(0);
const formRef = ref();
const dialogTitle = ref("");
const dialogVisible = ref(false);
const isEdit = ref(true);
const currentRow = ref({});
const submitLoading = ref(false);
const deleteLoading = ref(false);

async function getList() {
  loading.value = true;

  let params = {
    ...queryParams,
  };

  let res = await ShopCategoryApi.getShopCategoryPage({
    ...params,
  }).catch(() => {

  }).finally(() => {
    loading.value = false;
  });
  dataSource.value = res.list;
  total.value = res.total;
  ids.value = [];
}

getList();

// 操作函数
function handleQuery() {
  queryParams.currentPage = 1;
}

function resetQuery() {
  getList();
}

async function handleDelete(row?) {
  if (!userStore.user?.isAdmin) {
    return ElMessage.warning(t('shop.noPermission'))
  }
  let delIds: any = null;
  if (row) {
    delIds = [row.id];
  } else if (!ids.value.length) {
    return ElMessage.warning(t('shop.selectDataToDelete'));
  } else {
    delIds = [...ids.value];
  }

  try {
    await ElMessageBox.confirm(
      t('shop.confirmDelete'),
      t('shop.deleteTip'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'error',
      }
    )
    deleteLoading.value = true
    await ShopCategoryApi.deleteShopCategory({ ids: delIds });
    ElMessage.success(t('common.deleteSuccess'));
    await getList();
  } catch (error) {
  } finally {
    deleteLoading.value = false
  }
}


function handleAdd() {
  isEdit.value = false;
  dialogVisible.value = true;
  dialogTitle.value = t('shop.create');
  form.value = {};
}

function handleEdit(row) {
  isEdit.value = true;
  dialogVisible.value = true;
  dialogTitle.value = t('shop.edit');
  form.value = {
    ...row
  };
}



function cancel() {
  open.value = false;
}

const form = ref({
  categoryName: ''
});

const rules = {
  categoryName: [{ required: true, message: t('shop.categoryNameRequired'), trigger: "blur" }],
};

const dialogClose = () => {
  dialogVisible.value = false;
};

function checkboxChange(e) {
  ids.value = e.records.map((item) => item.id);
}

function checkboxAllChange(e) {
  ids.value = e.records.map((item) => item.id);
}



const submitForm = async () => {
  try {
    submitLoading.value = true;
    await formRef.value?.validate()
    if (isEdit.value) {
      await ShopCategoryApi.updateShopCategory({
        id: form.value.id,
        categoryName: form.value.categoryName
      });
      ElMessage.success(t('common.updateSuccess'));
    } else {
      await ShopCategoryApi.createShopCategory({
        ...form.value,
      });
      ElMessage.success(t('common.addSuccess'));
    }

    dialogVisible.value = false;
  } catch (e) {
  } finally {
    submitLoading.value = false;
  }
  if (!dialogVisible.value) {
    getList();
  }
};
</script>

<style lang="less" scoped>
:deep(.shop-category-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.shop-category-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.shop-category-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

:deep(.shop-category-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}
</style>
