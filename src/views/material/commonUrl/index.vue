<template>
  <ContentWrap :plain="true">
    <ListPageLayout
      class="common-url-page"
      :sidebar-width="folderTreeCollapsed ? '28px' : '280px'"
    >
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="10" :lg="8">
                <el-form-item label="搜索">
                  <el-input
                    v-model="queryParams.searchKeyword"
                    size="small"
                    placeholder="搜索名称、链接、描述、关键字"
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
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="时间范围">
                  <DateRangePicker
                    @change="
                      (val) => {
                        queryParams.startTime = val.start;
                        queryParams.endTime = val.end;
                        getList();
                      }
                    "
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" @click="handleSearch" :icon="Search" :loading="loading">搜索</el-button>
              <el-button size="small" :disabled="loading" @click="handleReset">重置</el-button>
              <el-button size="small" type="primary" :icon="Plus" @click="handleAdd">新增</el-button>
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                :loading="deleteLoading"
                @click="handleDelete(null)"
              >
                批量删除 ({{ ids.length }})
              </el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #sidebar>
        <div
          class="list-page-panel list-page-panel--flat list-page-sidebar common-url-sidebar folder-sidebar-shell"
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
        <div
          class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat"
        >
          <div class="list-page-table-panel__body">
            <div class="common-table">
              <vxe-grid
                class="common-url-dnd-grid dnd-text-selectable"
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
          <div class="flex justify-start">
            <el-dropdown class="operation-dropdown" placement="bottom-end">
              <el-button type="primary" link size="small" class="operation-trigger-button">操作</el-button>
              <template #dropdown>
                <el-dropdown-menu class="operation-menu-compact">
                  <el-dropdown-item @click="handleEdit(row)">编辑</el-dropdown-item>
                  <el-dropdown-item divided :disabled="loading || deleteLoading" @click="handleDelete(row)" class="operation-menu-item--danger">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
        <template #nameSlot="{ row }">
          <div class="text-wrap" style="max-width: 200px; word-break: break-all;">
            {{ row.name }}
          </div>
        </template>
        <template #urlSlot="{ row }">
          <div class="text-wrap" style="max-width: 300px; word-break: break-all;">
            <a :href="row.url" target="_blank" class="text-[var(--el-color-primary)] hover:text-[var(--el-color-primary-dark-2)]">
              {{ row.url }}
            </a>
          </div>
        </template>
        <template #descriptionSlot="{ row }">
          <div class="text-wrap" style="max-width: 300px; word-break: break-all;">
            {{ row.description || '-' }}
          </div>
        </template>
        <template #keywordsSlot="{ row }">
          <div v-if="row.keywords" class="keywords-container">
            <el-tag 
              v-for="keyword in getKeywordsArray(row.keywords)" 
              :key="keyword"
              size="small"
              type="info"
              class="keyword-tag"
            >
              {{ keyword.trim() }}
            </el-tag>
          </div>
          <span v-else>-</span>
        </template>
        <template #categorySlot="{ row }">
          <el-tag v-if="row.category" :type="getCategoryTagType(row.category)">
            {{ row.category }}
          </el-tag>
          <span v-else>-</span>
        </template>
        <template #statusSlot="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'danger'">
            {{ row.isActive ? '启用' : '禁用' }}
          </el-tag>
        </template>
        <template #uploaderSlot="{ row }">
          <span>{{ row.uploader?.account || row.uploader?.name || row.userId || '-' }}</span>
        </template>
        <template #createTimeSlot="{ row }">
          <span class="table-time-text">{{ formatDateTime(row.createTime) }}</span>
        </template>
        <template #updateTimeSlot="{ row }">
          <span class="table-time-text">{{ formatDateTime(row.updateTime) }}</span>
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
          <Pagination
            :total="total"
            v-model:page="queryParams.currentPage"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </div>
      </template>
    </ListPageLayout>

    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="700px"
      @close="dialogClose"
      align-center
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="网址名称" prop="name">
              <el-input 
                v-model="form.name" 
                placeholder="请输入网址名称" 
                maxlength="100"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="网址链接" prop="url">
              <el-input 
                v-model="form.url" 
                placeholder="请输入网址链接" 
                maxlength="500"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="详细描述" prop="description">
              <el-input 
                v-model="form.description" 
                type="textarea" 
                :rows="3"
                placeholder="请输入详细描述（可选）" 
                maxlength="1000"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="关键字" prop="keywords">
              <el-input 
                v-model="form.keywords" 
                placeholder="请输入关键字，多个关键字用逗号分隔（可选）" 
                maxlength="500"
                show-word-limit
              />
              <div class="form-tip">
                <span class="text-gray-500 text-sm">例如：设计,工具,在线,免费</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类" prop="category">
              <el-select 
                v-model="form.category" 
                placeholder="请选择分类（可选）"
                clearable
                style="width: 100%"
              >
                <el-option label="设计工具" value="设计工具" />
                <el-option label="素材资源" value="素材资源" />
                <el-option label="学习教程" value="学习教程" />
                <el-option label="在线工具" value="在线工具" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序" prop="sort">
              <el-input-number 
                v-model="form.sort" 
                :min="0" 
                :max="9999"
                placeholder="排序值（可选）"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="isActive">
              <el-switch 
                v-model="form.isActive" 
                active-text="启用" 
                inactive-text="禁用"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watchEffect, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Plus, Search, DArrowLeft, DArrowRight } from '@element-plus/icons-vue'
