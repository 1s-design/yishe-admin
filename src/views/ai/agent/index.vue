<template>
  <div class="agent-console">
    <!-- ═══════════ 顶栏：靠左对齐 · 极简扁平 ═══════════ -->
    <header class="console-head">
      <div class="console-head__left">
        <h2 class="console-head__title">智能体</h2>
        <span class="console-head__total">{{ agents.length }} 个</span>
        <span class="console-head__stats">
          对话 {{ taskTotal }} · 运行中 {{ statusStats.running || 0 }} · 等待
          {{ (statusStats.waiting_approval || 0) + (statusStats.waiting_input || 0) }} · 完成
          {{ statusStats.completed || 0 }}
        </span>
      </div>

      <div class="console-head__right">
        <div class="console-search">
          <el-icon class="console-search__icon"><Search /></el-icon>
          <input
            v-model="panelSearch"
            type="text"
            class="console-search__input"
            placeholder="搜索智能体名称或描述..."
          />
          <button v-if="panelSearch" class="console-search__clear" @click="panelSearch = ''">
            <el-icon><Close /></el-icon>
          </button>
        </div>

        <button class="btn btn--secondary btn--icon" title="刷新列表" @click="loadAll">
          <el-icon><Refresh /></el-icon>
        </button>

        <button class="btn btn--primary" @click="openCreateAgent">
          <el-icon><Plus /></el-icon>
          <span>创建智能体</span>
        </button>
      </div>
    </header>

    <!-- ═══════════ 状态过滤 Tabs ═══════════ -->
    <div class="console-tabs">
      <button
        v-for="f in panelFilters"
        :key="f.key"
        class="tab-btn"
        :class="{ 'is-active': panelFilter === f.key }"
        @click="panelFilter = f.key"
      >
        <span>{{ f.label }}</span>
        <span class="tab-btn__count">{{ f.count }}</span>
      </button>
    </div>

    <!-- ═══════════ 智能体清单 ═══════════ -->
    <div v-loading="loading" class="agent-list">
      <div
        v-for="item in filteredAgents"
        :key="item.id"
        class="agent-row"
        :class="{
          'is-running': agentRuntimeStatus(item) === 'running',
          'is-waiting': agentRuntimeStatus(item) === 'waiting',
          'is-disabled': !item.enabled
        }"
        @click="openChat(item)"
      >
        <div
          class="agent-row__avatar-wrap"
          :class="{ 'is-duty': item.enabled && item.dutyMode === 'duty' }"
        >
          <div class="agent-row__avatar agent-gradient" :class="resolveAgentGradient(item)" />
          <span v-if="item.enabled && item.dutyMode === 'duty'" class="agent-row__duty-tag">
            工作中
          </span>
        </div>

        <div class="agent-row__body">
          <h3 class="agent-row__title" :title="item.name">{{ item.name }}</h3>

          <p class="agent-row__desc" :title="item.description || ''">
            {{ item.description || '暂无业务描述' }}
          </p>

          <div class="agent-row__foot">
            <div class="agent-row__byline">
              {{ agentStatusLabel(item) }} · {{ (item.capabilities || []).length }} 项能力
              <template v-if="item.dutyMode === 'duty'">
                · 值守 {{ item.dutyRunCount ?? 0 }}/{{ item.dailyRunLimit ?? 24 }}
              </template>
              <template v-if="lastActiveAt(item)"> · 最近活跃 {{ lastActiveAt(item) }} </template>
            </div>

            <el-dropdown
              trigger="click"
              placement="bottom-end"
              :popper-options="{ modifiers: [{ name: 'flip', enabled: false }] }"
              @click.stop
            >
              <button class="agent-row__more" aria-label="更多操作" @click.stop>
                <el-icon><MoreFilled /></el-icon>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openEditAgent(item)">配置智能体</el-dropdown-item>
                  <el-dropdown-item @click="toggleWorking(item)">
                    {{ item.enabled && item.dutyMode === 'duty' ? '关闭工作' : '开启工作' }}
                  </el-dropdown-item>
                  <el-dropdown-item @click="toggleEnabled(item)">
                    {{ item.enabled ? '停用' : '启用' }}
                  </el-dropdown-item>
                  <el-dropdown-item type="danger" divided @click="removeAgent(item)">
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════ 公共配置 / 创建智能体全屏弹窗 ═══════════ -->
    <AgentConfigDialog
      v-model="agentDialogVisible"
      :agent="editingAgent"
      :capabilities="capabilities"
      @saved="loadAll"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Refresh, Close, MoreFilled } from '@element-plus/icons-vue'
