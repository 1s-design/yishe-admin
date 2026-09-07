<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="design-request-page">
      <!-- 顶部过滤与搜索栏 -->
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--base" :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="关键词搜索">
                  <el-input
                    v-model="searchQuery"
                    placeholder="搜索请求名称、描述、联系方式..."
                    clearable
                    :prefix-icon="Search"
                    @keyup.enter="handleSearch"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button type="primary" :icon="Plus" @click="handleAdd">新增设计请求</el-button>
              <el-button
                type="danger"
                plain
                :icon="Delete"
                :loading="deleteLoading"
                @click="handleDelete(null)"
              >
                批量删除 ({{ ids.length }})
              </el-button>
              <el-button type="primary" :icon="Search" :loading="loading" @click="handleSearch">搜索</el-button>
              <el-button :icon="Refresh" :disabled="loading" @click="resetQuery">重置</el-button>
            </div>
          </el-form>
        </div>
      </template>

      <!-- 主体表格内容区 -->
      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid
                ref="gridRef"
                v-bind="gridOptions"
                :data="filteredDataSource"
                :loading="loading"
                @checkbox-change="checkboxChange"
                @checkbox-all="checkboxAllChange"
              >
                <template #nameSlot="{ row }">
                  <div class="font-medium" style="max-width: 240px; word-break: break-all;">
                    {{ row.name }}
                  </div>
                </template>
                <template #descriptionSlot="{ row }">
                  <div class="text-gray-500" style="max-width: 360px; word-break: break-all;">
                    {{ row.description || '-' }}
                  </div>
                </template>
                <template #uploaderSlot="{ row }">
                  <span>{{ row.uploader?.account || row.uploader?.name || row.userId || '-' }}</span>
                </template>
                <template #phoneNumberSlot="{ row }">
                  <span>{{ row.phoneNumber || '-' }}</span>
                </template>
                <template #emailSlot="{ row }">
                  <span>{{ row.email || '-' }}</span>
                </template>
                <template #createTimeSlot="{ row }">
                  <span class="table-time-text">{{ formatDateTime(row.createTime) }}</span>
                </template>
                <template #updateTimeSlot="{ row }">
                  <span class="table-time-text">{{ formatDateTime(row.updateTime) }}</span>
                </template>
                <template #operationDefaultSlot="{ row }">
                  <div class="table-actions flex items-center gap-2">
                    <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
                    <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
                  </div>
                </template>
              </vxe-grid>
            </div>
          </div>
        </div>
      </template>

      <!-- 分页区域 -->
      <template #pagination>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat">
          <Pagination
            :total="total"
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="560px"
      @close="dialogClose"
      align-center
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="设计请求名称" prop="name">
          <el-input
            v-model="form.name"
            placeholder="例如：万圣节Q版可爱小南瓜贴图"
            maxlength="100"
            show-word-limit
            :prefix-icon="EditPen"
          />
        </el-form-item>

        <el-form-item label="详细要求与描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="在这里记下你的核心元素、配色灵感、使用场景或是参考的设计风格..."
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phoneNumber">
              <el-input
                v-model="form.phoneNumber"
                placeholder="提供电话（选填）"
                maxlength="20"
                :prefix-icon="Phone"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系邮箱" prop="email">
              <el-input
                v-model="form.email"
                placeholder="提供邮箱（选填）"
                maxlength="100"
                :prefix-icon="Message"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitLoading">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Plus, Search, Refresh, Phone, Message, EditPen } from '@element-plus/icons-vue'
import { getDesignRequestList, createDesignRequest, updateDesignRequest, deleteDesignRequest } from '@/api/designRequest'
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from '@/common/table'
import { useWindowSize } from '@vueuse/core'
import ContentWrap from '@/components/ContentWrap/src/ContentWrap.vue'
import ListPageLayout from '@/components/ListPageLayout/index.vue'
import Pagination from '@/components/Pagination/index.vue'

// 搜索过滤查询词
const searchQuery = ref('')
const { height } = useWindowSize()

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20
})

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  columns: [
    { type: 'checkbox', width: 50 },
    { title: 'ID', field: 'id', width: 80 },
    { title: '请求名称', field: 'name', minWidth: 200, slots: { default: 'nameSlot' } },
    { title: '详细描述', field: 'description', minWidth: 300, slots: { default: 'descriptionSlot' } },
    { title: '上传者', field: 'uploader', width: 130, slots: { default: 'uploaderSlot' } },
    { title: '联系电话', field: 'phoneNumber', width: 130, slots: { default: 'phoneNumberSlot' } },
    { title: '联系邮箱', field: 'email', width: 160, slots: { default: 'emailSlot' } },
    { ...buildTimeColumn('创建时间', 'createTime', 160), slots: { default: 'createTimeSlot' } },
    { ...buildTimeColumn('更新时间', 'updateTime', 160), slots: { default: 'updateTimeSlot' } },
    buildOperationColumn('operationDefaultSlot')
  ]
})

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360)
})

