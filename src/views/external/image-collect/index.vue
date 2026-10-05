<template>
  <div class="image-collect-page">
    <!-- 主体左右分栏 -->
    <div class="image-collect-layout">
      <!-- 左侧极简菜单栏 -->
      <aside class="collect-menu">
        <div class="menu-header">图片采集</div>
        <nav class="menu-list">
          <template v-for="group in menuGroups" :key="group.label">
            <div class="menu-group-title">{{ group.label }}</div>
            <div
              v-for="item in group.items"
              :key="item.key"
              class="menu-item"
              :class="{ 'is-active': activeTab === item.key }"
              @click="switchTab(item.key)"
            >
              <span class="menu-item-text">{{ item.name }}</span>
              <span
                v-if="item.available === false"
                class="menu-disabled-tag"
                :title="item.reason || '当前不可用'"
              >不可用</span>
            </div>
          </template>
        </nav>
      </aside>

      <!-- 右侧主体内容 -->
      <main class="collect-body">
        <keep-alive>
          <component :is="activeComponent" v-bind="activeProps" />
        </keep-alive>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, markRaw, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTagsView } from '@/hooks/web/useTagsView'
import GoogleArtView from '../google-art/index.vue'
import CollectEnginePanel from '../components/CollectEnginePanel.vue'
import { listCollectSources, type CollectSourceMeta } from '@/api/external/collect'
import { saveSourceMetas, loadSourceMetas } from '../components/collectPanelState'

defineOptions({
  name: 'ExternalImageCollect',
})

const route = useRoute()
const router = useRouter()
const { setTitle } = useTagsView()

type TabKey = string

interface MenuItem {
  key: TabKey
  name: string
  component: any
  props?: Record<string, any>
  group?: 'special'
  available?: boolean
  reason?: string
}

// ── 特殊采集（定制实现，保留独立界面）────────────────────
const specialItems: MenuItem[] = [
  { key: 'google-art', name: 'Google Arts 文化资产', component: markRaw(GoogleArtView), group: 'special' },
]

// ── 通用采集（接口驱动：源清单来自服务端定义，加源零前端改动）──
const engineItems = ref<MenuItem[]>([])

async function loadEngineSources() {
  const applyMetas = (metas: CollectSourceMeta[]) => {
    engineItems.value = metas.map((m) => ({
      key: `src-${m.id}`,
      name: m.name,
      component: markRaw(CollectEnginePanel),
      props: { sourceId: m.id },
      available: m.available !== false,
      reason: m.unavailableReason || '',
    }))
  }
  // 缓存优先：切换回来无空窗
  const cached = loadSourceMetas()
  if (cached && cached.length) {
    applyMetas(filterModuleMetas(cached, 'image-collect') as CollectSourceMeta[])
  }
  try {
    const res: any = await listCollectSources('image-collect')
    const list = res?.data ?? res ?? []
    const metas: CollectSourceMeta[] = Array.isArray(list) ? list : []
    saveSourceMetas(metas)
    applyMetas(metas)
  } catch (e) {
    console.error('[image-collect] 加载采集源清单失败:', e)
    if (!cached) engineItems.value = []
  }
}

const menuItems = computed<MenuItem[]>(() => [...engineItems.value, ...specialItems])

// 菜单分组：通用采集（引擎）/ 特殊采集（定制）
const menuGroups = computed(() => [
  { label: '通用采集', items: engineItems.value },
  { label: '特殊采集', items: specialItems },
])

const activeTab = ref<TabKey>('')

const activeComponent = computed(() => {
  const target = menuItems.value.find((m) => m.key === activeTab.value)
  return target ? target.component : null
})

const activeProps = computed(() => {
  const target = menuItems.value.find((m) => m.key === activeTab.value)
  return target?.props || {}
})

const getTabName = (key: TabKey): string => {
  const item = menuItems.value.find((m) => m.key === key)
  return item ? item.name : '图片采集'
}

const updateTabTitle = (key: TabKey) => {
  nextTick(() => {
    setTitle(getTabName(key), route.path)
  })
}

const switchTab = (key: TabKey) => {
  if (activeTab.value === key) return
  // 只改组件内部状态，不写 URL query：
  // 路由缓存 key 是 fullPath（含 query），写 query 会造成页面重建闪烁
  activeTab.value = key
  updateTabTitle(key)
}

// 菜单就绪后应用路由里的 tab（含旧 key 兼容：裸源 id → src-前缀）
function applyTabFromRoute() {
  const raw = String(route.query.tab || '')
  if (!raw) {
    if (!activeTab.value && menuItems.value.length) {
      activeTab.value = menuItems.value[0].key
      updateTabTitle(activeTab.value)
    }
    return
  }
  let key: TabKey = raw
  if (!menuItems.value.some((m) => m.key === key)) {
    const alt = menuItems.value.some((m) => m.key === `src-${raw}`) ? `src-${raw}` : ''
    if (alt) key = alt
  }
  if (menuItems.value.some((m) => m.key === key)) {
    if (activeTab.value !== key) activeTab.value = key
    updateTabTitle(key)
  }
}

watch(() => route.query.tab, applyTabFromRoute)

onMounted(async () => {
  await loadEngineSources()
  applyTabFromRoute()
})
</script>

<style scoped>
.image-collect-page {
  width: 100%;
  height: 100%;
}

.image-collect-layout {
  display: flex;
  gap: 12px;
  height: calc(100vh - var(--top-tool-height) - var(--tags-view-height));
}

/* 左侧极简菜单 */
.collect-menu {
  width: 180px;
  flex-shrink: 0;
  padding: 8px;
  overflow-y: auto;
}

/* 右侧内容容器 */
.collect-body {
  flex: 1;
  min-width: 0;
  padding: 16px;
  overflow-y: auto;
}

.menu-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 8px 8px 8px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 4px;
}

.menu-group-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 10px 8px 4px 8px;
}

.menu-group-title:not(:first-child) {
  margin-top: 8px;
  border-top: 1px solid var(--el-border-color-extra-light);
}

.menu-item {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  user-select: none;
}

.menu-item:hover {
  background: transparent;
  color: var(--el-text-color-primary);
}

.menu-item:focus,
.menu-item:focus-visible {
  outline: none;
}

.menu-item.is-active {
  background: transparent;
  color: var(--el-color-primary);
  font-weight: 500;
}

.menu-disabled-tag {
  flex-shrink: 0;
  margin-left: 4px;
  font-size: 10px;
  line-height: 1;
  padding: 2px 4px;
  border-radius: 3px;
  background: var(--el-color-danger-light-9, #fef0f0);
  color: var(--el-color-danger, #f56c6c);
  font-weight: 600;
}

.menu-item-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 窄滚动条 */
.collect-menu::-webkit-scrollbar,
.collect-body::-webkit-scrollbar {
  width: 4px;
}

.collect-menu::-webkit-scrollbar-track,
.collect-body::-webkit-scrollbar-track {
  background: transparent;
}

.collect-menu::-webkit-scrollbar-thumb,
.collect-body::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 2px;
}

.collect-menu::-webkit-scrollbar-thumb:hover,
.collect-body::-webkit-scrollbar-thumb:hover {
  background: var(--el-text-color-secondary);
}

:global(.dark) .menu-item.is-active {
  background: var(--el-color-primary-light-8);
}
</style>
