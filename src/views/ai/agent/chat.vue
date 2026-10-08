<template>
  <div class="agent-chat-page">
    <!-- ═══════════ 顶栏：极简通透 (ChatGPT / Grok 风格) ═══════════ -->
    <header class="chat-topbar">
      <div class="topbar-left">
        <!-- 返回智能体卡片列表（原生 hash 链接，避免路由视图不切换） -->
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
              <span>{{ (agent.capabilities || []).length }} 项通用能力</span>
              <span v-if="agent.description">·</span>
              <span v-if="agent.description" class="agent-meta__desc">{{ agent.description }}</span>
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
          @click="toggleWorking"
        >
          <span class="work-dot" />
          <span>{{ isWorking ? '已开启 · 点此关闭' : '已关闭 · 点此开启' }}</span>
        </button>

        <button class="topbar-btn" title="刷新任务状态" @click="refreshCurrent">
          <el-icon><Refresh /></el-icon>
          <span>刷新</span>
        </button>

        <button
          v-if="currentTask"
          class="topbar-btn"
          title="清空当前对话并重置状态"
          @click="clearConversation"
        >
          <el-icon><Delete /></el-icon>
          <span>清空对话</span>
        </button>

        <button
          v-if="isBusy"
          class="topbar-btn topbar-btn--danger"
          title="中止任务执行"
          @click="cancelCurrentTask"
        >
          <el-icon><CircleClose /></el-icon>
          <span>中止执行</span>
        </button>

        <button
          v-if="agent"
          class="topbar-btn topbar-btn--primary"
          title="配置智能体设定与工具"
          @click="openEditDialog"
        >
          <el-icon><Setting /></el-icon>
          <span>配置</span>
        </button>
      </div>
    </header>

    <!-- ═══════════ 对话消息流主体 (铺满宽度 · 内部独立滚动) ═══════════ -->
    <main class="chat-scroll" ref="chatScrollRef">
      <div class="chat-container">
        <!-- 首屏加载：避免欢迎文案/旧消息闪一下再替换 -->
        <div v-if="!pageReady" class="chat-boot">
          <span class="chat-boot__spinner" />
          <div class="chat-boot__hint">正在加载会话…</div>
        </div>

        <!-- 空态欢迎屏 (ChatGPT / Grok 标配) -->
        <div v-else-if="!chatItems.length && !isBusy" class="chat-welcome">
          <div class="welcome-avatar agent-gradient" :class="resolveAgentGradient(agent)" />

          <h1 class="welcome-title">
            {{ agent ? `${agent.name} 已就绪` : "智能体已就绪" }}
          </h1>

          <p class="welcome-subtitle">
            {{ agent?.description || "具备自主决策、系统工具调度与连续推进能力。" }}
          </p>

          <p v-if="isWorking" class="welcome-duty-hint">
            已开启持续执行，系统将在数秒内自动开工…
          </p>

          <!-- 快速灵感提示卡片 (纯扁平文字，无emoji) -->
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

        <!-- 消息与执行事件流 -->
        <div v-else class="chat-stream">
          <template v-for="(item, idx) in chatItems" :key="idx">
            <!-- 用户消息 (极简右侧气泡) -->
            <div v-if="item.kind === 'user'" class="msg-row msg-row--user">
              <div class="msg-bubble msg-bubble--user">
                <div class="msg-text">{{ item.content }}</div>
                <div class="msg-actions">
                  <button class="msg-copy-btn" title="复制内容" @click="copyText(item.content)">
                    <el-icon :size="12"><CopyDocument /></el-icon>
                  </button>
                  <button
                    class="msg-copy-btn"
                    title="存为长期微调笔记（后续值守遵守）"
                    @click="saveAsWorkNote(item.content)"
                  >
                    <el-icon :size="12"><Check /></el-icon>
                  </button>
                </div>
              </div>
            </div>

            <!-- 智能体消息组 (左侧：思考折叠条 + 实时动画 + 正文 Markdown + 审批卡) -->
            <div v-else-if="item.kind === 'assistant-group'" class="msg-row msg-row--assistant">
              <div class="assistant-content-wrap">
                <!-- 1. Grok / DeepSeek 风格深度思考与工具调度折叠块 -->
                <div v-if="item.tools && item.tools.length" class="thought-accordion">
                  <button class="thought-toggle" @click="toggleToolsExpand(idx)">
                    <div class="thought-toggle__left">
                      <span class="thought-label">
                        已调度 {{ item.tools.length }} 个执行动作
                      </span>
                    </div>
                    <span class="thought-chevron" :class="{ 'is-open': expandedToolGroups.has(idx) }">
                      ▾
                    </span>
                  </button>

                  <div v-show="expandedToolGroups.has(idx)" class="thought-body">
                    <div
                      v-for="(tool, tIdx) in item.tools"
                      :key="tIdx"
                      class="tool-step"
                      :class="{ 'tool-step--error': tool.status === 'error' }"
                    >
                      <div class="tool-step__header">
                        <span class="tool-step__status-dot" />
                        <span class="tool-step__name">{{ tool.label || tool.tool }}</span>
                        <span class="tool-step__badge">{{ tool.tool }}</span>
                      </div>
                      <div v-if="tool.summary" class="tool-step__summary">
                        {{ tool.summary }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 2. 执行中动画提示 -->
                <div v-if="item.thinking && !item.content" class="agent-thinking-pill">
                  <span class="thinking-spinner" />
                  <span>正在自主思考与规划工具调用...</span>
                </div>

                <!-- 3. Markdown 正文 -->
                <div v-if="item.content" class="agent-markdown-body">
                  <MarkdownView :content="item.content" />
                  <button class="msg-copy-btn agent-copy" title="复制回答" @click="copyText(item.content)">
                    <el-icon :size="12"><CopyDocument /></el-icon>
                  </button>
                </div>

                <!-- 4. 人机协作确认卡 (Human-in-the-loop) -->
                <div v-if="item.interact" class="interaction-card-wrap">
                  <InteractionRenderer
                    :payload="item.interact"
                    :loading="opLoading"
                    @submit="onInteractSubmit"
                    @reject="onInteractReject"
                  />
                </div>
              </div>
            </div>

            <!-- 系统/调度时间线（可追溯） -->
            <div v-else-if="item.kind === 'system'" class="msg-row msg-row--system">
              <div class="system-line" :class="`system-line--${item.level || 'info'}`">
                <span class="system-line__time">{{ formatLogTime(item.at) }}</span>
                <span class="system-line__text">{{ item.content }}</span>
              </div>
            </div>

            <!-- 异常提示条 -->
            <div v-else-if="item.kind === 'error'" class="msg-row msg-row--error">
              <div class="error-banner">
                <span>{{ item.event?.message || '任务执行遇到异常' }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </main>

    <!-- ═══════════ 悬浮式底部输入栏 (ChatGPT / Grok 居中气泡) ═══════════ -->
    <footer class="chat-composer">
      <div class="composer-container">
        <div class="composer-box" :class="{ 'is-focused': isInputFocused }">
          <textarea
            ref="composerTextareaRef"
            v-model="draftPrompt"
            class="composer-textarea"
            :placeholder="composerPlaceholder"
            rows="1"
            :disabled="isBusy"
            @focus="isInputFocused = true"
            @blur="isInputFocused = false"
            @keydown="handleComposerKeyDown"
            @input="autoResizeComposer"
          />

          <div class="composer-toolbar">
            <div class="composer-toolbar__left">
              <!-- 已启用能力提示 (纯扁平无emoji) -->
              <el-popover
                placement="top-start"
                :width="300"
                trigger="hover"
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

              <span class="composer-chip composer-chip--neutral">
                <span>自主连续推进</span>
              </span>
            </div>

            <div class="composer-toolbar__right">
              <!-- 停止按钮 -->
              <button
                v-if="isBusy"
                class="composer-action-btn composer-action-btn--stop"
                title="中止执行"
                @click="cancelCurrentTask"
              >
                <span class="stop-square" />
              </button>

              <!-- 发送按钮 (圆形箭头) -->
              <button
                v-else
                class="composer-action-btn composer-action-btn--send"
                :class="{ 'is-active': !!draftPrompt.trim() }"
                :disabled="!draftPrompt.trim() || !agent"
                title="发送指令 (Enter)"
                @click="sendPrompt"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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

    <!-- ═══════════ 配置智能体全屏弹窗 (Tab 位于标题下左侧 · 靠左自适应 · 零多余Icon) ═══════════ -->
    <el-dialog
      v-model="dialogVisible"
      fullscreen
      :show-close="false"
      class="flat-fs-dialog"
      destroy-on-close
    >
      <template #header>
        <div class="fs-dialog-header">
          <!-- 上行：标题与保存操作 -->
          <div class="fs-dialog-header__top">
            <div class="fs-dialog-header__title-wrap">
              <h2 class="fs-dialog-title">
                配置智能体: {{ agentForm.name }}
              </h2>
              <span class="fs-dialog-subtitle">通用业务能力组合 · 自主协同调度</span>
            </div>

            <div class="fs-dialog-header__actions">
              <button class="btn btn--secondary" @click="dialogVisible = false">取消</button>
              <button
                class="btn btn--primary"
                :disabled="savingAgent"
                @click="saveAgentConfiguration"
              >
                保存并生效
              </button>
            </div>
          </div>

          <!-- 下行靠左对齐：主配置 Tabs (位于标题下左侧) -->
          <div class="fs-dialog-header__tabs">
            <button
              class="fs-main-tab-btn"
              :class="{ 'is-active': activeDialogTab === 'basic' }"
              @click="activeDialogTab = 'basic'"
            >
              <span>角色设定与指令</span>
            </button>
            <button
              class="fs-main-tab-btn"
              :class="{ 'is-active': activeDialogTab === 'caps' }"
              @click="activeDialogTab = 'caps'"
            >
              <span>通用能力库</span>
              <span v-if="agentForm.capabilities.length" class="fs-main-tab-badge">
                {{ agentForm.capabilities.length }}
              </span>
            </button>
          </div>
        </div>
      </template>

      <div class="fs-dialog-body">
        <!-- ── TAB 1: 角色设定与系统核心指令 ── -->
        <div v-show="activeDialogTab === 'basic'" class="fs-tab-view fs-tab-view--basic">
          <div class="fs-view-content">
            <!-- 基础信息行 -->
            <div class="fs-form-row">
              <div class="fs-form-col fs-form-col--name">
                <label class="fs-label">智能体名称</label>
                <el-input
                  v-model="agentForm.name"
                  placeholder="例如：自动化流程执行专员"
                  maxlength="40"
                  show-word-limit
                />
              </div>

              <div class="fs-form-col fs-form-col--desc">
                <label class="fs-label">功能定位简述</label>
                <el-input
                  v-model="agentForm.description"
                  placeholder="简要概括业务职责..."
                  maxlength="120"
                  show-word-limit
                />
              </div>

              <div class="fs-form-col fs-form-col--switch">
                <label class="fs-label">启用状态</label>
                <div class="fs-switch-wrap">
                  <el-switch v-model="agentForm.enabled" active-text="启用" inactive-text="停用" />
                </div>
              </div>

              <div class="fs-form-col fs-form-col--switch">
                <label class="fs-label">持续执行</label>
                <div class="fs-switch-wrap">
                  <el-switch
                    v-model="agentForm.dutyMode"
                    active-value="duty"
                    inactive-value="off"
                    active-text="开"
                    inactive-text="关"
                  />
                </div>
              </div>

              <div class="fs-form-col fs-form-col--desc">
                <label class="fs-label">驻守目标（长期职责）</label>
                <el-input
                  v-model="agentForm.dutyGoal"
                  placeholder="例如：每日整理 3–8 张图片素材入组"
                  maxlength="200"
                  show-word-limit
                  :disabled="agentForm.dutyMode !== 'duty'"
                />
              </div>
            </div>

            <!-- 常用通用预设模板 (纯扁平文本，无emoji) -->
            <div class="fs-presets-bar">
              <span class="fs-presets-label">快速预设模板:</span>
              <div class="fs-presets-list">
                <button
                  v-for="p in universalPresets"
                  :key="p.name"
                  class="fs-preset-pill"
                  @click="applyPreset(p)"
                >
                  {{ p.name }}
                </button>
              </div>
            </div>

            <!-- 核心指令大编辑区 -->
            <div class="fs-editor-box">
              <div class="fs-editor-box__header">
                <div class="fs-editor-box__title-wrap">
                  <label class="fs-label">核心业务提示词与执行准则 (System Instructions)</label>
                  <span class="fs-subhint">定义智能体的身份角色、持续执行目标与工具调用规范</span>
                </div>
                <span class="fs-editor-counter">{{ agentForm.instructions.length }} 字符</span>
              </div>
              <el-input
                v-model="agentForm.instructions"
                type="textarea"
                class="fs-editor-textarea"
                placeholder="定义智能体的身份角色、持续执行目标与工具调用规范..."
              />
            </div>
          </div>
        </div>

        <!-- ── TAB 2: 通用能力库 (靠左分类 · 充分分配空间 · 纯扁平) ── -->
        <div v-show="activeDialogTab === 'caps'" class="fs-tab-view fs-tab-view--caps">
          <div class="fs-view-content">
            <!-- 靠左分类 Tabs (纯扁平文字，无emoji) -->
            <div class="fs-cap-categories">
              <button
                v-for="cat in capabilityCategories"
                :key="cat.key"
                class="fs-cat-btn"
                :class="{ 'is-active': activeCapGroup === cat.key }"
                @click="activeCapGroup = cat.key"
              >
                <span>{{ cat.label }}</span>
                <span class="fs-cat-btn__count">
                  {{ cat.key === 'selected' ? agentForm.capabilities.length : (categoryCounts[cat.key]?.total || 0) }}
                </span>
                <span
                  v-if="cat.key !== 'selected' && categoryCounts[cat.key]?.selected > 0"
                  class="fs-cat-btn__dot"
                />
              </button>
            </div>

            <!-- 工具栏：搜索、风险过滤与批量操作 -->
            <div class="fs-cap-toolbar">
              <div class="fs-cap-toolbar__left">
                <div class="fs-search-wrap">
                  <el-input
                    v-model="capSearch"
                    placeholder="搜索能力名称、工具ID或描述..."
                    clearable
                    prefix-icon="Search"
                  />
                </div>

                <div class="fs-risk-filter">
                  <button
                    class="fs-filter-pill"
                    :class="{ 'is-active': riskFilter === 'all' }"
                    @click="riskFilter = 'all'"
                  >
                    全部风险
                  </button>
                  <button
                    class="fs-filter-pill"
                    :class="{ 'is-active': riskFilter === 'low' }"
                    @click="riskFilter = 'low'"
                  >
                    只读安全
                  </button>
                  <button
                    class="fs-filter-pill"
                    :class="{ 'is-active': riskFilter === 'med_high' }"
                    @click="riskFilter = 'med_high'"
                  >
                    操作执行
                  </button>
                </div>
              </div>

              <div class="fs-cap-toolbar__right">
                <button class="fs-quick-action-btn" @click="toggleSelectCurrentGroup(true)">
                  全选当前分类
                </button>
                <button class="fs-quick-action-btn" @click="toggleSelectCurrentGroup(false)">
                  取消当前分类
                </button>
                <span class="fs-divider-v" />
                <button class="fs-quick-action-btn" @click="selectAllCaps">
                  全部启用
                </button>
                <button class="fs-quick-action-btn fs-quick-action-btn--clear" @click="clearAllCaps">
                  清空已选
                </button>
                <div class="fs-count-summary">
                  已启用 <strong>{{ agentForm.capabilities.length }}</strong> / {{ capabilities.length }} 项
                </div>
              </div>
            </div>

            <!-- 通用工具能力网格 (全宽网格 · 靠左铺满分配空间) -->
            <div class="fs-grid-scroll">
              <div v-if="filteredCapabilities.length === 0" class="fs-empty-caps">
                <p class="fs-empty-caps__text">未找到匹配的能力项</p>
                <button
                  v-if="capSearch || riskFilter !== 'all' || activeCapGroup === 'selected'"
                  class="btn btn--secondary btn--sm"
                  @click="resetCapFilters"
                >
                  重置筛选条件
                </button>
              </div>

              <div v-else class="fs-caps-grid">
                <div
                  v-for="cap in filteredCapabilities"
                  :key="cap.id"
                  class="fs-cap-card"
                  :class="{ 'is-selected': agentForm.capabilities.includes(cap.id) }"
                  @click="toggleCapability(cap.id)"
                >
                  <div class="fs-cap-card__header">
                    <div class="fs-checkbox-box" :class="{ 'is-checked': agentForm.capabilities.includes(cap.id) }">
                      <el-icon v-if="agentForm.capabilities.includes(cap.id)"><Check /></el-icon>
                    </div>

                    <div class="fs-cap-card__title" :title="cap.name || cap.id">
                      {{ cap.name || cap.id }}
                    </div>

                    <div class="fs-cap-card__badges">
                      <span class="fs-cat-tag">{{ resolveCapCategory(cap).label }}</span>
                      <span class="fs-risk-tag" :class="`fs-risk-tag--${cap.risk || 'low'}`">
                        {{ cap.risk === 'high' ? '敏感' : (cap.risk === 'medium' ? '执行' : '只读') }}
                      </span>
                    </div>
                  </div>

                  <div class="fs-cap-card__id">{{ cap.id }}</div>

                  <p class="fs-cap-card__desc" :title="cap.description || ''">
                    {{ cap.description || '支持当前业务环境内的该项能力调用与调度。' }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Check,
  CircleClose,
  CopyDocument,
  Delete,
  Refresh,
  Search,
  Setting
} from '@element-plus/icons-vue'
import MarkdownView from '@/components/MarkdownView/index.vue'
import InteractionRenderer from '@/components/AiAssistant/interactions/InteractionRenderer.vue'
import {
  AgentAdminApi,
  type AgentDefinition,
  type AgentTask,
  type CapabilityItem
} from '@/api/agent'
import { resolveAgentGradient } from './gradients'
import './agent-gradients.css'

defineOptions({ name: 'AiAgentChat' })

const route = useRoute()
const router = useRouter()
/** AppView 提供的整页重挂载（解决 hash 已切、视图不切） */
const reloadAppView = inject<() => void>('reload')

// ── 页面状态与数据 ────────────────────────────────────────
const agent = ref<AgentDefinition | null>(null)
const currentTask = ref<AgentTask | null>(null)
const capabilities = ref<CapabilityItem[]>([])

const draftPrompt = ref('')
const pageReady = ref(false)
const isInputFocused = ref(false)
const opLoading = ref(false)
const savingAgent = ref(false)
const composerTextareaRef = ref<HTMLTextAreaElement | null>(null)
const chatScrollRef = ref<HTMLElement | null>(null)
const expandedToolGroups = ref(new Set<number>())

let pollTimer: ReturnType<typeof setInterval> | null = null
let idleWatchTimer: ReturnType<typeof setInterval> | null = null

// ── 全屏弹窗表单 ──────────────────────────────────────────
const dialogVisible = ref(false)
const activeDialogTab = ref<'basic' | 'caps'>('basic')
const activeCapGroup = ref<string>('all')
const capSearch = ref('')
const riskFilter = ref<'all' | 'low' | 'med_high'>('all')

const agentForm = reactive({
  name: '',
  description: '',
  instructions: '',
  capabilities: [] as string[],
  enabled: true,
  dutyMode: 'off' as 'off' | 'duty',
  dutyGoal: '',
  dailyRunLimit: 24
})

// ── 通用业务智能体预设模板 (全业务通用，纯扁平，无多余Icon) ──
const universalPresets = [
  {
    name: '通用业务协同助手',
    desc: '面向多模块通用业务推进，具备系统查询、任务流转与上下文理解能力',
    instructions: `你是一个严谨高效的企业级业务协同智能体。你的目标是协助用户高效推进各项业务任务。
【工作规范】
1. 优先使用系统提供的真实工具查询数据，严禁凭空捏造虚假信息。
2. 收到用户任务后，先明确目标并拆解步骤，每一步调用最适合的工具推进。
3. 执行结果以结构化、清晰精炼的 Markdown 格式输出。`,
    defaultCaps: ['system.user.query_info', 'system.service.query_status']
  },
  {
    name: '流程与桌面自动化专员',
    desc: '专注于浏览器网页交互、自动化流程、Photoshop及远程客户端任务调度',
    instructions: `你是一名自动化流程执行专家。负责通过浏览器自动化、Photoshop 调度及客户端远程能力完成端到端任务。
【执行原则】
1. 在执行敏感或变更操作前，优先确认上下文参数正确性。
2. 遇到浏览器页面加载或客户端响应异常时，具备自动重试与状态诊断意识。
3. 输出包含操作链接、执行结果与耗时详情。`,
    defaultCaps: ['system.browser_automation.query_pages', 'system.browser_automation.open_link']
  },
  {
    name: '创意与多媒体制作专家',
    desc: '负责 Remotion 视频生成、AI语音TTS、AI图像TTI及多媒体工作流渲染',
    instructions: `你是一名多媒体创作与创意生成专家。擅长协调 AI 绘图、语音合成与视频模板渲染。
【创作流程】
1. 明确创意主题、风格基调及输出格式要求。
2. 智能调度 AI 语音、图像生成或视频模板渲染工具进行批量生产。
3. 渲染完成后提供产物预览信息及资产追踪路径。`,
    defaultCaps: ['video.template.list', 'ai.tts.generate', 'ai.tti.generate']
  },
  {
    name: '电商选品与发布顾问',
    desc: '负责商品信息解析、属性标准化、AI营销文案生成以及跨店铺发布任务调度',
    instructions: `你是一名电商运营与发布专家。负责商品信息解析、属性标准化、AI营销文案生成以及跨店铺发布任务的调度。
【运营准则】
1. 严格遵守电商平台规范，确保商品标题、类目与属性真实合规。
2. 发布任务提交后，实时追踪发布状态与报错信息并及时汇报。`,
    defaultCaps: ['product.search', 'product.detail', 'publish.task.list']
  },
  {
    name: '素材资产与知识库专员',
    desc: '负责贴纸图库、PSD模板、文案句库及企业设计规范知识的统一检索与管理',
    instructions: `你是一名素材资产与知识工程专家。负责企业设计资产、PSD模板、字体与文案资源的分类整理与高效检索。
【资产检索规范】
1. 根据用户关键词精准匹配素材资产标签与属性。
2. 支持多维度筛选（分类、分辨率、风格、许可），输出高可用资产链接。`,
    defaultCaps: ['material.sticker.search', 'material.psd_template.search']
  },
  {
    name: '系统监控与运维审计员',
    desc: '负责系统任务状态追踪、客户端在线探活、性能健康度统计与审计分析',
    instructions: `你是一名系统运维与审计专员。负责系统运行状况、队列任务健康度、客户端连接及操作日志的全局把控。
【运维规范】
1. 持续跟踪未决任务与异常报警，提供排查定位线索。
2. 统计模块容量与趋势，输出规范清晰的系统运行状态分析报告。`,
    defaultCaps: ['system.task.list', 'system.client.list_status', 'statistics.query']
  }
]

// ── 通用能力功能分类定义 ──
const capabilityCategories = [
  { key: 'all', label: '全部能力' },
  { key: 'automation', label: '自动化操作' },
  { key: 'ai', label: 'AI与智能' },
  { key: 'creative', label: '创意与工作流' },
  { key: 'material', label: '素材与知识库' },
  { key: 'ecommerce', label: '电商与业务' },
  { key: 'system', label: '系统与服务' },
  { key: 'selected', label: '已选能力' }
]

function resolveCapCategory(cap: CapabilityItem): { key: string; label: string } {
  const cat = String(cap.category || '').toLowerCase()
  const id = String(cap.id || '').toLowerCase()

  if (
    cat === 'browser' ||
    id.startsWith('system.browser_automation') ||
    id.startsWith('system.ps_automation') ||
    id.startsWith('client_runtime') ||
    id.startsWith('mcp_bridge') ||
    id.startsWith('system.design_tool')
  ) {
    return { key: 'automation', label: '自动化操作' }
  }

  if (
    cat === 'ai' ||
    id.startsWith('ai.') ||
    id.startsWith('image_processing') ||
    id.startsWith('ai_prompt') ||
    id.startsWith('design_request')
  ) {
    return { key: 'ai', label: 'AI与智能' }
  }

  if (
    cat === 'video' ||
    cat === 'workflow' ||
    id.startsWith('video.') ||
    id.startsWith('workflow.') ||
    id.startsWith('hotsearch.') ||
    id.startsWith('task.') ||
    id.startsWith('message_push.')
  ) {
    return { key: 'creative', label: '创意与工作流' }
  }

  if (
    cat === 'material' ||
    id.startsWith('material.') ||
    id.startsWith('asset_') ||
    id.startsWith('font.') ||
    id.startsWith('psd.')
  ) {
    return { key: 'material', label: '素材与知识库' }
  }

  if (
    cat === 'product' ||
    cat === 'shop' ||
    cat === 'publish' ||
    cat === 'partner' ||
    cat === 'ecom' ||
    cat === 'temu' ||
    id.startsWith('product.') ||
    id.startsWith('shop.') ||
    id.startsWith('publish.') ||
    id.startsWith('vendor.')
  ) {
    return { key: 'ecommerce', label: '电商与业务' }
  }

  return { key: 'system', label: '系统与服务' }
}

const categoryCounts = computed(() => {
  const counts: Record<string, { total: number; selected: number }> = {
    all: { total: capabilities.value.length, selected: agentForm.capabilities.length },
    automation: { total: 0, selected: 0 },
    ai: { total: 0, selected: 0 },
    creative: { total: 0, selected: 0 },
    material: { total: 0, selected: 0 },
    ecommerce: { total: 0, selected: 0 },
    system: { total: 0, selected: 0 }
  }

  for (const c of capabilities.value) {
    const groupKey = resolveCapCategory(c).key
    if (counts[groupKey]) {
      counts[groupKey].total += 1
      if (agentForm.capabilities.includes(c.id)) {
        counts[groupKey].selected += 1
      }
    }
  }

  return counts
})

const filteredCapabilities = computed(() => {
  let list = capabilities.value

  if (activeCapGroup.value === 'selected') {
    list = list.filter((c) => agentForm.capabilities.includes(c.id))
  } else if (activeCapGroup.value !== 'all') {
    list = list.filter((c) => resolveCapCategory(c).key === activeCapGroup.value)
  }

  if (capSearch.value.trim()) {
    const q = capSearch.value.trim().toLowerCase()
    list = list.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.id && c.id.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
    )
  }

  if (riskFilter.value === 'low') {
    list = list.filter((c) => c.risk === 'low' || (!c.risk && c.readOnly))
  } else if (riskFilter.value === 'med_high') {
    list = list.filter((c) => c.risk === 'medium' || c.risk === 'high')
  }

  return list
})

// ── 提示建议卡片 ──────────────────────────────────────────
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

// ── 状态计算 ──────────────────────────────────────────────
const isWorking = computed(() => agent.value?.dutyMode === 'duty')

async function toggleWorking() {
  if (!agent.value) return
  const next = isWorking.value ? 'off' : 'duty'
  if (next === 'duty' && !agent.value.dutyGoal?.trim()) {
    ElMessage.warning('请先在「配置」里填写驻守目标，再开启')
    openEditDialog()
    return
  }
  try {
    const res: any = await AgentAdminApi.updateDefinition(agent.value.id, {
      dutyMode: next
    })
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

// ── worklog → 对话流 ─────────────────────────────────────
const chatItems = computed(() => {
  const events = (currentTask.value?.worklog || []) as any[]
  const items: any[] = []
  let textBuf = ''
  let toolBuf: any[] = []
  let interact: any = null

  const flush = () => {
    if (toolBuf.length || textBuf || interact) {
      items.push({
        kind: 'assistant-group',
        tools: toolBuf,
        content: textBuf || '',
        thinking: false,
        interact
      })
    }
    textBuf = ''
    toolBuf = []
    interact = null
  }

  for (const ev of events) {
    if (ev?.type === 'text') {
      textBuf += ev.content || ''
      continue
    }
    if (ev?.type === 'thinking') {
      continue
    }
    flush()
    if (ev?.type === 'user') {
      items.push({ kind: 'user', content: ev.content })
    } else if (ev?.type === 'system') {
      items.push({
        kind: 'system',
        content: ev.content || '',
        level: ev.level || 'info',
        at: ev.at
      })
    } else if (ev?.type === 'tool') {
      toolBuf.push({
        id: `${ev.tool}-${ev.at}`,
        tool: ev.tool,
        label: ev.label,
        input: ev.input,
        summary: ev.summary,
        error: ev.error,
        status: ev.success ? 'done' : 'error'
      })
    } else if (ev?.type === 'interrupt') {
      interact = toInteractionPayload(ev.payload || {})
    } else if (ev?.type === 'error') {
      flush()
      items.push({ kind: 'error', event: ev })
    }
  }
  flush()

  if (isBusy.value) {
    items.push({
      kind: 'assistant-group',
      tools: [],
      content: '',
      thinking: true,
      interact: null
    })
  }

  return items
})

const composerPlaceholder = computed(() => {
  if (isWaiting.value) return '当前任务等待确认，请输入您的反馈意见或点击上方按钮操作...'
  if (isBusy.value) return '智能体正在执行任务中，请稍候...'
  return '输入业务指令或目标，智能体将自主规划推进 (Enter 发送)...'
})

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

/** 把用户这句话存为长期微调笔记（注入后续值守） */
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

// ── 数据加载 ──────────────────────────────────────────────
async function loadAgentAndLatestTask() {
  const id = String(route.params.id || '')
  if (!id) {
    router.replace('/ai/agent')
    return
  }

  try {
    const [defRes, capRes] = await Promise.all([
      AgentAdminApi.definitions(),
      AgentAdminApi.capabilities().catch(() => [])
    ])

    const list = ((defRes as any)?.data ?? defRes) as AgentDefinition[] || []
    agent.value = list.find((x) => x.id === id) || null
    capabilities.value = ((capRes as any)?.data ?? capRes) as CapabilityItem[] || []

    if (!agent.value) {
      ElMessage.warning('智能体不存在或已被移除')
      router.replace('/ai/agent')
      return
    }

    const taskRes: any = await AgentAdminApi.tasks({ agentDefinitionId: id, pageSize: 1 })
    const items = taskRes?.data?.items ?? taskRes?.items ?? []
    if (items.length) {
      await openTask(items[0].id)
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '加载智能体信息失败')
  } finally {
    pageReady.value = true
  }
}

async function openTask(taskId: string) {
  try {
    const res: any = await AgentAdminApi.taskDetail(taskId)
    currentTask.value = (res?.data ?? res) as AgentTask
    await nextTick()
    scrollToBottom()
    if (isBusy.value) startPolling()
    else stopPolling()
  } catch {
    /* ignore */
  }
}

async function refreshCurrent() {
  if (currentTask.value?.id) {
    await openTask(currentTask.value.id)
  } else if (agent.value) {
    await loadAgentAndLatestTask()
  }
}

function backToList(e?: Event) {
  e?.preventDefault()
  e?.stopPropagation()
  const go = () => {
    // 强制 AppView 重挂载，确保聊天页卸载、列表页出现
    reloadAppView?.()
  }
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

// ── 发送指令与对话 ────────────────────────────────────────
async function sendPrompt() {
  const text = draftPrompt.value.trim()
  if (!text || !agent.value || isBusy.value) return

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

  // 每个智能体只保留一条对话：已有会话线程则续聊，否则创建首个任务
  if (currentTask.value) {
    try {
      const res: any = await AgentAdminApi.sendMessage(currentTask.value.id, text)
      currentTask.value = (res?.data ?? res) as AgentTask
      expandedToolGroups.value.clear()
      await nextTick()
      scrollToBottom()
      startPolling()
    } catch (e: any) {
      ElMessage.error(e?.message || '发送消息失败')
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

// ── 轮询任务状态 ──────────────────────────────────────────
function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    if (!currentTask.value?.id) return stopPolling()
    try {
      const res: any = await AgentAdminApi.taskDetail(currentTask.value.id)
      const fresh = (res?.data ?? res) as AgentTask
      currentTask.value = fresh
      if (!['pending', 'running'].includes(fresh.status)) {
        stopPolling()
      }
      scrollToBottom()
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

/**
 * 值守空闲观察：开启后后台会新建任务轮，对话页需主动拉取才看得到。
 * 无进行中任务时定期查最新任务并打开。
 */
function startIdleWatch() {
  stopIdleWatch()
  idleWatchTimer = setInterval(async () => {
    if (!agent.value || !isWorking.value) return
    if (isBusy.value) return
    // 已有未完/刚完的任务则由 startPolling 管；这里只负责捞「新出现的任务」
    try {
      const id = String(route.params.id || '')
      if (!id) return
      const taskRes: any = await AgentAdminApi.tasks({ agentDefinitionId: id, pageSize: 1 })
      const items = taskRes?.data?.items ?? taskRes?.items ?? []
      const latest = items[0]
      if (!latest) return
      if (!currentTask.value || currentTask.value.id !== latest.id) {
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

// ── 人机协作确认提交 (Human-in-the-loop) ──────────────────
async function onInteractSubmit(payload: any) {
  if (!currentTask.value) return
  opLoading.value = true
  try {
    if (payload?.confirmed) {
      const res: any = await AgentAdminApi.approveTask(currentTask.value.id)
      currentTask.value = (res?.data ?? res) as AgentTask
    } else {
      const res: any = await AgentAdminApi.replyTask(
        currentTask.value.id,
        JSON.stringify(payload?.input || {})
      )
      currentTask.value = (res?.data ?? res) as AgentTask
    }
    startPolling()
  } catch (e: any) {
    ElMessage.error(e?.message || '确认提交失败')
  } finally {
    opLoading.value = false
  }
}

async function onInteractReject() {
  if (!currentTask.value) return
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
  if (!currentTask.value) return
  try {
    await ElMessageBox.confirm('确定中止当前智能体的执行过程吗？', '提示', {
      type: 'warning',
      confirmButtonText: '确定中止',
      cancelButtonText: '取消'
    })
    const res: any = await AgentAdminApi.cancelTask(currentTask.value.id)
    currentTask.value = (res?.data ?? res) as AgentTask
    stopPolling()
    ElMessage.info('任务已中止')
  } catch {
    /* cancel */
  }
}

/** 清空对话并重置会话状态（删除当前任务，下次发送为全新会话） */
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
    nextTick(() => {
      composerTextareaRef.value?.focus()
    })
  } catch {
    /* cancel */
  }
}

// ── 全屏弹窗配置 ──────────────────────────────────────────
function openEditDialog() {
  if (!agent.value) return
  activeDialogTab.value = 'basic'
  activeCapGroup.value = 'all'
  capSearch.value = ''
  riskFilter.value = 'all'

  agentForm.name = agent.value.name || ''
  agentForm.dutyMode = agent.value.dutyMode === 'duty' ? 'duty' : 'off'
  agentForm.dutyGoal = agent.value.dutyGoal || ''
  agentForm.dailyRunLimit = agent.value.dailyRunLimit || 24
  agentForm.description = agent.value.description || ''
  agentForm.instructions = agent.value.instructions || ''
  agentForm.capabilities = Array.isArray(agent.value.capabilities) ? [...agent.value.capabilities] : []
  agentForm.enabled = agent.value.enabled ?? true

  dialogVisible.value = true
}

function applyPreset(p: (typeof universalPresets)[0]) {
  agentForm.name = p.name
  agentForm.description = p.desc
  agentForm.instructions = p.instructions
  agentForm.capabilities = [...p.defaultCaps]
  ElMessage.success(`已应用「${p.name}」预设`)
}

function toggleCapability(id: string) {
  const idx = agentForm.capabilities.indexOf(id)
  if (idx >= 0) agentForm.capabilities.splice(idx, 1)
  else agentForm.capabilities.push(id)
}

function toggleSelectCurrentGroup(select: boolean) {
  const groupCaps = filteredCapabilities.value.map((c) => c.id)
  if (select) {
    for (const id of groupCaps) {
      if (!agentForm.capabilities.includes(id)) {
        agentForm.capabilities.push(id)
      }
    }
    ElMessage.success(`已勾选当前分类 ${groupCaps.length} 项能力`)
  } else {
    agentForm.capabilities = agentForm.capabilities.filter((id) => !groupCaps.includes(id))
    ElMessage.info('已取消勾选当前分类能力')
  }
}

function selectAllCaps() {
  agentForm.capabilities = capabilities.value.map((c) => c.id)
  ElMessage.success(`已启用全部 ${capabilities.value.length} 项系统能力`)
}

function clearAllCaps() {
  agentForm.capabilities = []
  ElMessage.info('已清空所有勾选能力')
}

function resetCapFilters() {
  capSearch.value = ''
  riskFilter.value = 'all'
  activeCapGroup.value = 'all'
}

async function saveAgentConfiguration() {
  if (!agent.value) return
  if (!agentForm.name.trim()) {
    ElMessage.warning('请输入智能体名称')
    return
  }

  savingAgent.value = true
  try {
    const res: any = await AgentAdminApi.updateDefinition(agent.value.id, {
      name: agentForm.name.trim(),
      description: agentForm.description.trim(),
      instructions: agentForm.instructions.trim(),
      capabilities: agentForm.capabilities,
      enabled: agentForm.enabled,
      dutyMode: agentForm.dutyMode,
      dutyGoal: agentForm.dutyGoal.trim() || null,
      dailyRunLimit: agentForm.dailyRunLimit
    })
    agent.value = ((res as any)?.data ?? res) as AgentDefinition
    dialogVisible.value = false
    ElMessage.success('智能体配置已更新')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    savingAgent.value = false
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

function scrollToBottom() {
  if (!chatScrollRef.value) return
  chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight
}

function toggleToolsExpand(idx: number) {
  if (expandedToolGroups.value.has(idx)) {
    expandedToolGroups.value.delete(idx)
  } else {
    expandedToolGroups.value.add(idx)
  }
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

// 路由 id 变化时重置加载态，避免残留上一会话内容
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
/* ═══════════════════════════════════════════════════════════
   极简扁平对话工作台 (ChatGPT / Grok 风格 · 黑夜/白天全兼容)
   ═══════════════════════════════════════════════════════════ */

.agent-chat-page {
  /* 对齐布局 ElScrollbar 可视高度，避免外层再出一条滚动条 */
  --chat-page-height: calc(
    100vh - var(--top-tool-height) - var(--tags-view-height)
  );
  --chat-page-height: calc(
    100dvh - var(--top-tool-height) - var(--tags-view-height)
  );

  display: flex;
  flex-direction: column;
  width: 100%;
  height: var(--chat-page-height);
  min-height: 0;
  overflow: hidden;
  background: var(--app-content-bg-color, #f8fafc);

  /* 主题色彩令牌 */
  --c-bg-surface: var(--app-content-surface-color, #ffffff);
  --c-border: var(--app-content-border-color, rgba(148, 163, 184, 0.22));
  --c-text-primary: var(--el-text-color-primary, #0f172a);
  --c-text-secondary: var(--el-text-color-secondary, #64748b);
  --c-text-placeholder: var(--el-text-color-placeholder, #94a3b8);
  --c-primary: var(--el-color-primary, #2563eb);
}

/* ════ 顶栏 ════ */
.chat-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 24px;
  background: transparent;
  flex-shrink: 0;
  z-index: 10;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  corner-shape: squircle;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s ease;

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
}

.agent-avatar-wrap {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  position: relative;
  border-radius: 50%;

  &.is-duty {
    &::before {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      border: 2px solid rgb(254, 54, 102);
      pointer-events: none;
      animation: agent-duty-heartbeat 1.4s ease-in-out infinite;
    }

    &::after {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      border: 2px solid rgb(254, 54, 102);
      opacity: 0;
      pointer-events: none;
      animation: agent-duty-heart-ring 1.4s ease-in-out infinite;
    }
  }
}

.agent-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  color: var(--c-text-primary);
  font-weight: 600;
  font-size: 13px;
  overflow: hidden;

  &:not(.agent-gradient) {
    background: var(--el-fill-color);
  }

  &.agent-gradient {
    color: #fff;
    isolation: isolate;
  }
}

@keyframes agent-duty-heartbeat {
  0% {
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
  60% {
    transform: scale(1);
    opacity: 0.9;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes agent-duty-heart-ring {
  0% {
    transform: scale(1);
    opacity: 0.55;
  }
  70% {
    transform: scale(1.35);
    opacity: 0;
  }
  100% {
    transform: scale(1.35);
    opacity: 0;
  }
}

@keyframes agent-duty-border {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  10% {
    transform: scale(1);
  }
  40% {
    opacity: 0.8;
  }
  66% {
    outline-width: 2px;
  }
  100% {
    transform: scale(1.23);
    opacity: 0;
    outline-width: 0px;
  }
}

.agent-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.agent-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
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
  corner-shape: squircle;
  background: var(--el-fill-color);
  color: var(--c-text-secondary);

  &__dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
  }

  &--running {
    background: rgba(16, 185, 129, 0.12);
    color: #10b981;
  }

  &--waiting {
    background: rgba(245, 158, 11, 0.12);
    color: #f59e0b;
  }
}

.agent-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--c-text-placeholder);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &__desc {
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  corner-shape: squircle;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  font-size: 12.5px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--el-fill-color);
    color: var(--c-text-primary);
  }

  &--primary {
    background: var(--c-primary);
    color: #ffffff;

    &:hover {
      opacity: 0.9;
      color: #ffffff;
    }
  }

  &--danger {
    background: rgba(239, 68, 68, 0.08);
    color: #ef4444;

    &:hover {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }
  }

  &--work {
    gap: 6px;

    .work-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--c-text-placeholder, #94a3b8);
    }

    &.is-on {
      background: rgba(16, 185, 129, 0.1);
      color: #059669;

      .work-dot {
        background: #10b981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
        animation: duty-pulse 1.6s ease-in-out infinite;
      }

      &:hover {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;

        .work-dot {
          background: #ef4444;
          box-shadow: none;
          animation: none;
        }
      }
    }
  }
}

@keyframes duty-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

/* ════ 对话流（页面内唯一滚动区） ════ */
.chat-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: var(--el-border-color-darker, rgba(148, 163, 184, 0.45)) transparent;

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color-darker, rgba(148, 163, 184, 0.45));
    border-radius: 999px;

    &:hover {
      background: var(--el-text-color-placeholder, #94a3b8);
    }
  }
}

.chat-container {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  padding: 20px 28px 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
  box-sizing: border-box;
}

/* 首屏加载占位 */
.chat-boot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: auto 0;
  padding: 48px 0;
  gap: 12px;

  &__spinner {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid var(--el-border-color, rgba(148, 163, 184, 0.35));
    border-top-color: var(--c-text-secondary, #64748b);
    animation: chat-boot-spin 0.8s linear infinite;
  }

  &__hint {
    font-size: 12px;
    color: var(--c-text-placeholder);
    animation: chat-boot-pulse 1.2s ease-in-out infinite;
  }
}

@keyframes chat-boot-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes chat-boot-pulse {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 1;
  }
}

/* 空态欢迎屏 */
.chat-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: auto 0;
  text-align: center;
  padding: 40px 0;
}

.welcome-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  margin-bottom: 16px;
  overflow: hidden;

  &:not(.agent-gradient) {
    background: var(--el-fill-color);
  }
}

.welcome-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--c-text-primary);
  margin: 0 0 8px;
  letter-spacing: -0.01em;
}

.welcome-subtitle {
  font-size: 13.5px;
  color: var(--c-text-secondary);
  max-width: 460px;
  line-height: 1.55;
  margin: 0 0 24px;
}

.welcome-duty-hint {
  font-size: 12px;
  color: var(--c-primary, #2563eb);
  margin: -12px 0 20px;
  animation: chat-boot-pulse 1.4s ease-in-out infinite;
}

.welcome-prompts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 720px;
}

.prompt-chip {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 8px;
  corner-shape: squircle;
  border: 1px solid var(--c-border);
  background: var(--c-bg-surface);
  color: var(--c-text-primary);
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--c-primary);
    background: var(--el-fill-color-lighter);
  }
}

/* 消息流 */
.chat-stream {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.msg-row {
  display: flex;
  width: 100%;

  &--user {
    justify-content: flex-end;
  }

  &--assistant {
    justify-content: flex-start;
  }

  &--system {
    justify-content: center;
    padding: 2px 0;
  }
}

/* 调度/状态时间线 */
.system-line {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  max-width: 92%;
  padding: 4px 10px;
  border-radius: 8px;
  corner-shape: squircle;
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

  &__text {
    white-space: pre-wrap;
    word-break: break-word;
  }

  &--warn {
    background: rgba(245, 158, 11, 0.1);
    color: #b45309;
  }

  &--success {
    background: rgba(16, 185, 129, 0.1);
    color: #047857;
  }
}

.msg-bubble {
  position: relative;
  max-width: 82%;
  padding: 10px 14px;
  border-radius: 12px;
  corner-shape: squircle;
  font-size: 14px;
  line-height: 1.6;

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
  gap: 2px;
  margin-top: 4px;
  justify-content: flex-end;
  min-height: 18px;
}

.msg-copy-btn {
  border: none;
  background: transparent;
  color: var(--c-text-placeholder);
  cursor: pointer;
  padding: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;

  &:hover {
    color: var(--c-text-primary);
  }

  &.agent-copy {
    position: static;
    margin-top: 6px;
    opacity: 0.6;
    &:hover { opacity: 1; }
  }
}

.assistant-content-wrap {
  width: 100%;
}

.thought-accordion {
  border: 1px solid var(--c-border);
  border-radius: 8px;
  corner-shape: squircle;
  background: var(--c-bg-surface);
  margin-bottom: 14px;
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

  &:hover {
    color: var(--c-text-primary);
  }

  &__left {
    display: flex;
    align-items: center;
    gap: 6px;
  }
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
  padding: 4px 0;

  &__header {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
  }

  &--error &__status-dot {
    background: #ef4444;
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
    corner-shape: squircle;
    font-family: monospace;
  }

  &__summary {
    color: var(--c-text-secondary);
    margin-left: 12px;
    margin-top: 2px;
  }
}

.agent-thinking-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  corner-shape: squircle;
  background: var(--el-fill-color-light);
  color: var(--c-text-secondary);
  font-size: 12.5px;
}

.thinking-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--el-border-color);
  border-top-color: var(--c-text-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.agent-markdown-body {
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--c-text-primary);
}

.interaction-card-wrap {
  margin-top: 14px;
  border: 1px solid var(--c-border);
  border-radius: 10px;
  corner-shape: squircle;
  padding: 14px;
  background: var(--c-bg-surface);
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  corner-shape: squircle;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #ef4444;
  font-size: 13px;
}

/* ════ 底部固定输入栏（始终贴底 · 无边框扁平） ════ */
.chat-composer {
  flex: 0 0 auto;
  position: sticky;
  bottom: 0;
  z-index: 5;
  padding: 12px 24px 16px;
  background: transparent;
}

.composer-container {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  box-sizing: border-box;
}

.composer-box {
  display: flex;
  flex-direction: column;
  background: var(--el-fill-color-light, rgba(148, 163, 184, 0.1));
  border: none;
  border-radius: 18px;
  corner-shape: squircle;
  padding: 12px 16px 10px;
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
  gap: 4px;
  height: 26px;
  padding: 0 8px;
  border-radius: 8px;
  corner-shape: squircle;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  font-size: 11.5px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: var(--c-text-primary);
    background: var(--el-fill-color);
  }

  &--neutral {
    cursor: default;
    background: transparent;
  }
}

.composer-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;

  &--send {
    background: var(--el-fill-color);
    color: var(--c-text-placeholder);

    &.is-active {
      background: var(--c-primary);
      color: #ffffff;

      &:hover {
        opacity: 0.9;
      }
    }
  }

  &--stop {
    background: #000000;
    color: #ffffff;

    .stop-square {
      width: 10px;
      height: 10px;
      background: #ffffff;
      border-radius: 2px;
      corner-shape: squircle;
    }
  }
}

.composer-foot-hint {
  text-align: center;
  font-size: 11.5px;
  color: var(--c-text-placeholder);
  margin-top: 8px;
}

@media (max-width: 768px) {
  .agent-chat-page {
    --chat-page-height: calc(100vh - var(--top-tool-height));
    --chat-page-height: calc(100dvh - var(--top-tool-height));
  }

  .chat-topbar {
    padding: 0 12px;
  }

  .chat-container {
    padding: 14px 12px 12px;
  }

  .chat-composer {
    padding: 8px 12px 10px;
  }

  .composer-foot-hint {
    display: none;
  }
}
</style>

<style lang="scss">
/* ═══════════════════════════════════════════════════════════
   全屏弹窗全局样式 (Teleport 兼容 · 黑夜/白天全兼容 · 零多余Icon)
   ═══════════════════════════════════════════════════════════ */

.flat-fs-dialog {
  margin: 0 !important;
  padding: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;

  /* 弹窗色彩令牌 (白天默认) */
  --c-dialog-bg: var(--app-content-surface-color, #ffffff);
  --c-dialog-border: var(--app-content-border-color, rgba(148, 163, 184, 0.22));
  --c-dialog-text: var(--el-text-color-primary, #0f172a);
  --c-dialog-subtext: var(--el-text-color-secondary, #64748b);
  --c-dialog-mute: var(--el-text-color-placeholder, #94a3b8);
  --c-primary: var(--el-color-primary, #2563eb);

  /* 关键：只读 (Low)、执行 (Medium)、敏感 (High) 标签色彩令牌 */
  --c-tag-low-bg: #ecfdf5;
  --c-tag-low-text: #059669;
  --c-tag-low-border: #a7f3d0;

  --c-tag-med-bg: #eff6ff;
  --c-tag-med-text: #2563eb;
  --c-tag-med-border: #bfdbfe;

  --c-tag-high-bg: #fef2f2;
  --c-tag-high-text: #dc2626;
  --c-tag-high-border: #fecaca;

  --c-tag-cat-bg: #f1f5f9;
  --c-tag-cat-text: #475569;
  --c-tag-cat-border: #e2e8f0;

  background: var(--c-dialog-bg) !important;

  .el-dialog__header {
    padding: 0 !important;
    margin: 0 !important;
    border-bottom: 1px solid var(--c-dialog-border);
    flex-shrink: 0;
    background: var(--c-dialog-bg);
  }

  .el-dialog__body {
    padding: 0 !important;
    flex: 1 !important;
    display: flex !important;
    min-height: 0 !important;
    overflow: hidden !important;
    background: var(--c-dialog-bg);
  }

  /* 顶栏容器 (两层结构：上层标题操作，下层靠左Tab) */
  .fs-dialog-header {
    display: flex;
    flex-direction: column;
    padding: 14px 28px 0;
    background: var(--c-dialog-bg);

    &__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    &__title-wrap {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    &__tabs {
      display: flex;
      align-items: center;
      gap: 20px;
    }
  }

  .fs-dialog-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--c-dialog-text);
    margin: 0;
    letter-spacing: -0.01em;
  }

  .fs-dialog-subtitle {
    font-size: 12px;
    color: var(--c-dialog-mute);
  }

  /* 标题下方靠左的主配置 Tab */
  .fs-main-tab-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    padding: 0 2px;
    border: none;
    background: transparent;
    color: var(--c-dialog-subtext);
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      color: var(--c-dialog-text);
    }

    &.is-active {
      color: var(--c-primary);
      font-weight: 600;

      &::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--c-primary);
        border-radius: 2px;
        corner-shape: squircle;
      }
    }
  }

  .fs-main-tab-badge {
    font-size: 11px;
    padding: 0 6px;
    height: 18px;
    line-height: 18px;
    border-radius: 10px;
    corner-shape: squircle;
    background: var(--el-fill-color, #e2e8f0);
    color: var(--c-dialog-subtext);

    .is-active & {
      background: var(--c-primary);
      color: #ffffff;
    }
  }

  /* 弹窗主体视口 */
  .fs-dialog-body {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .fs-tab-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    min-height: 0;
  }

  /* 靠左对齐，充分分配空间，消除两侧多余空白 */
  .fs-view-content {
    width: 100%;
    padding: 20px 28px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  /* ── TAB 1 布局 ── */
  .fs-form-row {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 14px;
    width: 100%;
  }

  .fs-form-col {
    display: flex;
    flex-direction: column;
    gap: 6px;

    &--name {
      width: 320px;
      flex-shrink: 0;
    }

    &--desc {
      flex: 1;
      min-width: 0;
    }

    &--switch {
      width: 110px;
      flex-shrink: 0;
    }
  }

  .fs-label {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--c-dialog-text);
  }

  .fs-switch-wrap {
    height: 32px;
    display: flex;
    align-items: center;
  }

  /* 常用预设（纯文本芯片，无emoji） */
  .fs-presets-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .fs-presets-label {
    font-size: 12px;
    color: var(--c-dialog-subtext);
  }

  .fs-presets-list {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .fs-preset-pill {
    display: inline-flex;
    align-items: center;
    height: 26px;
    padding: 0 10px;
    border-radius: 6px;
    corner-shape: squircle;
    border: 1px solid var(--c-dialog-border);
    background: var(--c-dialog-bg);
    color: var(--el-text-color-regular, #334155);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.12s ease;

    &:hover {
      border-color: var(--c-primary);
      color: var(--c-primary);
    }
  }

  .fs-editor-box {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 480px;

    &__header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    &__title-wrap {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
  }

  .fs-subhint {
    font-size: 12px;
    color: var(--c-dialog-mute);
  }

  .fs-editor-counter {
    font-size: 12px;
    color: var(--c-dialog-mute);
  }

  .fs-editor-textarea {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;

    .el-textarea__inner {
      flex: 1 !important;
      height: 100% !important;
      min-height: 460px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13.5px;
      line-height: 1.65;
      padding: 14px 16px;
      resize: none;
      border-radius: 8px;
      corner-shape: squircle;
      background: var(--c-dialog-bg);
      color: var(--c-dialog-text);
      border-color: var(--c-dialog-border);

      &:focus {
        border-color: var(--c-primary);
      }
    }
  }

  /* ── TAB 2: 通用能力库 (靠左分类 · 全宽分布) ── */
  .fs-cap-categories {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--c-dialog-border);
    margin-bottom: 12px;
    flex-shrink: 0;

    &::-webkit-scrollbar {
      height: 4px;
    }
  }

  .fs-cat-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border-radius: 6px;
    corner-shape: squircle;
    border: 1px solid var(--c-dialog-border);
    background: var(--c-dialog-bg);
    color: var(--c-dialog-subtext);
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.12s ease;

    &:hover {
      border-color: var(--el-border-color);
      color: var(--c-dialog-text);
    }

    &.is-active {
      background: var(--el-fill-color, #e2e8f0);
      border-color: var(--el-border-color);
      color: var(--c-dialog-text);
      font-weight: 600;
    }

    &__count {
      font-size: 11px;
      opacity: 0.75;
    }

    &__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--c-primary);
    }
  }

  .fs-cap-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 12px;
    flex-shrink: 0;

    &__left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    &__right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .fs-search-wrap {
    width: 260px;
  }

  .fs-risk-filter {
    display: flex;
    gap: 4px;
  }

  .fs-filter-pill {
    height: 28px;
    padding: 0 10px;
    border-radius: 6px;
    corner-shape: squircle;
    border: 1px solid var(--c-dialog-border);
    background: var(--c-dialog-bg);
    color: var(--c-dialog-subtext);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.12s ease;

    &:hover {
      color: var(--c-dialog-text);
    }

    &.is-active {
      background: var(--el-fill-color, #e2e8f0);
      color: var(--c-dialog-text);
      font-weight: 600;
    }
  }

  .fs-quick-action-btn {
    border: none;
    background: transparent;
    color: var(--c-primary);
    font-size: 12px;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    corner-shape: squircle;

    &:hover {
      background: var(--el-fill-color-light);
    }

    &--clear {
      color: var(--c-dialog-mute);
    }
  }

  .fs-divider-v {
    width: 1px;
    height: 14px;
    background: var(--c-dialog-border);
  }

  .fs-count-summary {
    font-size: 12.5px;
    color: var(--c-dialog-subtext);
    margin-left: 8px;

    strong {
      color: var(--c-primary);
    }
  }

  .fs-grid-scroll {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding-right: 4px;
  }

  .fs-empty-caps {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
    gap: 10px;

    &__text {
      font-size: 13px;
      color: var(--c-dialog-subtext);
    }
  }

  /* 通用能力网格 (全宽网格 · 靠左铺满分配空间) */
  .fs-caps-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 10px;
    width: 100%;
  }

  .fs-cap-card {
    display: flex;
    flex-direction: column;
    padding: 12px 14px;
    border-radius: 8px;
    corner-shape: squircle;
    border: 1px solid var(--c-dialog-border);
    background: var(--c-dialog-bg);
    cursor: pointer;
    transition: all 0.12s ease;

    &:hover {
      border-color: var(--el-border-color);
    }

    &.is-selected {
      border-color: var(--c-primary);
      background: color-mix(in srgb, var(--c-primary) 6%, var(--c-dialog-bg));
    }

    &__header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    &__title {
      font-size: 13px;
      font-weight: 600;
      color: var(--c-dialog-text);
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__badges {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    &__id {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: var(--c-dialog-mute);
      margin-bottom: 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__desc {
      font-size: 11.5px;
      color: var(--c-dialog-subtext);
      line-height: 1.45;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }

  .fs-checkbox-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 4px;
    corner-shape: squircle;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: var(--c-dialog-bg);
    color: #ffffff;
    font-size: 11px;
    flex-shrink: 0;
    transition: all 0.12s ease;

    &.is-checked {
      background: var(--c-primary);
      border-color: var(--c-primary);
    }
  }

  .fs-cat-tag {
    display: inline-flex;
    align-items: center;
    font-size: 10.5px;
    line-height: 1.1;
    padding: 2px 6px;
    border-radius: 4px;
    corner-shape: squircle;
    background: var(--c-tag-cat-bg);
    color: var(--c-tag-cat-text);
    border: 1px solid var(--c-tag-cat-border);
  }

  /* 关键：只读 / 执行 / 敏感 Tag 样式（高对比度，兼容黑天白天） */
  .fs-risk-tag {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    line-height: 1.1;
    padding: 2px 6px;
    border-radius: 4px;
    corner-shape: squircle;
    font-weight: 500;
    border: 1px solid transparent;
    transition: all 0.12s ease;

    &--low {
      background: var(--c-tag-low-bg);
      color: var(--c-tag-low-text);
      border-color: var(--c-tag-low-border);
    }

    &--medium {
      background: var(--c-tag-med-bg);
      color: var(--c-tag-med-text);
      border-color: var(--c-tag-med-border);
    }

    &--high {
      background: var(--c-tag-high-bg);
      color: var(--c-tag-high-text);
      border-color: var(--c-tag-high-border);
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   🌙 暗色模式 (html.dark) 针对全屏弹窗无缝生效
   ═══════════════════════════════════════════════════════════ */
html.dark .flat-fs-dialog {
  --c-dialog-bg: #141414;
  --c-dialog-border: rgba(255, 255, 255, 0.08);
  --c-dialog-text: #f8fafc;
  --c-dialog-subtext: #94a3b8;
  --c-dialog-mute: #64748b;

  /* 暗色模式下：只读 (Low)、执行 (Medium)、敏感 (High) 标签色彩 */
  --c-tag-low-bg: rgba(16, 185, 129, 0.16);
  --c-tag-low-text: #34d399;
  --c-tag-low-border: rgba(52, 211, 153, 0.3);

  --c-tag-med-bg: rgba(59, 130, 246, 0.16);
  --c-tag-med-text: #60a5fa;
  --c-tag-med-border: rgba(96, 165, 250, 0.3);

  --c-tag-high-bg: rgba(239, 68, 68, 0.16);
  --c-tag-high-text: #f87171;
  --c-tag-high-border: rgba(248, 113, 113, 0.3);

  --c-tag-cat-bg: #222225;
  --c-tag-cat-text: #94a3b8;
  --c-tag-cat-border: rgba(255, 255, 255, 0.08);

  .fs-dialog-header {
    background: #141414;
  }

  .fs-main-tab-badge {
    background: #252528;
    color: #94a3b8;
  }

  .fs-cat-btn {
    background: #19191b;
    border-color: rgba(255, 255, 255, 0.08);
    color: #94a3b8;

    &:hover {
      color: #f8fafc;
      border-color: rgba(255, 255, 255, 0.15);
    }

    &.is-active {
      background: #262629;
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.18);
    }
  }

  .fs-cap-card {
    background: #19191b;
    border-color: rgba(255, 255, 255, 0.08);

    &:hover {
      border-color: rgba(255, 255, 255, 0.18);
    }

    &.is-selected {
      background: color-mix(in srgb, var(--el-color-primary, #2563eb) 14%, #19191b);
      border-color: var(--el-color-primary, #2563eb);
    }
  }

  .fs-checkbox-box {
    background: #19191b;
    border-color: rgba(255, 255, 255, 0.2);

    &.is-checked {
      background: var(--el-color-primary, #2563eb);
      border-color: var(--el-color-primary, #2563eb);
    }
  }

  .fs-editor-textarea .el-textarea__inner {
    background: #19191b;
    border-color: rgba(255, 255, 255, 0.08);
    color: #f8fafc;
  }

  .fs-preset-pill {
    background: #19191b;
    border-color: rgba(255, 255, 255, 0.08);
    color: #cbd5e1;

    &:hover {
      border-color: var(--el-color-primary, #2563eb);
      color: #ffffff;
    }
  }

  .fs-filter-pill {
    background: #19191b;
    border-color: rgba(255, 255, 255, 0.08);
    color: #94a3b8;

    &:hover {
      color: #f8fafc;
      border-color: rgba(255, 255, 255, 0.18);
    }

    &.is-active {
      background: #262629;
      border-color: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }
  }
}
</style>
