<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MoreFilled, Clock, Search, Plus, VideoPlay, Collection } from '@element-plus/icons-vue'
import { Icon } from '@/components/Icon'
import { getManifestByType } from '@/views/workflow/editor/config/node-manifest'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/store/modules/user'
import ContentWrap from '@/components/ContentWrap/src/ContentWrap.vue'
import ExecutionHistory from '@/components/workflow/ExecutionHistory.vue'
import {
  getWorkflowPageApi,
  createWorkflowApi,
  deleteWorkflowApi,
  toggleEnabledApi,
  runWorkflowApi,
  getWorkflowExecutionsApi,
  deleteWorkflowExecutionApi,
  clearWorkflowExecutionsApi,
  publishWorkflowToLibraryApi,
  resetWorkflowApi,
  type WorkflowItem
} from '@/api/workflow'

type StatusFilter = 'all' | 'scheduled' | 'running' | 'failed' | 'disabled'

const router = useRouter()
const { t } = useI18n()
const userStore = useUserStore()
const isAdmin = computed(() => userStore.user?.isAdmin === true)

const loading = ref(false)
const list = ref<WorkflowItem[]>([])
const total = ref(0)
const params = reactive({ currentPage: 1, pageSize: 100, name: '' })
const activeFilter = ref<StatusFilter>('all')

const createVisible = ref(false)
const creating = ref(false)
const createForm = reactive({ name: '', description: '' })

const listRefreshing = ref(false)

const fetchList = async (options: { silent?: boolean } = {}) => {
  if (listRefreshing.value) return
  listRefreshing.value = true
  if (!options.silent) loading.value = true
  try {
    const res: any = await getWorkflowPageApi({ ...params })
    list.value = res.list || []
    total.value = res.total || 0
  } finally {
    listRefreshing.value = false
    if (!options.silent) loading.value = false
  }
}

const goToLibrary = () => {
  router.push('/workflow/library')
}

let runningRefreshTimer: ReturnType<typeof setInterval> | null = null

const refreshRunningWorkflows = async () => {
  if (loading.value || !list.value.some((item) => item.isRunning)) return
  await fetchList({ silent: true })
}

onMounted(async () => {
  await fetchList()
  runningRefreshTimer = setInterval(refreshRunningWorkflows, 2500)
})

onBeforeUnmount(() => {
  if (runningRefreshTimer) {
    clearInterval(runningRefreshTimer)
    runningRefreshTimer = null
  }
})

const handleSearch = () => {
  params.currentPage = 1
  fetchList()
}

const handleCreate = async () => {
  if (!createForm.name.trim()) {
    ElMessage.warning(t('workflow.nameRequired'))
    return
  }
  creating.value = true
  try {
    const res: any = await createWorkflowApi({
      name: createForm.name.trim(),
      description: createForm.description.trim()
    })
    ElMessage.success(t('workflow.createSuccess'))
    createVisible.value = false
    createForm.name = ''
    createForm.description = ''
    router.push(`/workflow/editor/${res.id}`)
  } finally {
    creating.value = false
  }
}

const openEditor = (row: WorkflowItem) => {
  router.push(`/workflow/editor/${row.id}`)
}

const handleViewWorkflowDetail = async (row: WorkflowItem) => {
  await ElMessageBox.alert(`工作流 ID：\n${row.id}`, '工作流详情', {
    confirmButtonText: '知道了'
  })
}

const handlePublishToLibrary = async (row: WorkflowItem) => {
  if (!isAdmin.value) return
  try {
    const category = await ElMessageBox.prompt('请输入工作流库分类', '发布到工作流库', {
      inputValue: '其他',
      confirmButtonText: '发布',
      cancelButtonText: '取消'
    })
    await publishWorkflowToLibraryApi(row.id, { category: category.value || '其他' })
    ElMessage.success('已发布到工作流库')
  } catch (error: any) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '发布到工作流库失败')
  }
}

