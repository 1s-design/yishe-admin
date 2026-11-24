<template>
  <div class="agent-chat-page">
    <!-- ═══════════ 顶栏 ═══════════ -->
    <header class="chat-topbar">
      <div class="topbar-left">
        <a class="icon-btn" href="#/ai/agent" title="返回智能体列表" @click="backToList">
          <el-icon :size="16"><ArrowLeft /></el-icon>
        </a>

        <div class="agent-profile" v-if="agent">
          <div class="agent-avatar-wrap" :class="{ 'is-duty': isWorking }">
            <div class="agent-avatar agent-gradient" :class="resolveAgentGradient(agent)" />
          </div>
          <div class="agent-info">
            <div class="agent-name-row">
              <h2 class="agent-name">{{ agent.name }}</h2>
              <span class="status-pill" :class="`status-pill--${taskBadgeClass}`">
                <span class="status-pill__dot" />
                {{ currentTaskStatusLabel }}
              </span>
            </div>
            <div class="agent-meta">
              <span>{{ (agent.capabilities || []).length }} 项能力</span>
              <span v-if="contextCount">·</span>
              <button
                v-if="contextCount"
                class="meta-link"
                title="点击查看上下文明细"
                @click="showContextDrawer = true"
              >
                上下文 {{ contextCount }}
              </button>
              <span v-if="userMessageCount" class="hide-mobile">·</span>
              <span v-if="userMessageCount" class="hide-mobile">输入 {{ userMessageCount }}</span>
              <span v-if="agent.description" class="hide-mobile">·</span>
              <span v-if="agent.description" class="agent-meta__desc hide-mobile">
                {{ agent.description }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="topbar-right">
        <button
          v-if="agent"
          class="topbar-btn topbar-btn--work"
          :class="{ 'is-on': isWorking }"
          :title="isWorking ? '停止后不再自动开新一轮' : '开启后将持续推进驻守目标'"
          :aria-label="isWorking ? '关闭值守' : '开启值守'"
          @click="toggleWorking"
        >
          <span class="work-dot" />
          <span class="work-label">{{ isWorking ? '值守中' : '未值守' }}</span>
        </button>

        <span class="topbar-divider hide-mobile" />

        <button
          class="topbar-btn topbar-btn--icon"
          title="刷新任务状态"
          aria-label="刷新"
          @click="refreshCurrent"
        >
          <el-icon><Refresh /></el-icon>
        </button>

        <button
          v-if="agent"
          class="topbar-btn topbar-btn--icon"
          title="定时任务（含 AI 自建循环计划）"
          aria-label="定时任务"
          @click="openScheduleDialog"
        >
          <el-icon><Timer /></el-icon>
        </button>

        <button
          v-if="currentTask"
          class="topbar-btn topbar-btn--icon"
          title="清空当前对话并重置状态"
          aria-label="清空对话"
          @click="clearConversation"
        >
          <el-icon><Delete /></el-icon>
        </button>

        <button
          v-if="isBusy"
          class="topbar-btn topbar-btn--icon topbar-btn--danger"
          title="中止任务执行"
          aria-label="中止执行"
          @click="cancelCurrentTask"
        >
          <el-icon><CircleClose /></el-icon>
        </button>

        <button
          v-if="agent"
          class="topbar-btn topbar-btn--icon"
          title="配置智能体设定与工具"
          aria-label="配置"
          @click="dialogVisible = true"
        >
          <el-icon><Setting /></el-icon>
        </button>
      </div>
    </header>

    <!-- ═══════════ 对话消息流主体 ═══════════ -->
    <main class="chat-scroll" ref="chatScrollRef">
      <div class="chat-container">
        <div v-if="!pageReady" class="chat-boot">
          <div class="boot-skeleton">
            <div class="boot-skeleton__line boot-skeleton__line--user" />
            <div class="boot-skeleton__line" />
            <div class="boot-skeleton__line boot-skeleton__line--short" />
            <div class="boot-skeleton__line" />
          </div>
        </div>

        <div v-else-if="!chatItems.length && !isBusy" class="chat-welcome">
          <div class="welcome-avatar agent-gradient" :class="resolveAgentGradient(agent)" />
          <h1 class="welcome-title">{{ agent ? `${agent.name} 已就绪` : '智能体已就绪' }}</h1>
          <p class="welcome-subtitle">
            {{ agent?.description || '具备自主决策、系统工具调度与连续推进能力。' }}
          </p>
          <p v-if="isWorking" class="welcome-duty-hint">
            已开启持续执行，系统将在数秒内自动开工…
          </p>

          <div v-if="starterPrompts.length" class="welcome-prompts">
            <button
              v-for="p in starterPrompts"
              :key="p.text"
              class="prompt-chip"
              @click="useStarterPrompt(p.text)"
            >
              <span class="prompt-chip__text">{{ p.text }}</span>
            </button>
          </div>
        </div>

        <div v-else class="chat-stream">
          <template v-for="(item, idx) in chatItems" :key="idx">
            <div v-if="item.kind === 'user'" class="msg-row msg-row--user">
              <div class="msg-bubble msg-bubble--user">
                <div class="msg-time" :data-at="item.at">
                  {{ formatLogTime(item.at) || (item.at ? String(item.at).slice(11, 19) : '') }}
                </div>
                <div class="msg-text">{{ item.content }}</div>
                <div class="msg-actions">
                  <button class="msg-copy-btn" title="复制内容" @click="copyText(item.content)">
                    <el-icon :size="13"><CopyDocument /></el-icon>
                  </button>
                  <button
                    class="msg-copy-btn"
                    title="存为长期微调笔记（后续值守遵守）"
                    @click="saveAsWorkNote(item.content)"
                  >
                    <el-icon :size="13"><Check /></el-icon>
                  </button>
                </div>
              </div>
            </div>

            <div v-else-if="item.kind === 'assistant-group'" class="msg-row msg-row--assistant">
              <div class="assistant-content-wrap">
                <div class="msg-time msg-time--assistant" :data-at="item.at">
                  {{ formatLogTime(item.at) || (item.at ? String(item.at).slice(11, 19) : '') }}
                </div>

                <!-- 工具调度单行折叠胶囊（默认收起，执行中自动展开） -->
                <div v-if="item.tools && item.tools.length" class="thought-accordion">
                  <button class="thought-toggle" @click="toggleToolsExpand(idx, item)">
                    <div class="thought-toggle__left">
                      <span class="thought-label">
                        已调度 {{ item.tools.length }} 个执行动作
                        <template v-if="item.tools.some((t: any) => t.status === 'running')">
                          · 正在执行中
                        </template>
                      </span>
                    </div>
                    <span class="thought-chevron" :class="{ 'is-open': isToolsExpanded(idx, item) }">
                      ▾
                    </span>
                  </button>

                  <div v-show="isToolsExpanded(idx, item)" class="thought-body">
                    <div
                      v-for="(tool, tIdx) in item.tools"
                      :key="tIdx"
                      class="tool-step"
                      :class="{
                        'tool-step--error': tool.status === 'error',
                        'tool-step--running': tool.status === 'running'
                      }"
                    >
                      <div class="tool-step__header">
                        <span class="tool-step__status-dot" />
                        <span class="tool-step__seq">#{{ tIdx + 1 }}</span>
                        <span class="tool-step__name">{{ tool.label || tool.tool }}</span>
                        <span class="tool-step__badge">{{ tool.tool }}</span>
                        <span v-if="tool.status === 'running'" class="tool-step__running-tag">
                          执行中...
                        </span>
                        <span v-else-if="tool.durationMs != null" class="tool-step__dur">
                          {{ formatDuration(tool.durationMs) }}
                        </span>
                      </div>
                      <div v-if="tool.summary" class="tool-step__summary">{{ tool.summary }}</div>
                      <div v-if="tool.error" class="tool-step__error">{{ tool.error }}</div>
                      <div v-if="tool.inputText" class="tool-step__input">
                        <div class="tool-step__input-label">入参</div>
                        <pre class="tool-step__pre">{{ tool.inputText }}</pre>
                      </div>
                      <div v-if="tool.assets && tool.assets.length" class="tool-assets">
                        <div class="tool-assets__label">命中素材 {{ tool.assets.length }}</div>
                        <div class="tool-assets__grid">
                          <div
                            v-for="(a, aIdx) in tool.assets"
                            :key="aIdx"
                            class="tool-assets__card"
                            :title="a.name || a.id || ''"
                          >
                            <img
                              v-if="a.url"
                              class="tool-assets__img"
                              :src="a.url"
                              :alt="a.name || a.id || '素材'"
                              loading="lazy"
                            />
                            <div v-else class="tool-assets__img tool-assets__img--ph">
                              {{ (a.name || a.id || '?')[0] }}
                            </div>
                            <div class="tool-assets__name">{{ a.name || a.id || '未命名素材' }}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 执行中状态胶囊 -->
                <div
                  v-if="
                    isBusy &&
                    (!item.content || item.tools?.some((t: any) => t.status === 'running'))
                  "
                  class="agent-thinking-pill"
                >
                  <span class="thinking-spinner" />
                  <span class="agent-thinking-pill__text">
                    {{ thinkingLabel }}<template v-if="thinkingElapsed"> · {{ thinkingElapsed }}</template>
                  </span>
                </div>

                <!-- Markdown 正文（流式期间启用 60ms 节流渲染） -->
                <div v-if="item.content" class="agent-markdown-body">
                  <MarkdownView :content="item.content" :streaming="isBusy" />
                  <button
                    class="msg-copy-btn agent-copy"
                    title="复制回答"
                    @click="copyText(item.content)"
                  >
                    <el-icon :size="13"><CopyDocument /></el-icon>
                  </button>
                </div>

                <!-- 人机协作确认卡 -->
                <div v-if="item.interact && isWaiting" class="interaction-card-wrap">
                  <InteractionRenderer
                    :payload="item.interact"
                    :loading="opLoading"
                    @submit="onInteractSubmit"
                    @reject="onInteractReject"
                  />
                </div>
              </div>
            </div>

            <div v-else-if="item.kind === 'system'" class="msg-row msg-row--system">
              <div class="system-line" :class="`system-line--${item.level || 'info'}`">
                <span class="system-line__time">{{ formatLogTime(item.at) }}</span>
                <span class="system-line__text">{{ item.content }}</span>
              </div>
            </div>

            <div v-else-if="item.kind === 'error'" class="msg-row msg-row--error">
              <div class="error-banner">
                <span>{{ item.event?.message || '任务执行遇到异常' }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </main>

    <!-- ═══════════ 底部输入栏 ═══════════ -->
    <footer class="chat-composer">
      <div class="composer-container">
        <div class="composer-box" :class="{ 'is-focused': isInputFocused }">
          <textarea
            ref="composerTextareaRef"
            v-model="draftPrompt"
            class="composer-textarea"
            :placeholder="composerPlaceholder"
            rows="1"
            @focus="isInputFocused = true"
            @blur="isInputFocused = false"
            @keydown="handleComposerKeyDown"
            @input="autoResizeComposer"
          />

          <div class="composer-toolbar">
            <div class="composer-toolbar__left">
              <el-popover
                placement="top-start"
                :width="280"
                trigger="click"
                popper-class="flat-popover"
              >
                <template #reference>
                  <button class="composer-chip">
                    <span>{{ (agent?.capabilities || []).length }} 项已绑定能力</span>
                  </button>
                </template>
                <div class="popover-cap-list">
                  <div class="popover-title">当前智能体绑定的能力：</div>
                  <div v-if="!(agent?.capabilities || []).length" class="popover-empty">
                    默认支持基础系统查询与通用规划
                  </div>
                  <div v-else class="popover-tags">
                    <span v-for="capId in agent?.capabilities || []" :key="capId" class="p-tag">
                      {{ capId }}
                    </span>
                  </div>
                </div>
              </el-popover>

              <span class="composer-chip composer-chip--neutral hide-mobile">
                <span>自主连续推进</span>
              </span>
            </div>

            <div class="composer-toolbar__right">
              <button
                v-if="isBusy"
                class="composer-action-btn composer-action-btn--stop"
                title="中止执行"
                @click="cancelCurrentTask"
              >
                <span class="stop-square" />
              </button>

              <button
                v-else
                class="composer-action-btn composer-action-btn--send"
                :class="{ 'is-active': !!draftPrompt.trim() }"
                :disabled="!draftPrompt.trim() || !agent"
                title="发送指令 (Enter)"
                @click="sendPrompt"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="composer-foot-hint">
          <span>Enter 发送 · Shift+Enter 换行 · 智能体具备自主规划、工具调度与审批确认能力</span>
        </div>
      </div>
    </footer>

    <!-- ═══════════ 上下文明细抽屉 ═══════════ -->
    <el-drawer
      v-model="showContextDrawer"
      title="上下文明细"
      size="min(420px, 92vw)"
      direction="rtl"
    >
      <div class="ctx-list">
        <div v-for="(ev, i) in contextEvents" :key="i" class="ctx-item">
          <div class="ctx-item__head">
            <span class="ctx-item__type" :class="`ctx-item__type--${ev.type}`">
              {{ ctxTypeLabel(ev.type) }}
            </span>
            <span class="ctx-item__time">{{ formatLogTime(ev.at) }}</span>
          </div>
          <div v-if="ev.content" class="ctx-item__content">{{ ctxPreview(ev.content) }}</div>
          <div v-else-if="ev.tool" class="ctx-item__content ctx-item__content--tool">
            {{ ev.tool }}{{ ev.summary ? ' → ' + ctxPreview(ev.summary) : '' }}
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- ═══════════ 公共配置智能体全屏弹窗 ═══════════ -->
    <AgentConfigDialog
      v-model="dialogVisible"
      :agent="agent"
      :capabilities="capabilities"
      @saved="onAgentSaved"
    />

    <!-- ═══════════ 定时任务弹窗 ═══════════ -->
    <el-dialog
      v-model="scheduleDialogVisible"
      title="定时任务"
      width="min(720px, 94vw)"
      class="sched-dialog"
    >
      <div class="sched-list">
        <div v-if="scheduleLoading" class="sched-empty">加载中…</div>
        <div v-else-if="!schedules.length" class="sched-empty">该智能体暂无定时任务</div>
        <div v-for="s in schedules" :key="s.id" class="sched-item">
          <div class="sched-main">
            <div class="sched-title">
              <el-tag v-if="isAiSched(s)" type="warning" size="small" effect="plain">AI 自建</el-tag>
              <span>{{ s.title }}</span>
            </div>
            <div class="sched-meta">
              {{ s.scheduleText || s.triggerType }} · 下次 {{ formatSchedTime(s.nextRunAt) }}
            </div>
            <div class="sched-instructions">{{ s.instructions }}</div>
          </div>
          <div class="sched-ops">
            <el-switch
              :model-value="s.isEnabled"
              inline-prompt
              active-text="启"
              inactive-text="停"
              @change="(v: boolean) => toggleSched(s, v)"
            />
            <el-button size="small" type="danger" text @click="removeSched(s)">删除</el-button>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Check,
  CircleClose,
  CopyDocument,
  Delete,
  Refresh,
  Setting,
  Timer
} from '@element-plus/icons-vue'
import MarkdownView from '@/components/MarkdownView/index.vue'
import InteractionRenderer from '@/components/AiAssistant/interactions/InteractionRenderer.vue'
import {
  AgentAdminApi,
  type AgentDefinition,
  type AgentTask,
  type CapabilityItem
} from '@/api/agent'
import {
  getAiScheduledTaskList,
  enableAiScheduledTask,
  disableAiScheduledTask,
  deleteAiScheduledTask
} from '@/api/aiScheduledTask'
import AgentConfigDialog from './components/AgentConfigDialog.vue'
import { resolveAgentGradient } from './gradients'
import './agent-gradients.css'

