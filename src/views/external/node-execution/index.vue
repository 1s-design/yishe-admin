<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="node-execution-page">
      <!-- 筛选栏 -->
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="节点类型">
                  <el-select v-model="filters.nodeType" placeholder="全部类型" clearable size="small" style="width: 100%" @change="handleSearch">
                    <el-option label="全部热搜" value="hotsearch" />
                    <el-option label="抖音热搜" value="hotsearch_douyin" />
                    <el-option label="百度热搜" value="hotsearch_baidu" />
                    <el-option label="头条热搜" value="hotsearch_toutiao" />
                    <el-option label="B站热搜" value="hotsearch_bilibili" />
                    <el-option label="知乎热搜" value="hotsearch_zhihu" />
                    <el-option label="微博热搜" value="hotsearch_weibo" />
                    <el-option label="豆瓣热搜" value="hotsearch_douban" />
                    <el-option label="快手热搜" value="hotsearch_kuaishou" />
                    <el-option label="小红书热搜" value="hotsearch_xiaohongshu" />
                    <el-option label="JS代码" value="js_code" />
                    <el-option label="AI调用" value="ai_call" />
                    <el-option label="飞书推送" value="message_push_feishu" />
                    <el-option label="图片引擎" value="image-engine" />
                    <el-option label="浏览器" value="browser-automation" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="状态">
                  <el-select v-model="filters.status" placeholder="全部状态" clearable size="small" style="width: 100%" @change="handleSearch">
                    <el-option label="成功" value="success" />
                    <el-option label="失败" value="failed" />
                    <el-option label="运行中" value="running" />
                    <el-option label="超时" value="timeout" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="节点">
                  <el-select v-model="filters.nodeKey" placeholder="全部节点" clearable size="small" style="width: 100%" @change="handleSearch">
                    <el-option v-for="node in availableNodes" :key="node.key" :label="node.label" :value="node.key" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="来源">
                  <el-select v-model="filters.triggerSource" placeholder="全部来源" clearable size="small" style="width: 100%" @change="handleSearch">
                    <el-option label="手动" value="admin-ui" />
                    <el-option label="工作流" value="workflow" />
                    <el-option label="定时" value="schedule" />
                    <el-option label="API" value="api" />
                    <el-option label="AI" value="ai-agent" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item label="搜索">
                  <el-input v-model="filters.keyword" placeholder="搜索节点..." clearable size="small" style="width: 100%" @keyup.enter="handleSearch" @clear="handleSearch" />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" @click="handleSearch">查询</el-button>
              <el-button size="small" @click="handleReset">重置</el-button>
            </div>
          </el-form>
        </div>
      </template>

      <!-- 数据表格 -->
      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body">
            <div class="content-container" style="flex: 1; min-width: 0; overflow: hidden">
              <div class="common-table">
                <vxe-grid
                  ref="gridRef"
                  v-bind="gridOptions"
                  :data="gridData"
                  :max-height="gridMaxHeight"
                  :loading="loading"
                  @cell-click="handleCellClick"
                >
                  <template #item_count="{ row }">
                    <span v-if="row.data?.itemCount || row.data?.item_count">{{ row.data.itemCount || row.data.item_count }}</span>
                    <span v-else-if="row.data?.items?.length">{{ row.data.items.length }}</span>
                    <span v-else>-</span>
                  </template>
                  <template #duration="{ row }">
                    <span v-if="row.durationMs">{{ row.durationMs }}ms</span>
                    <span v-else>-</span>
                  </template>
                  <template #status="{ row }">
                    <span class="status-badge" :class="`is-${row.status}`">{{ statusLabel(row.status) }}</span>
                  </template>
                  <template #client="{ row }">
                    <span v-if="row.clientId" class="client-id">{{ row.clientId }}</span>
                    <span v-else class="text-muted">服务端</span>
                  </template>
                </vxe-grid>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 分页 -->
      <template #pagination>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat">
          <pagination
            :total="pagination.total"
            v-model:page="pagination.page"
            v-model:limit="pagination.limit"
            @pagination="handleSearch"
          />
        </div>
      </template>
    </ListPageLayout>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" :title="`执行详情 - ${currentRow?.nodeKey}`" size="500px" direction="rtl">
      <div v-if="currentRow" class="detail-content">
        <div class="detail-section">
          <div class="detail-row"><span class="detail-label">ID:</span><span>{{ currentRow.id }}</span></div>
          <div class="detail-row"><span class="detail-label">节点:</span><span>{{ currentRow.nodeKey }}</span></div>
          <div class="detail-row"><span class="detail-label">类型:</span><span>{{ currentRow.nodeType }}</span></div>
          <div class="detail-row"><span class="detail-label">来源:</span><span>{{ currentRow.triggerSource }}</span></div>
          <div class="detail-row"><span class="detail-label">客户端:</span><span>{{ currentRow.clientId || '服务端' }}</span></div>
          <div class="detail-row"><span class="detail-label">状态">
            <el-tag size="small" :type="statusTagType(currentRow.status)">{{ statusLabel(currentRow.status) }}</el-tag>
          </span></div>
          <div class="detail-row"><span class="detail-label">耗时:</span><span>{{ currentRow.durationMs }}ms</span></div>
          <div class="detail-row"><span class="detail-label">时间:</span><span>{{ currentRow.createdAt }}</span></div>
          <div v-if="currentRow.errorMessage" class="detail-row"><span class="detail-label">错误:</span><span class="error-text">{{ currentRow.errorMessage }}</span></div>
        </div>

        <!-- 采集结果条目 -->
        <div v-if="currentRow.data?.items?.length" class="detail-section">
          <div class="section-title">采集结果 ({{ currentRow.data.items.length }} 条)</div>
          <div class="items-list">
            <div v-for="(item, idx) in currentRow.data.items" :key="idx" class="item-card">
              <div class="item-rank" v-if="item.rank">#{{ item.rank }}</div>
              <div class="item-title">{{ item.title || item.name || '未命名' }}</div>
              <div v-if="item.hot" class="item-hot">🔥 {{ item.hot }}</div>
              <div v-if="item.hot_score" class="item-hot">🔥 {{ item.hot_score.toLocaleString() }}</div>
              <div v-if="item.category" class="item-category">{{ item.category }}</div>
              <div v-if="item.url" class="item-url">
                <a :href="item.url" target="_blank" rel="noopener">{{ item.url }}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { VxeGridProps } from 'vxe-table'
