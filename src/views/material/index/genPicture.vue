<template>
  <div>
    <div class="py-4 flex justify-between gap-4 items-center">
      <!-- 导出按钮 -->
      <h3> 套图配置 </h3>
      <div style="flex: 1"></div>

      <div class="shrink-0">
        <el-button  @click="() => {
          $router.push({
            name:'PictureConfig'
          })
        }" :icon="TopRight"> 去添加默认配置 </el-button>
        <el-button type="primary" @click="handleAdd" :icon="Plus"> 新增 </el-button>
        <el-button type="warning" @click="handleRefresh" :icon="Refresh"> 重新拉取配置 </el-button>
      </div>
    </div>

    <!-- 表格展示 -->
    <div class="common-table">
      <vxe-grid v-bind="gridOptions" :data="dataSource" :loading="loading">
        <template #operationDefaultSlot="{ row }">
          <div class="flex table-operation-column">
            <el-button type="primary" link size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </div>
        </template>
      </vxe-grid>
    </div>

    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="600px" @close="dialogClose" @cancel="dialogClose"
      align-center>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="店铺" prop="shopId">
              <el-select v-model="form.shopId" placeholder="选择店铺" style="width:100%" @change="shopIdChange">
                <el-option v-for="item in shopList" :key="item.id" :value="item.id" :label="item.shopName"
                  :disabled="isShopIdDisabled(item.id)">
                  <div class="flex items-center gap-2">
                    {{ item.shopName }} <el-tag size="small" type="warning" round> {{ item.platformName }} </el-tag>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="类目" prop="categoryId">
              <el-select v-model="form.categoryId" placeholder="选择类目搜索" @change="categoryIdChange">
                <el-option v-for="item in shopCategoryList" :key="item.id" :label="item.categoryName" :value="item.id"
                  :disabled="isCategoryIdDisabled(item.id)" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="套图模板" prop="psdTemplateId">
              <el-select v-model="form.psdTemplateId" placeholder="选择套图模板" style="width:100%"
                @change="psdTemplateIdChange">
                <el-option v-for="item in psdTemplateList" :disabled="isPsdTemplateIdDisabled(item.id)" :key="item.id"
                  :label="item.templateName" :value="item.id" />
                <template #empty>
                  <template v-if="form.shopId && form.categoryId">
                    <el-button link type="primary" size="small" :icon="TopRight" @click="() => {
                      $router.push({
                        name: 'PsdTemplate'
                      })
                    }"> 该店铺类目下没有套图模板，去添加 </el-button>
                  </template>

                  <template v-if="!form.shopId && !form.categoryId">
                    <el-button type="warning" link size="small"> 请先选择店铺和分类 </el-button>
                  </template>

                  <template v-if="form.shopId && !form.categoryId">
                    <el-button type="warning" link size="small"> 请选择分类 </el-button>
                  </template>

                  <template v-if="!form.shopId && form.categoryId">
                    <el-button type="warning" link size="small"> 请选择店铺 </el-button>
                  </template>
                </template>

              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="标题模板" prop="titleTemplateId">
              <el-select v-model="form.titleTemplateId" placeholder="选择标题模板" style="width:100%">
                <el-option v-for="item in titleTemplateList" :key="item.id" :label="item.titleName" :value="item.id" />
                <template v-if="form.psdTemplateId" #empty>
                  <el-button link type="primary" size="small" :icon="TopRight" @click="() => {
                    $router.push({
                      name: 'TitleTemplate'
                    })
                  }"> 暂无标题,去添加 </el-button>
                </template>
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="发布模板" prop="publishTemplateId">
              <el-select v-model="form.publishTemplateId" placeholder="选择发布模板" style="width:100%">
                <el-option v-for="item in publishTemplateList" :key="item.id" :label="item.templateName"
                  :value="item.id" />
                <template #empty>
                  <template v-if="form.shopId && form.categoryId">
                    <el-button link type="primary" size="small" :icon="TopRight" @click="() => {
                      $router.push({
                        name: 'ShopTemplate'
                      })
                    }"> 该店铺类目下没有套图模板，去添加 </el-button>
                  </template>

                  <template v-if="!form.shopId && !form.categoryId">
                    <el-button type="warning" link size="small"> 请先选择店铺和类目 </el-button>
                  </template>

                  <template v-if="form.shopId && !form.categoryId">
                    <el-button type="warning" link size="small"> 请选择分类 </el-button>
                  </template>

                  <template v-if="!form.shopId && form.categoryId">
                    <el-button type="warning" link size="small"> 请选择店铺 </el-button>
                  </template>
                </template>

              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="tsx">
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import { buildOperationColumn, commonGridOptions } from "@/common/table";
import { formatTimestamp } from "@/common/date";
import { useUserStore } from "@/store/modules/user";
import { sortTypeOptions, defaultSortingValue } from "@/common/sort";
import { ElMessage, ElMessageBox } from "element-plus";
import { getTitleTemplateList, addTitleTemplate, editTitleTemplate, deleteTitleTemplate } from "@/api/publish"; // 实际接口导入
import { addConfigTemplate, deleteConfigTemplate, updateConfigTemplate, getConfigTemplateList } from "@/api/publish/config";
import { Search, Plus, Delete, TopRight, Refresh } from "@element-plus/icons-vue";
import { useWindowSize } from "@vueuse/core";
import { categoryOptions } from "@/views/material/collect";
import { ShopPlatformApi } from "@/api/shop/platform";
import { ShopCategoryApi } from "@/api/shop/category"; // 实际接口导入
import { ShopApi } from "@/api/shop/shopIndex";
import { psdTemplateApi } from "@/api/psdTemplate";
import { getProductTemplateList } from "@/api/publish/template";