const handleDelete = async (row: WorkflowItem) => {
  await ElMessageBox.confirm(`${t('workflow.deleteConfirm', { name: row.name })}`, t('common.tip'), {
    confirmButtonText: t('workflow.delete'),
    cancelButtonText: t('workflow.cancel'),
    type: 'warning',
    confirmButtonClass: 'el-button--danger'
  })
  await deleteWorkflowApi(row.id)
  ElMessage.success(t('workflow.deleted'))
  fetchList()
}

const handleResetWorkflow = async (row: WorkflowItem) => {
  try {
    await ElMessageBox.confirm(
      `确定强制终止工作流「${row.name}」的所有运行中任务并重置状态吗？`,
      t('common.tip'),
      {
        confirmButtonText: '强制重置',
        cancelButtonText: t('common.cancel'),
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    const res: any = await resetWorkflowApi(row.id)
    ElMessage.success(res?.message || '工作流状态已重置')
    fetchList()
  } catch (error: any) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '重置失败')
  }
}

const hasCronTrigger = (item: WorkflowItem) => item.triggers?.some((tr) => tr.type === 'cron' && tr.enabled)

const hasLatestExecutionFailure = (item: WorkflowItem) =>
  !item.isRunning && item.lastExecution?.status === 'failed'

const getLatestExecutionError = (item: WorkflowItem) =>
  hasLatestExecutionFailure(item) ? String(item.lastExecution?.errorText || '执行失败，请查看执行记录') : ''

const getFunctionalNodeManifests = (item: WorkflowItem) => {
  const all = (item.nodeTypes || []).map((type) => getManifestByType(type)).filter(Boolean)
  const core = all.filter((m) => m!.type !== 'start' && m!.type !== 'end')
  return (core.length ? core : all).slice(0, 4)
}

const getPrimaryManifest = (item: WorkflowItem) => getFunctionalNodeManifests(item)[0] || null

const getSecondaryManifests = (item: WorkflowItem) => getFunctionalNodeManifests(item).slice(1, 4)

const pad2 = (val: string) => String(parseInt(val, 10)).padStart(2, '0')

const getCronText = (item: WorkflowItem) => {
  const trigger = item.triggers?.find((tr) => tr.type === 'cron' && tr.enabled)
  const expr = trigger?.config?.expression || ''
  if (!expr) return t('workflow.cron')
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return t('workflow.cron')
  const [min, hour, dom, month, dow] = parts

  // 每 N 分钟
  if (min.startsWith('*/') && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return t('workflow.everyNMinutes', { n: min.slice(2) })
  }
  // 每 N 小时
  if (/^\d+$/.test(min) && hour.startsWith('*/') && dom === '*' && month === '*' && dow === '*') {
    return `每 ${hour.slice(2)} 小时`
  }
  // 每小时
  if (/^\d+$/.test(min) && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return min === '0' ? t('workflow.everyHour') : `每小时 :${pad2(min)}`
  }
  // 每天 HH:MM
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === '*' && month === '*' && dow === '*') {
    return `每天 ${pad2(hour)}:${pad2(min)}`
  }
  // 每周
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === '*' && month === '*' && dow !== '*') {
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    const days = dow
      .split(',')
      .map((d) => weekDays[parseInt(d, 10)] || d)
      .join('、')
    return `每周${days} ${pad2(hour)}:${pad2(min)}`
  }
  // 每月
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && /^\d+$/.test(dom) && month === '*' && dow === '*') {
    return `每月${dom}日 ${pad2(hour)}:${pad2(min)}`
  }
  return expr
}

const getStatusInfo = (item: WorkflowItem) => {
  if (hasLatestExecutionFailure(item)) {
    return { key: 'failed', label: '失败' }
  }
  if (item.isRunning) {
    return { key: 'running', label: '运行中' }
  }
  if (!item.isEnabled) {
    return { key: 'disabled', label: '已停用' }
  }
  if (hasCronTrigger(item)) {
    return { key: 'scheduled', label: '定时' }
  }
  return { key: 'enabled', label: '就绪' }
}

