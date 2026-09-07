<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="text-document-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="10" :lg="8">
                <el-form-item label="关键词">
                  <el-input
                    v-model="queryParams.keyword"
                    size="small"
                    clearable
                    placeholder="搜索标题、摘要、正文、分类、标签"
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                  />
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="7" :lg="4">
                <el-form-item label="内容类型">
                  <el-select
                    v-model="queryParams.contentType"
                    size="small"
                    clearable
                    placeholder="全部"
                    @change="handleSearch"
                  >
                    <el-option label="纯文本" value="plain" />
                    <el-option label="Markdown" value="markdown" />
                    <el-option label="LaTeX" value="latex" />
                    <el-option label="HTML" value="html" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--narrow" :xs="24" :sm="12" :md="7" :lg="4">
                <el-form-item label="状态">
                  <el-select
                    v-model="queryParams.status"
                    size="small"
                    clearable
                    placeholder="全部"
                    @change="handleSearch"
                  >
                    <el-option label="草稿" value="draft" />
                    <el-option label="发布" value="published" />
                    <el-option label="归档" value="archived" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading" @click="handleSearch">
                搜索
              </el-button>
              <el-button size="small" @click="handleReset">重置</el-button>
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
                <template #titleSlot="{ row }">
                  <div class="text-document-title">{{ row.title }}</div>
                  <div v-if="row.summary" class="text-document-summary">{{ row.summary }}</div>
                </template>
                <template #typeSlot="{ row }">
                  <el-tag>{{ getContentTypeLabel(row.contentType) }}</el-tag>
                </template>
                <template #statusSlot="{ row }">
                  <el-tag :type="getStatusTagType(row.status)">
                    {{ getStatusLabel(row.status) }}
                  </el-tag>
                </template>
                <template #tagsSlot="{ row }">
                  <div v-if="row.tags" class="text-document-tags">
                    <el-tag
                      v-for="tag in getTagsArray(row.tags)"
                      :key="tag"
                      size="small"
                      type="info"
                      effect="plain"
                      class="!bg-[var(--app-content-surface-muted-color)] !border-[var(--app-content-border-color)] !text-[var(--el-text-color-regular)]"
                    >
                      {{ tag }}
                    </el-tag>
                  </div>
                  <span v-else>-</span>
                </template>
                <template #contentSlot="{ row }">
                  <div class="text-document-content-snippet">{{ row.content }}</div>
                </template>
                <template #uploaderSlot="{ row }">
                  <span>{{ row.uploader?.account || row.uploader?.name || row.userId || '-' }}</span>
                </template>
                <template #createTimeSlot="{ row }">
                  <span class="table-time-text">{{ formatDateTime(row.createTime) }}</span>
                </template>
                <template #operationDefaultSlot="{ row }">
                  <div class="flex justify-start">
                    <el-dropdown class="operation-dropdown" placement="bottom-end">
                      <el-button type="primary" link size="small" class="operation-trigger-button">
                        操作
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu class="operation-menu-compact">
                          <el-dropdown-item @click="handlePreview(row)">预览</el-dropdown-item>
                          <el-dropdown-item @click="handleEdit(row)">编辑</el-dropdown-item>
                          <el-dropdown-item
                            divided
                            :disabled="loading || deleteLoading"
                            class="operation-menu-item--danger"
                            @click="handleDelete(row)"
                          >
                            删除
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

    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      fullscreen
      class="text-document-editor-dialog"
      @close="dialogClose"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="86px">
        <el-row :gutter="16">
          <el-col :span="14">
            <el-form-item label="标题" prop="title">
              <el-input v-model="form.title" maxlength="200" show-word-limit placeholder="请输入文档标题" />
            </el-form-item>
          </el-col>
          <el-col :span="5">
            <el-form-item label="类型" prop="contentType">
              <el-select v-model="form.contentType" style="width: 100%">
                <el-option label="纯文本" value="plain" />
                <el-option label="Markdown" value="markdown" />
                <el-option label="LaTeX" value="latex" />
                <el-option label="HTML" value="html" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="5">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="草稿" value="draft" />
                <el-option label="发布" value="published" />
                <el-option label="归档" value="archived" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类" prop="category">
              <el-input v-model="form.category" maxlength="80" show-word-limit placeholder="可选" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="标签" prop="tags">
              <el-input v-model="form.tags" placeholder="多个标签用逗号分隔" />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="排序" prop="sort">
              <el-input-number v-model="form.sort" :min="0" :max="9999" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="摘要" prop="summary">
              <el-input v-model="form.summary" type="textarea" :rows="2" placeholder="可选" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="内容" prop="content">
              <div class="document-content-toolbar">
                <el-upload
                  action="#"
                  :auto-upload="false"
                  :show-file-list="false"
                  accept=".txt,.md,.markdown,.tex,.latex,.html,.htm,.json,.csv,.log,text/*"
                  :on-change="handleFileSelected"
                >
                  <el-button size="small">从文件读取</el-button>
                </el-upload>
                <span class="document-content-toolbar__tip">
                  支持常见文本文件，读取后会覆盖当前正文
                </span>
              </div>
              <el-input
                v-model="form.content"
                class="document-content-input"
                type="textarea"
                :rows="28"
                resize="vertical"
                placeholder="请输入文本内容"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <div class="preview-panel">
              <div class="preview-panel__header">预览</div>
              <div class="preview-panel__body">
                <div v-if="form.contentType === 'markdown'" class="markdown-preview" v-html="markdownPreview"></div>
                <iframe
                  v-else-if="form.contentType === 'html'"
                  class="html-preview"
                  sandbox=""
                  :srcdoc="form.content"
                />
                <pre v-else class="plain-preview">{{ form.content }}</pre>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="previewVisible" :title="previewDocument?.title || '文档预览'" width="860px" align-center>
      <div class="document-preview-meta">
        <el-tag>{{ getContentTypeLabel(previewDocument?.contentType || 'plain') }}</el-tag>
        <el-tag :type="getStatusTagType(previewDocument?.status || 'draft')">
          {{ getStatusLabel(previewDocument?.status || 'draft') }}
        </el-tag>
        <span v-if="previewDocument?.category">{{ previewDocument.category }}</span>
      </div>
      <div class="preview-panel preview-panel--dialog">
        <div v-if="previewDocument?.contentType === 'markdown'" class="markdown-preview" v-html="previewHtml"></div>
        <iframe
          v-else-if="previewDocument?.contentType === 'html'"
          class="html-preview"
          sandbox=""
          :srcdoc="previewDocument?.content || ''"
        />
        <pre v-else class="plain-preview">{{ previewDocument?.content }}</pre>
      </div>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watchEffect } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { Delete, Plus, Search } from '@element-plus/icons-vue'
