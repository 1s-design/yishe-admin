<template>
  <el-dialog
    v-model="visible"
    title="工作流设置与触发器"
    width="540px"
    destroy-on-close
    append-to-body
    class="wf-trigger-dialog"
  >
    <el-tabs v-model="activeTab" class="wf-trigger-tabs">
      <!-- 1. 手动触发 -->
      <el-tab-pane label="手动触发" name="manual">
        <div class="wf-pane-content">
          <div class="wf-setting-item">
            <div class="wf-setting-label">
              <span>启用手动触发</span>
              <span class="wf-setting-desc">允许在编辑器控制台或通过 API 点击直接运行</span>
            </div>
            <el-switch v-model="manualEnabled" size="small" @change="saveManualTrigger" />
          </div>

          <div class="wf-code-box">
            <div class="wf-code-title">API 手动触发格式：</div>
            <code>POST /api/workflow/{{ props.workflowId }}/run</code>
          </div>
        </div>
      </el-tab-pane>

      <!-- 2. 定时触发 -->
      <el-tab-pane name="cron">
        <template #label>
          <span class="wf-tab-label">
            定时触发            <span :class="['wf-tab-status', cronConfigured ? 'wf-tab-status--on' : 'wf-tab-status--off']">
              {{ cronConfigured ? '已设置' : '未设置' }}
            </span>
          </span>
        </template>
        <div class="wf-pane-content">
          <div class="wf-setting-item">
            <div class="wf-setting-label">
              <span>启用定时触发</span>
              <span class="wf-setting-desc">基于 Redis ZSET 定时触发引擎自动按周期触发</span>
            </div>
            <el-switch v-model="cronEnabled" size="small" @change="saveCronTrigger" />
          </div>

          <div class="wf-cron-form">
            <div class="flex items-center justify-between mb-3">
              <div class="flex flex-col">
                <span class="text-xs font-500 text-[var(--el-text-color-regular)]">时间表达式：</span>
                <span class="text-sm font-mono text-[var(--el-color-primary)] font-600 mt-0.5">
                  {{ cronExpression || '未设置' }}
                </span>
              </div>
              <el-button size="small" type="primary" plain @click="advancedCronVisible = true">
                配置时间
              </el-button>
            </div>

            <div v-if="cronNextRunTime" class="text-xs text-[var(--el-color-success)] pt-2 border-t border-[var(--app-content-border-color)]">
              下次预计触发时间：{{ formatDate(cronNextRunTime) }}
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 3. Webhook 触发 -->
      <el-tab-pane name="webhook">
        <template #label>
          <span class="wf-tab-label">
            Webhook 触发            <span :class="['wf-tab-status', webhookConfigured ? 'wf-tab-status--on' : 'wf-tab-status--off']">
              {{ webhookConfigured ? '已设置' : '未设置' }}
            </span>
          </span>
        </template>
        <div class="wf-pane-content">
          <div class="wf-setting-item">
            <div class="wf-setting-label">
              <span>启用 Webhook 触发</span>
              <span class="wf-setting-desc">通过 HTTP 请求远程触发工作流</span>
            </div>
            <el-switch v-model="webhookEnabled" size="small" @change="saveWebhookTrigger" />
          </div>

          <div v-if="webhookPath" class="wf-webhook-info">
            <div class="wf-code-box">
              <div class="wf-code-title">Webhook URL（开发环境）：</div>
              <code>{{ webhookDevUrl }}</code>
              <button class="wf-copy-btn" @click="copyWebhookUrl(webhookDevUrl)">复制</button>
            </div>
            <div class="wf-code-box" style="margin-top: 8px;">
              <div class="wf-code-title">Webhook URL（线上环境）：</div>
              <code>{{ webhookProdUrl }}</code>
              <button class="wf-copy-btn" @click="copyWebhookUrl(webhookProdUrl)">复制</button>
            </div>
            <div class="wf-webhook-meta">
              <span>请求方法：<code>{{ webhookMethod }}</code></span>
              <span>路径标识：<code>{{ webhookPath }}</code></span>
            </div>
            <div class="wf-webhook-tip">
              <strong>调用方式：</strong>向上述 URL 发送 POST 请求即可触发工作流。
              请求体会作为工作流的输入参数传入。
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <AdvancedCronDialog v-model="advancedCronVisible" :workflow-id="props.workflowId" @saved="loadTriggers" />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AdvancedCronDialog from './AdvancedCronDialog.vue'
import {
  getWorkflowTriggersApi,
  saveWorkflowTriggerApi,
} from '@/api/workflow'

