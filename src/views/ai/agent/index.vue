<template>
  <div class="agent-console">
    <!-- ═══════════ 顶栏：靠左对齐 · 极简扁平 ═══════════ -->
    <header class="console-head">
      <div class="console-head__left">
        <h2 class="console-head__title">智能体</h2>
        <span class="console-head__total">{{ agents.length }} 个智能体</span>
      </div>

      <div class="console-head__right">
        <!-- 搜索框 -->
        <div class="console-search">
          <el-icon class="console-search__icon"><Search /></el-icon>
          <input
            v-model="panelSearch"
            type="text"
            class="console-search__input"
            placeholder="搜索智能体名称或描述..."
          />
          <button
            v-if="panelSearch"
            class="console-search__clear"
            @click="panelSearch = ''"
          >
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

    <!-- ═══════════ 标题下方左侧：状态过滤 Tabs ═══════════ -->
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

    <!-- ═══════════ 智能体清单（编号 + 圆像 + 标题/描述）═══════════ -->
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
        <div class="agent-row__avatar-wrap" :class="{ 'is-duty': item.dutyMode === 'duty' }">
          <div class="agent-row__avatar agent-gradient" :class="resolveAgentGradient(item)" />
          <span v-if="item.dutyMode === 'duty'" class="agent-row__duty-tag">工作中</span>
        </div>

        <div class="agent-row__body">
          <h3 class="agent-row__title" :title="item.name">{{ item.name }}</h3>

          <p class="agent-row__desc" :title="item.description || ''">
            {{ item.description || "暂无业务描述" }}
          </p>

          <div class="agent-row__foot">
            <div class="agent-row__byline">
              By {{ agentStatusLabel(item) }} · {{ (item.capabilities || []).length }} 项能力
            </div>

            <el-dropdown trigger="click" placement="top-end" @click.stop>
              <button class="agent-row__more" @click.stop>
                <el-icon><MoreFilled /></el-icon>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openEditAgent(item)">
                    配置智能体
                  </el-dropdown-item>
                  <el-dropdown-item @click="toggleWorking(item)">
                    {{ item.dutyMode === 'duty' ? '关闭' : '开启' }}
                  </el-dropdown-item>
                  <el-dropdown-item @click="toggleEnabled(item)">
                    {{ item.enabled ? "停用" : "启用" }}
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

    <!-- ═══════════ 配置 / 创建全屏弹窗 (Tab 位于标题下左侧 · 靠左自适应 · 零多余Icon) ═══════════ -->
    <el-dialog
      v-model="agentDialogVisible"
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
                {{ editingAgent ? `配置智能体: ${agentForm.name}` : '创建新智能体' }}
              </h2>
              <span class="fs-dialog-subtitle">通用业务能力组合 · 自主协同调度</span>
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
                  placeholder="简要概括智能体的核心业务定位与负责范畴..."
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
            </div>

            <!-- 头像渐变选择（下拉） -->
            <div class="fs-avatar-block">
              <label class="fs-label">头像</label>
              <el-select
                v-model="agentForm.avatarStyle"
                class="fs-avatar-select"
                filterable
                clearable
                placeholder="选择头像渐变（清空则按名称自动分配）"
                popper-class="fs-avatar-popper"
              >
                <el-option
                  v-for="n in AGENT_GRADIENT_COUNT"
                  :key="n"
                  :label="AGENT_GRADIENT_NAMES[n - 1]"
                  :value="`g${n}`"
                >
                  <div class="fs-avatar-option">
                    <span class="fs-avatar-option__swatch agent-gradient" :class="`g${n}`" />
                    <span class="fs-avatar-option__text">{{ AGENT_GRADIENT_NAMES[n - 1] }}</span>
                  </div>
                </el-option>
              </el-select>
            </div>

            <!-- 运行参数 -->
            <div class="fs-runtime-params">
              <div class="fs-runtime-params__title">
                <span>运行参数</span>
                <span class="fs-subhint">精确控制调度与推理行为</span>
              </div>
              <div class="fs-runtime-params__grid">
                <div class="fs-param">
                  <label class="fs-label">日执行上限</label>
                  <el-input-number v-model="agentForm.dailyRunLimit" :min="1" :max="500" size="small" />
                </div>
                <div class="fs-param">
                  <label class="fs-label">轮询间隔（秒）</label>
                  <el-input-number v-model="agentForm.wakeIntervalSeconds" :min="10" :max="86400" size="small" />
                </div>
                <div class="fs-param">
                  <label class="fs-label">最大工具步数</label>
                  <el-input-number v-model="agentForm.maxToolSteps" :min="5" :max="200" size="small" />
                </div>
                <div class="fs-param">
                  <label class="fs-label">模型温度</label>
                  <el-input-number v-model="agentForm.temperature" :min="0" :max="2" :step="0.1" :precision="1" size="small" />
                </div>
                <div class="fs-param">
                  <label class="fs-label">LLM 超时（毫秒）</label>
                  <el-input-number v-model="agentForm.llmTimeoutMs" :min="5000" :max="600000" :step="5000" size="small" />
                </div>
              </div>
            </div>

            <!-- 核心系统指令 (Instructions) 全高编辑区 -->
            <div class="fs-editor-box">
              <div class="fs-editor-box__header">
                <div class="fs-editor-box__title-wrap">
                  <label class="fs-label">业务职责提示词与思考规则 (System Instructions)</label>
                  <span class="fs-subhint">定义智能体执行目标、思考方式、工具调用逻辑及约束规则</span>
                </div>
                <span class="fs-editor-counter">{{ agentForm.instructions.length }} 字符</span>
              </div>
              <el-input
                v-model="agentForm.instructions"
                type="textarea"
                class="fs-editor-textarea"
                placeholder="请输入详细的系统职责提示词。例如：&#10;你是一个严谨高效的业务智能体，根据用户的任务指令自主推进执行。&#10;【执行原则】&#10;1. 优先调用系统已绑定的真实工具获取客观数据，严禁凭空捏造。&#10;2. 遇到需人工确认的操作时自动暂停并汇报关键参数。&#10;3. 执行完毕输出结构化结论与产物清单。"
              />
            </div>
          </div>
        </div>

        <!-- ── TAB 2: 通用能力库 (Tab 靠左对齐 · 空间充分分配 · 纯扁平) ── -->
        <div v-show="activeDialogTab === 'caps'" class="fs-tab-view fs-tab-view--caps">
          <div class="fs-view-content">
            <!-- 靠左分类 Tabs (纯扁平文字，去除多余emoji) -->
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
      <div class="fs-dialog-footer">
        <button class="btn btn--secondary" @click="agentDialogVisible = false">取消</button>
        <button class="btn btn--primary" :disabled="opLoading" @click="saveAgent">保存并生效</button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Plus,
  Refresh,
  Close,
  MoreFilled,
  Check
} from '@element-plus/icons-vue'
import {
  AgentAdminApi,
  type AgentDefinition,
  type CapabilityItem,
  type AgentTask
} from '@/api/agent'
import {
  AGENT_GRADIENT_COUNT,
  AGENT_GRADIENT_NAMES,
  resolveAgentGradient
} from './gradients'
import './agent-gradients.css'