const dataSource = ref<any[]>([])
const loading = ref(false)
const ids = ref<string[]>([])
const total = ref(0)
const deleteLoading = ref(false)
const formRef = ref()
const dialogTitle = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const form = ref<{
  id?: string
  name: string
  description: string
  phoneNumber: string
  email: string
}>({
  name: '',
  description: '',
  phoneNumber: '',
  email: ''
})
const submitLoading = ref(false)

// 本地搜索/检索数据源
const filteredDataSource = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return dataSource.value
  return dataSource.value.filter((item: any) => {
    return (
      (item.name && item.name.toLowerCase().includes(query)) ||
      (item.description && item.description.toLowerCase().includes(query)) ||
      (item.email && item.email.toLowerCase().includes(query)) ||
      (item.phoneNumber && item.phoneNumber.includes(query)) ||
      (item.uploader?.account && item.uploader.account.toLowerCase().includes(query)) ||
      (item.uploader?.name && item.uploader.name.toLowerCase().includes(query))
    )
  })
})

function formatDateTime(dateStr: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function getList() {
  loading.value = true
  try {
    const params = {
      page: queryParams.currentPage,
      pageSize: queryParams.pageSize
    }
    const res = await getDesignRequestList(params)
    dataSource.value = res.list || []
    total.value = res.total || 0
    ids.value = []
  } catch (error) {
    console.error('获取设计请求列表失败:', error)
    ElMessage.error('获取设计请求列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  queryParams.currentPage = 1
  getList()
}

function resetQuery() {
  searchQuery.value = ''
  queryParams.currentPage = 1
  getList()
}

function handleAdd() {
  isEdit.value = false
  dialogVisible.value = true
  dialogTitle.value = '新增设计请求'
  form.value = {
    name: '',
    description: '',
    phoneNumber: '',
    email: ''
  }
}

onMounted(getList)

function checkboxChange(e: any) {
  ids.value = (e.records || []).map((item: any) => item.id)
}

function checkboxAllChange(e: any) {
  ids.value = (e.records || []).map((item: any) => item.id)
}

function handleEdit(row: any) {
  isEdit.value = true
  dialogVisible.value = true
  dialogTitle.value = '编辑设计请求'
  form.value = {
    id: row.id,
    name: row.name,
    description: row.description || '',
    phoneNumber: row.phoneNumber || '',
    email: row.email || ''
  }
}

function handleDelete(row?: any) {
  let delIds: string[] = []
  if (row) {
    delIds = [row.id]
  } else if (!ids.value.length) {
    return ElMessage.warning('请选择要删除的数据')
  } else {
    delIds = [...ids.value]
  }

  ElMessageBox.confirm(
    `确认删除选中的 ${delIds.length} 条设计请求吗？此操作无法撤销。`,
    '提示',
    {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
      type: 'warning'
    }
  )
    .then(async () => {
      try {
        deleteLoading.value = true
        for (const id of delIds) {
          await deleteDesignRequest(id)
        }
        ElMessage.success('已删除设计请求')
        getList()
      } catch (error) {
        console.error('删除失败:', error)
        ElMessage.error('删除失败')
      } finally {
        deleteLoading.value = false
      }
    })
    .catch(() => {})
}

const rules = {
  name: [
    { required: true, message: '请输入请求名称', trigger: 'blur' },
    { min: 1, max: 100, message: '请求名称长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  description: [
    { max: 1000, message: '描述长度不能超过 1000 个字符', trigger: 'blur' }
  ],
  phoneNumber: [
    { max: 20, message: '联系电话长度不能超过 20 个字符', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
    { max: 100, message: '邮箱长度不能超过 100 个字符', trigger: 'blur' }
  ]
}

const dialogClose = () => {
  dialogVisible.value = false
  submitLoading.value = false
  formRef.value?.resetFields()
}

const submitForm = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    submitLoading.value = true

    if (isEdit.value) {
      await updateDesignRequest(form.value.id!, {
        name: form.value.name,
        description: form.value.description,
        phoneNumber: form.value.phoneNumber,
        email: form.value.email
      })
      ElMessage.success('更新成功')
    } else {
      await createDesignRequest({
        name: form.value.name,
        description: form.value.description,
        phoneNumber: form.value.phoneNumber,
        email: form.value.email
      })
      ElMessage.success('新增成功')
    }

    getList()
    dialogVisible.value = false
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('操作失败')
  } finally {
    submitLoading.value = false
  }
}
</script>

<style scoped>
:deep(.design-request-page.list-page-layout) {
  padding: 0;
  gap: 12px;
}

.table-time-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