const props = defineProps<{
  modelValue: boolean
  workflowId: string
}>()

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const activeTab = ref('manual')
const advancedCronVisible = ref(false)

// 触发器状态
const manualEnabled = ref(true)

const cronEnabled = ref(false)
const cronExpression = ref('0 8 * * *')
const cronNextRunTime = ref<string | null>(null)
const cronConfigured = ref(false)

// Webhook 触发
const webhookEnabled = ref(false)
const webhookPath = ref('')
const webhookMethod = ref('POST')
const webhookDevUrl = ref('')
const webhookProdUrl = ref('')
const webhookConfigured = ref(false)

// 时间选择器
const timePickerValue = ref<Date | null>(new Date(2026, 0, 1, 8, 0))

// 快捷 Cron 模板
const cronTemplates = [
  { label: '每 5 分钟', expr: '*/5 * * * *', desc: '适合高频轻量任务' },
  { label: '每 10 分钟', expr: '*/10 * * * *', desc: '常用轮询任务' },
  { label: '每 30 分钟', expr: '*/30 * * * *', desc: '中频同步任务' },
  { label: '每小时整点', expr: '0 * * * *', desc: '每小时执行一次' },
  { label: '每天 09:00', expr: '0 9 * * *', desc: '每天上午 9 点' },
  { label: '每天 12:00', expr: '0 12 * * *', desc: '每天中午 12 点' },
  { label: '每天 18:00', expr: '0 18 * * *', desc: '每天下午 6 点' },
  { label: '每天 00:30', expr: '30 0 * * *', desc: '适合夜间批处理' },
  { label: '工作日 09:00', expr: '0 9 * * 1-5', desc: '周一到周五上午 9 点' },
  { label: '工作日 18:00', expr: '0 18 * * 1-5', desc: '周一到周五下午 6 点' },
  { label: '每周一 09:00', expr: '0 9 * * 1', desc: '每周一上午 9 点' },
  { label: '每周日 23:00', expr: '0 23 * * 0', desc: '每周日晚上 11 点' },
  { label: '每月 1 日 09:00', expr: '0 9 1 * *', desc: '每月 1 日上午 9 点' },
  { label: '每月最后一天 23:00', expr: '0 23 28-31 * *', desc: '需脚本内自行兜底最后一天判断' },
]

const handleTimePickerChange = (val: Date | null) => {
  if (val) {
    const d = new Date(val)
    const h = d.getHours()
    const m = d.getMinutes()
    cronExpression.value = `${m} ${h} * * *`
  }
}

const applyCronTemplate = (expr: string) => {
  cronExpression.value = expr
  parseCronToTimePicker(expr)
}

const parseCronToTimePicker = (expr: string) => {
  const parts = expr.trim().split(/\s+/)
  if (parts.length === 5 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1]))) {
    const m = parseInt(parts[0], 10)
    const h = parseInt(parts[1], 10)
    timePickerValue.value = new Date(2026, 0, 1, h, m)
  }
}

const loadTriggers = async () => {
  if (!props.workflowId) return
  try {
    const res = await getWorkflowTriggersApi(props.workflowId)
    const list = res || []

    const manual = list.find((t: any) => t.type === 'manual')
    manualEnabled.value = manual ? manual.enabled : true

    const cron = list.find((t: any) => t.type === 'cron')
    if (cron) {
      cronEnabled.value = cron.enabled
      cronExpression.value = cron.config?.expression || '0 8 * * *'
      cronNextRunTime.value = cron.nextRunTime || null
      cronConfigured.value = true
      parseCronToTimePicker(cronExpression.value)
    } else {
      cronEnabled.value = false
      cronConfigured.value = false
    }

    const webhook = list.find((t: any) => t.type === 'webhook')
    if (webhook) {
      webhookEnabled.value = webhook.enabled
      webhookPath.value = webhook.config?.path || ''
      webhookMethod.value = webhook.config?.method || 'POST'
      webhookConfigured.value = true
      updateWebhookUrls()
    } else {
      webhookEnabled.value = false
      webhookConfigured.value = false
    }
  } catch (error) {
    console.error('加载触发器配置失败', error)
  }
}

const saveManualTrigger = async () => {
  try {
    await saveWorkflowTriggerApi(props.workflowId, {
      type: 'manual',
      enabled: manualEnabled.value,
    })
    ElMessage.success('手动触发配置已更新')
  } catch (err: any) {
    ElMessage.error(err.message || '更新失败')
  }
}

