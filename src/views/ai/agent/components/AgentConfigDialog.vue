<template>
  <el-dialog
    :model-value="modelValue"
    fullscreen
    :show-close="false"
    class="flat-fs-dialog"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="fs-dialog-header">
        <div class="fs-dialog-header__top">
          <div class="fs-dialog-header__title-wrap">
            <h2 class="fs-dialog-title">
              {{ agent ? `配置智能体: ${agentForm.name || agent.name}` : '创建新智能体' }}
            </h2>
            <span class="fs-dialog-subtitle">通用业务能力组合 · 自主协同调度</span>
          </div>
          <button class="fs-close-btn" title="关闭" aria-label="关闭" @click="close">
            <el-icon><Close /></el-icon>
          </button>
        </div>

        <div class="fs-dialog-header__tabs">
          <button
            v-for="tab in dialogTabs"
            :key="tab.key"
            class="fs-main-tab-btn"
            :class="{ 'is-active': activeDialogTab === tab.key }"
            @click="activeDialogTab = tab.key"
          >
            <span>{{ tab.label }}</span>
            <span
              v-if="tab.key === 'caps' && agentForm.capabilities.length"
              class="fs-main-tab-badge"
            >
              {{ agentForm.capabilities.length }}
            </span>
          </button>
        </div>
      </div>
    </template>

    <div class="fs-dialog-body">
      <!-- ── TAB 1: 基本与指令 ── -->
      <div v-show="activeDialogTab === 'basic'" class="fs-tab-view fs-tab-view--basic">
        <div class="fs-view-content">
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

          <div class="fs-avatar-block">
            <label class="fs-label">头像渐变</label>
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

          <div class="fs-editor-box">
            <div class="fs-editor-box__header">
              <div class="fs-editor-box__title-wrap">
                <label class="fs-label">核心业务提示词与执行准则</label>
                <span class="fs-subhint">定义身份角色、执行目标与工具调用规范</span>
              </div>
              <span class="fs-editor-counter">{{ agentForm.instructions.length }} 字符</span>
            </div>
            <el-input
              v-model="agentForm.instructions"
              type="textarea"
              class="fs-editor-textarea"
              placeholder="定义智能体的身份角色、持续执行目标与工具调用规范..."
            />

            <div v-if="agent" class="fs-optimize-bar">
              <button
                class="fs-btn fs-btn--secondary fs-btn--sm"
                :disabled="optimizing"
                @click="runOptimize"
              >
                {{ optimizing ? '优化中...' : '智能优化提示词' }}
              </button>
              <span class="fs-subhint">根据运行日志与用户微调自动生成建议</span>
            </div>

            <div v-if="autoOptimized" class="fs-optimize-review">
              <div class="fs-optimize-review__header">
                <span class="fs-optimize-review__title">优化建议（{{ optimizeTime }}）</span>
                <div class="fs-optimize-review__actions">
                  <button class="fs-btn fs-btn--primary fs-btn--sm" @click="acceptOptimized">
                    采纳
                  </button>
                  <button class="fs-btn fs-btn--secondary fs-btn--sm" @click="rejectOptimized">
                    拒绝
                  </button>
                </div>
              </div>
              <div class="fs-optimize-review__body">{{ autoOptimized }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── TAB 2: 值守 ── -->
      <div v-show="activeDialogTab === 'duty'" class="fs-tab-view">
        <div class="fs-view-content">
          <div class="fs-form-row">
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
          <div class="fs-runtime-params__grid" style="margin-top: 12px">
            <div class="fs-param">
              <label class="fs-label" title="智能体每天最多自动运行多少轮，达到后当天停止，次日重置">
                每日最多运行
              </label>
              <el-input-number v-model="agentForm.dailyRunLimit" :min="1" :max="99999" size="small" />
            </div>
            <div class="fs-param">
              <label class="fs-label" title="每隔多少秒自动唤醒一次智能体执行任务，越小越频繁">
                自动唤醒间隔（秒）
              </label>
              <el-input-number
                v-model="agentForm.wakeIntervalSeconds"
                :min="10"
                :max="86400"
                size="small"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ── TAB 3: 运行参数 ── -->
      <div v-show="activeDialogTab === 'runtime'" class="fs-tab-view">
        <div class="fs-view-content">
          <div class="fs-runtime-params__grid">
            <div class="fs-param">
              <label class="fs-label" title="单轮任务中最多调用多少次工具，防止无限循环">
                单轮最大操作数
              </label>
              <el-input-number v-model="agentForm.maxToolSteps" :min="5" :max="200" size="small" />
            </div>
            <div class="fs-param">
              <label class="fs-label" title="0=严谨稳定，1=平衡，2=发散。建议 0.1~0.3">
                回答稳定度
              </label>
              <el-input-number
                v-model="agentForm.temperature"
                :min="0"
                :max="2"
                :step="0.1"
                :precision="1"
                size="small"
              />
            </div>
            <div class="fs-param">
              <label class="fs-label" title="等 AI 回复的最长时间，超时自动中止本轮。推荐 90000">
                响应超时（毫秒）
              </label>
              <el-input-number
                v-model="agentForm.llmTimeoutMs"
                :min="5000"
                :max="600000"
                :step="5000"
                size="small"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ── TAB 4: 自动清理 ── -->
      <div v-show="activeDialogTab === 'clean'" class="fs-tab-view">
        <div class="fs-view-content">
          <div class="fs-runtime-params__title" style="margin-bottom: 12px">
            <span>自动清理</span>
            <span class="fs-subhint">清理旧对话记录，用户微调指令自动保留</span>
            <button
              v-if="agent"
              class="fs-clean-btn"
              :disabled="cleaningAgent"
              @click="cleanNow"
            >
              {{ cleaningAgent ? '清理中...' : '立即清理' }}
            </button>
          </div>
          <div class="fs-runtime-params__grid">
            <div class="fs-param">
              <label class="fs-label">自动清理</label>
              <el-switch v-model="agentForm.autoCleanEnabled" />
            </div>
            <div class="fs-param">
              <label class="fs-label">完成保留天数</label>
              <el-input-number
                v-model="agentForm.retainCompletedDays"
                :min="1"
                :max="365"
                size="small"
              />
            </div>
            <div class="fs-param">
              <label class="fs-label">失败保留天数</label>
              <el-input-number
                v-model="agentForm.retainFailedDays"
                :min="1"
                :max="365"
                size="small"
              />
            </div>
            <div class="fs-param">
              <label class="fs-label">上下文上限</label>
              <el-input-number
                v-model="agentForm.maxWorklogEntries"
                :min="50"
                :max="5000"
                :step="50"
                size="small"
              />
            </div>
            <div class="fs-param">
              <label class="fs-label">清理间隔（小时）</label>
              <el-input-number
                v-model="agentForm.cleanIntervalHours"
                :min="1"
                :max="720"
                size="small"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ── TAB 5: 通用能力库（含采集源模块子分组） ── -->
      <div v-show="activeDialogTab === 'caps'" class="fs-tab-view fs-tab-view--caps">
        <div class="fs-view-content">
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
                {{
                  cat.key === 'selected'
                    ? agentForm.capabilities.length
                    : categoryCounts[cat.key]?.total || 0
                }}
              </span>
              <span
                v-if="cat.key !== 'selected' && categoryCounts[cat.key]?.selected > 0"
                class="fs-cat-btn__dot"
              />
            </button>
          </div>

          <div class="fs-cap-toolbar">
            <div class="fs-cap-toolbar__left">
              <div class="fs-search-wrap">
                <el-input
                  v-model="capSearch"
                  placeholder="搜索能力名称、工具ID或描述..."
                  clearable
                  :prefix-icon="Search"
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
              <button class="fs-quick-action-btn" @click="selectAllCaps">全部启用</button>
              <button
                class="fs-quick-action-btn fs-quick-action-btn--clear"
                @click="clearAllCaps"
              >
                清空已选
              </button>
              <div class="fs-count-summary">
                已启用 <strong>{{ agentForm.capabilities.length }}</strong> /
                {{ capabilities.length }} 项
              </div>
            </div>
          </div>

          <div class="fs-grid-scroll">
            <div v-if="filteredCapabilities.length === 0" class="fs-empty-caps">
              <p class="fs-empty-caps__text">未找到匹配的能力项</p>
              <button
                v-if="capSearch || riskFilter !== 'all' || activeCapGroup === 'selected'"
                class="fs-btn fs-btn--secondary fs-btn--sm"
                @click="resetCapFilters"
              >
                重置筛选条件
              </button>
            </div>

            <template v-else>
              <div v-for="group in groupedFilteredCapabilities" :key="group.key || '_flat'">
                <div v-if="group.label" class="fs-cap-group-header">{{ group.label }}</div>

                <div class="fs-caps-grid">
                  <div
                    v-for="cap in group.items"
                    :key="cap.id"
                    class="fs-cap-card"
                    :class="{ 'is-selected': agentForm.capabilities.includes(cap.id) }"
                    @click="toggleCapability(cap.id)"
                  >
                    <div class="fs-cap-card__header">
                      <div
                        class="fs-checkbox-box"
                        :class="{ 'is-checked': agentForm.capabilities.includes(cap.id) }"
                      >
                        <el-icon v-if="agentForm.capabilities.includes(cap.id)"><Check /></el-icon>
                      </div>

                      <div class="fs-cap-card__title" :title="cap.name || cap.id">
                        {{ cap.name || cap.id }}
                      </div>

                      <div class="fs-cap-card__badges">
                        <span class="fs-cat-tag">
                          {{ cap.meta?.moduleLabel || resolveCapCategory(cap).label }}
                        </span>
                        <span class="fs-risk-tag" :class="`fs-risk-tag--${cap.risk || 'low'}`">
                          {{ cap.risk === 'high' ? '敏感' : cap.risk === 'medium' ? '执行' : '只读' }}
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
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="fs-dialog-footer">
      <button class="fs-btn fs-btn--secondary" @click="close">取消</button>
      <button class="fs-btn fs-btn--primary" :disabled="saving" @click="save">保存并生效</button>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Close, Search } from '@element-plus/icons-vue'