const formatRelativeDate = (dateStr?: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (isSameDay) {
    return `今天 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${mm}-${dd}`
}

const filterCounts = computed(() => {
  let scheduled = 0
  let running = 0
  let failed = 0
  let disabled = 0
  for (const item of list.value) {
    if (hasLatestExecutionFailure(item)) failed += 1
    else if (item.isRunning) running += 1
    else if (!item.isEnabled) disabled += 1
    else if (hasCronTrigger(item)) scheduled += 1
  }
  return {
    all: list.value.length,
    scheduled,
    running,
    failed,
    disabled
  }
})

const filterTabs = computed(() => {
  const tabs: { key: StatusFilter; label: string; count: number; dot?: string }[] = [
    { key: 'all', label: '全部', count: filterCounts.value.all },
    { key: 'scheduled', label: '定时中', count: filterCounts.value.scheduled, dot: 'scheduled' }
  ]
  if (filterCounts.value.running > 0 || activeFilter.value === 'running') {
    tabs.push({ key: 'running', label: '运行中', count: filterCounts.value.running, dot: 'running' })
  }
  if (filterCounts.value.failed > 0 || activeFilter.value === 'failed') {
    tabs.push({ key: 'failed', label: '失败', count: filterCounts.value.failed, dot: 'failed' })
  }
  if (filterCounts.value.disabled > 0 || activeFilter.value === 'disabled') {
    tabs.push({ key: 'disabled', label: '已停用', count: filterCounts.value.disabled, dot: 'disabled' })
  }
  return tabs
})

const filteredList = computed(() => {
  if (activeFilter.value === 'all') return list.value
  return list.value.filter((item) => {
    if (activeFilter.value === 'failed') return hasLatestExecutionFailure(item)
    if (activeFilter.value === 'running') return item.isRunning && !hasLatestExecutionFailure(item)
    if (activeFilter.value === 'disabled') return !item.isEnabled
    if (activeFilter.value === 'scheduled') return item.isEnabled && hasCronTrigger(item)
    return true
  })
})

const handleToggleEnabled = async (row: WorkflowItem) => {
  if (row.isRunning) {
    ElMessage.warning(t('workflow.runningCannotDisable'))
    return
  }
  try {
    const res: any = await toggleEnabledApi(row.id)
    row.isEnabled = res.isEnabled
    ElMessage.success(row.isEnabled ? t('workflow.enabled') : t('workflow.disabled'))
  } catch (err: any) {
    ElMessage.error(err.message || t('common.operationFailed'))
  }
}

const historyDialogVisible = ref(false)
const historyWorkflow = ref<WorkflowItem | null>(null)
const executions = ref<any[]>([])
const loadingHistory = ref(false)

const terminalExecutionStatuses = new Set(['success', 'failed', 'cancelled', 'paused'])
const monitoredExecutionIds = new Set<string>()

/** 手动执行后精确轮询该条执行记录，终态落库后立即同步卡片。 */
const monitorExecutionCompletion = async (workflowId: string, executionId: string) => {
  if (!executionId || monitoredExecutionIds.has(executionId)) return
  monitoredExecutionIds.add(executionId)
  try {
    for (let attempt = 0; attempt < 450; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 800))
      const res: any = await getWorkflowExecutionsApi(workflowId, { currentPage: 1, pageSize: 20 })
      const records = res?.list ?? res?.data?.list ?? []
      const execution = records.find((item: any) => item.id === executionId)
      if (execution && terminalExecutionStatuses.has(execution.status)) {
        await fetchList()
        return
      }
    }
  } catch (error) {
    console.warn('工作流执行状态同步失败', error)
  } finally {
    monitoredExecutionIds.delete(executionId)
  }
}

