<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="design-knowledge-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="关键词">
                  <el-input v-model="queryParams.keyword" size="small" clearable placeholder="搜索标题/内容" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="5" :xl="4">
                <el-form-item label="分类">
                  <el-select v-model="queryParams.category" size="small" clearable placeholder="全部分类">
                    <el-option label="CSS技巧" value="css-trick" />
                    <el-option label="颜色值" value="color-value" />
                    <el-option label="代码配置" value="code-config" />
                    <el-option label="设计原则" value="design-principle" />
                    <el-option label="模板技巧" value="template-tip" />
                    <el-option label="其他" value="other" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
              <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
              <el-button type="primary" :icon="Plus" @click="handleAdd">新增</el-button>
              <el-button type="danger" :icon="Delete" @click="handleDelete(null)">批量删除</el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <vxe-grid
          ref="gridRef"
          v-bind="gridOptions"
          :data="dataSource"
          :loading="loading"
          @checkbox-change="checkboxChange"
          @checkbox-all="checkboxAllChange"
        >
          <template #categoryDefaultSlot="{ row }">
            <el-tag :type="getCategoryTagType(row.category)" size="small">
              {{ getCategoryLabel(row.category) }}
            </el-tag>
          </template>
          <template #tagsDefaultSlot="{ row }">
            <el-tag v-for="tag in (row.tags || []).slice(0, 3)" :key="tag" size="small" class="mr-1 mb-1">
              {{ tag }}
            </el-tag>
            <el-tag v-if="(row.tags || []).length > 3" size="small" type="info">+{{ row.tags.length - 3 }}</el-tag>
          </template>
          <template #contentPreviewSlot="{ row }">
            <span class="content-preview">{{ getContentPreview(row.content) }}</span>
          </template>
          <template #isPublicDefaultSlot="{ row }">
            <el-tag :type="row.isPublic ? 'success' : 'info'" size="small">
              {{ row.isPublic ? '公开' : '私有' }}
            </el-tag>
          </template>
          <template #operationDefaultSlot="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </vxe-grid>
      </template>

      <template #pagination>
        <Pagination
          v-model:current-page="queryParams.currentPage"
          v-model:page-size="queryParams.pageSize"
          :total="total"
          @change="getList"
        />
      </template>
    </ListPageLayout>
  </ContentWrap>

  <!-- 新增/编辑弹窗 - 全屏大弹窗 -->
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    fullscreen
    :close-on-click-modal="false"
    destroy-on-close
    class="knowledge-dialog"
  >
    <div class="knowledge-dialog-content">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-position="top">
        <!-- 左右布局：左侧编辑区，右侧设置区 -->
        <div class="knowledge-dialog-layout">
          <!-- 左侧：主要内容编辑 -->
          <div class="knowledge-dialog-main">
            <el-form-item label="标题" prop="title">
              <el-input v-model="formData.title" placeholder="简短描述这条知识" size="large" />
            </el-form-item>

            <el-form-item label="知识内容" prop="content" class="content-editor-item">
              <el-input
                v-model="formData.content"
                type="textarea"
                placeholder="知识内容（支持 Markdown）"
                class="content-editor"
              />
            </el-form-item>
          </div>

          <!-- 右侧：设置面板 -->
          <div class="knowledge-dialog-sidebar">
            <div class="sidebar-section">
              <div class="sidebar-section-title">基本信息</div>
              <el-form-item label="分类" prop="category">
                <el-select v-model="formData.category" placeholder="选择分类" style="width: 100%">
                  <el-option label="CSS技巧" value="css-trick" />
                  <el-option label="颜色值" value="color-value" />
                  <el-option label="代码配置" value="code-config" />
                  <el-option label="设计原则" value="design-principle" />
                  <el-option label="模板技巧" value="template-tip" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>

              <el-form-item label="可见性">
                <el-radio-group v-model="formData.isPublic">
                  <el-radio :value="false">私有</el-radio>
                  <el-radio :value="true">公开</el-radio>
                </el-radio-group>
              </el-form-item>
            </div>

            <div class="sidebar-section">
              <div class="sidebar-section-title">标签</div>
              <div class="tags-input-wrapper">
                <el-tag
                  v-for="tag in formData.tags"
                  :key="tag"
                  closable
                  @close="removeTag(tag)"
                  class="mr-1 mb-1"
                >
                  {{ tag }}
                </el-tag>
              </div>
              <el-input
                v-model="newTag"
                size="small"
                placeholder="输入标签后回车添加"
                @keyup.enter="addTag"
                @blur="addTag"
                class="mt-2"
              />
            </div>

            <div class="sidebar-section">
              <div class="sidebar-section-title">扩展数据 (JSON)</div>
              <el-input
                v-model="extrasJson"
                type="textarea"
                :rows="6"
                placeholder='{"key": "value"}'
              />
              <div v-if="extrasError" class="el-form-item__error">JSON 格式不正确</div>
            </div>
          </div>
        </div>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false" size="large">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit" size="large">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watchEffect } from 'vue'