import { AgentAdminApi, type AgentDefinition, type CapabilityItem } from '@/api/agent'
import { AGENT_GRADIENT_COUNT, AGENT_GRADIENT_NAMES } from '../gradients'

const props = defineProps<{
  modelValue: boolean
  agent?: AgentDefinition | null
  capabilities: CapabilityItem[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'saved', agent: AgentDefinition): void
}>()

const dialogTabs = [
  { key: 'basic', label: '基本与指令' },
  { key: 'duty', label: '值守' },
  { key: 'runtime', label: '运行' },
  { key: 'clean', label: '清理' },
  { key: 'caps', label: '能力' }
]

const capabilityCategories = [
  { key: 'all', label: '全部能力' },
  { key: 'automation', label: '自动化操作' },
  { key: 'ai', label: 'AI与智能' },
  { key: 'creative', label: '创意与工作流' },
  { key: 'material', label: '素材与知识库' },
  { key: 'ecommerce', label: '电商与业务' },
  { key: 'collect', label: '采集源' },
  { key: 'system', label: '系统与服务' },
  { key: 'selected', label: '已选能力' }
]

const COLLECT_MODULE_ORDER = ['image-collect', 'media-collect', 'hotsearch', 'news', 'data-tools']
const COLLECT_MODULE_LABELS: Record<string, string> = {
  'image-collect': '图片采集',
  'media-collect': '媒体采集',
  hotsearch: '热搜榜单',
  news: '新闻资讯',
  'data-tools': '数据工具'
}