import { getNodeExecutionList, getNodeExecutionStats, type NodeExecutionItem, type NodeExecutionStats } from '@/api/external/nodeExecution'
import { commonGridOptions, useTableMaxHeight } from '@/common/table'
import Pagination from '@/components/Pagination/index.vue'

const route = useRoute()
const gridRef = ref<any>(null)

// ─── 状态 ────────────────────────────────────────────
const loading = ref(false)
const tableData = ref<NodeExecutionItem[]>([])
const stats = ref<NodeExecutionStats>({ total: 0, today: 0, successRate: 0, avgDurationMs: 0, activeNodes: 0 })
const detailVisible = ref(false)
const currentRow = ref<NodeExecutionItem | null>(null)

const filters = reactive({
  nodeType: '',
  status: '',
  nodeKey: '',
  triggerSource: '',
  keyword: '',
})

const queryParams = filters

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
})

const gridMaxHeight = useTableMaxHeight(220)

const gridData = computed(() => tableData.value)

const gridOptions = computed<VxeGridProps>(() => ({
  ...commonGridOptions,
  id: 'node-execution-grid',
  width: '100%',
  scrollX: { enabled: true, gt: 0 },
  columns: [
    { field: 'createdAt', title: '时间', width: 168, showOverflow: true, formatter: ({ cellValue }) => cellValue ? new Date(cellValue).toLocaleString('zh-CN', { hour12: false }) : '-' },
    { field: 'nodeType', title: '类型', width: 110, showOverflow: true, formatter: ({ cellValue }) => nodeTypeLabel(String(cellValue)) },
    { field: 'nodeKey', title: '节点', minWidth: 140, flex: 2, showOverflow: true, formatter: ({ cellValue }) => cellValue || '-' },
    { field: 'triggerSource', title: '来源', width: 80, align: 'center', formatter: ({ cellValue }) => triggerSourceLabel(String(cellValue)) },
    { field: 'item_count', title: '条目', width: 60, align: 'center', slots: { default: 'item_count' } },
    { field: 'duration', title: '耗时', width: 80, align: 'right', showOverflow: true, slots: { default: 'duration' } },
    { field: 'status', title: '状态', width: 70, align: 'center', slots: { default: 'status' } },
    { field: 'client', title: '执行方', minWidth: 80, flex: 1, align: 'center', slots: { default: 'client' } },
  ],
}))