import { marked } from 'marked'
import { useWindowSize } from '@vueuse/core'
import {
  createTextDocument,
  deleteTextDocument,
  getTextDocumentList,
  TextDocument,
  TextDocumentContentType,
  TextDocumentStatus,
  updateTextDocument,
} from '@/api/textDocument'
import { buildOperationColumn, buildTimeColumn, commonGridOptions } from '@/common/table'
import ContentWrap from '@/components/ContentWrap/src/ContentWrap.vue'
import ListPageLayout from '@/components/ListPageLayout/index.vue'
import Pagination from '@/components/Pagination/index.vue'

const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  keyword: '',
  category: '',
  contentType: '',
  status: '',
})

const { height } = useWindowSize()
const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  columns: [
    { type: 'checkbox', width: 50 },
    { title: '标题', field: 'title', minWidth: 260, slots: { default: 'titleSlot' } },
    { title: '类型', field: 'contentType', width: 110, slots: { default: 'typeSlot' } },
    { title: '状态', field: 'status', width: 90, slots: { default: 'statusSlot' } },
    { title: '分类', field: 'category', width: 120 },
    { title: '标签', field: 'tags', minWidth: 180, slots: { default: 'tagsSlot' } },
    { title: '内容摘要', field: 'content', minWidth: 300, slots: { default: 'contentSlot' } },
    { title: '排序', field: 'sort', width: 80 },
    { title: '上传者', field: 'uploader', width: 120, slots: { default: 'uploaderSlot' } },
    { ...buildTimeColumn('创建时间', 'createTime', 160), slots: { default: 'createTimeSlot' } },
    buildOperationColumn('operationDefaultSlot'),
  ],
})

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360)
})