const activeDialogTab = ref('basic')
const activeCapGroup = ref('all')
const capSearch = ref('')
const riskFilter = ref<'all' | 'low' | 'med_high'>('all')
const saving = ref(false)
const cleaningAgent = ref(false)
const optimizing = ref(false)
const autoOptimized = ref('')
const optimizeTime = ref('')

const agentForm = reactive({
  name: '',
  description: '',
  instructions: '',
  capabilities: [] as string[],
  enabled: true,
  avatarStyle: '' as string,
  dutyMode: 'off' as 'off' | 'duty',
  dutyGoal: '',
  dailyRunLimit: 24,
  wakeIntervalSeconds: 30,
  maxToolSteps: 50,
  temperature: 0.2,
  llmTimeoutMs: 90000,
  autoCleanEnabled: true,
  retainCompletedDays: 7,
  retainFailedDays: 3,
  maxWorklogEntries: 500,
  cleanIntervalHours: 24
})

function syncFormFromProp() {
  activeDialogTab.value = 'basic'
  activeCapGroup.value = 'all'
  capSearch.value = ''
  riskFilter.value = 'all'

  const a = props.agent
  if (!a) {
    agentForm.name = ''
    agentForm.description = ''
    agentForm.instructions = ''
    agentForm.capabilities = []
    agentForm.enabled = true
    agentForm.avatarStyle = ''
    agentForm.dutyMode = 'off'
    agentForm.dutyGoal = ''
    agentForm.dailyRunLimit = 24
    agentForm.wakeIntervalSeconds = 30
    agentForm.maxToolSteps = 50
    agentForm.temperature = 0.2
    agentForm.llmTimeoutMs = 90000
    agentForm.autoCleanEnabled = true
    agentForm.retainCompletedDays = 7
    agentForm.retainFailedDays = 3
    agentForm.maxWorklogEntries = 500
    agentForm.cleanIntervalHours = 24
    autoOptimized.value = ''
    optimizeTime.value = ''
    return
  }

  agentForm.name = a.name || ''
  agentForm.description = a.description || ''
  agentForm.instructions = a.instructions || ''
  agentForm.capabilities = Array.isArray(a.capabilities) ? [...a.capabilities] : []
  agentForm.enabled = a.enabled ?? true
  agentForm.avatarStyle = a.avatarStyle || ''
  agentForm.dutyMode = a.dutyMode === 'duty' ? 'duty' : 'off'
  agentForm.dutyGoal = a.dutyGoal || ''
  agentForm.dailyRunLimit = a.dailyRunLimit || 24
  agentForm.wakeIntervalSeconds = a.wakeIntervalSeconds || 30
  agentForm.maxToolSteps = a.maxToolSteps || 50
  agentForm.temperature = Number(a.temperature) || 0.2
  agentForm.llmTimeoutMs = a.llmTimeoutMs || 90000
  agentForm.autoCleanEnabled = a.autoCleanEnabled !== false
  agentForm.retainCompletedDays = a.retainCompletedDays || 7
  agentForm.retainFailedDays = a.retainFailedDays || 3
  agentForm.maxWorklogEntries = a.maxWorklogEntries || 500
  agentForm.cleanIntervalHours = a.cleanIntervalHours || 24
  autoOptimized.value = a.autoOptimizedInstructions || ''
  optimizeTime.value = a.autoOptimizedAt
    ? new Date(a.autoOptimizedAt).toLocaleString('zh-CN')
    : ''
}