const router = useRouter()

// ── 列表数据 ──
const loading = ref(false)
const opLoading = ref(false)
const agents = ref<AgentDefinition[]>([])
const tasks = ref<AgentTask[]>([])
const capabilities = ref<CapabilityItem[]>([])

// 搜索与过滤
const panelSearch = ref('')
const panelFilter = ref<'all' | 'running' | 'waiting' | 'ready' | 'disabled'>('all')

// ── 弹窗状态 ──
const agentDialogVisible = ref(false)
const editingAgent = ref<AgentDefinition | null>(null)
const activeDialogTab = ref<'basic' | 'caps'>('basic')

// 能力选择与分类过滤
const activeCapGroup = ref<string>('all')
const capSearch = ref('')
const riskFilter = ref<'all' | 'low' | 'med_high'>('all')

const agentForm = reactive({
  name: '',
  description: '',
  instructions: '',
  capabilities: [] as string[],
  enabled: true,
  avatarStyle: '' as string,
  dailyRunLimit: 24,
  wakeIntervalSeconds: 30,
  maxToolSteps: 50,
  temperature: 0.2,
  llmTimeoutMs: 90000
})

// ── 通用业务智能体预设模板 (全方位覆盖，纯扁平，无多余Icon) ──
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

// ── 通用能力功能分类定义 (简洁扁平文本) ──
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

