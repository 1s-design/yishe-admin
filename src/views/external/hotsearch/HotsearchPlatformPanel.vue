<template>
  <div class="hotsearch-panel" v-loading="loading">
    <!-- 顶部工具条 -->
    <div class="panel-toolbar">
      <div class="toolbar-left">
        <div class="platform-header">
          <span class="platform-name">{{ title }}</span>
        </div>

        <!-- 执行位置选择（仅支持服务端执行的节点显示） -->
        <el-select
          v-if="supportsServer"
          v-model="executionMode"
          placeholder="执行位置"
          size="default"
          style="width: 140px"
        >
          <el-option label="服务端执行" value="server">
            <div class="mode-option">
              <span>服务端执行</span>
              <el-tag size="small" type="success">默认</el-tag>
            </div>
          </el-option>
          <el-option label="客户端执行" value="client">
            <div class="mode-option">
              <span>客户端执行</span>
              <el-tag size="small" type="warning">需在线</el-tag>
            </div>
          </el-option>
        </el-select>

        <!-- 客户端节点选择（始终显示，服务端模式下仅作参考） -->
        <ClientSelector
          ref="clientSelectorRef"
          v-model="selectedClientId"
          :disabled="executionMode === 'server'"
          @refresh="loadClients"
        />
      </div>

      <div class="toolbar-right">
        <el-button v-if="items.length" @click="copyRaw">复制数据</el-button>
        <el-button
          type="primary"
          :disabled="!isReady"
          :loading="searching"
          @click="handleSearch"
        >
          {{ items.length ? '再次采集' : '开始采集' }}
        </el-button>
      </div>
    </div>

    <!-- 结果统计 -->
    <div v-if="items.length" class="stats-bar">
      共 {{ items.length }} 条 · {{ resultMessage }}
    </div>

    <!-- 数据列表：自适应简洁网格/列表 -->
    <div v-if="items.length" class="items-container" v-loading="searching">
      <div
        v-for="(item, idx) in items"
        :key="item.id || item.rank || idx"
        class="item-card"
        :class="{ 'has-cover': Boolean(getCover(item)) }"
        @click="openLink(item)"
      >
        <!-- 封面图 (若存在) -->
        <div v-if="getCover(item)" class="item-cover">
          <img :src="getCover(item)" :alt="getTitle(item)" loading="lazy" @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" />
          <span class="rank-tag" :class="getRankClass(item.rank ?? idx + 1)">#{{ item.rank ?? idx + 1 }}</span>
        </div>

        <!-- 内容区域 -->
        <div class="item-body">
          <div class="item-header">
            <!-- 无封面时的排名勋章 -->
            <span v-if="!getCover(item)" class="rank-badge" :class="getRankClass(item.rank ?? idx + 1)">
              {{ item.rank ?? idx + 1 }}
            </span>
            <span class="item-title" :title="getTitle(item)">{{ getTitle(item) }}</span>
            <span v-if="getTag(item)" class="item-tag">{{ getTag(item) }}</span>
          </div>

          <!-- 描述/摘要 (可选) -->
          <div v-if="getDesc(item)" class="item-desc">
            {{ getDesc(item) }}
          </div>

          <!-- 底部元数据 -->
          <div class="item-footer">
            <span v-if="getAuthor(item)" class="meta-item">👤 {{ getAuthor(item) }}</span>
            <span v-if="getMetaExtra(item)" class="meta-item">🏷️ {{ getMetaExtra(item) }}</span>
            <span v-if="getHot(item)" class="meta-hot">🔥 {{ getHot(item) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!searching" class="panel-empty">
      选择在线的客户端节点后点击「开始采集」获取实时数据
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { genericSearchAndWait } from '@/api/external/genericCommand'
import { executeNodeCapability, supportsServerExecution } from '@/api/external/hotsearch'
import * as appIcons from '@/assets/icons/apps'
import ClientSelector from '../components/ClientSelector.vue'

defineOptions({ name: 'HotsearchPlatformPanel' })

const props = defineProps<{
  pluginKey: string
  title: string
  subtitle?: string
}>()

// 映射平台图标
const platformIcon = computed(() => {
  const map: Record<string, string> = {
    weibo: appIcons.weiboIcon,
    douyin: appIcons.douyinIcon,
    bilibili: appIcons.bilibiliIcon,
    zhihu: appIcons.zhihuIcon,
    toutiao: appIcons.toutiaoIcon,
    douban: appIcons.doubanIcon,
    kuaishou: appIcons.kuaishouIcon,
    v2ex: appIcons.v2exIcon,
    '36kr': appIcons.thirtySixKrIcon,
    ithome: appIcons.ithomeIcon,
    xiaohongshu: appIcons.xiaohongshuIcon,
    baidu: appIcons.baiduIcon,
    github: appIcons.githubIcon,
    devto: appIcons.devtoIcon,
    douyin_jingxuan: appIcons.douyinIcon,
  }
  return map[props.pluginKey] || ''
})

// 执行模式：server（服务端，默认）或 client（客户端）
const executionMode = ref<'server' | 'client'>('server')

// 当前节点是否支持服务端执行
const supportsServer = computed(() => supportsServerExecution(props.pluginKey))

const clientSelectorRef = ref<InstanceType<typeof ClientSelector> | null>(null)
const loading = ref(false)

const selectedClientId = ref('')
const selectedClient = computed(() =>
  clientSelectorRef.value?.clients?.find((c: any) => c.clientId === selectedClientId.value) || null,
)
const searching = ref(false)
const items = ref<any[]>([])
const resultMessage = ref('')
const rawData = ref<any>(null)

// 判断是否可执行：
// - 支持服务端执行的节点：server 模式始终可执行，client 模式需要选中在线客户端
// - 仅支持客户端执行的节点：需要选中在线客户端
const isReady = computed(() => {
  if (supportsServer.value && executionMode.value === 'server') return true
  return !!selectedClientId.value && !!selectedClient.value?.isOnline
})

const loadClients = async () => {
  loading.value = true
  try {
    await clientSelectorRef.value?.refresh()
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  searching.value = true
  try {
    let res: any

    // 服务端执行模式（仅支持服务端执行的节点）
    if (supportsServer.value && executionMode.value === 'server') {
      const response = await executeNodeCapability(props.pluginKey, { maxCount: 20 })
      const resData = response?.data || response
      rawData.value = resData
      const arr = resData?.items || []
      items.value = arr.map((it: any, idx: number) => ({
        ...it,
        rank: it.rank ?? idx + 1,
      }))
      resultMessage.value = `${items.value.length} 条数据（服务端执行）`
    } else {
      // 客户端执行模式：通过 WebSocket 派发到客户端
      if (!selectedClientId.value) {
        ElMessage.warning('请先选择客户端节点')
        searching.value = false
        return
      }
      if (!selectedClient.value?.isOnline) {
        ElMessage.warning('该客户端节点当前离线')
        searching.value = false
        return
      }
      res = await genericSearchAndWait(selectedClientId.value, props.pluginKey, {})
      rawData.value = res
      const arr = res?.items || (Array.isArray(res?.raw) ? res.raw : [])
      items.value = arr.map((it: any, idx: number) => ({
        ...it,
        rank: it.rank ?? idx + 1,
      }))
      resultMessage.value = `${items.value.length} 条数据（客户端执行）`
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '采集失败')
  } finally {
    searching.value = false
  }
}

// 极其鲁棒的动态字段提取器（兼容各种字段变动）
const getTitle = (item: any) =>
  item.title || item.name || item.headline || item.query || item.text || JSON.stringify(item)

const getCover = (item: any) =>
  item.coverUrl || item.cover || item.thumbnail || item.img || item.image || ''

const getDesc = (item: any) =>
  item.desc || item.description || item.excerpt || item.summary || item.snippet || ''

const getAuthor = (item: any) =>
  item.author || item.user?.nickname || item.owner || item.source?.label || ''

const getTag = (item: any) =>
  item.tag || item.label || item.badge || ''

const getMetaExtra = (item: any) =>
  item.node || item.category || item.date || item.pubDate || ''

const getHot = (item: any) => {
  if (item.hot !== undefined && item.hot !== null && item.hot !== '') return String(item.hot)
  if (item.stars !== undefined) return `${item.stars} ⭐`
  if (item.replies !== undefined) return `${item.replies} 回复`
  if (item.points !== undefined) return `${item.points} pts`
  if (item.price !== undefined) return `${item.price}`
  return ''
}

const getRankClass = (rank: number) => {
  if (rank === 1) return 'rank-1'
  if (rank === 2) return 'rank-2'
  if (rank === 3) return 'rank-3'
  return 'rank-other'
}

const openLink = (item: any) => {
  const url = item.url || item.link || item.href
  if (url) window.open(url, '_blank', 'noopener')
}

const copyRaw = async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(rawData.value, null, 2))
    ElMessage.success('已复制原始数据')
  } catch {
    ElMessage.warning('复制失败')
  }
}