const handleRunWorkflow = async (row: WorkflowItem) => {
  if (!row.isEnabled || row.isRunning) return
  try {
    const res: any = await runWorkflowApi(row.id)
    const executionId = String(res?.executionId || '')
    row.isRunning = true
    ElMessage.success(`${t('workflow.triggeredWithId', { id: executionId || 'OK' })}`)
    void monitorExecutionCompletion(row.id, executionId)
    await fetchList()
  } catch (err: any) {
    ElMessage.error(err.message || t('workflow.executeFailed'))
    await fetchList()
  }
}

const handleShowHistory = async (row: WorkflowItem) => {
  historyWorkflow.value = row
  historyDialogVisible.value = true
  await loadExecutions(row.id)
}

const loadExecutions = async (workflowId: string) => {
  loadingHistory.value = true
  try {
    const res: any = await getWorkflowExecutionsApi(workflowId, { currentPage: 1, pageSize: 100 })
    executions.value = res?.list ?? res?.data?.list ?? []
  } catch (err) {
    console.error(t('workflow.fetchHistoryFailed'), err)
  } finally {
    loadingHistory.value = false
  }
}

const handleDeleteExecution = async (executionId: string) => {
  await ElMessageBox.confirm(t('workflow.deleteExecutionConfirm'), t('common.tip'), { type: 'warning' })
  try {
    await deleteWorkflowExecutionApi(executionId)
    ElMessage.success(t('workflow.deleted'))
    if (historyWorkflow.value) {
      await loadExecutions(historyWorkflow.value.id)
    }
  } catch (err: any) {
    ElMessage.error(err.message || t('common.deleteFailed'))
  }
}

const handleClearHistory = async () => {
  if (!historyWorkflow.value) return
  await ElMessageBox.confirm(t('workflow.clearHistoryConfirm'), t('common.tip'), { type: 'warning' })
  try {
    await clearWorkflowExecutionsApi(historyWorkflow.value.id)
    ElMessage.success(t('workflow.historyCleared'))
    executions.value = []
  } catch (err: any) {
    ElMessage.error(err.message || t('common.clearFailed'))
  }
}
</script>