const dataSource = ref<TextDocument[]>([])
const loading = ref(false)
const ids = ref<string[]>([])
const total = ref(0)
const deleteLoading = ref(false)
const formRef = ref()
const dialogTitle = ref('')
const dialogVisible = ref(false)
const submitLoading = ref(false)
const isEdit = ref(false)
const previewVisible = ref(false)
const previewDocument = ref<TextDocument | null>(null)

const defaultForm = () => ({
  id: '',
  title: '',
  content: '',
  contentType: 'plain' as TextDocumentContentType,
  summary: '',
  category: '',
  tags: '',
  status: 'draft' as TextDocumentStatus,
  sort: 0,
})

const form = ref(defaultForm())

const markdownPreview = computed(() => marked.parse(form.value.content || '', { async: false }) as string)
const previewHtml = computed(() =>
  marked.parse(previewDocument.value?.content || '', { async: false }) as string,
)

function getContentTypeLabel(type: string) {
  const labelMap: Record<string, string> = {
    plain: '纯文本',
    markdown: 'Markdown',
    latex: 'LaTeX',
    html: 'HTML',
  }
  return labelMap[type] || type || '-'
}

function getStatusLabel(status: string) {
  const labelMap: Record<string, string> = {
    draft: '草稿',
    published: '发布',
    archived: '归档',
  }
  return labelMap[status] || status || '-'
}

function getStatusTagType(status: string) {
  const typeMap: Record<string, string> = {
    draft: 'info',
    published: 'success',
    archived: 'warning',
  }
  return typeMap[status] || 'info'
}

function getTagsArray(tags: string) {
  return String(tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

async function getList() {
  loading.value = true
  try {
    const res = await getTextDocumentList({
      page: queryParams.currentPage,
      pageSize: queryParams.pageSize,
      keyword: queryParams.keyword,
      category: queryParams.category,
      contentType: queryParams.contentType,
      status: queryParams.status,
    })
    dataSource.value = res.list || []
    total.value = res.total || 0
    ids.value = []
  } catch (error) {
    console.error('获取文档列表失败:', error)
    ElMessage.error('获取文档列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  queryParams.currentPage = 1
  getList()
}

function handleReset() {
  queryParams.keyword = ''
  queryParams.category = ''
  queryParams.contentType = ''
  queryParams.status = ''
  handleSearch()
}

function handleAdd() {
  isEdit.value = false
  dialogTitle.value = '新增文档'
  form.value = defaultForm()
  dialogVisible.value = true
}

function handleEdit(row: TextDocument) {
  isEdit.value = true
  dialogTitle.value = '编辑文档'
  form.value = {
    id: row.id,
    title: row.title,
    content: row.content || '',
    contentType: row.contentType || 'plain',
    summary: row.summary || '',
    category: row.category || '',
    tags: row.tags || '',
    status: row.status || 'draft',
    sort: row.sort || 0,
  }
  dialogVisible.value = true
}

function handlePreview(row: TextDocument) {
  previewDocument.value = row
  previewVisible.value = true
}

function inferContentTypeByFileName(fileName: string): TextDocumentContentType {
  const lowerName = fileName.toLowerCase()
  if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) {
    return 'markdown'
  }
  if (lowerName.endsWith('.tex') || lowerName.endsWith('.latex')) {
    return 'latex'
  }
  if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
    return 'html'
  }
  return 'plain'
}

function getFileTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '')
}

function handleFileSelected(uploadFile: UploadFile) {
  const rawFile = uploadFile.raw
  if (!rawFile) {
    ElMessage.error('读取文件失败')
    return
  }

  if (rawFile.size > 1024 * 1024 * 5) {
    ElMessage.warning('文本文件不能超过 5MB')
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    form.value.content = String(reader.result || '')
    form.value.contentType = inferContentTypeByFileName(rawFile.name)
    if (!form.value.title) {
      form.value.title = getFileTitle(rawFile.name)
    }
    ElMessage.success('文件内容已读取到正文')
  }
  reader.onerror = () => {
    ElMessage.error('读取文件失败')
  }
  reader.readAsText(rawFile)
}