import { useWindowSize } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Delete } from '@element-plus/icons-vue'
import ContentWrap from '@/components/ContentWrap/src/ContentWrap.vue'
import ListPageLayout from '@/components/ListPageLayout/index.vue'
import Pagination from '@/components/Pagination/index.vue'
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from '@/common/table'
import {
  getDesignKnowledgePage,
  createDesignKnowledge,
  updateDesignKnowledge,
  deleteDesignKnowledge,
  type DesignKnowledge
} from '@/api/design-knowledge'

// 查询参数
const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  keyword: '',
  category: ''
})

// 列表数据
const dataSource = ref<DesignKnowledge[]>([])
const loading = ref(false)
const ids = ref<string[]>([])
const total = ref(0)

// 弹窗相关
const dialogVisible = ref(false)
const dialogTitle = ref('新增知识')
const submitLoading = ref(false)
const formRef = ref()
const newTag = ref('')
const extrasJson = ref('')
const extrasError = ref(false)

// 表单数据
const formData = reactive<DesignKnowledge>({
  title: '',
  content: '',
  category: 'other',
  tags: [],
  extras: {},
  isPublic: false
})

// 表单验证规则
const formRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }]
}

// 分类选项
const categoryOptions = [
  { label: 'CSS技巧', value: 'css-trick' },
  { label: '颜色值', value: 'color-value' },
  { label: '代码配置', value: 'code-config' },
  { label: '设计原则', value: 'design-principle' },
  { label: '模板技巧', value: 'template-tip' },
  { label: '其他', value: 'other' }
]

// 表格配置
const { height } = useWindowSize()

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: { keyField: 'id' },
  checkboxConfig: { reserve: true },
  columns: [
    { type: 'checkbox', width: 50 },
    { title: '标题', field: 'title', minWidth: 180 },
    { title: '分类', field: 'category', width: 100, slots: { default: 'categoryDefaultSlot' } },
    { title: '内容预览', field: 'content', minWidth: 300, slots: { default: 'contentPreviewSlot' } },
    { title: '标签', field: 'tags', width: 200, slots: { default: 'tagsDefaultSlot' } },
    { title: '公开', field: 'isPublic', width: 80, slots: { default: 'isPublicDefaultSlot' } },
    buildTimeColumn('创建时间', 'createTime', 150),
    buildOperationColumn('operationDefaultSlot', 120)
  ]
})

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360)
})

