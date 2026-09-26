<template>
  <div class="service-panel" v-loading="loading">
    <!-- 工具栏：客户端选择 + 刷新 -->
    <div class="service-panel__toolbar">
      <div class="service-panel__left">
        <div class="service-panel__title">
          {{ title }}
          <span class="service-panel__subtitle">{{ subtitle }}</span>
        </div>
        <ClientSelector
          ref="clientSelectorRef"
          v-model="selectedClientId"
          @change="handleSelectClient"
          @refresh="loadClients"
        />
      </div>
      <div class="service-panel__actions">
        <el-button
          type="primary"
          :disabled="!isReady"
          :loading="searching"
          @click="handleSearch"
        >
          {{ fields.length ? '开始采集' : '开始查询' }}
        </el-button>
      </div>
    </div>

    <!-- 表单区 -->
    <div v-if="fields.length" class="service-panel__form">
      <div class="service-panel__form-item" v-for="field in fields" :key="field.key">
        <span class="service-panel__form-label">{{ field.label }}</span>
        <el-input
          v-model="form[field.key]"
          size="small"
          :type="field.type === 'password' ? 'password' : 'text'"
          :placeholder="field.placeholder || field.label"
          style="width: 180px"
        />
      </div>
    </div>

    <!-- 结果区 -->
    <div v-if="rawData" class="service-panel__results">
      <div class="service-panel__results-header">
        <div class="service-panel__results-info">
          {{ resultMessage }}
        </div>
        <div class="service-panel__results-actions">
          <el-button size="small" @click="copyRaw">复制原始数据</el-button>
          <el-button size="small" type="primary" :loading="searching" @click="handleSearch">
            再次采集
          </el-button>
        </div>
      </div>

      <!-- 列表形结果 -->
      <div v-if="items.length" class="service-item-list">
        <div v-for="(item, index) in items" :key="item.originalIndex ?? index" class="service-item">
          <div class="service-item__index">{{ (item.originalIndex ?? index) + 1 }}</div>
          <div class="service-item__body">
            <div class="service-item__title">{{ displayTitle(item) }}</div>
            <div v-if="displayDesc(item)" class="service-item__desc">{{ displayDesc(item) }}</div>
            <div class="service-item__meta">
              <span v-if="displayMeta(item)">{{ displayMeta(item) }}</span>
              <span v-if="displayLink(item)" class="service-item__link" @click="copyLink(item)">
                复制链接
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 对象形结果 (JSON) -->
      <div v-else class="service-json">
        <pre class="service-json__block">{{ prettyRaw }}</pre>
      </div>
    </div>

    <div v-else-if="!searching" class="service-panel__empty">
      选择客户端节点后点击「开始采集」，将从已连接客户端返回采集结果。
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { genericSearchAndWait } from '@/api/external/genericCommand'
import ClientSelector from './ClientSelector.vue'

export interface PanelField {
  key: string
  label: string
  placeholder?: string
  type?: 'text' | 'number' | 'password'
  default?: string | number
}

const props = defineProps<{
  pluginKey: string
  title: string
  subtitle?: string
  fields?: PanelField[]
}>()

const clientSelectorRef = ref<InstanceType<typeof ClientSelector> | null>(null)
const loading = ref(false)

const selectedClientId = ref('')
const selectedClient = computed(() =>
  clientSelectorRef.value?.clients?.find((c: any) => c.clientId === selectedClientId.value) || null,
)
const searching = ref(false)
const rawData = ref<any>(null)
const resultMessage = ref('')
const items = ref<any[]>([])
const form = reactive<Record<string, any>>({})

const isReady = computed(() => !!selectedClientId.value && !!selectedClient.value?.isOnline)

const buildForm = () => {
  for (const k of Object.keys(form)) delete form[k]
  ;(props.fields || []).forEach((f) => {
    form[f.key] = f.default ?? ''
  })
}

const handleSelectClient = () => {
  if (!selectedClient.value?.isOnline) {
    ElMessage.warning('该客户端节点当前离线，请先刷新节点或选择在线客户端')
  }
}

