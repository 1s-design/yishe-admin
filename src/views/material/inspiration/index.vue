<!-- 图片采集灵感：作为采集模块 Tab 内的组件使用，不单独占用路由；纯文字速记 -->
<template>
  <div class="inspiration-panel">
    <ListPageLayout class="inspiration-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="关键词">
                  <el-input
                    v-model="queryParams.keyword"
                    size="small"
                    clearable
                    placeholder="名称 / 描述 / 备注"
                    @keyup.enter="handleSearch"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
              <el-button size="small" :icon="Refresh" @click="resetQuery">重置</el-button>
              <el-button size="small" type="primary" :icon="Plus" @click="openDialog()">新增灵感</el-button>
              <el-button size="small" type="danger" :icon="Delete" :disabled="!selectedIds.length" @click="handleBatchDelete">
                批量删除 ({{ selectedIds.length }})
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
                :data="list"
                :loading="loading"
                @checkbox-change="onCheckboxChange"
                @checkbox-all="onCheckboxChange"
              >
                <template #operationDefaultSlot="{ row }">
                  <div class="inspiration-operations">
                    <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
                    <el-button link type="danger" size="small" @click="handleDelete(row.id)">删除</el-button>
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
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            :total="total"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>
  </div>

  <!-- 新增 / 编辑 -->
  <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" destroy-on-close>
    <el-form :model="form" label-width="80px" size="small">
      <el-form-item label="灵感名称">
        <el-input v-model="form.name" maxlength="255" show-word-limit placeholder="给这条灵感起个名字" />
      </el-form-item>
      <el-form-item label="文字描述">
        <el-input v-model="form.content" type="textarea" :rows="4" placeholder="用文字描述你的灵感 / 需求" />
      </el-form-item>
      <el-form-item label="补充备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useWindowSize } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Delete } from '@element-plus/icons-vue'
import ListPageLayout from '@/components/ListPageLayout/index.vue'
import { buildOperationColumn, commonGridOptions } from '@/common/table'
import {
  getInspirationPage,
  createInspiration,
  updateInspiration,
  deleteInspiration,
  type Inspiration
} from '@/api/inspiration'

const loading = ref(false)
const saving = ref(false)
const list = ref<Inspiration[]>([])
const total = ref(0)
const selectedIds = ref<Array<string | number>>([])
const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  keyword: ''
})

const dialogVisible = ref(false)
const dialogTitle = ref('新增灵感')

const gridRef = ref<any>()
const { height: windowHeight } = useWindowSize()
const gridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: Math.max(windowHeight.value - 320, 360),
  rowConfig: { keyField: 'id' },
  columns: [
    { type: 'checkbox' as const, width: 50, title: '' },
    { field: 'name', title: '灵感名称', minWidth: 200, showOverflow: true, className: 'font-bold' },
    { field: 'content', title: '文字描述', minWidth: 260, showOverflow: true },
    { field: 'remark', title: '备注', minWidth: 160, showOverflow: true },
    {
      field: 'createdAt',
      title: '创建时间',
      width: 168,
      formatter: ({ cellValue }: any) => formatTime(cellValue)
    },
    buildOperationColumn('operationDefaultSlot', 110)
  ] as any
}))

const form = reactive({
  id: '' as string | number,
  name: '',
  content: '',
  remark: ''
})

const formatTime = (value?: string) =>
  value ? String(value).replace('T', ' ').slice(0, 19) : '-'

async function getList() {
  selectedIds.value = []
  loading.value = true
  try {
    const res: any = await getInspirationPage({
      currentPage: queryParams.currentPage,
      pageSize: queryParams.pageSize,
      keyword: queryParams.keyword || undefined
    })
    list.value = res?.list || []
    total.value = res?.total || 0
  } catch {
    ElMessage.error('获取灵感列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  queryParams.currentPage = 1
  getList()
}

function resetQuery() {
  queryParams.keyword = ''
  queryParams.currentPage = 1
  getList()
}

function onCheckboxChange() {
  selectedIds.value = (gridRef.value?.getCheckboxRecords?.() || [])
    .map((row: Inspiration) => row.id)
    .filter(Boolean)
}

function openDialog(row?: Inspiration) {
  dialogTitle.value = row ? '编辑灵感' : '新增灵感'
  form.id = row?.id ?? ''
  form.name = row?.name || ''
  form.content = row?.content || ''
  form.remark = row?.remark || ''
  dialogVisible.value = true
}

async function handleSave() {
  const payload: Inspiration = {
    name: form.name,
    content: form.content || null,
    remark: form.remark || null
  }
  if (form.id !== '' && form.id !== undefined && form.id !== null) {
    payload.id = form.id
  }

  saving.value = true
  try {
    if (payload.id) {
      await updateInspiration(payload)
    } else {
      await createInspiration(payload)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    getList()
  } catch (error: any) {
    ElMessage.error(error?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function doDelete(ids: Array<string | number>) {
  if (!ids.length) return
  await ElMessageBox.confirm(`确认删除选中的 ${ids.length} 条灵感吗？`, '提示', { type: 'warning' })
  try {
    await deleteInspiration(ids)
    ElMessage.success('删除成功')
    selectedIds.value = []
    getList()
  } catch (error: any) {
    ElMessage.error(error?.message || '删除失败')
  }
}

const handleDelete = (id: string | number) => doDelete([id])
const handleBatchDelete = () => doDelete([...selectedIds.value])

onMounted(getList)
</script>

<style scoped>
/* 嵌在采集模块 Tab 内：与其他标准列表页保持一致的紧凑间距 */
:deep(.inspiration-page) { gap: 10px; padding: 8px 0 0; }
:deep(.inspiration-page .list-page-layout__body),
:deep(.inspiration-page .list-page-layout__main) { gap: 10px; }
:deep(.inspiration-page .list-page-filter--flat) { gap: 10px; padding-bottom: 10px; }
:deep(.inspiration-page .list-page-table-panel__pagination--flat) { padding-top: 10px; }
:deep(.inspiration-page .list-page-table-panel__body) { overflow: hidden; }

.inspiration-panel { min-height: 0; }
.inspiration-operations { display: inline-flex; align-items: center; gap: 4px; }
</style>