/** 解析工具所属的功能分类 */
function resolveCapCategory(cap: CapabilityItem): { key: string; label: string } {
  const cat = String(cap.category || '').toLowerCase()
  const id = String(cap.id || '').toLowerCase()

  // 1. 自动化操作: browser, ps, client_runtime, mcp
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

  // 2. AI与智能: ai, tts, tti, prompt, api_key, image_processing
  if (
    cat === 'ai' ||
    id.startsWith('ai.') ||
    id.startsWith('image_processing') ||
    id.startsWith('ai_prompt') ||
    id.startsWith('design_request')
  ) {
    return { key: 'ai', label: 'AI与智能' }
  }

  // 3. 创意制作与工作流: video, workflow, hotsearch, task, message_push
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

  // 4. 素材与知识库: material, sticker, asset, font, psd, crawler, document, text_document, design_knowledge
  if (
    cat === 'material' ||
    id.startsWith('material.') ||
    id.startsWith('asset_') ||
    id.startsWith('font.') ||
    id.startsWith('psd.')
  ) {
    return { key: 'material', label: '素材与知识库' }
  }

  // 5. 电商与业务: product, shop, publish, partner, vendor, ecom, temu
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

  // 6. 系统与基础服务
  return { key: 'system', label: '系统与服务' }
}

// ── 统计各分类能力数量 ──
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

// ── 当前筛选后的能力列表 ──
const filteredCapabilities = computed(() => {
  let list = capabilities.value

  // 1. 分类 Tab 过滤
  if (activeCapGroup.value === 'selected') {
    list = list.filter((c) => agentForm.capabilities.includes(c.id))
  } else if (activeCapGroup.value !== 'all') {
    list = list.filter((c) => resolveCapCategory(c).key === activeCapGroup.value)
  }

  // 2. 搜索关键词过滤
  if (capSearch.value.trim()) {
    const q = capSearch.value.trim().toLowerCase()
    list = list.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.id && c.id.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
    )
  }

  // 3. 风险等级过滤
  if (riskFilter.value === 'low') {
    list = list.filter((c) => c.risk === 'low' || (!c.risk && c.readOnly))
  } else if (riskFilter.value === 'med_high') {
    list = list.filter((c) => c.risk === 'medium' || c.risk === 'high')
  }

  return list
})

// ── 列表筛选与统计 ──
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

// ── 智能体状态计算 ──
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

// ── 加载数据 ──
async function loadAll() {
  loading.value = true
  try {
    const [defRes, capRes, taskRes] = await Promise.all([
      AgentAdminApi.definitions().catch(() => []),
      AgentAdminApi.capabilities().catch(() => []),
      AgentAdminApi.tasks({ page: 1, pageSize: 100 }).catch(() => ({ items: [], total: 0 }))
    ])
    agents.value = defRes || []
    capabilities.value = capRes || []
    tasks.value = (taskRes as any)?.items || []
  } catch (e: any) {
    ElMessage.error(e?.message || '加载智能体数据失败')
  } finally {
    loading.value = false
  }
}

// ── 弹窗操作 ──
function openCreateAgent() {
  editingAgent.value = null
  activeDialogTab.value = 'basic'
  activeCapGroup.value = 'all'
  capSearch.value = ''
  riskFilter.value = 'all'

  agentForm.name = ''
  agentForm.description = ''
  agentForm.instructions = ''
  agentForm.capabilities = []
  agentForm.enabled = true
  agentForm.avatarStyle = ''
  agentForm.dailyRunLimit = 24
  agentForm.wakeIntervalSeconds = 30
  agentForm.maxToolSteps = 50
  agentForm.temperature = 0.2
  agentForm.llmTimeoutMs = 90000

  agentDialogVisible.value = true
}