import { getCommonUrlList, createCommonUrl, updateCommonUrl, deleteCommonUrl, batchMoveCommonUrl } from '@/api/commonUrl'
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from '@/common/table'
import { useWindowSize, useLocalStorage } from '@vueuse/core'
import ContentWrap from '@/components/ContentWrap/src/ContentWrap.vue'
import ListPageLayout from '@/components/ListPageLayout/index.vue'
import Pagination from '@/components/Pagination/index.vue'
import FolderTree from '@/components/material/FolderTree.vue'
import TableRowDragHandle from '@/components/TableRowDragHandle/index.vue'
import DateRangePicker from '@/components/DateRangePicker.vue'
import { useFolderRowDrag } from '@/hooks/useFolderRowDrag'
import { FOLDER_FILTER, convertFolderIdToApiParam } from '@/constants/folder'
import { formatTimestamp } from '@/common/date'

const FOLDER_CATEGORY = 'commonurl'
const folderTreeCollapsed = useLocalStorage('common_url_folder_collapsed', false)
const selectedFolderId = ref<string | null>('__all__')

// 查询条件
const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  startTime: '',
  endTime: '',
  searchKeyword: '',
  folderId: null as string | null,
})

// 获取窗口尺寸
const { height } = useWindowSize()

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  columns: [
    {
      title: '',
      field: 'dragHandle',
      width: 34,
      showOverflow: false,
      align: 'center',
      slots: {
        default: 'dragHandleSlot',
      },
    },
    { type: 'checkbox', width: 42 },
    // { title: 'ID', field: 'id', width: 80 },
    { title: '网址名称', field: 'name', minWidth: 200, slots: { default: 'nameSlot' } },
    { title: '网址链接', field: 'url', minWidth: 300, slots: { default: 'urlSlot' } },
    { title: '详细描述', field: 'description', minWidth: 300, slots: { default: 'descriptionSlot' } },
    { title: '关键字', field: 'keywords', minWidth: 200, slots: { default: 'keywordsSlot' } },
    { title: '分类', field: 'category', width: 120, slots: { default: 'categorySlot' } },
    { title: '状态', field: 'isActive', width: 80, slots: { default: 'statusSlot' } },
    { title: '排序', field: 'sort', width: 80 },
    { title: '上传者', field: 'uploader', width: 120, slots: { default: 'uploaderSlot' } },
    { ...buildTimeColumn('创建时间', 'createTime', 160), slots: { default: 'createTimeSlot' } },
    { ...buildTimeColumn('更新时间', 'updateTime', 160), slots: { default: 'updateTimeSlot' } },
    buildOperationColumn('operationDefaultSlot')
  ]
})

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360)
})