import {
  AgentAdminApi,
  type AgentDefinition,
  type CapabilityItem,
  type AgentTask
} from '@/api/agent'
import AgentConfigDialog from './components/AgentConfigDialog.vue'
import { resolveAgentGradient } from './gradients'
import './agent-gradients.css'

const router = useRouter()

const loading = ref(false)
const agents = ref<AgentDefinition[]>([])
const tasks = ref<AgentTask[]>([])
const capabilities = ref<CapabilityItem[]>([])
const taskTotal = ref(0)
const statusStats = ref<Record<string, number>>({})

const panelSearch = ref('')
const panelFilter = ref<'all' | 'running' | 'waiting' | 'ready' | 'disabled'>('all')

const agentDialogVisible = ref(false)
const editingAgent = ref<AgentDefinition | null>(null)

const panelFilters = computed(() => {
  const running = agents.value.filter((a) => agentRuntimeStatus(a) === 'running').length
  const waiting = agents.value.filter((a) => agentRuntimeStatus(a) === 'waiting').length
  const disabled = agents.value.filter((a) => !a.enabled).length
  const ready = agents.value.length - running - waiting - disabled

  return [
    { key: 'all' as const, label: '全部', count: agents.value.length },
    { key: 'running' as const, label: '运行中', count: running },
    { key: 'waiting' as const, label: '待审批', count: waiting },
    { key: 'ready' as const, label: '就绪', count: Math.max(0, ready) },
    { key: 'disabled' as const, label: '已停用', count: disabled }
  ]
})

const filteredAgents = computed(() => {
  let list = agents.value
  if (panelSearch.value.trim()) {
    const q = panelSearch.value.trim().toLowerCase()
    list = list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q))
    )
  }
  if (panelFilter.value !== 'all') {
    list = list.filter((a) => {
      const st = agentRuntimeStatus(a)
      if (panelFilter.value === 'running') return st === 'running'
      if (panelFilter.value === 'waiting') return st === 'waiting'
      if (panelFilter.value === 'disabled') return !a.enabled
      if (panelFilter.value === 'ready') return a.enabled && st === 'ready'
      return true
    })
  }
  return list
})

function agentRuntimeStatus(agent: AgentDefinition): 'running' | 'waiting' | 'ready' | 'disabled' {
  if (!agent.enabled) return 'disabled'
  const task = tasks.value.find((t) => t.agentDefinitionId === agent.id)
  if (!task) return 'ready'
  if (task.status === 'running') return 'running'
  if (task.status === 'waiting_approval' || task.status === 'waiting_input') return 'waiting'
  return 'ready'
}

function agentStatusLabel(agent: AgentDefinition): string {
  if (!agent.enabled) return '已停用'
  const st = agentRuntimeStatus(agent)
  if (st === 'running') return agent.dutyMode === 'duty' ? '执行中' : '运行中'
  if (st === 'waiting') return '待审批'
  return agent.dutyMode === 'duty' ? '已开启' : '就绪'
}

