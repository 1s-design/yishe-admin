<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="hotsearch-history-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--base" :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="类型">
                  <el-select v-model="queryParams.module" size="small" clearable placeholder="全部" @change="handleSearch">
                    <el-option v-for="m in moduleList" :key="m.module" :label="m.label" :value="m.module" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col class="list-page-search-form__col--base" :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="平台">
                  <el-select v-model="queryParams.platform" size="small" clearable filterable placeholder="全部平台" @change="handleSearch">
                    <el-option v-for="p in platforms" :key="p.platformKey" :label="p.platformName" :value="p.platformKey" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :icon="Search" :loading="loading" @click="handleSearch">查询</el-button>
              <el-button size="small" :disabled="loading" @click="handleReset">重置</el-button>
              <el-button size="small" :icon="Refresh" :loading="refreshing" @click="handleRefresh">刷新缓存</el-button>
              <el-button
                size="small"
                type="danger"
                :disabled="!selectedIds.length"
                @click="handleBatchDelete"
              >
                批量删除{{ selectedIds.length ? ` (${selectedIds.length})` : '' }}
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
                :data="dataList"
                :loading="loading"
                @checkbox-change="handleCheckboxChange"
                @checkbox-all="handleCheckboxAllChange"
              >
                <template #module_default="{ row }">
                  <el-tag size="small" :type="row.module === 'news' ? 'warning' : 'primary'">
                    {{ row.module === 'news' ? '资讯' : '热搜' }}
                  </el-tag>
                </template>

                <template #collectedAt_default="{ row }">
                  {{ formatTime(row.collectedAt) }}
                </template>

                <template #action_default="{ row }">
                  <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
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

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="detailTitle" width="800px" destroy-on-close>
      <div class="detail-list">
        <div v-for="(item, idx) in detailItems" :key="idx" class="detail-item">
          <div class="detail-item__rank">{{ idx + 1 }}</div>
          <div class="detail-item__content">
            <div class="detail-item__title">
              <a v-if="item.url" :href="item.url" target="_blank" class="item-link">{{ item.title }}</a>
              <span v-else>{{ item.title }}</span>
            </div>
            <div v-if="item.extra" class="detail-item__extra">{{ item.extra }}</div>
            <div v-if="item.heat" class="detail-item__heat">热度: {{ item.heat }}</div>
          </div>
        </div>
        <el-empty v-if="!detailItems.length" description="暂无数据" />
      </div>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts" name="HotSearch">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import ContentWrap from '@/components/ContentWrap/src/ContentWrap.vue'
import ListPageLayout from '@/components/ListPageLayout/index.vue'
import Pagination from '@/components/Pagination/index.vue'
import { commonGridOptions, buildTimeColumn, buildOperationColumn } from '@/common/table'
import {
  getSnapshots,
  getPlatforms,
  getModules,
  refreshHotsearch,
  batchDeleteSnapshots,
  type HotsearchSnapshot,
  type HotsearchPlatformInfo,
  type HotsearchModuleInfo
} from '@/api/hotsearch'

defineOptions({ name: 'HotSearch' })

const loading = ref(false)
const refreshing = ref(false)
const dataList = ref<HotsearchSnapshot[]>([])
const platforms = ref<HotsearchPlatformInfo[]>([])
const moduleList = ref<HotsearchModuleInfo[]>([])
const total = ref(0)
const selectedIds = ref<string[]>([])
const detailVisible = ref(false)
const detailTitle = ref('')
const detailItems = ref<Record<string, any>[]>([])

const queryParams = reactive({
  module: '',
  platform: '',
  currentPage: 1,
  pageSize: 20
})

const gridOptions = ref({
  ...commonGridOptions,
  checkboxConfig: { reserve: true },
  columns: [
    { type: 'checkbox', width: 50 },
    { type: 'seq', width: 70 },
    { field: 'module', title: '类型', width: 80, slots: { default: 'module_default' } },
    { field: 'platformName', title: '平台', minWidth: 120 },
    { field: 'itemCount', title: '条目数', width: 80, align: 'center' },
    buildTimeColumn('采集时间', 'collectedAt', 170, { slots: { default: 'collectedAt_default' } }),
    buildOperationColumn('action_default', 80)
  ]
})

const formatTime = (t: string) => {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN', { hour12: false })
}

const normalizeItems = (items: Record<string, any>[]) => {
  if (!Array.isArray(items)) return []
  return items.map(item => ({
    rank: item.rank ?? item.order ?? '',
    title: item.title ?? item.word ?? item.name ?? item.text ?? '',
    heat: item.heat ?? item.hot ?? item.num ?? item.score ?? item.value ?? '',
    url: item.url ?? item.link ?? item.scheme ?? '',
    extra: [item.subtitle, item.category, item.tags, item.icon_desc]
      .filter(Boolean).join(' / ') || ''
  }))
}

const getList = async () => {
  loading.value = true
  selectedIds.value = []
  try {
    const params: any = {
      page: queryParams.currentPage,
      pageSize: queryParams.pageSize
    }
    if (queryParams.module) params.module = queryParams.module
    if (queryParams.platform) params.platform = queryParams.platform
    const res = await getSnapshots(params)
    const data = (res as any)?.data ?? res
    dataList.value = data?.list ?? []
    total.value = data?.total ?? 0
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadPlatforms = async () => {
  try {
    const res = await getPlatforms()
    platforms.value = (res as any)?.data ?? res ?? []
  } catch (e) {
    console.error(e)
  }
}

const loadModules = async () => {
  try {
    const res = await getModules()
    moduleList.value = (res as any)?.data ?? res ?? []
  } catch (e) {
    console.error(e)
  }
}

const handleSearch = () => {
  queryParams.currentPage = 1
  getList()
}

const handleCheckboxChange = ({ records }: { records: HotsearchSnapshot[] }) => {
  selectedIds.value = records.map((item) => item.id)
}

const handleCheckboxAllChange = ({ records }: { records: HotsearchSnapshot[] }) => {
  selectedIds.value = records.map((item) => item.id)
}

const handleBatchDelete = async () => {
  if (!selectedIds.value.length) return
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 条快照？`, '提示', {
      type: 'warning'
    })
    const res = await batchDeleteSnapshots(selectedIds.value)
    const deleted = (res as any)?.data?.deleted ?? selectedIds.value.length
    ElMessage.success(`已删除 ${deleted} 条`)
    selectedIds.value = []
    await getList()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

const handleReset = () => {
  queryParams.module = ''
  queryParams.platform = ''
  queryParams.currentPage = 1
  getList()
}

const handleRefresh = async () => {
  refreshing.value = true
  try {
    await refreshHotsearch()
    ElMessage.success('热搜缓存已刷新')
    await getList()
  } catch (e) {
    ElMessage.error('刷新失败')
  } finally {
    refreshing.value = false
  }
}

const handleView = (row: HotsearchSnapshot) => {
  detailTitle.value = `${row.platformName} · ${formatTime(row.collectedAt)}`
  detailItems.value = normalizeItems(row.items || [])
  detailVisible.value = true
}

onMounted(() => {
  loadModules()
  loadPlatforms()
  getList()
})
</script>

<style scoped lang="scss">
.hotsearch-history-page {
  height: 100%;
}

.item-link {
  color: var(--el-color-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}
</style>