defineOptions({ name: 'AiAgentChat' })

const route = useRoute()
const router = useRouter()
const reloadAppView = inject<() => void>('reload')

const agent = ref<AgentDefinition | null>(null)
const currentTask = ref<AgentTask | null>(null)
const capabilities = ref<CapabilityItem[]>([])
const dialogVisible = ref(false)

const scheduleDialogVisible = ref(false)
const scheduleLoading = ref(false)
const schedules = ref<any[]>([])

function isAiSched(s: any) {
  return ((s?.tags || []) as string[]).includes('self-wake') || s?.source === 'ai'
}
function formatSchedTime(v?: string | null) {
  if (!v) return '—'
  try {
    return new Date(v).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return '—'
  }
}
async function openScheduleDialog() {
  scheduleDialogVisible.value = true
  await loadSchedules()
}
async function loadSchedules() {
  if (!agent.value?.id) return
  scheduleLoading.value = true
  try {
    const data: any = await getAiScheduledTaskList({
      agentDefinitionId: String(agent.value.id),
      pageSize: 50
    })
    schedules.value = data?.items || data?.list || []
  } catch (e: any) {
    ElMessage.error(e?.message || '加载定时任务失败')
  } finally {
    scheduleLoading.value = false
  }
}
async function toggleSched(s: any, v: boolean) {
  try {
    if (v) await enableAiScheduledTask(s.id)
    else await disableAiScheduledTask(s.id)
    s.isEnabled = v
    ElMessage.success(v ? '已启用' : '已暂停')
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}
async function removeSched(s: any) {
  try {
    await ElMessageBox.confirm('确认删除该定时任务？删除后不再按计划执行。', '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    await deleteAiScheduledTask(s.id)
    await loadSchedules()
    ElMessage.success('已删除')
  } catch {
    /* cancel */
  }
}

const draftPrompt = ref('')
const pageReady = ref(false)
const cancelling = ref(false)
const isInputFocused = ref(false)
const opLoading = ref(false)
const composerTextareaRef = ref<HTMLTextAreaElement | null>(null)
const chatScrollRef = ref<HTMLElement | null>(null)
const expandedToolGroups = ref(new Set<number>())
const userFoldedToolGroups = ref(new Set<number>())
/** 工具明细默认收起，执行中自动展开，避免长日志刷屏手机端 */
const toolAutoOpen = ref(false)

let pollTimer: ReturnType<typeof setInterval> | null = null
let idleWatchTimer: ReturnType<typeof setInterval> | null = null

const starterPrompts = computed(() => {
  if (!agent.value) return []
  const name = (agent.value.name || '').toLowerCase()
  if (name.includes('自动') || name.includes('流程')) {
    return [
      { text: '检查当前客户端与浏览器连接状态，报告运行环境概览' },
      { text: '打开常用设计工具后台并保持页面聚焦' },
      { text: '执行最近一项未完成的自动化排队任务' }
    ]
  }
  if (name.includes('视频') || name.includes('创意')) {
    return [
      { text: '检索高频推荐的 Remotion 视频模板并列出主要属性' },
      { text: '使用 AI 语音合成生成一段 15 秒旁白音频初稿' },
      { text: '生成一组设计风格概念图并追踪产物生成进度' }
    ]
  }
  if (name.includes('电商') || name.includes('商品')) {
    return [
      { text: '搜索近 7 天新增商品并分析类目与库存分布' },
      { text: '为最新设计款式生成多语言电商营销标题与卖点' },
      { text: '查询各店铺商品发布任务的最新执行状态' }
    ]
  }
  return [
    { text: '梳理并报告当前可用的业务工具与能力目录' },
    { text: '查询系统当前进行中的业务任务与健康度概览' },
    { text: '根据业务职责，列出建议优先推进的执行计划' }
  ]
})

const isWorking = computed(() => Boolean(agent.value?.enabled && agent.value?.dutyMode === 'duty'))
const contextCount = computed(() =>
  Array.isArray(currentTask.value?.worklog) ? currentTask.value!.worklog!.length : 0
)
const userMessageCount = computed(() => {
  const wl = currentTask.value?.worklog
  return Array.isArray(wl) ? wl.filter((e: any) => e?.type === 'user').length : 0
})
const showContextDrawer = ref(false)
const contextEvents = computed(() =>
  Array.isArray(currentTask.value?.worklog) ? currentTask.value!.worklog! : []
)

function ctxTypeLabel(type?: string) {
  const map: Record<string, string> = {
    user: '用户',
    text: 'AI',
    tool: '工具',
    tool_pending: '工具',
    thinking: '思考',
    system: '系统',
    error: '错误',
    completed: '完成'
  }
  return map[type || ''] || type || '?'
}

function ctxPreview(content?: string) {
  const s = String(content || '')
  return s.length > 120 ? s.slice(0, 120) + '…' : s
}

function onAgentSaved(saved: AgentDefinition) {
  agent.value = saved
  if (isWorking.value) startIdleWatch()
  else stopIdleWatch()
}

async function toggleWorking() {
  if (!agent.value) return
  const next = isWorking.value ? 'off' : 'duty'
  if (next === 'duty' && !agent.value.dutyGoal?.trim()) {
    ElMessage.warning('请先在「配置」里填写驻守目标，再开启')
    dialogVisible.value = true
    return
  }
  try {
    const payload: any = { dutyMode: next }
    if (next === 'duty' && !agent.value.enabled) payload.enabled = true
    const res: any = await AgentAdminApi.updateDefinition(agent.value.id, payload)
    agent.value = ((res as any)?.data ?? res) as AgentDefinition
    ElMessage.success(next === 'duty' ? '已开启，开始持续执行' : '已关闭，停止自动执行')
    if (next === 'duty') {
      void refreshCurrent()
      startIdleWatch()
    } else {
      stopIdleWatch()
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '切换工作状态失败')
  }
}

const isBusy = computed(() => {
  const st = currentTask.value?.status
  return st === 'pending' || st === 'running'
})

const isWaiting = computed(() => {
  const st = currentTask.value?.status
  return st === 'waiting_approval' || st === 'waiting_input'
})

const thinkingTick = ref(0)
let thinkingTimer: ReturnType<typeof setInterval> | null = null

watch(
  isBusy,
  (busy) => {
    if (busy && !thinkingTimer) {
      thinkingTick.value = 0
      thinkingTimer = setInterval(() => {
        thinkingTick.value++
      }, 1000)
    } else if (!busy && thinkingTimer) {
      clearInterval(thinkingTimer)
      thinkingTimer = null
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (thinkingTimer) {
    clearInterval(thinkingTimer)
    thinkingTimer = null
  }
})

const thinkingElapsed = computed(() => {
  void thinkingTick.value
  const events = (currentTask.value?.worklog || []) as any[]
  let roundStartTime: number | null = null
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]
    if (
      ev?.type === 'user' ||
      (ev?.type === 'system' && /唤醒|发起|开始/i.test(ev?.content || ''))
    ) {
      if (ev.at) {
        roundStartTime = new Date(ev.at).getTime()
        break
      }
    }
  }
  const baseTime = roundStartTime || currentTask.value?.startedAt
  if (!baseTime) return ''
  const sec = Math.max(0, Math.floor((Date.now() - new Date(baseTime).getTime()) / 1000))
  return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m${sec % 60}s`
})

const thinkingLabel = computed(() => {
  void thinkingTick.value
  const events = (currentTask.value?.worklog || []) as any[]
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]
    if (ev?.type === 'tool_pending') {
      const q = ev.input?.query || ev.input?.keyword || ev.input?.searchText || ''
      const s = ev.input?.sourceId || ev.input?.source || ''
      const detail = q && s ? ` · [${s}]「${q}」` : q ? ` ·「${q}」` : ''
      return `正在执行：${ev.label || ev.tool}${detail}`
    }
    if (ev?.type === 'thinking' && ev.content) return ev.content
    if (ev?.type === 'tool') return `已完成【${ev.label || ev.tool}】`
    if (ev?.type === 'text') return '正在生成回复...'
    if (ev?.type === 'user') return '正在分析指令与意图...'
  }
  return '正在自主思考与规划工具调用...'
})

const taskBadgeClass = computed(() => {
  const st = currentTask.value?.status
  if (st === 'running') return 'running'
  if (st === 'waiting_approval' || st === 'waiting_input') return 'waiting'
  if (st === 'completed') return 'completed'
  if (st === 'failed') return 'failed'
  return 'idle'
})

const currentTaskStatusLabel = computed(() => {
  const map: Record<string, string> = {
    pending: '排队中',
    running: '正在执行',
    waiting_approval: '等待审批',
    waiting_input: '等待输入',
    completed: '执行完成',
    failed: '执行异常',
    cancelled: '已中止'
  }
  const st = currentTask.value?.status
  return st ? map[st] || st : '就绪'
})

const chatItems = computed(() => {
  const events = (currentTask.value?.worklog || []) as any[]
  const items: any[] = []
  let textBuf = ''
  let toolBuf: any[] = []
  let interact: any = null
  let groupAt = ''

  const flush = (at?: string) => {
    if (toolBuf.length || textBuf || interact) {
      items.push({
        kind: 'assistant-group',
        tools: toolBuf,
        content: textBuf || '',
        thinking: false,
        interact,
        at: groupAt || at || toolBuf[0]?.at || ''
      })
    }
    textBuf = ''
    toolBuf = []
    interact = null
    groupAt = ''
  }

  for (const ev of events) {
    if (ev?.type === 'text') {
      if (!groupAt && ev.at) groupAt = ev.at
      textBuf += ev.content || ''
      continue
    }
    if (ev?.type === 'thinking') continue
    if (ev?.type === 'user') {
      flush(ev.at)
      items.push({ kind: 'user', content: ev.content, at: ev.at })
    } else if (ev?.type === 'system') {
      flush(ev.at)
      items.push({
        kind: 'system',
        content: ev.content || '',
        level: ev.level || 'info',
        at: ev.at
      })
    } else if (ev?.type === 'tool_pending') {
      let inputText = ''
      try {
        inputText = JSON.stringify(ev.input ?? {}, null, 2)
        if (inputText.length > 800) inputText = inputText.slice(0, 800) + '…'
      } catch {
        inputText = String(ev.input || '')
      }
      const existing = toolBuf.find((t) => t.tool === ev.tool && t.status === 'running')
      if (!existing) {
        toolBuf.push({
          id: `pending-${ev.tool}-${ev.at}`,
          tool: ev.tool,
          label: ev.label,
          input: ev.input,
          inputText,
          summary: '正在执行中...',
          durationMs: null,
          at: ev.at,
          assets: [],
          status: 'running'
        })
      }
    } else if (ev?.type === 'tool') {
      let inputText = ''
      try {
        inputText = JSON.stringify(ev.input ?? {}, null, 2)
        if (inputText.length > 800) inputText = inputText.slice(0, 800) + '…'
      } catch {
        inputText = String(ev.input || '')
      }
      const pendingIdx = toolBuf.findLastIndex((t) => t.tool === ev.tool && t.status === 'running')
      const toolItem = {
        id: `${ev.tool}-${ev.at}`,
        tool: ev.tool,
        label: ev.label,
        input: ev.input,
        inputText,
        summary: ev.summary,
        error: ev.error,
        durationMs: ev.durationMs,
        assets: ev.assets || [],
        status: ev.success ? 'done' : 'error',
        at: ev.at
      }
      if (pendingIdx !== -1) toolBuf[pendingIdx] = toolItem
      else toolBuf.push(toolItem)
    } else if (ev?.type === 'interrupt') {
      interact = toInteractionPayload(ev.payload || {})
    } else if (ev?.type === 'error') {
      flush(ev.at)
      items.push({ kind: 'error', event: ev, at: ev.at })
    }
  }

  if (isBusy.value) {
    items.push({
      kind: 'assistant-group',
      tools: toolBuf,
      content: textBuf || '',
      thinking: true,
      interact,
      at: groupAt || toolBuf[0]?.at || ''
    })
  } else {
    flush(groupAt || (events[events.length - 1] as any)?.at)
  }

  return items
})

const composerPlaceholder = computed(() => {
  if (isWaiting.value) return '当前任务等待确认，请输入您的反馈意见...'
  if (isBusy.value) return '智能体执行中，可继续输入指令（本轮完成后自动执行）...'
  return '输入业务指令或目标，智能体将自主规划推进...'
})

function formatDuration(ms?: number) {
  if (ms == null) return ''
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`
}

function formatLogTime(at?: string) {
  if (!at) return ''
  try {
    const d = new Date(at)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  } catch {
    return ''
  }
}

async function saveAsWorkNote(text: string) {
  if (!agent.value || !text.trim()) return
  try {
    await AgentAdminApi.appendWorkNote(agent.value.id, text.trim())
    ElMessage.success('已保存为长期微调笔记，后续值守将遵守')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存微调笔记失败')
  }
}

function toInteractionPayload(payload: any) {
  if (!payload) return null
  const question = String(payload?.question || payload?.title || '需要确认')
  return {
    type: payload?.type || 'confirm',
    runId: payload?.runId || currentTask.value?.runId || currentTask.value?.id || '',
    question,
    title: question,
    message: payload?.message || payload?.contextSummary || '',
    tool: payload?.toolName || payload?.tool,
    toolName: payload?.toolName || payload?.tool,
    options: payload?.options,
    confirmText: payload?.confirmText || '批准执行',
    cancelText: payload?.cancelText || '驳回',
    fields: payload?.fields,
    defaultValue: payload?.defaultValue,
    riskLevel: payload?.riskLevel,
    preview: payload?.preview,
    plan: payload?.plan,
    compare: payload?.compare,
    steps: payload?.steps
  } as any
}

async function loadAgentAndLatestTask() {
  const id = String(route.params.id || '')
  if (!id) {
    router.replace('/ai/agent')
    return
  }

  try {
    // 直接查单个智能体详情，避免拉全量 definitions 列表
    const [defRes, capRes, taskRes] = await Promise.all([
      AgentAdminApi.definitionDetail(id).catch(() => null),
      capabilities.value.length
        ? Promise.resolve(capabilities.value)
        : AgentAdminApi.capabilities().catch(() => []),
      AgentAdminApi.tasks({ agentDefinitionId: id, pageSize: 1 }).catch(() => null)
    ])

    agent.value = ((defRes as any)?.data ?? defRes) as AgentDefinition | null
    capabilities.value = ((capRes as any)?.data ?? capRes) as CapabilityItem[] || []

    if (!agent.value) {
      ElMessage.warning('智能体不存在或已被移除')
      router.replace('/ai/agent')
      return
    }

    const items = (taskRes as any)?.data?.items ?? (taskRes as any)?.items ?? []
    if (items.length) await openTask(items[0].id)
  } catch (e: any) {
    ElMessage.error(e?.message || '加载智能体信息失败')
  } finally {
    pageReady.value = true
    await nextTick()
    scrollToBottom({ instant: true, retries: 3 })
  }
}

async function openTask(taskId: string) {
  try {
    const res: any = await AgentAdminApi.taskDetail(taskId)
    currentTask.value = (res?.data ?? res) as AgentTask
    await nextTick()
    scrollToBottom({ instant: true, retries: 2 })
    if (isBusy.value) startPolling()
    else stopPolling()
  } catch {
    /* ignore */
  }
}

async function refreshCurrent() {
  if (currentTask.value?.id) await openTask(currentTask.value.id)
  else if (agent.value) await loadAgentAndLatestTask()
}

function backToList(e?: Event) {
  e?.preventDefault()
  e?.stopPropagation()
  const go = () => reloadAppView?.()
  if (route.name === 'AiAgent') {
    go()
    return
  }
  void router
    .replace({ path: '/ai/agent' })
    .then(go)
    .catch(() => {
      window.location.hash = '#/ai/agent'
      setTimeout(go, 0)
    })
}

async function sendPrompt() {
  const text = draftPrompt.value.trim()
  if (!text || !agent.value) return

  draftPrompt.value = ''
  nextTick(autoResizeComposer)

  if (currentTask.value && isWaiting.value) {
    try {
      const res: any = await AgentAdminApi.replyTask(currentTask.value.id, text)
      currentTask.value = (res?.data ?? res) as AgentTask
      scrollToBottom()
      startPolling()
      ElMessage.success('已补充输入并继续执行')
    } catch (e: any) {
      ElMessage.error(e?.message || '补充输入失败')
    }
    return
  }

  if (currentTask.value) {
    try {
      const res: any = await AgentAdminApi.sendMessage(currentTask.value.id, text)
      currentTask.value = (res?.data ?? res) as AgentTask
      expandedToolGroups.value.clear()
      await nextTick()
      scrollToBottom()
      startPolling()
    } catch (e: any) {
      if (isBusy.value) {
        ElMessage.info('消息已入队，将在当前轮完成后自动执行')
      } else {
        ElMessage.error(e?.message || '发送消息失败')
      }
    }
    return
  }

  try {
    const res: any = await AgentAdminApi.dispatchTask({
      agentDefinitionId: agent.value.id,
      title: text.length > 20 ? text.slice(0, 20) + '...' : text,
      prompt: text
    })
    currentTask.value = (res?.data ?? res) as AgentTask
    expandedToolGroups.value.clear()
    await nextTick()
    scrollToBottom()
    startPolling()
  } catch (e: any) {
    ElMessage.error(e?.message || '下发任务失败')
  }
}

function useStarterPrompt(text: string) {
  draftPrompt.value = text
  sendPrompt()
}

let pollSignature = ''

function detailSignatureOf(task: any) {
  const worklogCount = Array.isArray(task?.worklog) ? task.worklog.length : 0
  return `${task?.status ?? ''}:${worklogCount}:${task?.updatedAt ?? ''}`
}

function startPolling() {
  stopPolling()
  pollSignature = detailSignatureOf(currentTask.value)
  pollTimer = setInterval(async () => {
    if (typeof document !== 'undefined' && document.hidden) return
    if (!currentTask.value?.id) return stopPolling()
    try {
      const summary: any = await AgentAdminApi.taskDetailSummary(currentTask.value.id)
      const s = (summary?.data ?? summary) as {
        status: string
        updatedAt?: string
        worklogCount: number
      }
      const sig = `${s.status}:${s.worklogCount}:${s.updatedAt ?? ''}`
      if (sig === pollSignature && ['pending', 'running'].includes(s.status)) return

      const currentLog = Array.isArray(currentTask.value?.worklog) ? currentTask.value.worklog : []
      const afterIndex =
        currentLog.length > 0 && s.worklogCount >= currentLog.length
          ? Math.max(0, currentLog.length - 1)
          : undefined
      const res: any = await AgentAdminApi.taskDetail(currentTask.value.id, afterIndex)
      const fresh = (res?.data ?? res) as AgentTask & {
        worklogStartIndex?: number
        worklogTotal?: number
      }
      if (
        afterIndex !== undefined &&
        fresh.worklogStartIndex === afterIndex &&
        Array.isArray(fresh.worklog)
      ) {
        currentTask.value = {
          ...fresh,
          worklog: [...currentLog.slice(0, afterIndex), ...fresh.worklog]
        }
      } else {
        currentTask.value = fresh
      }
      pollSignature = detailSignatureOf(currentTask.value)
      if (!['pending', 'running'].includes(currentTask.value.status)) stopPolling()
      await nextTick()
      scrollToBottom({ instant: false, retries: 1 })
    } catch {
      stopPolling()
    }
  }, 2200)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function startIdleWatch() {
  stopIdleWatch()
  idleWatchTimer = setInterval(async () => {
    if (typeof document !== 'undefined' && document.hidden) return
    if (!agent.value || !isWorking.value || isBusy.value) return
    try {
      const id = String(route.params.id || '')
      if (!id) return
      const taskRes: any = await AgentAdminApi.tasks({ agentDefinitionId: id, pageSize: 1 })
      const items = taskRes?.data?.items ?? taskRes?.items ?? []
      const latest = items[0]
      if (latest && (!currentTask.value || currentTask.value.id !== latest.id)) {
        await openTask(latest.id)
      }
    } catch {
      /* ignore */
    }
  }, 3000)
}

function stopIdleWatch() {
  if (idleWatchTimer) {
    clearInterval(idleWatchTimer)
    idleWatchTimer = null
  }
}

async function onInteractSubmit(payload: any) {
  if (!currentTask.value) return
  opLoading.value = true
  try {
    if (!isWaiting.value) {
      const text =
        String(payload?.input?.value ?? payload?.input?.answer ?? payload?.reason ?? '').trim() ||
        JSON.stringify(payload?.input || {})
      const res: any = await AgentAdminApi.sendMessage(currentTask.value.id, text)
      currentTask.value = (res?.data ?? res) as AgentTask
      startPolling()
      return
    }
    const res: any = payload?.confirmed
      ? await AgentAdminApi.approveTask(currentTask.value.id)
      : await AgentAdminApi.replyTask(currentTask.value.id, JSON.stringify(payload?.input || {}))
    currentTask.value = (res?.data ?? res) as AgentTask
    startPolling()
  } catch (e: any) {
    ElMessage.error(e?.message || '确认提交失败')
  } finally {
    opLoading.value = false
  }
}

async function onInteractReject() {
  if (!currentTask.value || !isWaiting.value) return
  opLoading.value = true
  try {
    const res: any = await AgentAdminApi.declineTask(currentTask.value.id)
    currentTask.value = (res?.data ?? res) as AgentTask
    startPolling()
  } catch (e: any) {
    ElMessage.error(e?.message || '驳回操作失败')
  } finally {
    opLoading.value = false
  }
}

async function cancelCurrentTask() {
  if (!currentTask.value || cancelling.value) return
  try {
    await ElMessageBox.confirm('确定中止当前智能体的执行过程吗？', '提示', {
      type: 'warning',
      confirmButtonText: '确定中止',
      cancelButtonText: '取消'
    })
    cancelling.value = true
    const id = currentTask.value.id
    stopPolling()
    currentTask.value = {
      ...currentTask.value,
      status: 'cancelled',
      finishedAt: new Date().toISOString()
    } as AgentTask
    ElMessage.info('任务已中止')
    AgentAdminApi.cancelTask(id)
      .then((res: any) => {
        const fresh = (res?.data ?? res) as AgentTask
        if (currentTask.value?.id === id && fresh) currentTask.value = fresh
      })
      .catch((e: any) => {
        ElMessage.error(e?.message || '中止落库失败')
      })
      .finally(() => {
        cancelling.value = false
      })
  } catch {
    cancelling.value = false
  }
}

async function clearConversation() {
  const id = currentTask.value?.id
  if (!id) return
  try {
    await ElMessageBox.confirm(
      '将清空当前全部对话记录并重置会话状态，此操作不可恢复。确定继续吗？',
      '清空对话',
      {
        type: 'warning',
        confirmButtonText: '清空并重置',
        cancelButtonText: '取消'
      }
    )
    await AgentAdminApi.clearTask(id)
    stopPolling()
    currentTask.value = null
    expandedToolGroups.value.clear()
    draftPrompt.value = ''
    pageReady.value = true
    ElMessage.success('对话已清空，可开始新会话')
    nextTick(() => composerTextareaRef.value?.focus())
  } catch {
    /* cancel */
  }
}

function handleComposerKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendPrompt()
  }
}

function autoResizeComposer() {
  const el = composerTextareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 180)}px`
}

function scrollToBottom(options: { instant?: boolean; retries?: number } = {}) {
  const { instant = false, retries = 2 } = options
  nextTick(() => {
    const el = chatScrollRef.value
    if (!el) return
    const doScroll = () => {
      if (!el) return
      el.scrollTop = el.scrollHeight
      el.scrollTo({ top: el.scrollHeight, behavior: instant ? 'auto' : 'smooth' })
    }
    doScroll()
    if (retries > 0) {
      setTimeout(doScroll, 80)
      setTimeout(doScroll, 220)
      if (retries > 2) setTimeout(doScroll, 500)
    }
  })
}

watch(
  () => chatItems.value.length,
  (newLen, oldLen) => {
    if (pageReady.value && newLen > (oldLen || 0)) {
      scrollToBottom({ instant: false, retries: 1 })
    }
  }
)

function isToolsExpanded(idx: number, item?: any) {
  if (userFoldedToolGroups.value.has(idx)) return false
  if (expandedToolGroups.value.has(idx)) return true
  if (toolAutoOpen.value) return true
  if (item?.tools?.some((t: any) => t.status === 'running')) return true
  return false
}

function toggleToolsExpand(idx: number, item?: any) {
  if (isToolsExpanded(idx, item)) {
    userFoldedToolGroups.value.add(idx)
    expandedToolGroups.value.delete(idx)
  } else {
    userFoldedToolGroups.value.delete(idx)
    expandedToolGroups.value.add(idx)
  }
  nextTick(() => scrollToBottom({ instant: false, retries: 1 }))
}

async function copyText(str: string) {
  try {
    await navigator.clipboard.writeText(str)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.info('复制失败，请手动选择复制')
  }
}

onMounted(() => {
  void loadAgentAndLatestTask().then(() => {
    if (isWorking.value) startIdleWatch()
  })
})

watch(
  () => route.params.id,
  (id, prev) => {
    if (!id || id === prev) return
    pageReady.value = false
    currentTask.value = null
    stopPolling()
    void loadAgentAndLatestTask()
  }
)

onBeforeUnmount(() => {
  stopPolling()
  stopIdleWatch()
})
</script>

<style scoped lang="scss">
.agent-chat-page {
  --chat-page-height: calc(100vh - var(--top-tool-height) - var(--tags-view-height));
  --chat-page-height: calc(100dvh - var(--top-tool-height) - var(--tags-view-height));

  display: flex;
  flex-direction: column;
  width: 100%;
  height: var(--chat-page-height);
  min-height: 0;
  overflow: hidden;
  background: var(--app-content-bg-color, #f8fafc);

  --c-bg-surface: var(--app-content-surface-color, #ffffff);
  --c-border: var(--app-content-border-color, rgba(148, 163, 184, 0.22));
  --c-text-primary: var(--el-text-color-primary, #0f172a);
  --c-text-secondary: var(--el-text-color-secondary, #64748b);
  --c-text-placeholder: var(--el-text-color-placeholder, #94a3b8);
  --c-primary: var(--el-color-primary);
}

.chat-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 52px;
  padding: 0 20px;
  flex-shrink: 0;
  z-index: 10;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  text-decoration: none;

  &:hover {
    background: var(--el-fill-color);
    color: var(--c-text-primary);
  }
}

.agent-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.agent-avatar-wrap {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  position: relative;
  border-radius: 50%;

  &.is-duty::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 2px solid var(--el-color-danger);
    pointer-events: none;
    animation: agent-duty-heartbeat 1.4s ease-in-out infinite;
  }
}

.agent-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
}

@keyframes agent-duty-heartbeat {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  20% {
    transform: scale(1.12);
  }
}

.agent-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.agent-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.agent-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--c-text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 10px;
  background: var(--el-fill-color);
  color: var(--c-text-secondary);
  flex-shrink: 0;

  &__dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
  }

  &--running {
    background: color-mix(in srgb, var(--el-color-success) 12%, transparent);
    color: var(--el-color-success);
  }

  &--waiting {
    background: color-mix(in srgb, var(--el-color-warning) 12%, transparent);
    color: var(--el-color-warning);
  }
}

.agent-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--c-text-placeholder);
  white-space: nowrap;
  overflow: hidden;

  &__desc {
    max-width: 260px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.topbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 9px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: var(--el-fill-color);
    color: var(--c-text-primary);
  }

  &--icon {
    width: 30px;
    padding: 0;
    justify-content: center;
    font-size: 14px;
  }

  &--danger {
    background: color-mix(in srgb, var(--el-color-danger) 12%, transparent);
    color: var(--el-color-danger);
  }

  &--work {
    .work-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--c-text-placeholder, #94a3b8);
    }

    &.is-on {
      background: color-mix(in srgb, var(--el-color-success) 12%, transparent);
      color: var(--el-color-success);

      .work-dot {
        background: var(--el-color-success);
      }
    }
  }
}

.topbar-divider {
  width: 1px;
  height: 16px;
  margin: 0 2px;
  background: var(--el-border-color-lighter);
}

.chat-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
}

.chat-container {
  width: 100%;
  margin: 0 auto;
  padding: 18px 24px 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
  box-sizing: border-box;
}

.chat-boot {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: auto 0;
  padding: 48px 0;
}

.boot-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 480px;

  &__line {
    height: 14px;
    border-radius: 7px;
    background: var(--el-fill-color, rgba(148, 163, 184, 0.12));

    &--user {
      width: 60%;
      align-self: flex-end;
    }

    &--short {
      width: 72%;
    }
  }
}

.chat-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: auto 0;
  text-align: center;
  padding: 36px 0;
}

.welcome-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  margin-bottom: 14px;
}

.welcome-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--c-text-primary);
  margin: 0 0 8px;
}

.welcome-subtitle {
  font-size: 13.5px;
  color: var(--c-text-secondary);
  max-width: 460px;
  line-height: 1.55;
  margin: 0 0 20px;
}

.welcome-duty-hint {
  font-size: 12px;
  color: var(--c-primary);
  margin: -10px 0 18px;
}

.welcome-prompts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 680px;
}

.prompt-chip {
  display: flex;
  align-items: center;
  padding: 11px 14px;
  border-radius: 8px;
  border: 1px solid var(--c-border);
  background: var(--c-bg-surface);
  color: var(--c-text-primary);
  font-size: 13px;
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: var(--c-primary);
    background: var(--el-fill-color-lighter);
  }
}

.chat-stream {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.msg-row {
  display: flex;
  width: 100%;
  content-visibility: auto;
  contain-intrinsic-size: 0 120px;

  &--user {
    justify-content: flex-end;
  }

  &--assistant {
    justify-content: flex-start;
  }

  &--system {
    justify-content: center;
  }
}

.system-line {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  max-width: 92%;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11.5px;
  line-height: 1.45;
  background: var(--el-fill-color-light, rgba(148, 163, 184, 0.1));
  color: var(--c-text-secondary);

  &__time {
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    color: var(--c-text-placeholder);
    font-size: 10.5px;
  }

  &--warn {
    background: color-mix(in srgb, var(--el-color-warning) 12%, transparent);
    color: var(--el-color-warning);
  }

  &--success {
    background: color-mix(in srgb, var(--el-color-success) 12%, transparent);
    color: var(--el-color-success);
  }
}

.msg-time {
  font-size: 11px;
  color: var(--el-text-color-secondary, #909399);
  margin-bottom: 4px;
  user-select: none;
  font-variant-numeric: tabular-nums;

  &--assistant {
    margin-bottom: 6px;
  }
}

.meta-link {
  background: none;
  border: none;
  padding: 0;
  font-size: inherit;
  color: var(--c-primary);
  cursor: pointer;
  text-decoration: underline dotted;
}

.ctx-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ctx-item {
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  font-size: 12px;

  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  &__type {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--el-fill-color);
  }

  &__time {
    font-size: 11px;
    color: var(--el-text-color-placeholder);
    margin-left: auto;
  }

  &__content {
    color: var(--el-text-color-regular);
    line-height: 1.5;
    word-break: break-word;

    &--tool {
      font-family: monospace;
      font-size: 11px;
    }
  }
}

.msg-bubble {
  position: relative;
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;

  &--user {
    background: var(--el-fill-color);
    color: var(--c-text-primary);
    border-bottom-right-radius: 4px;

    &:hover .msg-copy-btn {
      opacity: 1;
    }
  }
}

.msg-actions {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  justify-content: flex-end;
  min-height: 20px;
}

.msg-copy-btn {
  border: none;
  background: transparent;
  color: var(--c-text-placeholder);
  cursor: pointer;
  padding: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;

  &:hover {
    color: var(--c-text-primary);
  }

  &.agent-copy {
    margin-top: 6px;
    opacity: 0.65;
  }
}

.assistant-content-wrap {
  width: 100%;
  min-width: 0;
}

.thought-accordion {
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-bg-surface);
  margin-bottom: 12px;
  overflow: hidden;
}

.thought-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--c-text-secondary);
}

.thought-chevron {
  font-size: 12px;
  transition: transform 0.15s ease;

  &.is-open {
    transform: rotate(180deg);
  }
}

.thought-body {
  padding: 6px 12px 10px;
  border-top: 1px dashed var(--c-border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-step {
  font-size: 12px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--c-border);

  &:last-child {
    border-bottom: none;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--el-color-success);
  }

  &--error &__status-dot {
    background: var(--el-color-danger);
  }

  &--running &__status-dot {
    background: var(--el-color-primary);
  }

  &__seq {
    font-size: 10px;
    color: var(--c-text-placeholder);
  }

  &__name {
    font-weight: 500;
    color: var(--c-text-primary);
  }

  &__badge {
    font-size: 10.5px;
    color: var(--c-text-placeholder);
    background: var(--el-fill-color);
    padding: 1px 5px;
    border-radius: 3px;
    font-family: monospace;
  }

  &__dur,
  &__running-tag {
    margin-left: auto;
    font-size: 10px;
  }

  &__dur {
    color: var(--c-text-placeholder);
  }

  &__running-tag {
    color: var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
    padding: 1px 6px;
    border-radius: 4px;
  }

  &__summary {
    color: var(--c-text-secondary);
    margin-top: 2px;
  }

  &__error {
    margin-top: 4px;
    font-size: 11px;
    color: var(--el-color-danger);
  }

  &__input {
    margin-top: 6px;
  }

  &__input-label {
    font-size: 10px;
    color: var(--c-text-placeholder);
    margin-bottom: 2px;
  }

  &__pre {
    margin: 0;
    padding: 6px 8px;
    border-radius: 6px;
    background: var(--el-fill-color-light);
    font-size: 10.5px;
    line-height: 1.4;
    color: var(--c-text-secondary);
    overflow: auto;
    max-height: 120px;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
}

.tool-assets {
  margin-top: 8px;

  &__label {
    font-size: 10px;
    color: var(--c-text-placeholder);
    margin-bottom: 6px;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
    gap: 8px;
  }

  &__card {
    border-radius: 8px;
    overflow: hidden;
    background: var(--el-fill-color-light);
    border: 1px solid var(--c-border);
  }

  &__img {
    display: block;
    width: 100%;
    height: 70px;
    object-fit: cover;

    &--ph {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--c-text-placeholder);
    }
  }

  &__name {
    padding: 4px 6px;
    font-size: 10px;
    color: var(--c-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.agent-thinking-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  padding: 4px 0;
}

.thinking-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--el-border-color);
  border-top-color: var(--el-text-color-secondary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.agent-markdown-body {
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--c-text-primary);
}

.interaction-card-wrap {
  margin-top: 10px;
}

.error-banner {
  padding: 10px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--el-color-danger) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--el-color-danger) 25%, transparent);
  color: var(--el-color-danger);
  font-size: 13px;
}

.chat-composer {
  flex: 0 0 auto;
  position: sticky;
  bottom: 0;
  z-index: 5;
  padding: 10px 20px calc(14px + env(safe-area-inset-bottom, 0px));
  background: transparent;
}

.composer-container {
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.composer-box {
  display: flex;
  flex-direction: column;
  background: var(--el-fill-color-light, rgba(148, 163, 184, 0.1));
  border-radius: 16px;
  padding: 10px 14px 8px;
  transition: background 0.15s ease;

  &.is-focused {
    background: var(--el-fill-color, rgba(148, 163, 184, 0.16));
  }
}

.composer-textarea {
  width: 100%;
  min-height: 24px;
  max-height: 180px;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  color: var(--c-text-primary);
  padding: 2px 4px 6px;

  &::placeholder {
    color: var(--c-text-placeholder);
  }
}

.composer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.composer-toolbar__left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.composer-chip {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 8px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  font-size: 11.5px;
  cursor: pointer;

  &:hover {
    color: var(--c-text-primary);
    background: var(--el-fill-color);
  }

  &--neutral {
    cursor: default;
  }
}

.composer-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  cursor: pointer;

  &--send {
    background: var(--el-fill-color);
    color: var(--c-text-placeholder);

    &.is-active {
      background: var(--c-primary);
      color: var(--el-color-white);
    }
  }

  &--stop {
    background: var(--el-color-danger);
    color: var(--el-color-white);

    .stop-square {
      width: 10px;
      height: 10px;
      background: var(--el-color-white);
      border-radius: 2px;
    }
  }
}

.composer-foot-hint {
  text-align: center;
  font-size: 11.5px;
  color: var(--c-text-placeholder);
  margin-top: 8px;
}

/* 触屏设备常显消息操作按钮 */
@media (hover: none), (max-width: 768px) {
  .msg-copy-btn {
    opacity: 0.72;
  }
}

/* 移动端优先响应式适配 */
@media (max-width: 768px) {
  .agent-chat-page {
    --chat-page-height: calc(100vh - var(--top-tool-height));
    --chat-page-height: calc(100dvh - var(--top-tool-height));
  }

  .hide-mobile {
    display: none !important;
  }

  .chat-topbar {
    padding: 0 10px;
    height: 50px;
  }

  .topbar-left {
    gap: 6px;
  }

  .agent-avatar-wrap {
    width: 28px;
    height: 28px;
  }

  .topbar-btn {
    height: 32px;
    padding: 0 6px;

    &--icon {
      width: 30px;
    }

    &--work .work-label {
      display: none;
    }
  }

  .chat-container {
    padding: 12px 12px 10px;
  }

  .chat-composer {
    padding: 8px 10px calc(10px + env(safe-area-inset-bottom, 0px));
  }

  .composer-textarea {
    font-size: 16px;
  }

  .composer-foot-hint {
    display: none;
  }

  .msg-bubble {
    max-width: 92%;
  }
}

.sched-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 56vh;
  overflow: auto;
}

.sched-empty {
  padding: 24px 0;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.sched-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.sched-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sched-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  font-size: 13px;
}

.sched-meta,
.sched-instructions {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.sched-ops {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>