const emits = defineEmits(['config-change'])

function configChange() {
  const params = dataSource.value.map((item) => {
    return {
      shopId: item.shopId,
      categoryId: item.categoryId,
      psdTemplateId: item.psdTemplateId,
      titleTemplateId: item.titleTemplateId,
      publishTemplateId:item.publishTemplateId
    }
  })

  emits('config-change', params)
}

// 查询条件
const queryParams = reactive({
  currentPage: 1,
  pageSize: 99,
  name: "",
  categoryId: '',
  sortingFields: defaultSortingValue(),
});


/**
 * @psd套图列表
*/
const psdTemplateList = ref([])

async function initPsdTemplate() {

  let shopId = form.value.shopId;
  let categoryId = form.value.categoryId

  if (!shopId || !categoryId) {
    return
  }

  let res = await psdTemplateApi.getPsdTemplatePage({
    currentPage: 1,
    pageSize: 99,
    shopId,
    categoryId
  })
  psdTemplateList.value = res.list
}

/**
 * @psd模板是否可用，psd模板在列表中只能出现一个
*/

function isPsdTemplateIdDisabled(psdTemplateId) {
  return dataSource.value.some((item) => {
    return item.psdTemplateId == psdTemplateId
  })
}

/**
 * @同店铺和同类目只能有一个
*/

/**
 * @店铺是否禁用
*/

function isShopIdDisabled(shopId) {

  if (!form.value.categoryId) {
    return false
  }

  let someCategoryIdShopIdSame = dataSource.value.some((row) => {
    return row.categoryId == form.value.categoryId && row.shopId == shopId
  })

  if (someCategoryIdShopIdSame) {
    return true
  }

  return false

}

/**
 * @类目是否禁用
*/

function isCategoryIdDisabled(categoryId) {
  if (!form.value.shopId) {
    return false
  }


  let someCategoryIdShopIdSame = dataSource.value.some((row) => {
    return row.categoryId == categoryId && row.shopId == form.value.shopId
  })

  if (someCategoryIdShopIdSame) {
    return true
  }

  return false
}


/**
 * @店铺类目列表
*/

const shopCategoryList = ref([])

async function initShopCategory() {
  const res = await ShopCategoryApi.getShopCategoryPage({
    currentPage: 1,
    pageSize: 20,
  })
  shopCategoryList.value = res.list
}

initShopCategory()

// 店铺的下拉多选
const shopList = ref([
])

async function initShopList() {
  const res = await ShopApi.getShopPage({
    currentPage: 1,
    pageSize: 99
  });
  shopList.value = res.list
}

initShopList();


function psdTemplateIdChange(psdTemplateId) {
  initTitleTemplate(psdTemplateId)
  form.value.titleTemplateId = null
}


/**
 * @标题模板
*/
const titleTemplateList = ref([])

async function initTitleTemplate(psdTemplateId?) {
  let res = await getTitleTemplateList({
    currentPage: 1,
    pageSize: 99,
    psdTemplateId
  })
  titleTemplateList.value = res.list
}