watch(
  () => props.pluginKey,
  () => {
    rawData.value = null
    resultMessage.value = ''
    items.value = []
    // 切换平台时重置为默认执行模式
    executionMode.value = 'server'
  },
)
</script>

<style scoped>
.hotsearch-panel {
  width: 100%;
  padding: 16px;
}

.panel-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--el-border-color-lighter, #f3f4f6);
  margin-bottom: 14px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.platform-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.platform-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.platform-icon-fallback {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: var(--el-color-primary-light-9, #eef2ff);
  color: var(--el-color-primary, #4f46e5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

.platform-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary, #111827);
}

.mode-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.stats-bar {
  font-size: 12px;
  color: var(--el-text-color-secondary, #9ca3af);
  margin-bottom: 12px;
}

/* 统一极简卡片列表 */
.items-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter, #f3f4f6);
  background: var(--el-bg-color, #ffffff);
  cursor: pointer;
  transition: all 0.15s ease;
}

.item-card:hover {
  background: var(--el-fill-color-lighter, #fafafa);
  border-color: var(--el-border-color, #e5e7eb);
  transform: translateX(2px);
}

/* 图文卡片微缩图 */
.item-cover {
  position: relative;
  width: 72px;
  height: 54px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background: var(--el-fill-color-light, #f3f4f6);
}

.item-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.rank-tag {
  position: absolute;
  top: 2px;
  left: 2px;
  padding: 1px 4px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  border-radius: 3px;
}

/* 排名勋章 */
.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
  flex-shrink: 0;
}

.rank-1 { background: #ef4444; }
.rank-2 { background: #f97316; }
.rank-3 { background: #f59e0b; }
.rank-other { background: var(--el-fill-color-light, #f3f4f6); color: var(--el-text-color-secondary, #9ca3af); }

.item-body {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary, #1f2937);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-card:hover .item-title {
  color: var(--el-color-primary, #4f46e5);
}

.item-tag {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 3px;
  background: #fef2f2;
  color: #ef4444;
  flex-shrink: 0;
  font-weight: 600;
}

.item-desc {
  margin-top: 3px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #6b7280);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
  font-size: 11px;
  color: var(--el-text-color-placeholder, #9ca3af);
}

.meta-item {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-hot {
  margin-left: auto;
  color: #ef4444;
  font-weight: 600;
  white-space: nowrap;
}

.panel-empty {
  padding: 80px 0;
  text-align: center;
  font-size: 13px;
  color: var(--el-text-color-secondary, #9ca3af);
}
</style>
