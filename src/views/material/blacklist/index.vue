<!-- 采集黑名单：录入「不想采集」的题材/关键词，采集 Agent 经 MCP(collect_blacklist) 读取后跳过。
     复用灵感表（inputType="blacklist"，config.keywords 存匹配词），不建表。 -->
<template>
  <div class="blacklist-panel">
    <ListPageLayout class="blacklist-page">
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
                    placeholder="名称 / 说明 / 备注"
                    @keyup.enter="handleSearch"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
              <el-button size="small" :icon="Refresh" @click="resetQuery">重置</el-button>
              <el-button size="small" type="primary" :icon="Plus" @click="openDialog()">新增黑名单</el-button>
              <el-button size="small" type="danger" :icon="Delete" :disabled="!selectedIds.length" @click="handleBatchDelete">
                批量删除 ({{ selectedIds.length }})
              </el-button>
            </div>
          </el-form>
          <el-alert type="info" :closable="false" show-icon class="blacklist-tip">
            <template #title>
              录入不想采集的题材 / 关键词。采集 Agent 会经 MCP 读取本清单，命中（标题 / 名称 / 描述）的一律不采；
              系统也会在浏览与判定环节自动跳过、强制淘汰命中条目。
            </template>
          </el-alert>
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
                <template #keywordsSlot="{ row }">
                  <el-tag
                    v-for="k in row.keywords || []"
                    :key="k"
                    size="small"
                    effect="plain"
                    class="blacklist-keyword-tag"
                  >{{ k }}</el-tag>
                  <span v-if="!(row.keywords || []).length" class="blacklist-keyword-empty">-</span>
                </template>
                <template #operationDefaultSlot="{ row }">
                  <div class="blacklist-operations">
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
  <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" destroy-on-close>
    <el-form :model="form" label-width="96px" size="small">
      <el-form-item label="条目名称" required>
        <el-input v-model="form.name" maxlength="255" show-word-limit placeholder="不想采集的题材名，如「真人照片」「电影海报」" />
      </el-form-item>
      <el-form-item label="匹配关键词">
        <el-input
          v-model="form.keywordsText"
          type="textarea"
          :rows="3"
          placeholder="多个关键词用逗号 / 顿号 / 换行分隔，如 poster、bluray、cosplay。条目名称本身也参与匹配"
        />
      </el-form-item>
      <el-form-item label="原因说明">
        <el-input v-model="form.content" type="textarea" :rows="2" placeholder="选填：为什么不想采集" />
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

/** 黑名单条目 = 灵感表 inputType="blacklist" + config.keywords，不建新表 */
const BLACKLIST_TYPE = 'blacklist'

interface BlacklistRow extends Inspiration {
  keywords?: string[]
}

const loading = ref(false)
const saving = ref(false)
const list = ref<BlacklistRow[]>([])
const total = ref(0)
const selectedIds = ref<Array<string | number>>([])
const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  keyword: ''
})

const dialogVisible = ref(false)
const dialogTitle = ref('新增黑名单')

const gridRef = ref<any>()
const { height: windowHeight } = useWindowSize()
const gridOptions = computed(() => ({
  ...commonGridOptions,
  maxHeight: Math.max(windowHeight.value - 360, 320),
  rowConfig: { keyField: 'id' },
  columns: [
    { type: 'checkbox' as const, width: 50, title: '' },
    { field: 'name', title: '条目名称', minWidth: 180, showOverflow: true, className: 'font-bold' },
    { field: 'keywords', title: '匹配关键词', minWidth: 240, slots: { default: 'keywordsSlot' } },
    { field: 'content', title: '原因说明', minWidth: 200, showOverflow: true },
    { field: 'remark', title: '备注', minWidth: 140, showOverflow: true },
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
  keywordsText: '',
  content: '',
  remark: ''
})

const formatTime = (value?: string) =>
  value ? String(value).replace('T', ' ').slice(0, 19) : '-'

const parseKeywords = (text: string): string[] =>
  text
    .split(/[,，、;；\n\r\t]+/)
    .map((s) => s.trim())
    .filter(Boolean)

function normalizeRow(row: any): BlacklistRow {
  const cfg = row?.config
  let keywords: string[] = []
  if (cfg && typeof cfg === 'object' && Array.isArray(cfg.keywords)) {
    keywords = cfg.keywords.map((k: any) => String(k)).filter(Boolean)
  }
  return { ...row, keywords }
}

async function getList() {
  selectedIds.value = []
  loading.value = true
  try {
    const res: any = await getInspirationPage({
      currentPage: queryParams.currentPage,
      pageSize: queryParams.pageSize,
      keyword: queryParams.keyword || undefined,
      inputType: BLACKLIST_TYPE
    })
    list.value = (res?.list || []).map(normalizeRow)
    total.value = res?.total || 0
  } catch {
    ElMessage.error('获取黑名单列表失败')
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
    .map((row: BlacklistRow) => row.id)
    .filter(Boolean)
}

function openDialog(row?: BlacklistRow) {
  dialogTitle.value = row ? '编辑黑名单' : '新增黑名单'
  form.id = row?.id ?? ''
  form.name = row?.name || ''
  form.keywordsText = (row?.keywords || []).join('、')
  form.content = row?.content || ''
  form.remark = row?.remark || ''
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.name.trim()) {
    ElMessage.warning('请填写条目名称')
    return
  }
  const keywords = parseKeywords(form.keywordsText)
  const payload: Inspiration = {
    name: form.name.trim(),
    inputType: BLACKLIST_TYPE,
    content: form.content || null,
    config: keywords.length ? { keywords } : null,
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
  await ElMessageBox.confirm(`确认删除选中的 ${ids.length} 条黑名单吗？删除后采集 Agent 将不再跳过对应题材。`, '提示', { type: 'warning' })
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
:deep(.blacklist-page) { gap: 10px; padding: 8px 0 0; }
:deep(.blacklist-page .list-page-layout__body),
:deep(.blacklist-page .list-page-layout__main) { gap: 10px; }
:deep(.blacklist-page .list-page-filter--flat) { gap: 10px; padding-bottom: 10px; }
:deep(.blacklist-page .list-page-table-panel__pagination--flat) { padding-top: 10px; }
:deep(.blacklist-page .list-page-table-panel__body) { overflow: hidden; }

.blacklist-panel { min-height: 0; }
.blacklist-tip { margin-top: 4px; }
.blacklist-operations { display: inline-flex; align-items: center; gap: 4px; }
.blacklist-keyword-tag { margin: 2px 4px 2px 0; }
.blacklist-keyword-empty { color: var(--el-text-color-placeholder); }
</style>