<template>
  <ContentWrap :plain="true">
    <div class="wf-wall">
      <!-- 顶部工具栏：左侧极简状态切换，右侧搜索与主操作 -->
      <header class="wf-toolbar">
        <div class="wf-toolbar__left">
          <div class="wf-tabs" role="tablist">
            <button
              v-for="tab in filterTabs"
              :key="tab.key"
              type="button"
              role="tab"
              :aria-selected="activeFilter === tab.key"
              :class="['wf-tab', { 'wf-tab--active': activeFilter === tab.key }]"
              @click="activeFilter = tab.key"
            >
              <span v-if="tab.dot" :class="['wf-dot', `wf-dot--${tab.dot}`]" />
              <span>{{ tab.label }}</span>
              <span class="wf-tab__count">{{ tab.count }}</span>
            </button>
          </div>
        </div>

        <div class="wf-toolbar__right">
          <el-input
            v-model="params.name"
            class="wf-search"
            :placeholder="t('workflow.search')"
            :prefix-icon="Search"
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
          <el-button class="wf-btn-ghost" :icon="Collection" @click="goToLibrary">工作流库</el-button>
          <el-button type="primary" class="wf-btn-primary" :icon="Plus" @click="createVisible = true">
            {{ t('workflow.create') }}
          </el-button>
        </div>
      </header>

      <!-- 扁平化卡片墙 -->
      <div v-loading="loading" class="wf-grid">
        <article
          v-for="item in filteredList"
          :key="item.id"
          :class="[
            'wf-card',
            `wf-card--${getStatusInfo(item).key}`
          ]"
          @click="openEditor(item)"
        >
          <!-- 卡片顶栏：核心节点图标 + 状态点 + 悬浮快捷操作 -->
          <div class="wf-card__top">
            <div class="wf-card__brand">
              <div
                class="wf-card__avatar"
                :style="
                  getPrimaryManifest(item)?.color
                    ? { '--node-accent': getPrimaryManifest(item)!.color }
                    : undefined
                "
              >
                <img
                  v-if="getPrimaryManifest(item)?.iconImage"
                  :src="getPrimaryManifest(item)!.iconImage"
                  :alt="getPrimaryManifest(item)!.name"
                />
                <Icon
                  v-else-if="getPrimaryManifest(item)?.icon"
                  :icon="getPrimaryManifest(item)!.icon"
                  :size="18"
                />
                <span v-else class="wf-card__avatar-fallback">
                  {{ (item.name || 'W').slice(0, 1) }}
                </span>
              </div>

              <div v-if="getSecondaryManifests(item).length" class="wf-card__sub-icons">
                <span
                  v-for="manifest in getSecondaryManifests(item)"
                  :key="manifest!.type"
                  class="wf-card__sub-icon"
                  :style="{ color: manifest!.color }"
                  :title="manifest!.name"
                >
                  <img v-if="manifest!.iconImage" :src="manifest!.iconImage" :alt="manifest!.name" />
                  <Icon v-else-if="manifest!.icon" :icon="manifest!.icon" :size="12" />
                  <span v-else>{{ manifest!.name.slice(0, 1) }}</span>
                </span>
              </div>
            </div>

            <div class="wf-card__top-right">
              <span :class="['wf-status', `wf-status--${getStatusInfo(item).key}`]">
                <span :class="['wf-dot', `wf-dot--${getStatusInfo(item).key}`]" />
                <span>{{ getStatusInfo(item).label }}</span>
              </span>

              <div class="wf-card__actions" @click.stop>
                <button
                  type="button"
                  class="wf-icon-btn wf-icon-btn--run"
                  :disabled="!item.isEnabled || item.isRunning"
                  :title="item.isRunning ? t('workflow.executing') : t('workflow.execute')"
                  @click.stop="handleRunWorkflow(item)"
                >
                  <el-icon><VideoPlay /></el-icon>
                </button>

                <el-dropdown trigger="click" placement="bottom-end" @click.stop>
                  <button type="button" class="wf-icon-btn" title="更多操作" @click.stop>
                    <el-icon><MoreFilled /></el-icon>
                  </button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        :disabled="!item.isEnabled || item.isRunning"
                        @click="handleRunWorkflow(item)"
                      >
                        {{ item.isRunning ? t('workflow.executing') : t('workflow.execute') }}
                      </el-dropdown-item>
                      <el-dropdown-item v-if="item.isRunning" @click="handleResetWorkflow(item)">
                        强制终止与重置
                      </el-dropdown-item>
                      <el-dropdown-item @click="handleShowHistory(item)">
                        {{ t('workflow.executionHistory') }}
                      </el-dropdown-item>
                      <el-dropdown-item @click="handleViewWorkflowDetail(item)">查看详情</el-dropdown-item>
                      <el-dropdown-item divided @click="openEditor(item)">
                        {{ t('workflow.edit') }}
                      </el-dropdown-item>
                      <el-dropdown-item v-if="isAdmin" @click="handlePublishToLibrary(item)">
                        发布到工作流库
                      </el-dropdown-item>
                      <el-dropdown-item :disabled="item.isRunning" @click="handleToggleEnabled(item)">
                        {{ item.isEnabled ? t('workflow.disable') : t('workflow.enable') }}
                      </el-dropdown-item>
                      <el-dropdown-item divided @click="handleDelete(item)">
                        <span class="wf-danger-text">{{ t('workflow.delete') }}</span>
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>

          <!-- 卡片主体：标题 + 单行描述/报错 -->
          <div class="wf-card__body">
            <h3 class="wf-card__title" :title="item.name">{{ item.name }}</h3>
            <p
              v-if="getLatestExecutionError(item)"
              class="wf-card__desc wf-card__desc--error"
              :title="getLatestExecutionError(item)"
            >
              {{ getLatestExecutionError(item) }}
            </p>
            <p v-else class="wf-card__desc" :title="item.description || ''">
              {{ item.description || '点击打开画布编排与调试工作流' }}
            </p>
          </div>

          <!-- 卡片底栏：极简元信息（定时计划 / 更新时间） -->
          <footer class="wf-card__meta">
            <span v-if="hasCronTrigger(item)" class="wf-card__schedule">
              <el-icon><Clock /></el-icon>
              <span>{{ getCronText(item) }}</span>
            </span>
            <span v-else class="wf-card__schedule wf-card__schedule--manual">
              手动触发
            </span>

            <span class="wf-card__time" :title="new Date(item.updateTime).toLocaleString('zh-CN')">
              {{ formatRelativeDate(item.lastExecution?.updateTime || item.updateTime) }}
            </span>
          </footer>
        </article>

        <!-- 末尾极简新建卡片（仅全部视图且无搜索词时展示） -->
        <button
          v-if="activeFilter === 'all' && !params.name.trim()"
          type="button"
          class="wf-card wf-card--new"
          @click="createVisible = true"
        >
          <span class="wf-card--new__plus">
            <el-icon><Plus /></el-icon>
          </span>
          <span class="wf-card--new__label">{{ t('workflow.create') }}</span>
        </button>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && filteredList.length === 0" class="wf-empty">
        <p class="wf-empty__title">暂无匹配的工作流</p>
        <p class="wf-empty__sub">尝试切换筛选状态、清空搜索关键词，或新建一条工作流</p>
      </div>

      <!-- 分页 -->
      <div v-if="total > params.pageSize" class="wf-pagination">
        <el-pagination
          v-model:current-page="params.currentPage"
          v-model:page-size="params.pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @change="fetchList"
        />
      </div>

      <!-- 执行记录 - 全屏列表弹窗 -->
      <el-dialog
        v-model="historyDialogVisible"
        :title="`${historyWorkflow?.name || ''} - 执行记录`"
        fullscreen
        destroy-on-close
        class="wf-history-dialog"
      >
        <ExecutionHistory
          :executions="executions"
          :loading="loadingHistory"
          :show-delete="true"
          @refresh="historyWorkflow && loadExecutions(historyWorkflow.id)"
          @delete="handleDeleteExecution"
          @clear="handleClearHistory"
        />
      </el-dialog>

      <!-- 创建 -->
      <el-dialog v-model="createVisible" :title="t('workflow.create')" width="440px" align-center>
        <el-form label-position="top" @submit.prevent="handleCreate">
          <el-form-item :label="t('workflow.name')" required>
            <el-input
              v-model="createForm.name"
              :placeholder="t('workflow.namePlaceholder')"
              autofocus
              maxlength="100"
              show-word-limit
            />
          </el-form-item>
          <el-form-item :label="t('workflow.description')">
            <el-input
              v-model="createForm.description"
              type="textarea"
              :placeholder="t('workflow.descriptionPlaceholder')"
              :rows="3"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="createVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" :loading="creating" @click="handleCreate">
            {{ t('workflow.createAndOpen') }}
          </el-button>
        </template>
      </el-dialog>
    </div>
  </ContentWrap>