const loadClients = async () => {
  loading.value = true
  try {
    await clientSelectorRef.value?.refresh()
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  if (!selectedClientId.value) {
    ElMessage.warning('请先选择客户端节点')
    return
  }
  if (!selectedClient.value?.isOnline) {
    ElMessage.warning('该客户端节点当前离线')
    return
  }
  const payload: Record<string, any> = {}
  ;(props.fields || []).forEach((f) => {
    const v = form[f.key]
    if (v !== '' && v !== undefined && v !== null) payload[f.key] = v
  })
  searching.value = true
  try {
    const res = await genericSearchAndWait(selectedClientId.value, props.pluginKey, payload)
    rawData.value = res
    const arr = res?.items || (Array.isArray(res?.raw) ? res.raw : [])
    items.value = arr.map((it: any, idx: number) => ({ ...it, originalIndex: idx }))
    resultMessage.value = res?.message || `${res?.count ?? items.value.length} 条结果`
  } catch (e: any) {
    ElMessage.error(e?.message || '采集失败')
  } finally {
    searching.value = false
  }
}

const copyRaw = async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(rawData.value, null, 2))
    ElMessage.success('已复制原始数据')
  } catch {
    ElMessage.warning('复制失败')
  }
}

const copyLink = async (item: any) => {
  const link = displayLink(item)
  if (!link) return
  try {
    await navigator.clipboard.writeText(link)
    ElMessage.success('已复制链接')
  } catch {
    ElMessage.warning('复制失败')
  }
}

const displayTitle = (item: any) =>
  item.title || item.headline || item.h1 || item.name || item.question || item.word || item.text || JSON.stringify(item)

const displayDesc = (item: any) => {
  const desc =
    item.description ||
    item.snippet ||
    item.summary ||
    item.abstract ||
    item.excerpt ||
    item.content
  return desc ?? ''
}

const displayMeta = (item: any) =>
  [item.author, item.source?.label || item.source?.title, item.published_at || item.datePublished || item.pubDate || item.date || item.category]
    .filter((v) => !!v)
    .join(' · ')

const displayLink = (item: any) => item.url || item.link || item.href || ''

const prettyRaw = computed(() => JSON.stringify(rawData.value ?? {}, null, 2))

onMounted(() => {
  buildForm()
})

watch(
  () => props.pluginKey,
  () => {
    rawData.value = null
    resultMessage.value = ''
    items.value = []
    buildForm()
  },
)
</script>

<style scoped>
.service-panel {
  width: 100%;
  min-height: 300px;
  padding: 16px;
}

.service-panel__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.service-panel__left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.service-panel__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary, #1f2937);
}

.service-panel__subtitle {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary, #9ca3af);
}

.service-panel__actions {
  display: flex;
  gap: 8px;
}

.service-panel__form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px;
  margin-bottom: 16px;
  background: var(--el-fill-color-lighter, #fafafa);
  border-radius: 8px;
}

.service-panel__form-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.service-panel__form-label {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-regular, #4b5563);
}

.service-panel__results {
  border: 1px solid var(--el-border-color-lighter, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
}

.service-panel__results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: var(--el-fill-color-light, #f9fafb);
  border-bottom: 1px solid var(--el-border-color-lighter, #e5e7eb);
}

.service-panel__results-info {
  font-size: 13px;
  color: var(--el-text-color-primary, #374151);
}

.service-panel__results-actions {
  display: flex;
  gap: 8px;
}

.service-item-list {
  max-height: 560px;
  overflow: auto;
}

.service-item {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--el-border-color-extra-light, #f3f4f6);
}

.service-item:last-child {
  border-bottom: none;
}

.service-item__index {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  line-height: 22px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-primary, #4f46e5);
  background: var(--el-color-primary-light-9, #eef2ff);
  border-radius: 6px;
}

.service-item__body {
  min-width: 0;
  flex: 1;
}

.service-item__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary, #1f2937);
  word-break: break-all;
}

.service-item__desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #6b7280);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.service-item__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #9ca3af);
}

.service-item__link {
  cursor: pointer;
  color: var(--el-color-primary, #4f46e5);
}

.service-json {
  padding: 14px;
  max-height: 560px;
  overflow: auto;
}

.service-json__block {
  margin: 0;
  font-family: "SF Mono", Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-regular, #4b5563);
  white-space: pre-wrap;
  word-break: break-all;
}

.service-panel__empty {
  padding: 80px 0;
  text-align: center;
  font-size: 13px;
  color: var(--el-text-color-secondary, #9ca3af);
}
</style>