const dataSource = ref([])
const loading = ref(false)
const ids = ref([])
const total = ref(0)
const deleteLoading = ref(false)
const formRef = ref()
const dialogTitle = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const form = ref<{
  id?: string
  name: string
  url: string
  description: string
  keywords: string
  category: string
  icon: string
  sort: number
  isActive: boolean
}>({
  name: '',
  url: '',
  description: '',
  keywords: '',
  category: '',
  icon: '',
  sort: 0,
  isActive: true
})
const submitLoading = ref(false)

// 拖拽状态（拖网址 -> 文件夹）
const {
  dragState,
  setupRowDrag,
  handleFolderDragOver,
  handleFolderDragLeave,
  resetAfterDrop,
  markExternalFolderDropHandled,
} = useFolderRowDrag({
  gridClass: 'common-url-dnd-grid',
  dataSource,
  selectedIds: ids,
  onDropToFolder: handleFolderDrop,
})

async function getList() {
  loading.value = true
  try {
    const params = {
      page: queryParams.currentPage,
      pageSize: queryParams.pageSize,
      searchKeyword: queryParams.searchKeyword || undefined,
      folderId: convertFolderIdToApiParam(queryParams.folderId) as string | null | undefined,
      startTime: queryParams.startTime || undefined,
      endTime: queryParams.endTime || undefined,
    }
    const res = await getCommonUrlList(params)
    dataSource.value = res.list || []
    total.value = res.total || 0
    ids.value = []
  } catch (error) {
    console.error('获取列表失败:', error)
    ElMessage.error('获取列表失败')
  } finally {
    loading.value = false
    nextTick(setupRowDrag)
  }
}

function handleSearch() {
  queryParams.currentPage = 1
  getList()
}

function handleReset() {
  queryParams.searchKeyword = ''
  queryParams.startTime = ''
  queryParams.endTime = ''
  queryParams.currentPage = 1
  getList()
}

function handleFolderChange(payload: { folderId: string | null }) {
  if (payload.folderId === '__all__') {
    queryParams.folderId = FOLDER_FILTER.ALL
  } else if (payload.folderId === null) {
    queryParams.folderId = FOLDER_FILTER.NOT_GROUP
  } else {
    queryParams.folderId = payload.folderId
  }
  queryParams.currentPage = 1
  getList()
}

async function handleFolderDrop(payload: { data: any }) {
  markExternalFolderDropHandled()
  if (!dragState.draggingIds.length) return
  if (payload.data.id === FOLDER_FILTER.ALL) return

  const targetFolderId =
    payload.data.id === FOLDER_FILTER.NOT_GROUP ? FOLDER_FILTER.NOT_GROUP : payload.data.id
  const targetPath = payload.data.path || ''
  const movingIds = [...dragState.draggingIds]

  try {
    await batchMoveCommonUrl({
      ids: movingIds.map(String),
      folderId: convertFolderIdToApiParam(targetFolderId) as string,
    })
    ElMessage.success(`已移动 ${movingIds.length} 条网址到 ${targetPath || '未分组'}`)
    await getList()
    ids.value = []
  } catch (error) {
    ElMessage.error((error as Error).message || '移动失败')
  } finally {
    resetAfterDrop()
  }
}

// 获取分类标签类型
function getCategoryTagType(category: string) {
  const typeMap: Record<string, string> = {
    '设计工具': 'primary',
    '素材资源': 'success',
    '学习教程': 'warning',
    '在线工具': 'info',
    '其他': 'info'
  }
  return typeMap[category] || 'info'
}

// 处理关键字字符串，转换为数组
function getKeywordsArray(keywords: string) {
  if (!keywords) return []
  return keywords.split(',').filter(keyword => keyword.trim())
}