function checkboxChange(e) {
  ids.value = e.records.map((item) => item.id)
}

function checkboxAllChange(e) {
  ids.value = e.records.map((item) => item.id)
}

function handleDelete(row?: TextDocument | null) {
  const delIds = row ? [row.id] : [...ids.value]
  if (!delIds.length) {
    return ElMessage.warning('请选择要删除的数据')
  }

  const message = row ? `确认删除文档"${row.title}"吗？` : `确认删除选中的 ${delIds.length} 条数据吗？`
  ElMessageBox.confirm(message, '删除提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        deleteLoading.value = true
        await Promise.all(delIds.map((id) => deleteTextDocument(id)))
        ElMessage.success(`成功删除 ${delIds.length} 条数据`)
        if (dataSource.value.length === delIds.length && queryParams.currentPage > 1) {
          queryParams.currentPage--
        }
        getList()
      } catch (error) {
        console.error('删除文档失败:', error)
        ElMessage.error('删除失败')
      } finally {
        deleteLoading.value = false
      }
    })
    .catch(() => {})
}

const rules = {
  title: [
    { required: true, message: '请输入文档标题', trigger: 'blur' },
    { min: 1, max: 200, message: '标题长度在 1 到 200 个字符', trigger: 'blur' },
  ],
  content: [{ required: true, message: '请输入文档内容', trigger: 'blur' }],
  category: [{ max: 80, message: '分类长度不能超过 80 个字符', trigger: 'blur' }],
  sort: [{ type: 'number', min: 0, max: 9999, message: '排序值必须在 0-9999 之间', trigger: 'blur' }],
}

function dialogClose() {
  dialogVisible.value = false
  submitLoading.value = false
  formRef.value?.resetFields()
}

async function submitForm() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
    submitLoading.value = true
    const payload = {
      title: form.value.title,
      content: form.value.content,
      contentType: form.value.contentType,
      summary: form.value.summary,
      category: form.value.category,
      tags: form.value.tags,
      status: form.value.status,
      sort: form.value.sort,
    }
    if (isEdit.value) {
      await updateTextDocument(form.value.id, payload)
      ElMessage.success('更新成功')
    } else {
      await createTextDocument(payload)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    getList()
  } catch (error) {
    console.error('提交文档失败:', error)
    ElMessage.error('操作失败')
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  getList()
})
</script>

<style scoped>
:deep(.text-document-page) {
  gap: 10px;
  padding: 8px 0 0;
}

:deep(.text-document-page .list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

.text-document-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.text-document-summary,
.text-document-content-snippet {
  display: -webkit-box;
  overflow: hidden;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  word-break: break-all;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.text-document-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.document-content-toolbar {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.document-content-toolbar__tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.preview-panel {
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
}

.preview-panel--dialog {
  max-height: 62vh;
  overflow: auto;
}

.preview-panel__header {
  height: 34px;
  padding: 0 12px;
  line-height: 34px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color);
}

.text-document-editor-dialog :deep(.el-dialog__body) {
  height: calc(100vh - 104px);
  padding: 16px 20px;
  overflow: auto;
  box-sizing: border-box;
}

.text-document-editor-dialog :deep(.document-content-input .el-textarea__inner) {
  min-height: calc(100vh - 238px) !important;
}

.preview-panel__body {
  height: calc(100vh - 292px);
  overflow: auto;
}

.plain-preview,
.markdown-preview {
  min-height: 100%;
  padding: 12px;
  margin: 0;
  line-height: 1.7;
  word-break: break-word;
  white-space: pre-wrap;
}

.html-preview {
  width: 100%;
  height: calc(100vh - 292px);
  border: 0;
}

.document-preview-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
  color: var(--el-text-color-secondary);
}

:deep(.markdown-preview code) {
  padding: 2px 4px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

:deep(.markdown-preview pre) {
  padding: 10px;
  overflow: auto;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}
</style>