</template>

<style scoped lang="scss">
@keyframes wf-dot-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.45;
    transform: scale(0.8);
  }
}

.wf-wall {
  --wf-surface: var(--app-content-surface-color, #ffffff);
  --wf-surface-subtle: var(--app-content-surface-muted-color, #f7f8fa);
  --wf-border: rgba(15, 23, 42, 0.08);
  --wf-border-hover: rgba(15, 23, 42, 0.18);
  --wf-divider: rgba(15, 23, 42, 0.06);
  --wf-text-primary: var(--el-text-color-primary, #111827);
  --wf-text-secondary: var(--el-text-color-secondary, #6b7280);
  --wf-text-muted: var(--el-text-color-placeholder, #9ca3af);
  --wf-accent-green: #10b981;
  --wf-accent-amber: #d97706;
  --wf-accent-red: #ef4444;

  min-height: calc(100vh - 120px);
  padding: 6px 0 24px;
}

/* ==================== 顶部极简工具栏 ==================== */
.wf-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;

  &__left {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
}

.wf-tabs {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  background: var(--wf-surface-subtle);
  border: 1px solid var(--wf-border);
  border-radius: 9px;
}

.wf-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--wf-text-secondary);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;

  &:hover {
    color: var(--wf-text-primary);
  }

  &--active {
    color: var(--wf-text-primary);
    background: var(--wf-surface);
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
  }

  &__count {
    font-size: 11px;
    font-weight: 500;
    color: var(--wf-text-muted);
    font-variant-numeric: tabular-nums;
  }

  &--active &__count {
    color: var(--wf-text-secondary);
  }
}

.wf-search {
  width: 220px;

  :deep(.el-input__wrapper) {
    border-radius: 8px;
    box-shadow: 0 0 0 1px var(--wf-border) inset;
    background: var(--wf-surface);
    transition: box-shadow 0.15s ease;

    &:hover,
    &.is-focus {
      box-shadow: 0 0 0 1px var(--wf-border-hover) inset;
    }
  }
}

.wf-btn-ghost {
  border-radius: 8px;
  border-color: var(--wf-border);
  background: var(--wf-surface);
  color: var(--wf-text-primary);
  font-weight: 500;

  &:hover {
    border-color: var(--wf-border-hover);
    background: var(--wf-surface-subtle);
    color: var(--wf-text-primary);
  }
}

.wf-btn-primary {
  border-radius: 8px;
  font-weight: 500;
}

/* ==================== 扁平卡片墙网格（桌面端固定 5 列） ==================== */
.wf-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 1320px) {
  .wf-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .wf-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .wf-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .wf-grid {
    grid-template-columns: 1fr;
  }
}

/* ==================== 单张工作流卡片 ==================== */
.wf-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 134px;
  padding: 15px 16px 12px;
  background: var(--wf-surface);
  border: 1px solid var(--wf-border);
  border-radius: 10px;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease;

  &:hover {
    border-color: var(--wf-border-hover);
    background: color-mix(in srgb, var(--wf-surface-subtle) 45%, var(--wf-surface));

    .wf-card__actions {
      opacity: 1;
    }
  }

  /* 仅在运行中或失败时用克制的 1px 边框微调提示，绝不使用重阴影 */
  &--running {
    border-color: color-mix(in srgb, var(--wf-accent-green) 42%, var(--wf-border));

    &:hover {
      border-color: color-mix(in srgb, var(--wf-accent-green) 65%, var(--wf-border));
    }
  }

  &--failed {
    border-color: color-mix(in srgb, var(--wf-accent-red) 35%, var(--wf-border));

    &:hover {
      border-color: color-mix(in srgb, var(--wf-accent-red) 55%, var(--wf-border));
    }
  }

  &--disabled {
    opacity: 0.56;

    &:hover {
      opacity: 0.82;
    }
  }

  /* 顶栏 */
  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  &__avatar {
    --node-accent: var(--el-color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    border-radius: 8px;
    color: var(--node-accent);
    background: color-mix(in srgb, var(--node-accent) 9%, var(--wf-surface-subtle));
    border: 1px solid color-mix(in srgb, var(--node-accent) 14%, transparent);

    img {
      width: 18px;
      height: 18px;
      object-fit: contain;
    }
  }

  &__avatar-fallback {
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
  }

  &__sub-icons {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__sub-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 5px;
    background: var(--wf-surface-subtle);
    border: 1px solid var(--wf-divider);

    img {
      width: 12px;
      height: 12px;
      object-fit: contain;
    }
  }

  &__top-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  &__actions {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    opacity: 0.35;
    transition: opacity 0.15s ease;
  }

  /* 主体 */
  &__body {
    flex: 1;
    min-width: 0;
    margin-bottom: 12px;
  }

  &__title {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 1.4;
    color: var(--wf-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__desc {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--wf-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &--error {
      color: var(--wf-accent-red);
    }
  }

  /* 底栏 */
  &__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--wf-divider);
    font-size: 11.5px;
    color: var(--wf-text-muted);
    font-variant-numeric: tabular-nums;
  }

  &__schedule {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    color: var(--wf-text-secondary);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    :deep(.el-icon) {
      font-size: 12px;
      color: var(--wf-text-muted);
      flex-shrink: 0;
    }

    &--manual {
      color: var(--wf-text-muted);
      font-weight: 400;
    }
  }

  &__time {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--wf-text-muted);
  }
}

/* 状态指示器 */
.wf-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--wf-text-muted);

  &--scheduled {
    background: var(--wf-accent-amber);
  }

  &--running {
    background: var(--wf-accent-green);
    animation: wf-dot-pulse 1.4s ease-in-out infinite;
  }

  &--enabled {
    background: var(--wf-accent-green);
  }

  &--failed {
    background: var(--wf-accent-red);
  }

  &--disabled {
    background: var(--wf-text-muted);
  }
}