watch(
  () => [props.modelValue, props.agent] as const,
  ([visible]) => {
    if (visible) syncFormFromProp()
  },
  { immediate: true }
)

function resolveCapCategory(cap: CapabilityItem): { key: string; label: string } {
  const cat = String(cap.category || '').toLowerCase()
  const id = String(cap.id || '').toLowerCase()
  if (cat === 'collect' || id.startsWith('collect.')) return { key: 'collect', label: '采集源' }
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
    all: { total: props.capabilities.length, selected: agentForm.capabilities.length },
    automation: { total: 0, selected: 0 },
    ai: { total: 0, selected: 0 },
    creative: { total: 0, selected: 0 },
    material: { total: 0, selected: 0 },
    ecommerce: { total: 0, selected: 0 },
    collect: { total: 0, selected: 0 },
    system: { total: 0, selected: 0 }
  }
  for (const c of props.capabilities) {
    const groupKey = resolveCapCategory(c).key
    if (counts[groupKey]) {
      counts[groupKey].total += 1
      if (agentForm.capabilities.includes(c.id)) counts[groupKey].selected += 1
    }
  }
  return counts
})

const filteredCapabilities = computed(() => {
  let list = props.capabilities
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

const groupedFilteredCapabilities = computed(() => {
  const list = filteredCapabilities.value
  if (activeCapGroup.value !== 'collect' || capSearch.value.trim()) {
    return [{ key: '', label: '', items: list }]
  }
  const groups = new Map<string, CapabilityItem[]>()
  for (const cap of list) {
    const mod = cap.meta?.module || 'other'
    if (!groups.has(mod)) groups.set(mod, [])
    groups.get(mod)!.push(cap)
  }
  const ordered: Array<{ key: string; label: string; items: CapabilityItem[] }> = []
  const moduleItems = list.filter((c) => c.id.startsWith('collect.module.'))
  if (moduleItems.length) {
    ordered.push({ key: '_module', label: '整组启用', items: moduleItems })
  }
  for (const mod of COLLECT_MODULE_ORDER) {
    const items = groups.get(mod)
    if (items?.length) {
      ordered.push({
        key: mod,
        label: COLLECT_MODULE_LABELS[mod] || mod,
        items: items.filter((c) => !c.id.startsWith('collect.module.'))
      })
    }
  }
  for (const [mod, items] of groups) {
    if (COLLECT_MODULE_ORDER.includes(mod)) continue
    ordered.push({
      key: mod,
      label: mod === 'other' ? '工具' : COLLECT_MODULE_LABELS[mod] || mod,
      items
    })
  }
  return ordered.filter((g) => g.items.length > 0)
})

function toggleCapability(id: string) {
  const idx = agentForm.capabilities.indexOf(id)
  if (idx >= 0) agentForm.capabilities.splice(idx, 1)
  else agentForm.capabilities.push(id)
}

function toggleSelectCurrentGroup(select: boolean) {
  const groupCaps = filteredCapabilities.value.map((c) => c.id)
  if (select) {
    for (const id of groupCaps) {
      if (!agentForm.capabilities.includes(id)) agentForm.capabilities.push(id)
    }
    ElMessage.success(`已勾选当前分类 ${groupCaps.length} 项能力`)
  } else {
    agentForm.capabilities = agentForm.capabilities.filter((id) => !groupCaps.includes(id))
    ElMessage.info('已取消勾选当前分类能力')
  }
}

function selectAllCaps() {
  agentForm.capabilities = props.capabilities.map((c) => c.id)
  ElMessage.success(`已启用全部 ${props.capabilities.length} 项系统能力`)
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

async function runOptimize() {
  if (!props.agent) return
  optimizing.value = true
  try {
    const res: any = await AgentAdminApi.optimizeInstructions(props.agent.id)
    const data = (res?.data ?? res) as AgentDefinition
    autoOptimized.value = data?.autoOptimizedInstructions || ''
    optimizeTime.value = data?.autoOptimizedAt
      ? new Date(data.autoOptimizedAt).toLocaleString('zh-CN')
      : ''
    if (autoOptimized.value) ElMessage.success('优化完成，请审阅')
    else ElMessage.warning('未生成优化内容')
  } catch (e: any) {
    ElMessage.error(e?.message || '优化失败')
  } finally {
    optimizing.value = false
  }
}

async function acceptOptimized() {
  if (!props.agent) return
  try {
    const res: any = await AgentAdminApi.acceptOptimized(props.agent.id)
    const data = (res?.data ?? res) as AgentDefinition
    agentForm.instructions = data?.instructions || ''
    autoOptimized.value = ''
    emit('saved', data)
    ElMessage.success('已采纳优化版提示词')
  } catch (e: any) {
    ElMessage.error(e?.message || '采纳失败')
  }
}

async function rejectOptimized() {
  if (!props.agent) return
  try {
    await AgentAdminApi.rejectOptimized(props.agent.id)
    autoOptimized.value = ''
    ElMessage.info('已拒绝优化建议')
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

async function cleanNow() {
  if (!props.agent || cleaningAgent.value) return
  cleaningAgent.value = true
  try {
    const res: any = await AgentAdminApi.cleanNow(props.agent.id)
    const d = res?.data ?? res
    ElMessage.success(
      `清理完成：提炼微调 ${d?.promoted ?? 0} 条，裁剪 ${d?.trimmed ?? 0} 条，清空 ${d?.cleared ?? 0} 条`
    )
  } catch (e: any) {
    ElMessage.error(e?.message || '清理失败')
  } finally {
    cleaningAgent.value = false
  }
}

function close() {
  emit('update:modelValue', false)
}

async function save() {
  if (!agentForm.name.trim()) {
    ElMessage.warning('请输入智能体名称')
    return
  }
  saving.value = true
  try {
    const commonPayload = {
      name: agentForm.name.trim(),
      description: agentForm.description.trim(),
      instructions: agentForm.instructions.trim(),
      capabilities: agentForm.capabilities,
      dutyMode: agentForm.dutyMode,
      dutyGoal: agentForm.dutyGoal.trim() || null,
      dailyRunLimit: agentForm.dailyRunLimit,
      wakeIntervalSeconds: agentForm.wakeIntervalSeconds,
      maxToolSteps: agentForm.maxToolSteps,
      temperature: agentForm.temperature,
      llmTimeoutMs: agentForm.llmTimeoutMs,
      autoCleanEnabled: agentForm.autoCleanEnabled,
      retainCompletedDays: agentForm.retainCompletedDays,
      retainFailedDays: agentForm.retainFailedDays,
      maxWorklogEntries: agentForm.maxWorklogEntries,
      cleanIntervalHours: agentForm.cleanIntervalHours
    }
    let res: any
    if (!props.agent) {
      res = await AgentAdminApi.createDefinition({
        ...commonPayload,
        avatarStyle: agentForm.avatarStyle || undefined
      })
      ElMessage.success('智能体创建成功')
    } else {
      res = await AgentAdminApi.updateDefinition(props.agent.id, {
        ...commonPayload,
        enabled: agentForm.enabled,
        avatarStyle: agentForm.avatarStyle || null
      })
      ElMessage.success('智能体配置已更新')
    }
    const saved = (res?.data ?? res) as AgentDefinition
    emit('saved', saved)
    close()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss">
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
  height: 100dvh !important;
  max-width: 100vw !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;

  --c-dialog-bg: var(--app-content-surface-color, #ffffff);
  --c-dialog-border: var(--app-content-border-color, rgba(148, 163, 184, 0.22));
  --c-dialog-text: var(--el-text-color-primary, #0f172a);
  --c-dialog-subtext: var(--el-text-color-secondary, #64748b);
  --c-dialog-mute: var(--el-text-color-placeholder, #94a3b8);
  --c-primary: var(--el-color-primary, #2563eb);

  --c-tag-low-bg: var(--el-color-success-light-9, #ecfdf5);
  --c-tag-low-text: var(--el-color-success, #059669);
  --c-tag-low-border: var(--el-color-success-light-7, #a7f3d0);

  --c-tag-med-bg: var(--el-color-primary-light-9, #eff6ff);
  --c-tag-med-text: var(--el-color-primary, #2563eb);
  --c-tag-med-border: var(--el-color-primary-light-7, #bfdbfe);

  --c-tag-high-bg: var(--el-color-danger-light-9, #fef2f2);
  --c-tag-high-text: var(--el-color-danger, #dc2626);
  --c-tag-high-border: var(--el-color-danger-light-7, #fecaca);

  --c-tag-cat-bg: var(--el-fill-color-light, #f1f5f9);
  --c-tag-cat-text: var(--el-text-color-regular, #475569);
  --c-tag-cat-border: var(--el-border-color-lighter, #e2e8f0);

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

  .fs-dialog-header {
    display: flex;
    flex-direction: column;
    padding: 14px 28px 0;
    background: var(--c-dialog-bg);

    &__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }

    &__title-wrap {
      display: flex;
      align-items: baseline;
      gap: 12px;
      min-width: 0;
    }

    &__tabs {
      display: flex;
      align-items: center;
      gap: 20px;
      overflow-x: auto;
      scrollbar-width: none;
      &::-webkit-scrollbar {
        display: none;
      }
    }
  }

  .fs-close-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--c-dialog-subtext);
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
      background: var(--el-fill-color);
      color: var(--c-dialog-text);
    }
  }

  .fs-dialog-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--c-dialog-text);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .fs-dialog-subtitle {
    font-size: 12px;
    color: var(--c-dialog-mute);
    white-space: nowrap;
  }

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
    white-space: nowrap;
    flex-shrink: 0;
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
      color: var(--el-color-white, #fff);
    }
  }

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
    padding: 12px 28px calc(12px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--c-dialog-border);
    background: var(--c-dialog-bg);
  }

  .fs-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 36px;
    padding: 0 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    border: 1px solid transparent;

    &--primary {
      background: var(--c-primary);
      color: var(--el-color-white, #fff);
      &:hover {
        opacity: 0.9;
      }
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    &--secondary {
      background: var(--c-dialog-bg);
      border-color: var(--c-dialog-border);
      color: var(--c-dialog-text);
      &:hover {
        background: var(--el-fill-color);
      }
    }

    &--sm {
      height: 28px;
      padding: 0 10px;
      font-size: 12px;
    }
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

  .fs-view-content {
    width: 100%;
    padding: 20px 28px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
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

  .fs-avatar-block {
    margin: 4px 0 16px;
    max-width: 420px;

    .fs-label {
      display: block;
      margin-bottom: 6px;
    }
  }

  .fs-avatar-select {
    width: 100%;
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

  .fs-clean-btn {
    margin-left: auto;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 500;
    color: var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--el-color-primary) 25%, transparent);
    border-radius: 6px;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: color-mix(in srgb, var(--el-color-primary) 18%, transparent);
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .fs-runtime-params__title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--c-dialog-text);
  }

  .fs-runtime-params__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 20px;
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

  .fs-optimize-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 10px;
  }

  .fs-optimize-review {
    margin-top: 12px;
    border: 1px solid var(--c-dialog-border);
    border-radius: 8px;
    overflow: hidden;

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--el-fill-color-light);
    }

    &__title {
      font-size: 12px;
      font-weight: 600;
      color: var(--c-dialog-text);
    }

    &__actions {
      display: flex;
      gap: 8px;
    }

    &__body {
      padding: 12px;
      font-size: 12px;
      line-height: 1.7;
      color: var(--c-dialog-subtext);
      white-space: pre-wrap;
      max-height: 280px;
      overflow-y: auto;
    }
  }

  .fs-editor-box {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 360px;

    &__header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }

    &__title-wrap {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 8px;
    }
  }

  .fs-subhint,
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
      min-height: 340px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13.5px;
      line-height: 1.65;
      padding: 14px 16px;
      resize: none;
      border-radius: 8px;
      background: var(--c-dialog-bg);
      color: var(--c-dialog-text);
      border-color: var(--c-dialog-border);
    }
  }

  .fs-cap-categories {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--c-dialog-border);
    margin-bottom: 12px;
    flex-shrink: 0;
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
    flex-shrink: 0;

    &.is-active {
      background: var(--el-fill-color, #e2e8f0);
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
    gap: 10px;
    margin-bottom: 12px;
    flex-shrink: 0;

    &__left,
    &__right {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
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
    padding: 48px 0;
    gap: 10px;

    &__text {
      font-size: 13px;
      color: var(--c-dialog-subtext);
    }
  }

  .fs-cap-group-header {
    font-size: 12px;
    font-weight: 600;
    color: var(--c-dialog-mute);
    padding: 12px 0 6px;
    margin-bottom: 6px;
  }

  .fs-caps-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 10px;
    width: 100%;
  }

  .fs-cap-card {
    display: flex;
    flex-direction: column;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1px solid var(--c-dialog-border);
    background: var(--el-fill-color-lighter, #f8fafc);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: var(--el-fill-color-light, #f1f5f9);
      border-color: rgba(148, 163, 184, 0.45);
    }

    &.is-selected {
      border-color: var(--c-primary);
      background: color-mix(in srgb, var(--c-primary) 8%, var(--c-dialog-bg));
      box-shadow: 0 0 0 1px var(--c-primary);
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
    color: var(--el-color-white, #fff);
    font-size: 11px;
    flex-shrink: 0;

    &.is-checked {
      background: var(--c-primary);
      border-color: var(--c-primary);
    }
  }

  .fs-cat-tag,
  .fs-risk-tag {
    display: inline-flex;
    align-items: center;
    font-size: 10.5px;
    line-height: 1.1;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .fs-cat-tag {
    background: var(--c-tag-cat-bg);
    color: var(--c-tag-cat-text);
  }

  .fs-risk-tag {
    font-weight: 500;
    &--low {
      background: var(--c-tag-low-bg);
      color: var(--c-tag-low-text);
    }
    &--medium {
      background: var(--c-tag-med-bg);
      color: var(--c-tag-med-text);
    }
    &--high {
      background: var(--c-tag-high-bg);
      color: var(--c-tag-high-text);
    }
  }
}

/* 移动端优先响应式适配 */
@media (max-width: 768px) {
  .flat-fs-dialog {
    .fs-dialog-header {
      padding: 12px 14px 0;
    }

    .fs-dialog-subtitle {
      display: none;
    }

    .fs-dialog-header__tabs {
      gap: 14px;
    }

    .fs-view-content {
      padding: 14px;
    }

    .fs-form-row {
      flex-direction: column;
      gap: 12px;
    }

    .fs-form-col--name,
    .fs-form-col--desc,
    .fs-form-col--switch,
    .fs-avatar-block,
    .fs-search-wrap {
      width: 100%;
      max-width: 100%;
    }

    .fs-editor-box {
      min-height: 260px;
    }

    .fs-editor-textarea .el-textarea__inner {
      min-height: 220px;
      font-size: 16px;
    }

    .el-input__inner {
      font-size: 16px;
    }

    .fs-caps-grid {
      grid-template-columns: 1fr;
    }

    .fs-dialog-footer {
      padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
    }

    .fs-btn {
      flex: 1;
      height: 40px;
    }
  }
}

html.dark .flat-fs-dialog {
  --c-dialog-bg: var(--el-bg-color-overlay);
  --c-dialog-border: var(--el-border-color-lighter);
  --c-dialog-text: var(--el-text-color-primary);
  --c-dialog-subtext: var(--el-text-color-secondary);
  --c-dialog-mute: var(--el-text-color-placeholder);

  .fs-cap-card {
    background: var(--el-fill-color-light);
    border-color: rgba(255, 255, 255, 0.08);

    &.is-selected {
      background: color-mix(in srgb, var(--c-primary) 16%, #18181b);
      border-color: var(--c-primary);
    }
  }

  .fs-editor-textarea .el-textarea__inner {
    background: var(--el-bg-color);
    border-color: rgba(255, 255, 255, 0.08);
  }
}
</style>