function lastActiveAt(agent: AgentDefinition): string {
  const t = tasks.value.find((t) => t.agentDefinitionId === agent.id)
  if (!t?.updatedAt) return ''
  try {
    const d = new Date(t.updatedAt)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${p(d.getHours())}:${p(d.getMinutes())}`
  } catch {
    return ''
  }
}

async function loadAll() {
  loading.value = true
  try {
    const [defRes, capRes, taskRes, statRes] = await Promise.all([
      AgentAdminApi.definitions().catch(() => []),
      capabilities.value.length
        ? Promise.resolve(capabilities.value)
        : AgentAdminApi.capabilities().catch(() => []),
      AgentAdminApi.tasks({ page: 1, pageSize: 20 }).catch(() => ({ items: [], total: 0 })),
      AgentAdminApi.taskStatusCounts().catch(() => ({}))
    ])
    agents.value = defRes || []
    capabilities.value = capRes || []
    tasks.value = (taskRes as any)?.items || []
    taskTotal.value = (taskRes as any)?.total || 0
    statusStats.value = statRes || {}
  } catch (e: any) {
    ElMessage.error(e?.message || '加载智能体数据失败')
  } finally {
    loading.value = false
  }
}

function openCreateAgent() {
  editingAgent.value = null
  agentDialogVisible.value = true
}

function openEditAgent(agent: AgentDefinition) {
  editingAgent.value = agent
  agentDialogVisible.value = true
}

async function toggleEnabled(agent: AgentDefinition) {
  try {
    await AgentAdminApi.updateDefinition(agent.id, { enabled: !agent.enabled })
    agent.enabled = !agent.enabled
    ElMessage.success(agent.enabled ? '已启用智能体' : '已停用智能体')
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

async function toggleWorking(agent: AgentDefinition) {
  const isCurrentlyWorking = Boolean(agent.enabled && agent.dutyMode === 'duty')
  const next = isCurrentlyWorking ? 'off' : 'duty'
  if (next === 'duty' && !agent.dutyGoal?.trim()) {
    ElMessage.warning('请先配置驻守目标，再开启')
    openEditAgent(agent)
    return
  }
  try {
    const payload: any = { dutyMode: next }
    if (next === 'duty' && !agent.enabled) payload.enabled = true
    const res: any = await AgentAdminApi.updateDefinition(agent.id, payload)
    const updated = ((res as any)?.data ?? res) as AgentDefinition
    agent.dutyMode = updated.dutyMode
    agent.enabled = updated.enabled
    agent.nextWakeAt = updated.nextWakeAt
    ElMessage.success(
      next === 'duty' ? `「${agent.name}」已开启工作` : `「${agent.name}」已关闭工作`
    )
    void loadAll()
  } catch (e: any) {
    ElMessage.error(e?.message || '切换失败')
  }
}

async function removeAgent(agent: AgentDefinition) {
  try {
    await ElMessageBox.confirm(`确定删除智能体「${agent.name}」吗？此操作不可逆。`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    await AgentAdminApi.removeDefinition(agent.id)
    agents.value = agents.value.filter((a) => a.id !== agent.id)
    ElMessage.success('智能体已删除')
  } catch {
    /* cancel */
  }
}

function openChat(agent: AgentDefinition) {
  router.push(`/ai/agent/chat/${agent.id}`)
}

onMounted(() => {
  loadAll()
})
</script>

<style scoped lang="scss">
.agent-console {
  padding: 20px 24px 36px;
  width: 100%;
  box-sizing: border-box;

  --c-bg-surface: var(--app-content-surface-color, #ffffff);
  --c-bg-page: var(--app-content-bg-color, #f8fafc);
  --c-border: var(--app-content-border-color, rgba(148, 163, 184, 0.22));
  --c-text-primary: var(--el-text-color-primary, #0f172a);
  --c-text-secondary: var(--el-text-color-secondary, #64748b);
  --c-text-placeholder: var(--el-text-color-placeholder, #94a3b8);
  --c-primary: var(--el-color-primary, #2563eb);
}

.console-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--c-border);
  margin-bottom: 14px;

  &__left {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px 10px;
  }

  &__title {
    font-size: 19px;
    font-weight: 600;
    color: var(--c-text-primary);
    margin: 0;
  }

  &__total {
    font-size: 13px;
    color: var(--c-text-secondary);
  }

  &__stats {
    font-size: 12px;
    color: var(--c-text-secondary);
    opacity: 0.85;
    padding-left: 10px;
    border-left: 1px solid var(--c-border);
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.console-search {
  position: relative;
  display: flex;
  align-items: center;
  width: 240px;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  background: var(--el-fill-color-light, rgba(0, 0, 0, 0.03));
  transition: background 0.15s ease;

  &:focus-within {
    background: var(--el-fill-color, rgba(0, 0, 0, 0.06));
  }

  &__icon {
    font-size: 14px;
    color: var(--c-text-placeholder);
    margin-right: 6px;
  }

  &__input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    color: var(--c-text-primary);

    &::placeholder {
      color: var(--c-text-placeholder);
    }
  }

  &__clear {
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 0;
    color: var(--c-text-placeholder);
    display: flex;
    align-items: center;
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;
  border: 1px solid transparent;

  &--primary {
    background: var(--c-primary);
    color: var(--el-color-white, #fff);
    &:hover {
      opacity: 0.9;
    }
  }

  &--secondary {
    background: var(--c-bg-surface);
    border-color: var(--c-border);
    color: var(--c-text-primary);
    &:hover {
      background: var(--el-fill-color);
    }
  }

  &--icon {
    width: 34px;
    padding: 0;
  }
}

.console-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    color: var(--c-text-primary);
    background: var(--el-fill-color-light);
  }

  &.is-active {
    color: var(--c-text-primary);
    background: var(--el-fill-color);
    font-weight: 600;
  }

  &__count {
    font-size: 11px;
    opacity: 0.75;
  }
}

.agent-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  column-gap: 16px;
  row-gap: 12px;
  width: 100%;
  padding: 2px 0 10px;
}

.agent-row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 10px;
  cursor: pointer;
  background: var(--el-fill-color-lighter, rgba(148, 163, 184, 0.08));
  transition: background 0.15s ease;

  &:hover {
    background: var(--el-fill-color-light, rgba(148, 163, 184, 0.14));

    .agent-row__more {
      opacity: 1;
    }
  }

  &.is-disabled {
    opacity: 0.55;
  }

  &.is-running .agent-row__byline {
    color: var(--el-color-success, #67c23a);
  }

  &.is-waiting .agent-row__byline {
    color: var(--el-color-warning, #e6a23c);
  }

  &__avatar-wrap {
    width: 56px;
    height: 56px;
    flex-shrink: 0;
    position: relative;
    border-radius: 50%;

    &.is-duty {
      &::before {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        border: 3px solid var(--el-color-danger);
        pointer-events: none;
        animation: agent-duty-heartbeat 1.4s ease-in-out infinite;
      }

      &::after {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        border: 3px solid var(--el-color-danger);
        opacity: 0;
        pointer-events: none;
        animation: agent-duty-heart-ring 1.4s ease-in-out infinite;
      }
    }
  }

  &__duty-tag {
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 9px;
    line-height: 1;
    padding: 2px 5px;
    border-radius: 6px;
    background: var(--el-color-danger);
    color: var(--el-color-white);
    white-space: nowrap;
    z-index: 1;
    pointer-events: none;
  }

  &__avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    overflow: hidden;
  }

  &__body {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__title {
    margin: 0;
    font-size: 13.5px;
    font-weight: 700;
    color: var(--c-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__more {
    border: none;
    background: transparent;
    color: var(--c-text-placeholder);
    cursor: pointer;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.15s ease;

    &:hover {
      color: var(--c-text-primary);
      background: var(--el-fill-color);
      opacity: 1;
    }
  }

  &__desc {
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    color: var(--c-text-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 34px;
  }

  &__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 2px;
    min-height: 24px;
  }

  &__byline {
    flex: 1;
    min-width: 0;
    font-size: 11px;
    color: var(--c-text-placeholder);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

@keyframes agent-duty-heartbeat {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  15% {
    transform: scale(1.12);
    opacity: 1;
  }
  30% {
    transform: scale(1);
    opacity: 0.85;
  }
  45% {
    transform: scale(1.08);
    opacity: 1;
  }
}

@keyframes agent-duty-heart-ring {
  0% {
    transform: scale(1);
    opacity: 0.55;
  }
  70%,
  100% {
    transform: scale(1.35);
    opacity: 0;
  }
}

/* 触屏与移动端优先适配 */
@media (hover: none), (max-width: 768px) {
  .agent-row__more {
    opacity: 0.85;
  }
}

@media (max-width: 768px) {
  .agent-console {
    padding: 14px 12px calc(24px + env(safe-area-inset-bottom, 0px));
  }

  .console-head {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .console-head__stats {
    width: 100%;
    padding-left: 0;
    border-left: none;
  }

  .console-head__right {
    width: 100%;
  }

  .console-search {
    flex: 1;
    width: auto;
    height: 38px;

    &__input {
      font-size: 16px;
    }
  }

  .btn {
    height: 38px;
  }

  .agent-list {
    grid-template-columns: 1fr;
  }

  .agent-row {
    grid-template-columns: 48px minmax(0, 1fr);
    gap: 12px;
    padding: 12px 14px;

    &__avatar-wrap,
    &__avatar {
      width: 48px;
      height: 48px;
    }

    &__desc {
      min-height: 0;
    }
  }
}
</style>