.wf-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  color: var(--wf-text-secondary);
  white-space: nowrap;

  &--running {
    color: #059669;
  }

  &--failed {
    color: #dc2626;
  }
}

/* 卡片操作图标按钮 */
.wf-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  color: var(--wf-text-secondary);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;

  &:hover:not(:disabled) {
    background: var(--wf-surface-subtle);
    color: var(--wf-text-primary);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &--run:hover:not(:disabled) {
    color: var(--el-color-primary);
  }

  :deep(.el-icon) {
    font-size: 14px;
  }
}

.wf-danger-text {
  color: var(--el-color-danger);
}

/* 末尾极简新建卡片 */
.wf-card--new {
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: transparent;
  border: 1px dashed var(--wf-border-hover);
  color: var(--wf-text-secondary);

  &:hover {
    border-color: var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 4%, transparent);
    color: var(--el-color-primary);

    .wf-card--new__plus {
      border-color: color-mix(in srgb, var(--el-color-primary) 40%, transparent);
      color: var(--el-color-primary);
    }
  }

  &__plus {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--wf-border);
    background: var(--wf-surface);
    font-size: 15px;
    transition: border-color 0.15s ease, color 0.15s ease;
  }

  &__label {
    font-size: 12.5px;
    font-weight: 500;
  }
}

/* 空状态 */
.wf-empty {
  padding: 64px 20px;
  text-align: center;

  &__title {
    margin: 0 0 6px;
    font-size: 14px;
    font-weight: 600;
    color: var(--wf-text-primary);
  }

  &__sub {
    margin: 0;
    font-size: 12px;
    color: var(--wf-text-muted);
  }
}

.wf-pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.wf-history-dialog {
  :deep(.el-dialog__body) {
    padding: 20px 32px;
    height: calc(100vh - 60px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}

/* ==================== 暗黑模式精细适配 ==================== */
:global(html.dark) .wf-wall {
  --wf-border: rgba(255, 255, 255, 0.08);
  --wf-border-hover: rgba(255, 255, 255, 0.18);
  --wf-divider: rgba(255, 255, 255, 0.06);
  --wf-accent-green: #34d399;
  --wf-accent-amber: #fbbf24;
  --wf-accent-red: #f87171;
}

:global(html.dark) .wf-tab--active {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

:global(html.dark) .wf-status--running {
  color: #6ee7b7;
}

:global(html.dark) .wf-status--failed {
  color: #fca5a5;
}
</style>