function openEditAgent(agent: AgentDefinition) {
  editingAgent.value = agent
  activeDialogTab.value = 'basic'
  activeCapGroup.value = 'all'
  capSearch.value = ''
  riskFilter.value = 'all'

  agentForm.name = agent.name || ''
  agentForm.description = agent.description || ''
  agentForm.instructions = agent.instructions || ''
  agentForm.capabilities = Array.isArray(agent.capabilities) ? [...agent.capabilities] : []
  agentForm.enabled = agent.enabled ?? true
  agentForm.avatarStyle = agent.avatarStyle || ''
  agentForm.dailyRunLimit = (agent as any).dailyRunLimit || 24
  agentForm.wakeIntervalSeconds = (agent as any).wakeIntervalSeconds || 30
  agentForm.maxToolSteps = (agent as any).maxToolSteps || 50
  agentForm.temperature = Number((agent as any).temperature) || 0.2
  agentForm.llmTimeoutMs = (agent as any).llmTimeoutMs || 90000

  agentDialogVisible.value = true
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

async function saveAgent() {
  if (!agentForm.name.trim()) {
    ElMessage.warning('请输入智能体名称')
    return
  }

  opLoading.value = true
  try {
    if (!editingAgent.value) {
      await AgentAdminApi.createDefinition({
        name: agentForm.name.trim(),
        description: agentForm.description.trim(),
        instructions: agentForm.instructions.trim(),
        capabilities: agentForm.capabilities,
        avatarStyle: agentForm.avatarStyle || undefined,
        dailyRunLimit: agentForm.dailyRunLimit,
        wakeIntervalSeconds: agentForm.wakeIntervalSeconds,
        maxToolSteps: agentForm.maxToolSteps,
        temperature: agentForm.temperature,
        llmTimeoutMs: agentForm.llmTimeoutMs
      })
      ElMessage.success('智能体创建成功')
    } else {
      await AgentAdminApi.updateDefinition(editingAgent.value.id, {
        name: agentForm.name.trim(),
        description: agentForm.description.trim(),
        instructions: agentForm.instructions.trim(),
        capabilities: agentForm.capabilities,
        enabled: agentForm.enabled,
        avatarStyle: agentForm.avatarStyle || null,
        dailyRunLimit: agentForm.dailyRunLimit,
        wakeIntervalSeconds: agentForm.wakeIntervalSeconds,
        maxToolSteps: agentForm.maxToolSteps,
        temperature: agentForm.temperature,
        llmTimeoutMs: agentForm.llmTimeoutMs
      })
      ElMessage.success('智能体配置已更新')
    }
    agentDialogVisible.value = false
    await loadAll()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    opLoading.value = false
  }
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

/** 手动开关：开启=持续执行，关闭=停止自动开新一轮 */
async function toggleWorking(agent: AgentDefinition) {
  const next = agent.dutyMode === 'duty' ? 'off' : 'duty'
  if (next === 'duty' && !agent.dutyGoal?.trim()) {
    ElMessage.warning('请先配置驻守目标，再开启')
    openEditAgent(agent)
    return
  }
  try {
    const res: any = await AgentAdminApi.updateDefinition(agent.id, { dutyMode: next })
    const updated = ((res as any)?.data ?? res) as AgentDefinition
    agent.dutyMode = updated.dutyMode
    agent.nextWakeAt = updated.nextWakeAt
    ElMessage.success(next === 'duty' ? `「${agent.name}」已开启` : `「${agent.name}」已关闭`)
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
/* ═══════════════════════════════════════════════════════════
   极简扁平化智能体控制台 (靠左自适应布局 · 黑夜/白天全兼容)
   ═══════════════════════════════════════════════════════════ */

.agent-console {
  padding: 20px 24px 36px;
  width: 100%;
  box-sizing: border-box;

  /* 基础色彩映射 */
  --c-bg-surface: var(--app-content-surface-color, #ffffff);
  --c-bg-page: var(--app-content-bg-color, #f8fafc);
  --c-border: var(--app-content-border-color, rgba(148, 163, 184, 0.22));
  --c-text-primary: var(--el-text-color-primary, #0f172a);
  --c-text-secondary: var(--el-text-color-secondary, #64748b);
  --c-text-placeholder: var(--el-text-color-placeholder, #94a3b8);
  --c-primary: var(--el-color-primary, #2563eb);
}

/* ── 顶栏：靠左对齐 ── */
.console-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--c-border);
  margin-bottom: 14px;

  &__left {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  &__title {
    font-size: 19px;
    font-weight: 600;
    color: var(--c-text-primary);
    margin: 0;
    letter-spacing: -0.01em;
  }

  &__total {
    font-size: 13px;
    color: var(--c-text-secondary);
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 10px;
  }
}

/* 搜索框 */
.console-search {
  position: relative;
  display: flex;
  align-items: center;
  width: 240px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-bg-surface);
  transition: border-color 0.15s ease;

  &:focus-within {
    border-color: var(--c-primary);
  }

  &__icon {
    font-size: 14px;
    color: var(--c-text-placeholder);
    margin-right: 6px;
  }

  &__input {
    flex: 1;
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

    &:hover {
      color: var(--c-text-primary);
    }
  }
}

/* 统一按钮样式 */
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
  transition: all 0.15s ease;
  border: 1px solid transparent;

  &--primary {
    background: var(--c-primary);
    color: #ffffff;

    &:hover {
      opacity: 0.9;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &--secondary {
    background: var(--c-bg-surface);
    border-color: var(--c-border);
    color: var(--c-text-primary);

    &:hover {
      background: var(--el-fill-color);
      border-color: var(--el-border-color);
    }
  }

  &--sm {
    height: 28px;
    padding: 0 10px;
    font-size: 12px;
  }

  &--icon {
    width: 34px;
    padding: 0;
  }
}

/* 标题下靠左过滤 Tabs */
.console-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 20px;
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
  transition: all 0.15s ease;

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

/* ── 智能体清单（参考编号+圆像+文案设计） ── */
.agent-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
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
  corner-shape: squircle;
  cursor: pointer;
  background: var(--el-fill-color-lighter, rgba(148, 163, 184, 0.08));
  transition: background 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    background: var(--el-fill-color-light, rgba(148, 163, 184, 0.14));
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);

    .agent-row__more {
      opacity: 1;
    }
  }

  &.is-disabled {
    opacity: 0.55;
  }

  &.is-running .agent-row__byline {
    color: #059669;
  }

  &.is-waiting .agent-row__byline {
    color: #d97706;
  }

  &__avatar-wrap {
    width: 56px;
    height: 56px;
    flex-shrink: 0;
    position: relative;
    border-radius: 50%;

    &.is-duty {
      /* 单色心跳光环 */
      &::before {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        border: 3px solid rgb(254, 54, 102);
        pointer-events: none;
        animation: agent-duty-heartbeat 1.4s ease-in-out infinite;
      }

      &::after {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        border: 3px solid rgb(254, 54, 102);
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
    background: rgb(254, 54, 102);
    color: #fff;
    white-space: nowrap;
    z-index: 1;
    pointer-events: none;
  }

  &__avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 18px;
    font-weight: 600;
    flex-shrink: 0;
    box-shadow: 0 3px 10px rgba(15, 23, 42, 0.1);
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
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__more {
    border: none;
    background: transparent;
    color: var(--c-text-placeholder);
    cursor: pointer;
    padding: 2px;
    border-radius: 4px;
    corner-shape: squircle;
    display: flex;
    align-items: center;
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
    min-height: 22px;
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

/* 心跳：快扩慢收，中间再抖一下 */
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

/* 外扩扩散环 */
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

@media (max-width: 720px) {
  .agent-list {
    grid-template-columns: 1fr;
  }

  .agent-row {
    grid-template-columns: 48px minmax(0, 1fr);
    gap: 12px;
    padding: 12px 14px;

    &__avatar-wrap {
      width: 48px;
      height: 48px;
    }

    &__avatar {
      width: 48px;
      height: 48px;
      font-size: 16px;
    }

    &__title {
      font-size: 13px;
    }

    &__desc {
      font-size: 11.5px;
      min-height: 0;
    }
  }
}
</style>

<style lang="scss">
/* ═══════════════════════════════════════════════════════════
   全屏弹窗全局样式 (Teleport 兼容 · 黑夜/白天全兼容 · 零多余Icon)
   ═══════════════════════════════════════════════════════════ */

.fs-avatar-popper {
  .fs-avatar-option {
    display: flex;
    align-items: center;
    gap: 10px;

    &__swatch {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      flex-shrink: 0;
      overflow: hidden;
    }

    &__text {
      font-size: 12px;
    }
  }
}

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
    flex-direction: column !important;
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
      }
    }
  }

  .fs-main-tab-badge {
    font-size: 11px;
    padding: 0 6px;
    height: 18px;
    line-height: 18px;
    border-radius: 10px;
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
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .fs-dialog-footer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 12px 28px;
    border-top: 1px solid var(--c-dialog-border);
    background: var(--c-dialog-bg);
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
  .fs-avatar-block {
    margin: 10px 0 18px;
    max-width: 420px;

    .fs-label {
      display: block;
      margin-bottom: 8px;
    }
  }

  .fs-avatar-select {
    width: 100%;
  }

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

  .fs-runtime-params {
    margin-bottom: 16px;

    &__title {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin-bottom: 10px;
      font-size: 13px;
      font-weight: 600;
      color: var(--c-dialog-text);
    }

    &__grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 20px;
    }
  }

  .fs-param {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .fs-label {
      font-size: 11.5px;
      color: var(--c-dialog-subtext);
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