const saveCronTrigger = async () => {
  try {
    const res = await saveWorkflowTriggerApi(props.workflowId, {
      type: 'cron',
      enabled: cronEnabled.value,
      config: { expression: cronExpression.value },
    })
    if (res?.nextRunTime) {
      cronNextRunTime.value = res.nextRunTime
    }
    cronConfigured.value = true
    ElMessage.success('定时触发配置已保存')
  } catch (err: any) {
    ElMessage.error(err.message || '保存失败，请检查 Cron 表达式')
  }
}


const saveWebhookTrigger = async () => {
  try {
    const config: Record<string, any> = {
      method: webhookMethod.value,
    }
    if (webhookPath.value) {
      config.path = webhookPath.value
    }
    const res = await saveWorkflowTriggerApi(props.workflowId, {
      type: 'webhook',
      enabled: webhookEnabled.value,
      config,
    })
    if (res?.config?.path) {
      webhookPath.value = res.config.path
      updateWebhookUrls()
    }
    webhookConfigured.value = true
    ElMessage.success('Webhook 触发配置已保存')
  } catch (err: any) {
    ElMessage.error(err.message || '保存失败')
  }
}

const updateWebhookUrls = () => {
  if (!webhookPath.value) return
  const basePath = `/api/workflow/webhook/${webhookPath.value}`
  const configuredBase = String(import.meta.env.VITE_BASE_URL || '').trim().replace(/\/+$/, '').replace(/\/api$/, '')
  // 开发环境：优先配置，回退 localhost:1520
  const devOrigin = configuredBase || 'http://localhost:1520'
  // 线上/当前环境：优先配置，其次当前页面 origin
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const prodOrigin = configuredBase || currentOrigin
  webhookDevUrl.value = `${devOrigin}${basePath}`
  webhookProdUrl.value = `${prodOrigin}${basePath}`
}

const copyWebhookUrl = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('Webhook URL 已复制到剪贴板')
  } catch {
    // fallback
    const input = document.createElement('input')
    input.value = url
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    ElMessage.success('Webhook URL 已复制到剪贴板')
  }
}

const formatDate = (val: string) => {
  if (!val) return '-'
  return new Date(val).toLocaleString()
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      loadTriggers()
    }
  }
)
</script>

<style scoped>
.wf-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.wf-tab-status {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 3px;
  line-height: 1.4;

  &--on {
    color: #16a34a;
    background: rgba(22, 163, 74, 0.12);
  }

  &--off {
    color: var(--el-text-color-placeholder);
    background: var(--app-content-surface-muted-color);
  }
}
.wf-pane-content {
  padding: 4px 0;
}

.wf-setting-item {
  display: flex;
  padding: 8px 12px;
  margin-bottom: 10px;
  background: var(--app-content-surface-muted-color);
  border-radius: 6px;
  align-items: center;
  justify-content: space-between;
}

.wf-setting-label {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  font-weight: 500;
}

.wf-setting-desc {
  margin-top: 2px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.wf-code-box {
  padding: 10px 12px;
  font-family: monospace;
  font-size: 12px;
  color: #4ec9b0;
  background: #1e1e1e;
  border-radius: 6px;
}

.wf-cron-form {
  padding: 10px 12px;
  background: var(--app-content-surface-muted-color);
  border-radius: 6px;
}

.wf-template-card {
  padding: 8px 10px;
  background: var(--app-content-surface-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}

.wf-reference-card {
  padding: 8px 10px;
  background: var(--app-content-surface-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}

.wf-reference-list {
  display: flex;
  max-height: 120px;
  overflow-y: auto;
  flex-direction: column;
  gap: 4px;
}

.wf-reference-item {
  display: flex;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  align-items: center;
  gap: 6px;
}

.wf-ref-label {
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.wf-ref-expr {
  padding: 0 4px;
  font-family: monospace;
  color: var(--el-color-primary);
  background: var(--app-content-surface-muted-color);
  border-radius: 3px;
}

.wf-ref-desc {
  opacity: 0.85;
}



.wf-webhook-info {
  margin-top: 12px;
}

.wf-webhook-meta {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 11px;
  color: var(--el-text-color-secondary);

  code {
    padding: 1px 4px;
    font-family: monospace;
    color: var(--el-color-primary);
    background: var(--app-content-surface-muted-color);
    border-radius: 3px;
  }
}

.wf-webhook-tip {
  margin-top: 8px;
  padding: 8px 10px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  background: var(--app-content-surface-muted-color);
  border-radius: 6px;
  border-left: 3px solid var(--el-color-primary);
}

.wf-copy-btn {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 11px;
  color: var(--el-color-primary);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--el-color-primary);
  border-radius: 4px;
  transition: all 0.15s;

  &:hover {
    color: #fff;
    background: var(--el-color-primary);
  }
}

</style>