// ─── 节点列表（用于筛选下拉） ──────────────────────────
const availableNodes = [
  { key: 'weibo', label: '微博' },
  { key: 'douyin', label: '抖音' },
  { key: 'baidu', label: '百度热搜' },
  { key: 'toutiao', label: '今日头条' },
  { key: 'bilibili', label: 'B站' },
  { key: 'zhihu', label: '知乎' },
  { key: 'douban', label: '豆瓣' },
  { key: 'kuaishou', label: '快手' },
  { key: 'v2ex', label: 'V2EX' },
  { key: '36kr', label: '36氪' },
  { key: 'ithome', label: 'IT之家' },
  { key: 'xiaohongshu', label: '小红书' },
  { key: 'bbc_news', label: 'BBC News' },
  { key: 'cnn', label: 'CNN' },
  { key: 'hackernews', label: 'Hacker News' },
  { key: 'github', label: 'GitHub' },
  { key: 'google_trends', label: 'Google Trends' },
  { key: 'nytimes', label: 'NYTimes' },
  { key: 'wikipedia', label: 'Wikipedia' },
  { key: 'devto', label: 'Dev.to' },
  { key: 'lobsters', label: 'Lobsters' },
  { key: 'aljazeera', label: 'Al Jazeera' },
]

// ─── 方法 ────────────────────────────────────────────
async function fetchList() {
  loading.value = true
  try {
    const res = await getNodeExecutionList({
      nodeType: filters.nodeType || undefined,
      status: filters.status || undefined,
      nodeKey: filters.nodeKey || undefined,
      triggerSource: filters.triggerSource || undefined,
      page: pagination.page,
      limit: pagination.limit,
    })
    tableData.value = res.items || []
    pagination.total = res.total || 0
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    stats.value = await getNodeExecutionStats()
  } catch {
    // ignore
  }
}

function handleSearch() {
  pagination.page = 1
  fetchList()
}

function handleReset() {
  filters.nodeType = ''
  filters.status = ''
  filters.nodeKey = ''
  filters.triggerSource = ''
  filters.keyword = ''
  pagination.page = 1
  fetchList()
}

function handleCellClick({ row }: { row: NodeExecutionItem }) {
  currentRow.value = row
  detailVisible.value = true
}

// ─── 显示格式化 ───────────────────────────────────────
function statusLabel(status: string) {
  return { running: '运行中', success: '成功', failed: '失败', timeout: '超时' }[status] || status
}

function statusTagType(status: string) {
  return { running: 'primary', success: 'success', failed: 'danger', timeout: 'warning' }[status] || 'info'
}