// 格式化日期时间
function formatDateTime(dateStr: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function handleAdd() {
  isEdit.value = false
  dialogVisible.value = true
  dialogTitle.value = '新增常用网址'
  form.value = {
    name: '',
    url: '',
    description: '',
    keywords: '',
    category: '',
    icon: '',
    sort: 0,
    isActive: true
  }
}

onMounted(() => {
  getList()
})

function checkboxChange(e) {
  ids.value = e.records.map((item) => item.id)
  console.log('选中的ID:', ids.value)
}

function checkboxAllChange(e) {
  ids.value = e.records.map((item) => item.id)
  console.log('全选ID:', ids.value)
}

function handleEdit(row) {
  isEdit.value = true
  dialogVisible.value = true
  dialogTitle.value = '编辑常用网址'
  form.value = { 
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description || '',
    keywords: row.keywords || '',
    category: row.category || '',
    icon: row.icon || '',
    sort: row.sort || 0,
    isActive: row.isActive !== undefined ? row.isActive : true
  }
}

function handleDelete(row?) {
  let delIds = null
  if (row) {
    delIds = [row.id]
  } else if (!ids.value.length) {
    return ElMessage.warning('请选择要删除的数据')
  } else {
    delIds = [...ids.value]
  }
  
  const message = row 
    ? `确认删除网址"${row.name}"吗？` 
    : `确认删除选中的 ${delIds.length} 条数据吗？`
    
  ElMessageBox.confirm(
    message, 
    '删除提示', 
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(async () => {
      try {
        deleteLoading.value = true
        // 批量删除
        const deletePromises = delIds.map(id => deleteCommonUrl(id))
        await Promise.all(deletePromises)
        
        ElMessage.success(`成功删除 ${delIds.length} 条数据`)
        // 如果当前页没有数据了，回到上一页
        if (dataSource.value.length === delIds.length && queryParams.currentPage > 1) {
          queryParams.currentPage--
        }
        // 清空选中的ID
        ids.value = []
        getList()
      } catch (error) {
        console.error('删除失败:', error)
        // 更详细的错误信息
        let errorMessage = '删除失败，请重试'
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        } else if (error.message) {
          errorMessage = error.message
        }
        ElMessage.error(errorMessage)
      } finally {
        deleteLoading.value = false
      }
    })
    .catch(() => {})
}

const rules = {
  name: [
    { required: true, message: '请输入网址名称', trigger: 'blur' },
    { min: 1, max: 100, message: '网址名称长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  url: [
    { required: true, message: '请输入网址链接', trigger: 'blur' },
    { type: 'url', message: '请输入正确的网址格式', trigger: 'blur' },
    { max: 500, message: '网址长度不能超过 500 个字符', trigger: 'blur' }
  ],
  description: [
    { max: 1000, message: '描述长度不能超过 1000 个字符', trigger: 'blur' }
  ],
  keywords: [
    { max: 500, message: '关键字长度不能超过 500 个字符', trigger: 'blur' }
  ],
  category: [
    { max: 50, message: '分类长度不能超过 50 个字符', trigger: 'blur' }
  ],
  sort: [
    { type: 'number', min: 0, max: 9999, message: '排序值必须在 0-9999 之间', trigger: 'blur' }
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
      await updateCommonUrl(form.value.id, {
        name: form.value.name,
        url: form.value.url,
        description: form.value.description,
        keywords: form.value.keywords,
        category: form.value.category,
        icon: form.value.icon,
        sort: form.value.sort,
        isActive: form.value.isActive
      })
      ElMessage.success('更新成功')
    } else {
      await createCommonUrl({
        name: form.value.name,
        url: form.value.url,
        description: form.value.description,
        keywords: form.value.keywords,
        category: form.value.category,
        icon: form.value.icon,
        sort: form.value.sort,
        isActive: form.value.isActive
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
:deep(.common-url-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.common-url-page .list-page-layout__main) {
  gap: 10px;
}

:deep(.common-url-page .list-page-filter--flat) {
  padding-bottom: 10px;
}

:deep(.common-url-page .list-page-table-panel__pagination--flat) {
  padding-top: 10px;
}

.common-url-sidebar {
  min-height: 100%;
}

.text-wrap {
  line-height: 1.5;
  white-space: normal;
}

.keywords-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 200px;
}

.keyword-tag {
  margin: 2px;
  font-size: 12px;
  color: rgb(255 255 255 / 80%);
  background-color: rgb(255 255 255 / 4%);
  border-color: rgb(255 255 255 / 12%);
  border-radius: 999px;
}

.keyword-tag:hover {
  color: rgb(255 255 255 / 92%);
  background-color: rgb(255 255 255 / 7%);
  border-color: rgb(255 255 255 / 18%);
}

.form-tip {
  margin-top: 4px;
}
</style> 