// 获取列表
async function getList() {
  loading.value = true
  try {
    const res = await getDesignKnowledgePage({ ...queryParams })
    dataSource.value = res.list || []
    total.value = res.total || 0
  } catch (error) {
    ElMessage.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  queryParams.currentPage = 1
  getList()
}

// 重置查询
function resetQuery() {
  queryParams.keyword = ''
  queryParams.category = ''
  queryParams.currentPage = 1
  getList()
}

// 新增
function handleAdd() {
  dialogTitle.value = '新增知识'
  resetForm()
  dialogVisible.value = true
}

// 编辑
function handleEdit(row: DesignKnowledge) {
  dialogTitle.value = '编辑知识'
  Object.assign(formData, {
    ...row,
    tags: row.tags || [],
    extras: row.extras || {}
  })
  extrasJson.value = row.extras ? JSON.stringify(row.extras, null, 2) : ''
  dialogVisible.value = true
}

// 提交表单
async function handleSubmit() {
  await formRef.value.validate()

  // 解析 extras JSON
  if (extrasJson.value) {
    try {
      formData.extras = JSON.parse(extrasJson.value)
      extrasError.value = false
    } catch {
      extrasError.value = true
      return
    }
  } else {
    formData.extras = {}
  }

  submitLoading.value = true
  try {
    if (formData.id) {
      await updateDesignKnowledge(formData)
      ElMessage.success('更新成功')
    } else {
      await createDesignKnowledge(formData)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await getList()
  } catch (error) {
    ElMessage.error('操作失败')
  } finally {
    submitLoading.value = false
  }
}


// 删除
function handleDelete(id: string | null) {
  const delIds = id ? [id] : ids.value
  if (!delIds.length) return

  ElMessageBox.confirm(`确认删除选中的${delIds.length}条数据吗`, '删除提示', { type: 'error' })
    .then(async () => {
      try {
        await deleteDesignKnowledge(delIds)
        ElMessage.success('删除成功')
        await getList()
      } catch (error) {
        ElMessage.error('删除失败')
      }
    })
}

// 重置表单
function resetForm() {
  Object.assign(formData, {
    id: undefined,
    title: '',
    content: '',
    category: 'other',
    tags: [],
    extras: {},
    isPublic: false
  })
  extrasJson.value = ''
  extrasError.value = false
  newTag.value = ''
}

// 标签操作
function addTag() {
  const tag = newTag.value.trim()
  if (tag && !formData.tags?.includes(tag)) {
    if (!formData.tags) formData.tags = []
    formData.tags.push(tag)
  }
  newTag.value = ''
}

function removeTag(tag: string) {
  if (formData.tags) {
    formData.tags = formData.tags.filter(t => t !== tag)
  }
}

// 工具函数
function getCategoryLabel(category: string) {
  return categoryOptions.find(c => c.value === category)?.label || category
}

function getCategoryTagType(category: string) {
  const types: Record<string, string> = {
    'css-trick': '',
    'color-value': 'success',
    'code-config': 'warning',
    'design-principle': 'danger',
    'template-tip': 'info',
    'other': 'info'
  }
  return types[category] || 'info'
}

function getContentPreview(content: string) {
  if (!content) return ''
  return content.length > 100 ? content.slice(0, 100) + '...' : content
}

// checkbox 选择
function checkboxChange({ records }: { records: DesignKnowledge[] }) {
  ids.value = records.map(r => r.id!).filter(Boolean)
}

function checkboxAllChange({ records }: { records: DesignKnowledge[] }) {
  ids.value = records.map(r => r.id!).filter(Boolean)
}

onMounted(() => {
  getList()
})
</script>

<style scoped>
.design-knowledge-page {
  gap: 10px;
  padding: 8px 0 0;

  :deep(.list-page-layout__main) {
    gap: 10px;
  }

  :deep(.list-page-filter--flat) {
    gap: 10px;
    padding-bottom: 10px;
  }

  :deep(.list-page-table-panel__pagination--flat) {
    padding-top: 10px;
  }
}

.content-preview {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.tags-input-wrapper {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.mr-1 {
  margin-right: 4px;
}

.mb-1 {
  margin-bottom: 4px;
}

.mt-2 {
  margin-top: 8px;
}

/* 全屏弹窗样式 */
.knowledge-dialog :deep(.el-dialog__body) {
  height: calc(100vh - 120px);
  padding: 0;
  overflow: hidden;
}

.knowledge-dialog-content {
  height: 100%;
  padding: 20px;
  overflow-y: auto;
}

.knowledge-dialog-layout {
  display: flex;
  gap: 24px;
  height: 100%;
}

.knowledge-dialog-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.knowledge-dialog-sidebar {
  width: 320px;
  flex-shrink: 0;
  overflow-y: auto;
}

.sidebar-section {
  padding: 16px;
  margin-bottom: 24px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.sidebar-section-title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.content-editor-item {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.content-editor-item :deep(.el-form-item__content) {
  flex: 1;
}

.content-editor {
  height: 100%;
}

.content-editor :deep(.el-textarea__inner) {
  height: 100% !important;
  min-height: 400px;
  font-family: Monaco, Menlo, Consolas, monospace;
  font-size: 14px;
  line-height: 1.6;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