// 节点类型中文映射（细分到具体子类型）
const NODE_TYPE_LABELS: Record<string, string> = {
  // 基础节点
  start: '开始',
  end: '结束',
  // JS 代码
  js_code: 'JS代码',
  // AI 节点
  ai_call: 'AI调用',
  ai: 'AI调用',
  deep_research: '深度研究',
  ai_code_interpreter: 'AI代码解释',
  // 消息推送
  message_push_feishu: '飞书推送',
  message_push: '消息推送',
  // 图片引擎
  'image-engine': '图片引擎',
  // 浏览器
  'browser-automation': '浏览器',
  // 热搜细分
  hotsearch: '热搜',
  hotsearch_douyin: '抖音热搜',
  hotsearch_baidu: '百度热搜',
  hotsearch_toutiao: '头条热搜',
  hotsearch_bilibili: 'B站热搜',
  hotsearch_zhihu: '知乎热搜',
  hotsearch_douban: '豆瓣热搜',
  hotsearch_kuaishou: '快手热搜',
  hotsearch_weibo: '微博热搜',
  hotsearch_xiaohongshu: '小红书热搜',
  hotsearch_v2ex: 'V2EX热搜',
  hotsearch_ithome: 'IT之家热搜',
  hotsearch_github: 'GitHub趋势',
  hotsearch_devto: 'Dev.to热搜',
  hotsearch_jd_hot: '京东热搜',
  hupu_post_search: '虎扑热帖',
  douyin_jingxuan_search: '抖音精选',
}

function nodeTypeLabel(type: string) {
  return NODE_TYPE_LABELS[type] || type
}

function nodeTypeTagType(type: string) {
  if (type.startsWith('hotsearch_') || type === 'hotsearch') return 'danger'
  return { start: '', end: 'info', js_code: 'primary', ai_call: 'success', ai: 'success', 'image-engine': 'warning', 'browser-automation': 'warning' }[type] || 'info'
}

function triggerSourceLabel(source: string) {
  return { 'admin-ui': '手动', schedule: '定时', workflow: '工作流', api: 'API', 'ai-agent': 'AI' }[source] || source
}

// ─── 初始化 ───────────────────────────────────────────
onMounted(() => {
  // 如果从其他页面带 node 参数跳转过来，自动过滤
  const nodeParam = route.query.node as string
  if (nodeParam) {
    filters.nodeKey = nodeParam
  }
  fetchList()
  fetchStats()
})
</script>

<style scoped>
.node-execution-page {
  gap: 10px;
  padding: 8px 0 0;
}
.node-execution-page .list-page-layout__main {
  gap: 10px;
}

/* 确保表格占满容器宽度 */
.node-execution-page .common-table {
  width: 100%;
}
.node-execution-page .vxe-grid {
  width: 100%;
}
.node-execution-page .list-page-filter--flat {
  gap: 10px;
  padding-bottom: 10px;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.status-badge.is-success {
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
}
.status-badge.is-failed {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}
.status-badge.is-running {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
.status-badge.is-timeout {
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
}

.client-id {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.text-muted {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

/* 详情抽屉 */
.detail-content {
  padding: 0 16px 24px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 14px;
}

.detail-label {
  width: 80px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.error-text {
  color: var(--el-color-danger);
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color);
}

.items-list {
  max-height: 60vh;
  overflow-y: auto;
}

.item-card {
  padding: 10px 12px;
  margin-bottom: 8px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  border-left: 3px solid var(--el-color-primary);
}

.item-rank {
  font-size: 12px;
  color: var(--el-color-primary);
  font-weight: 600;
}

.item-title {
  font-size: 13px;
  margin: 4px 0;
  color: var(--el-text-color-primary);
}

.item-hot {
  font-size: 12px;
  color: var(--el-color-danger);
}

.item-category {
  display: inline-block;
  font-size: 11px;
  padding: 1px 6px;
  background: var(--el-color-info-light-9);
  border-radius: 3px;
  margin-top: 4px;
}

.item-url a {
  font-size: 12px;
  color: var(--el-color-primary);
  word-break: break-all;
}
</style>