const { height } = useWindowSize();

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  columns: [
    { title: "店铺", field: "shopName", minWidth: 100, showOverflow: true },
    {
      title: "类目", field: "categoryName", minWidth: 100, showOverflow: true,
    },
    { title: "套图模板", field: "psdTemplateName", minWidth: 100, showOverflow: true },
    { title: "标题模板", field: "titleTemplateName", minWidth: 100, showOverflow: true },
    { title: "发布模板名称", field: "publishTemplateName", minWidth: 100, showOverflow: true },
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


async function getList() {
  loading.value = true;

  let params = {
    ...queryParams,
  };

  getConfigTemplateList({
    ...params,
  }).then((res) => {
    dataSource.value = res.list;
    total.value = res.total;
    ids.value = [];
    configChange()
  }).catch((err) => {
    ElMessage.error(err)
  }).finally(() => {
    loading.value = false;
  });
}

getList();
function handleDelete(row?) {
  let ind = dataSource.value.indexOf(row)
  dataSource.value.splice(ind, 1)
  configChange()
}

function handleAdd() {
  isEdit.value = false;
  dialogVisible.value = true;
  dialogTitle.value = "新建";
  form.value = {};
}

async function handleEdit(row) {
  isEdit.value = true;
  dialogVisible.value = true;
  dialogTitle.value = "编辑";
  currentRow.value = row
  form.value = {
    ...row
  };

  initPsdTemplate()
  initPublishTemplate()
  initTitleTemplate(form.value.psdTemplateId)
}


async function handleRefresh() {
  getList()
}


const form = ref({
  shopId: '',
  categoryId: '',
  psdTemplateId: '',
  titleTemplateId: '',
  publishTemplateId:'',
});

const rules = {
  categoryId: [{ required: true, message: "请选择类目", trigger: "blur" }],
  shopId: [{ required: true, message: "请选择店铺", trigger: "blur" }],
  psdTemplateId: [{ required: true, message: "请选择套图模板", trigger: "blur" }],
  titleTemplateId: [{ required: true, message: "请选择标题模板", trigger: "blur" }],
  publishTemplateId: [{ required: true, message: "请选择发布模板", trigger: "blur" }],
};

const dialogClose = () => {
  dialogVisible.value = false;
  form.value = {}
  formRef.value.clearValidate()
};

const submitForm = async () => {
  submitLoading.value = true;
  await formRef.value.validate().finally(() => {
    submitLoading.value = false;
  });
  try {

    let newRow = {
      shopId: form.value.shopId,
      shopName: shopList.value.find((item) => item.id == form.value.shopId).shopName,
      categoryId: form.value.categoryId,
      categoryName: shopCategoryList.value.find((item) => item.id == form.value.categoryId).categoryName,
      psdTemplateId: form.value.psdTemplateId,
      psdTemplateName: psdTemplateList.value.find((item) => item.id == form.value.psdTemplateId).templateName,
      titleTemplateId: form.value.titleTemplateId,
      titleTemplateName: titleTemplateList.value.find((item) => item.id == form.value.titleTemplateId).titleName,
    }

    if (isEdit.value) {
      let ind = dataSource.value.indexOf(currentRow.value);
      dataSource.value[ind] = newRow;
      configChange()
      ElMessage.success("更新成功");
    } else {
      dataSource.value.push(newRow)
      configChange()
      ElMessage.success("添加成功");
    }
    dialogVisible.value = false;
  } catch (e) {
  } finally {
    submitLoading.value = false;
    dialogVisible.value = false;
  }
};

async function shopIdChange(shopId) {
  initPsdTemplate()
  initPublishTemplate()
  form.value.psdTemplateId = null
  form.value.publishTemplateId = null
  form.value.titleTemplateId = null
}

async function categoryIdChange(categoryId) {
  initPsdTemplate()
  initPublishTemplate()
  form.value.psdTemplateId = null
  form.value.publishTemplateId = null
  form.value.titleTemplateId = null
}

const publishTemplateList = ref([])
async function initPublishTemplate() {
  let shopId = form.value.shopId;
  let categoryId = form.value.categoryId

  if (!shopId || !categoryId) {
    return
  }
  const res = await getProductTemplateList({
    shopId: shopId,
    categoryId: categoryId
  })
  publishTemplateList.value = res.list
}
</script>

<style lang="less"></style>
@/api/psdTemplate
